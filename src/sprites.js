/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var shader = require('./shader');

/*
 * Sprite layer.
 */
function Sprites() {
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
 * Initialize the sprite layer.
 */
Sprites.prototype.init = function(r) {
	if (this.program) {
		return;
	}
	this.program = shader.loadProgram(r.gl, {
		vert: 'plain.vert',
		frag: 'plain.frag',
		attributes: 'Pos Color',
		uniforms: 'MVP',
	});
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
		this.voff_pos = 0;
		this.voff_color = this.count * 32;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.count * 48, gl.DYNAMIC_DRAW);
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
	gl.uniformMatrix4fv(this.program.MVP, false, camera.MVP);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, this.voff_pos);
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
 * arg.radius: Radius
 * arg.color: Color to use
 */
Sprites.prototype.add = function() {
	var i;

	var count = this.count, new_count = count + arguments.length;
	if (new_count > this.capacity) {
		var new_capacity = Math.max(this.capacity, 32);
		while (new_count > new_capacity) {
			new_capacity *= 2;
		}
		var new_vdata_pos = new Float32Array(new_capacity * 8);
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
		var arg = arguments[i];
		var r = arg.radius;
		var x = arg.x, y = arg.y;
		var x0 = x - r, x1 = x + r, y0 = y - r, y1 = y + r;
		var color = arg.color | 0;
		color =
			((color >> 24) & 0x000000ff) |
			((color >>  8) & 0x0000ff00) |
			((color <<  8) & 0x00ff0000) |
			((color << 24) & 0xff000000);
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
