/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var shader = require('./shader');

/*
 * Fullscreen shader layer.
 *
 * spec.shader: Fragment shader name (not including .frag extension)
 * uniforms: List of uniforms
 * func: Function to update uniforms (r, prog)
 * target: The 'this' argument for the function
 */
function Filter(spec) {
	this._progSpec = {
		vert: 'fullscreen.vert',
		frag: spec.shader + '.frag',
		attributes: 'Pos',
		uniforms: spec.uniforms,
	};
	this._prog = null;
	this._vbuf = null;
	this._func = spec.func;
	this._target = spec.target;
}

/*
 * Initialize the filter.
 */
Filter.prototype.init = function(r) {
	var gl = r.gl;
	this._prog = shader.loadProgram(gl, this._progSpec);
	var vdata = new Float32Array([
		// Fullscreen quad
		-1.0, -1.0, +3.0, -1.0, -1.0, +3.0,
	]);
	this._vbuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuf);
	gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

/*
 * Destroy the filter.
 */
Filter.prototype.destroy = function(r) {
	var gl = r.gl;
	if (this._prog) {
		gl.deleteProgram(this._prog.program);
	}
	if (this._vbuf) {
		gl.deleteBuffer(this._vbuf);
	}
};

/*
 * Render the filter.
 */
Filter.prototype.render = function(r) {
	var p = this._prog;
	if (!p) {
		return;
	}
	var gl = r.gl;

	gl.useProgram(p.program);
	this._func.call(this._target, r, p);
	gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuf);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

	gl.drawArrays(gl.TRIANGLES, 0, 3);

	gl.disableVertexAttribArray(0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.useProgram(null);
};

module.exports = {
	Filter: Filter,
};
