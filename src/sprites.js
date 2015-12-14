/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var load = require('./load');
var shader = require('./shader');
var util = require('./util');

// Attribute offsets
var APos = 0;       // float x 2
var ATexCoord = 8;  // int16 x 2
var AColor1 = 12;   // u8 x 4
var AColor2 = 16;   // u8 x 4
var ATotal = 20;

// Map from sprites to locations
var SpriteNames = {
	// Weapons
	WRocket:   0,
	WHoming:   1,
	WTriple:   2,
	WWave:     3,
	WSingle:   8,
	WSnake:    9,
	WItano:   10,
	WReaper:  11,
	// Items
	IShield1: 16,
	IShield2: 17,
	ISpeed:   18,
	IDeath:   19,
	// Bonuses
	BHalf:    24,
	BTwo:     25,
	BThree:   26,
	BFour:    27,
	// Enemies
	EGlider:   4,
	EHoriz:    5,
	ESilo:     6,
	EDiamond:  7,
	EStar:    12,
	EAce:     13,
	ETurret:  14,
	// Shots
	SDot:     20,
	SRocket1: 21,
	SRocket2: 22,
	STri:     23,
	SStar:    28,
	// Player
	PStand:   29,
	PForward: 30,
	PHurt:    31,
};

/*
 * Sprite layer.
 */
function Sprites() {
	this.program = null;

	this.tex = null;          // sprite texture
	this.count = 0;           // number of sprites
	this.capacity = 0;        // maximum number of sprites in array
	this.vdata = null;        // vertex data (ArrayBuffer)
	this.vdataU8 = null;      // vertex data as U8
	this.vdataI16 = null;     // vertex data as I16
	this.vdataF32 = null;     // vertex data as F32
	this.vdataU32 = null;     // vertex data as U32
	this.vdirty = true;       // whether vertex data has changed
	this.idirty = true;       // whether index data has changed
	this.vbuffer = null;      // GL array buffer
	this.ibuffer = null;      // GL element array buffer
}

/*
 * Initialize the sprite layer.
 */
Sprites.prototype.init = function(r) {
	if (this.program) {
		return;
	}
	var gl = r.gl;

	this.program = shader.loadProgram(r.gl, {
		vert: 'sprite.vert',
		frag: 'sprite.frag',
		attributes: 'Pos TexCoord Color1 Color2',
		uniforms: 'MVP SpriteSheet',
	});

	var img = load.getImage('Sprites');
	if (img) {
		this.tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(
      gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
};

/*
 * Destroy the sprite layer.
 */
Sprites.prototype.destroy = function(r) {
	if (this.program) {
		this.program.destroy(r);
	}
	if (this.vbuffer) {
		r.gl.deleteBuffer(this.vbuffer);
	}
	if (this.ibuffer) {
		r.gl.deleteBuffer(this.ibuffer);
	}
};

/*
 * Draw the sprite layer to the screen.
 */
Sprites.prototype.render = function(r, camera) {
	var gl = r.gl;
	var i;

	if (!this.program || !this.count) {
		return;
	}

	if (this.vdirty) {
		if (!this.vbuffer) {
			this.vbuffer = gl.createBuffer();
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			this.vdataU8.subarray(0, ATotal * 4 * this.count),
			gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		this.vdirty = false;
	}

	if (this.idirty) {
		if (!this.ibuffer) {
			this.ibuffer = gl.createBuffer();
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			util.genIndexArray(this.capacity),
			gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		this.idirty = false;
	}

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.useProgram(this.program.program);
	gl.uniformMatrix4fv(this.program.MVP, false, camera.MVP);
	gl.uniform1i(this.program.SpriteSheet, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, ATotal, APos);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 2, gl.SHORT, false, ATotal, ATexCoord);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, ATotal, AColor1);
	gl.enableVertexAttribArray(3);
	gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, ATotal, AColor2);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.tex);

	gl.drawElements(gl.TRIANGLES, this.count * 6, gl.UNSIGNED_SHORT, 0);

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.disableVertexAttribArray(0);
	gl.disableVertexAttribArray(1);
	gl.disableVertexAttribArray(2);
	gl.disableVertexAttribArray(3);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.useProgram(null);
	gl.disable(gl.BLEND);
};

/*
 * Add sprites to the sprite layer.
 * arg.position: Position
 * arg.radius: Radius
 * arg.sprite: Name of sprite
 * arg.color: Color to use
 */
Sprites.prototype.add = function() {
	var i, vb, u8, i16, f32, u32;

	var count = this.count, newCount = count + arguments.length;
	if (newCount > this.capacity) {
		var newCapacity = Math.max(this.capacity, 32);
		while (newCount > newCapacity) {
			newCapacity *= 2;
		}
		vb = new ArrayBuffer(ATotal * 4 * newCapacity);
		u8 = new Uint8Array(vb);
		i16 = new Int16Array(vb);
		f32 = new Float32Array(vb);
		u32 = new Uint32Array(vb);
		if (this.vdata) {
			u8.set(this.vdataU8);
		}
		this.vdata = vb;
		this.vdataU8 = u8;
		this.vdataI16 = i16;
		this.vdataF32 = f32;
		this.vdataU32 = u32;
		this.capacity = newCapacity;
		this.idirty = true;
	} else {
		i16 = this.vdataI16;
		f32 = this.vdataF32;
		u32 = this.vdataU32;
	}

	for (i = 0; i < arguments.length; i++) {
		var j = 20 * (count + i), k = 40 * (count + i);
		var arg = arguments[i];
		var pos = arg.position, r = arg.radius;
		if (!pos || typeof r !== 'number') {
			console.error('Invalid sprite');
			continue;
		}
		var x = pos[0], y = pos[1];
		var angle = arg.angle, vc = r, vs = 0;
		if (angle) {
			vc = Math.cos(angle) * r;
			vs = Math.sin(angle) * r;
		}
		var color1 = color.toU32(arg.color), color2 = 0xffffffff;
		var sprite = SpriteNames[arg.sprite];
		if (typeof sprite == 'undefined') {
			console.warn('Unknown sprite: ' + arg.sprite);
			sprite = 0;
		}
		var tx = sprite & 7, ty = sprite >> 3;

		f32[j+ 0] = x - vc + vs;
		f32[j+ 1] = y - vc - vs;
		i16[k+ 4] = tx;
		i16[k+ 5] = ty + 1;
		u32[j+ 3] = color1;
		u32[j+ 4] = color2;

		f32[j+ 5] = x + vc + vs;
		f32[j+ 6] = y - vc + vs;
		i16[k+14] = tx + 1;
		i16[k+15] = ty + 1;
		u32[j+ 8] = color1;
		u32[j+ 9] = color2;

		f32[j+10] = x - vc - vs;
		f32[j+11] = y + vc - vs;
		i16[k+24] = tx;
		i16[k+25] = ty;
		u32[j+13] = color1;
		u32[j+14] = color2;

		f32[j+15] = x + vc - vs;
		f32[j+16] = y + vc + vs;
		i16[k+34] = tx + 1;
		i16[k+35] = ty;
		u32[j+18] = color1;
		u32[j+19] = color2;
	}

	this.count = newCount;
	this.vdirty = true;
};

/*
 * Remove all sprites from the layer.
 */
Sprites.prototype.clear = function() {
	this.count = 0;
	this.vdirty = true;
};

module.exports = {
	Sprites: Sprites,
};
