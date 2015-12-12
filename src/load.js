/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

/*
 * Asset loading and loading screen.
 */

var shader = require('./shader');
var state = require('./state');

/*
 * Loading screen.
 */
function Load() {
	this.bgProg = null;
	this.vbuf = null;
}

/*
 * Initialize the screen.
 */
Load.prototype.init = function(curTime, gl) {
	this.bgProg = shader.loadProgram(gl, {
		vert: 'fullscreen.vert',
		frag: 'loading_bg.frag',
		attributes: 'Pos',
		uniforms: 'Scale Color Wave InvRadius',
	});
	var vdata = new Float32Array([
		// Fullscreen quad
		-1.0, -1.0, +3.0, -1.0, -1.0, +3.0,
	]);
	this.vbuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
	gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

/*
 * Destroy the screen.
 */
Load.prototype.deactivate = function(gl) {};

/*
 * Render the loading screen.
 */
Load.prototype.render = function(curTime, gl, width, height, aspect) {
	gl.viewport(0, 0, width, height);

	var p = this.bgProg;
	if (p) {
		var t = curTime * 1e-3;
		gl.useProgram(p.program);
		gl.uniform2fv(
			p.Scale,
			aspect >= 1.0 ? [aspect, 1.0] : [1.0, 1.0 / aspect]);
		gl.uniform4fv(p.Color, [
			4.0, 2.0, 1.0, 1.0,
			1.0, 2.0, 4.0, 1.0,
		]);
		gl.uniform4fv(p.Wave, [
			1, (t * 3.0) % (Math.PI * 2.0), 0.25, 1.0,
			3, (t * -0.5) % (Math.PI * 2.0), 0.75, 3.0,
		]);
		gl.uniform1fv(p.InvRadius, [
			(1 + 0.1 * Math.sin(t * 0.6)) * 1.8,
			(1 + 0.1 * Math.sin(t * 0.6 + 0.5)) * 2.2,
		]);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

		gl.drawArrays(gl.TRIANGLES, 0, 3);

		gl.disableVertexAttribArray(0);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.useProgram(null);
	}
};

// We export through the state module.
state.Load = Load;
