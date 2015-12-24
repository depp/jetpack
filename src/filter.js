/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var shader = require('./shader');

// Fullscreen quad
var FilterVData = new Float32Array([
		-1.0, -1.0, +3.0, -1.0, -1.0, +3.0,
]);

/*
 * Initialize the filter.
 */
function filterInit(r) {
	/*jshint validthis:true*/
	if (this.prog) {
		return;
	}
	var gl = r.gl;
	this.prog = shader.loadProgram(gl, {
		vert: 'fullscreen.vert',
		frag: this.shader + '.frag',
		attributes: 'Pos',
		uniforms: this.uniforms,
	});
	this._vbuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuf);
	gl.bufferData(gl.ARRAY_BUFFER, FilterVData, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

/*
 * Destroy the filter.
 */
function filterDestroy(r) {
	/*jshint validthis:true*/
	var gl = r.gl;
	if (this.prog) {
		this.prog.destroy();
		this.prog = null;
	}
	if (this._vbuf) {
		gl.deleteBuffer(this._vbuf);
		this._vbuf = null;
	}
}

/*
 * Render the filter.
 */
function filterRender(r) {
	/*jshint validthis:true*/
	var p = this.prog;
	if (!p) {
		return;
	}
	var gl = r.gl;

	gl.useProgram(p.program);
	this.updateUniforms(r);
	gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuf);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

	gl.drawArrays(gl.TRIANGLES, 0, 3);

	gl.disableVertexAttribArray(0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.useProgram(null);
}

/*
 * Create a fullscreen shader layer.
 *
 * Modifies the argument and returns it.
 *
 * Existing properties:
 * obj.shader: Fragment shader name, not including .frag extension
 * obj.uniforms: List of shader uniforms
 * obj.updateUniforms: Method to update program uniforms
 *
 * New properties:
 * obj.prog: Shader program (has uniform locations as attributes)
 * obj.init: Initialize filter
 * obj.destroy: Destroy filter
 * obj.render Render the filter
 */
function makeFilter(obj) {
	obj.prog = null;
	obj.init = filterInit;
	obj.destroy = filterDestroy;
	obj.render = filterRender;
	return obj;
}

module.exports = {
	makeFilter: makeFilter,
};
