/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */

var load = require('./load');
var shader = require('./shader');
var util = require('./util');

// Attribute offsets
var APos = 0;       // float x 2
var ATexCoord = 8;  // float x 2
var ANormal = 16;   // float x 4
var AColor = 32;    // u8 x 4
var ATotal = 36;

/*
 * Tile layer.
 */
function Tiles() {
	this.program = null;
	this.count = 0;
	this.capacity = 0;
	this.vdata = null;
	this.vdataU8 = null;
	this.vdataF32 = null;
	this.vdataU32 = null;
	this.vdirty = true;
	this.vbuffer = null;
	this.ibuffer = null;
	this.texColor = null;
	this.texNormal = null;
}

/*
 * Initialize the tile layer.
 */
Tiles.prototype.init = function(r) {
	if (this.program) {
		return;
	}
	var gl = r.gl;

	this.program = shader.loadProgram(r.gl, {
		vert: 'tile.vert',
		frag: 'tile.frag',
		attributes: 'Pos Normal Color',
		uniforms: 'MVP TexColor TexNormal LightColor LightPosition BlockColor',
	});

	var img;

	img = load.getImage('BlockColor');
	if (img) {
		this.texColor = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texColor);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(
      gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.generateMipmap(gl.TEXTURE_2D);
	}

	img = load.getImage('BlockNormal');
	if (img) {
		this.texNormal = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texNormal);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(
      gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.generateMipmap(gl.TEXTURE_2D);
	}

	gl.bindTexture(gl.TEXTURE_2D, null);
};

/*
 * Destroy the tile layer.
 */
Tiles.prototype.destroy = function(r) {
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
 * Draw the tile layer.
 */
Tiles.prototype.render = function(r, camera, lights) {
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
			gl.STATIC_DRAW);
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

	gl.useProgram(this.program.program);
	gl.uniformMatrix4fv(this.program.MVP, false, camera.MVP);
	gl.uniform1i(this.program.TexColor, 0);
	gl.uniform1i(this.program.TexNormal, 1);
	gl.uniform4fv(this.program.LightColor, lights.colors);
	gl.uniform4fv(this.program.LightPosition, lights.locs);
	gl.uniform3fv(this.program.BlockColor, [0.6, 0.6, 0.6]);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, ATotal, APos);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 2, gl.FLOAT, false, ATotal, ATexCoord);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, ATotal, AColor);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.texColor);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.texNormal);

	gl.drawElements(gl.TRIANGLES, this.count * 6, gl.UNSIGNED_SHORT, 0);

	gl.disableVertexAttribArray(0);
	gl.disableVertexAttribArray(1);
	gl.disableVertexAttribArray(2);
	gl.disableVertexAttribArray(3);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.useProgram(null);
};

/*
 * Clear the tile layer.
 */
Tiles.prototype.clear = function() {
	this.count = 0;
};

/*
 * Add tiles to the tile layer.
 * tile.x: X center coordinate
 * tile.y: Y center coordinate
 * tile.w: Width
 * tile.h: Height
 * tile.angle: Angle, in radians
 */
Tiles.prototype.add = function(tiles) {
	var i, vb, u8, f32, u32;

	var count = this.count, newCount = count + tiles.length;
	if (newCount > this.capacity) {
		var newCapacity = Math.max(this.capacity, 32);
		while (newCount > newCapacity) {
			newCapacity *= 2;
		}
		vb = new ArrayBuffer(ATotal * 4 * newCapacity);
		u8 = new Uint8Array(vb);
		f32 = new Float32Array(vb);
		u32 = new Uint32Array(vb);
		if (this.vdata) {
			u8.set(this.vdataU8);
		}
		this.vdata = vb;
		this.vdataU8 = u8;
		this.vdataF32 = f32;
		this.vdataU32 = u32;
		this.capacity = newCapacity;
		this.idirty = true;
	} else {
		f32 = this.vdataF32;
		u32 = this.vdataU32;
	}

	for (i = 0; i < tiles.length; i++) {
		var j = 36 * (count + i);
		var tile = tiles[i];
		var x = tile.x, y = tile.y, w = tile.w, h = tile.h;
		var tx = Math.floor(1024 * Math.random() - 512);
		var ty = Math.floor(1024 * Math.random() - 512);
		var color = tile.color;

		f32[j+ 0] = x - w * 0.5;
		f32[j+ 1] = y - h * 0.5;
		f32[j+ 2] = tx;
		f32[j+ 3] = ty + h * 0.5;
		f32[j+ 4] = 0;
		f32[j+ 5] = 0;
		f32[j+ 6] = 0;
		f32[j+ 7] = 0;
		u32[j+ 8] = color;

		f32[j+ 9] = x + w * 0.5;
		f32[j+10] = y - h * 0.5;
		f32[j+11] = tx + w * 0.5;
		f32[j+12] = ty + h * 0.5;
		f32[j+13] = 0;
		f32[j+14] = 0;
		f32[j+15] = 0;
		f32[j+16] = 0;
		u32[j+17] = color;

		f32[j+18] = x - w * 0.5;
		f32[j+19] = y + h * 0.5;
		f32[j+20] = tx;
		f32[j+21] = ty;
		f32[j+22] = 0;
		f32[j+23] = 0;
		f32[j+24] = 0;
		f32[j+25] = 0;
		u32[j+26] = color;

		f32[j+27] = x + w * 0.5;
		f32[j+28] = y + h * 0.5;
		f32[j+29] = tx + w * 0.5;
		f32[j+30] = ty;
		f32[j+31] = 0;
		f32[j+32] = 0;
		f32[j+33] = 0;
		f32[j+34] = 0;
		u32[j+35] = color;
	}

	this.count = newCount;
	this.vdirty = true;
};

module.exports = {
	Tiles: Tiles,
};
