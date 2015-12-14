/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;
var vec3 = glm.vec3;
var vec4 = glm.vec4;

var MaxGlobal = 4;
var MaxLocal = 4;
var MaxLights = MaxGlobal + MaxLocal;

function Lights() {
	this.colors = new Float32Array(MaxLights * 4);
	this.locs = new Float32Array(MaxLights * 4);
	this._global = 0;
	this._local = [];
}

/*
 * Clear all lights.
 */
Lights.prototype.clear = function() {
	this._global = 0;
	this._local = [];
	this.colors.fill(0);
	this.locs.fill(0);
};

/*
 * Clear all local lights.
 */
Lights.prototype.clearLocal = function() {
	this._local = [];
};

/*
 * Add a local light.
 *
 * obj.color: vec4 (alpha is ignored)
 * obj.intensity: float
 * obj.position: vec2
 * obj.height: float
 */
Lights.prototype.addLocal = function(obj) {
	if (!obj.color || obj.color.length !== 4 ||
			!obj.position || obj.position.length !== 2) {
		throw new TypeError('Bad local light');
	}
	this._local.push(obj);
};

/*
 * Add global lights.
 *
 * obj.color: vec4 (alpha is ignored)
 * obj.intensity: float
 * obj.direction: vec3
 */
Lights.prototype.addGlobal = function(arr) {
	var j = 0, i = this._global;
	var n = Math.min(arr.length, MaxGlobal - this._global);
	for (; j < n; j++, i++) {
		var obj = arr[j];
		if (!obj.color || obj.color.length !== 4 ||
				!obj.direction || obj.direction.length !== 3) {
			throw new TypeError('Bad global light');
		}
		vec4.scale(
			this.colors.subarray(i * 4, i * 4 + 4),
			obj.color, obj.intensity);
		this.colors[i * 4 + 3] = 0;
		vec3.normalize(
			this.locs.subarray(i * 4, i * 4 + 3),
			obj.direction);
		this.locs[i * 4 + 3] = 0;
	}
	this._global = i;
};

/*
 * Update the lighting info.
 */
Lights.prototype.update = function(camera) {
	var pos = camera.pos;
	var local = _.sortBy(this._local, function(it) {
		return -it.intensity / (vec2.dist(pos, it.position) + 10);
	});
	var i0, i = 0, n = Math.min(MaxLocal, local.length), j;
	var colors = this.colors;
	var locs = this.locs;
	for (; i < n; i++) {
		i0 = (MaxGlobal + i) * 4;
		var it = local[i];
		colors[i0+0] = it.color[0];
		colors[i0+1] = it.color[1];
		colors[i0+2] = it.color[2];
		colors[i0+3] = 1.0 / it.intensity;
		locs[i0+0] = it.position[0];
		locs[i0+1] = it.position[1];
		locs[i0+2] = it.height;
		locs[i0+3] = 0;
	}
	colors.fill(0, (MaxGlobal + n) * 4);
	locs.fill(0, (MaxGlobal + n) * 4);
};

module.exports = {
	Lights: Lights,
};
