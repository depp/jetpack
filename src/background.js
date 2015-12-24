/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var filter = require('./filter');
var param = require('./param');

function Background() {
	this._filter = null;
	this._pending = null;
}

/*
 * Set the background.
 */
Background.prototype._set = function(obj) {
	obj.offset = vec2.create();
	obj.pos = vec2.create();
	this._pending = filter.makeFilter(obj);
};

/*
 * Initialize the background.
 */
Background.prototype.init = function(r) {};

/*
 * Render the background.
 */
Background.prototype.render = function(r, camera) {
	if (this._pending) {
		if (this._filter) {
			this._filter.destroy(r);
			this._filter = null;
		}
		this._pending.init(r);
		this._filter = this._pending;
		this._pending = null;
	}
	var f = this._filter;
	if (f) {
		vec2.add(f.pos, camera.pos, f.offset);
		f.render(r);
	}
};

/*
 * Switch to the grid background.
 */
Background.prototype.setGrid = function() {
	this._set({
		shader: 'game_bg',
		uniforms: 'Xform Grid Color',
		updateUniforms: function(r) {
			var gl = r.gl, p = this.prog;
			var fovY = param.FovY, fovX = fovY * r.aspect;
			gl.uniform4fv(p.Xform, [
				fovX / r.width, fovY / r.height,
				this.pos[0] - fovX * 0.5, this.pos[1] - fovY * 0.5,
			]);
			gl.uniform2fv(p.Grid, [
				0.1, 1 / 4,
			]);
			gl.uniform4fv(p.Color, [
				0.15, 0.15, 0.15, 1.0,
				0.1, 0.1, 0.3, 1.0,
			]);
		},
	});
};

Background.prototype.setBoxes = function() {
	var scale = [5, 4, 3, 2];
	var parallax = [0.2, 0.4, 0.6, 0.8];
	var n = 4;
	var layer = new Float32Array(n * 4);
	for (var i = 0; i < n; i++) {
		var a = Math.random() * 2 * Math.PI, s = scale[i];
		layer[i*4+0] = (Math.random() - 0.5) * 64;
		layer[i*4+1] = (Math.random() - 0.5) * 64;
		layer[i*4+2] = scale[i];
		layer[i*4+3] = parallax[i];
	}
	var lc = new Float32Array([
		0.0, 0.0, 1.0, 0.5,
		0.0, 1.0, 0.0, 0.5,
		1.0, 1.0, 0.0, 0.5,
		1.0, 0.0, 0.0, 0.5,
	]);
	this._set({
		shader: 'boxbg',
		uniforms: 'Xform Time Layer Color Offset',
		updateUniforms: function(r) {
			var gl = r.gl, p = this.prog;
			gl.uniform4fv(p.Xform, [
				2 * r.aspect / r.width, 2 / r.height, -r.aspect, -1]);
			gl.uniform1f(p.Time, r.time * 1e-3 * 0.25);
			gl.uniform4fv(p.Layer, layer);
			gl.uniform4fv(p.Color, lc);
			var sc = 0.1;
			gl.uniform2f(p.Offset, this.pos[0] * sc, this.pos[1] * sc);
		},
	});
};

// Add an offset to the background
Background.prototype.addOffset = function(offset) {
	if (!this._filter) {
		return;
	}
	vec2.subtract(this._filter.offset, this._filter.offset, offset);
};

module.exports = new Background();
