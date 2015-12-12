/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var prog;
var shader = require('./shader');

var STATE_UNLOADED = 0, STATE_LOADED = 1, STATE_FAILED = 2;

/*
 * Sprite layer.
 */
function Sprites() {
	this.loadState = 0; // 0=unloaded, 1=loaded, 2=failed
	this.program = null;

	this.count = 0;           // number of sprites
	this.capacity = 0;        // maximum number of sprites in array
	this.vdata_pos = null;    // position array
	this.vdata_color = null;  // color array
	this.voff_pos = 0;        // offset of position data in buffer
	this.voff_color = 0;      // offset of color data in buffer
	this.vdirty = true;       // whether vertex data has changed
	this.idirty = true;       // whether index data has changed
	this.vbuffer = null;      // GL array buffer
	this.ibuffer = null;      // GL element array buffer
}

/*
 * Draw the sprite layer to the screen.
 * gl: WebGL context
 */
Sprites.prototype.draw = function(gl) {
	var i;

	if (this.loadState !== STATE_LOADED) {
		if (this.loadState !== STATE_UNLOADED) {
			return;
		}
		this.loadState = STATE_FAILED;
		this.program = shader.loadProgram(gl, {
			vert: 'plain.vert',
			frag: 'plain.frag',
			attributes: 'Pos Color',
			uniforms: 'MVP',
		});
		if (!this.program) {
			return;
		}
		this.loadState = STATE_LOADED;
	}

	if (this.vdirty) {
		if (!this.vbuffer) {
			this.vbuffer = gl.createBuffer();
		}
		this.voff_pos = 0;
		this.voff_color = this.count * 16;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.count * 32, gl.DYNAMIC_DRAW);
		gl.bufferSubData(
			gl.ARRAY_BUFFER,
			this.voff_pos,
			this.vdata_pos.subarray(0, this.count * 8));
		gl.bufferSubData(
			gl.ARRAY_BUFFER,
			this.voff_color,
			this.vdata_color.subarray(0, this.count * 4));
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		this.vdirty = false;
	}

	if (this.idirty) {
		if (!this.ibuffer) {
			this.ibuffer = gl.createBuffer();
		}
		var capacity = this.capacity;
		var idata = new Uint16Array(capacity * 6);
		for (i = 0; i < capacity; i++) {
			idata.set([
				i*4+0, i*4+1, i*4+2,
				i*4+2, i*4+1, i*4+3,
			], i * 6);
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		this.idirty = false;
	}

	gl.useProgram(this.program.program);
	gl.uniformMatrix4fv(this.program.MVP, false, new Float32Array([
		2/800, 0, 0, 0,
		0, 2/450, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	]));
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.SHORT, false, 4, this.voff_pos);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 4, this.voff_color);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);

	gl.drawElements(gl.TRIANGLES, this.count * 6, gl.UNSIGNED_SHORT, 0);

	gl.disableVertexAttribArray(0);
	gl.disableVertexAttribArray(1);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.useProgram(null);
};

/*
 * Add sprites to the sprite layer.
 * arg.x: X coordinate
 * arg.y: Y coordinate
 */
Sprites.prototype.add = function() {
	var i;

	var count = this.count, new_count = count + arguments.length;
	if (new_count > this.capacity) {
		var new_capacity = Math.max(this.capacity, 32);
		while (new_count > new_capacity) {
			new_capacity *= 2;
		}
		var new_vdata_pos = new Int16Array(new_capacity * 8);
		if (this.vdata_pos) {
			new_vdata_pos.set(this.vdata_pos);
		}
		this.vdata_pos = new_vdata_pos;
		var new_vdata_color = new Uint32Array(new_capacity * 4);
		if (this.vdata_color) {
			new_vdata_color.set(this.vdata_color);
		}
		this.vdata_color = new_vdata_color;
		this.capacity = new_capacity;
		this.idirty = true;
	}

	for (i = 0; i < arguments.length; i++) {
		var x = arguments[i].x, y = arguments[i].y;
		var x0 = x - 16, x1 = x + 16, y0 = y - 16, y1 = y + 16;
		var color = 0x3399ccff;
		this.vdata_pos.set([x0, y0, x1, y0, x0, y1, x1, y1], i * 8);
		this.vdata_color.set([color, color, color, color], i * 4);
	}

	this.count = new_count;
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
