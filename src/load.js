/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

/*
 * Asset loading and loading screen.
 */

var filter = require('./filter');
var state = require('./state');

/*
 * Loading screen.
 */
function Load() {
	this._bg = new filter.Filter({
		shader: 'loading_bg',
		uniforms: 'Scale Offset Color Wave InvRadius',
		func: this._bgUniforms,
		target: this,
	});
	this._startTime = -1;
}

/*
 * Initialize the screen.
 */
Load.prototype.init = function(r) {
	this._bg.init(r);
	this._startTime = r.time;
};

/*
 * Destroy the screen.
 */
Load.prototype.destroy = function(r) {
	this._bg.destroy(r);
};

/*
 * Render the loading screen.
 */
Load.prototype.render = function(r) {
	if (r.time >= this._startTime + 100) {
		state.set(new state.Game());
	}

	this._bg.render(r);
};

/*
 * Update the uniforms for the background.
 */
Load.prototype._bgUniforms = function(r, p) {
	var gl = r.gl;
	var t = r.time * 1e-3;

	var a;
	if (r.aspect >= 1) {
		a = r.aspect;
		gl.uniform2fv(p.Scale, [2 * a / r.width, 2 / r.height]);
		gl.uniform2fv(p.Offset, [-a, -1]);
	} else {
		a = 1 / r.aspect;
		gl.uniform2fv(p.Scale, [2 / r.width, 2 * a / r.height]);
		gl.uniform2fv(p.Offset, [-1, -a]);
	}
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
};

// We export through the state module.
state.Load = Load;
