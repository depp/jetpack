/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var param = require('./param');
var glm = require('gl-matrix');
var vec2 = glm.vec2;
var mat4 = glm.mat4;

/**********************************************************************/

/*
 * Target position calculator.
 */
function Tracker() {
	this.targets = [];
	this.lockX = false;
	this.lockY = false;
	this.pos = [0, 0];
	this.offset = [0, 0];
	this.leading = 0;
}

/*
 * Set the camera tracking parameters.
 *
 * arg.target: Target to track
 * arg.targets: Targets to track
 * arg.targetX: Locked X position
 * arg.targetY: Locked Y position
 * arg.offsetX: X offset from tracked targets
 * arg.offsetY: Y offset from tracked targets
 * leading: How much to lead the targets
 */
Tracker.prototype.set = function(arg, leading) {
	var newTargets = null;
	if (arg.hasOwnProperty('target')) {
		if (!newTargets) {
			newTargets = [];
		}
		newTargets.push(arg.target);
	}
	if (arg.hasOwnProperty('targets')) {
		if (!newTargets) {
			newTargets = [];
		}
		newTargets.push.apply(newTargets, arg.targets);
	}
	if (newTargets) {
		this.targets = newTargets;
	}

	if (arg.hasOwnProperty('targetX')) {
		if (arg.targetX !== null) {
			this.lockX = true;
			this.pos[0] = arg.targetX;
		} else {
			this.lockX = false;
		}
	}

	if (arg.hasOwnProperty('targetY')) {
		if (arg.targetY !== null) {
			this.lockY = true;
			this.pos[1] = arg.targetY;
		} else {
			this.lockY = false;
		}
	}

	if (arg.hasOwnProperty('offsetX')) {
		this.offset[0] = arg.offsetX;
	}

	if (arg.hasOwnProperty('offsetY')) {
		this.offset[1] = arg.offsetY;
	}

	this.leading = leading;
};

/*
 * Update the target position.
 */
Tracker.prototype.update = function() {
	if (!this.targets.length) {
		return;
	}
	var x = 0, y = 0, t = this.targets, p, v, lead = this.leading;
	for (var i = 0; i < t.length; i++) {
		p = t[i].position;
		v = t[i].velocity;
		x += p[0] + v[0] * lead;
		y += p[1] + v[1] * lead;
	}
	var a = 1.0 / t.length;
	if(!this.lockX) {
		this.pos[0] = x * a + this.offset[0];
	}
	if (!this.lockY) {
		this.pos[1] = y * a + this.offset[1];
	}
};

/**********************************************************************/

/*
 * Smoothing filter for 2D vectors.
 *
 * pos: Initial value
 */
function Filter(order, time) {
	this.order = order;
	this.data = new Float64Array(order * 2);
	this.coeff = Math.pow(time, 1 / param.Rate);
	this.pos = new Float64Array(2);
	// Extra leading needed to compensate for the filter
	this.leading = this.order * this.coeff / ((1 - this.coeff) * param.Rate);
}

/*
 * Set the current filter value, erasing any history.
 *
 * inPos: The new input and output value
 */
Filter.prototype.reset = function(inPos) {
	var order = this.order;
	for (var i = 0; i < this.order; i++) {
		this.data.set(inPos, i * 2);
	}
};

/*
 * Update the filtered position.
 *
 * inPos: The input vector to filter
 */
Filter.prototype.update = function(inPos) {
	var x = inPos[0], y = inPos[1], x0, y0;
	var coeff = this.coeff, n = this.order;
	for (var i = 0; i < n; i++) {
		x0 = this.data[i*2+0];
		y0 = this.data[i*2+1];
		x = x * (1 - coeff) + x0 * coeff;
		y = y * (1 - coeff) + y0 * coeff;
		this.data[i*2+0] = x;
		this.data[i*2+1] = y;
	}
	this.pos[0] = x;
	this.pos[1] = y;
};

/**********************************************************************/

/*
 * Camera which tracks targets.
 *
 * arg.target: Target to track
 * arg.targets: Targets to track
 * arg.targetX: Locked X position
 * arg.targetY: Locked Y position
 * arg.offsetX: X offset from tracked targets
 * arg.offsetY: Y offset from tracked targets
 */
function Camera(arg) {
	var p = param.Camera;
	// How much to lead the objects
	this._leading = 0;
	// Object tracking
	this._track = new Tracker();
	// Position filter
	this._filter = new Filter(p.FilterOrder, p.FilterTime);
	// Position interpolation, previous and current frame
	this._pos0 = vec2.create();
	this._pos1 = vec2.create();
	// Model view projection matrix
	this._translate = glm.vec3.create();
	this._proj = mat4.create();
	this._proj[0] = 2/64;
	this._proj[5] = 2/36;
	this._mvp = mat4.create();

	// Public results
	this.MVP = null;
	this.pos = vec2.create();

	if (arg) {
		this.set(arg);
		this.reset();
	}
}

/*
 * Reset the camera, clearing the filter history.
 */
Camera.prototype.reset = function() {
	this._track.update();
	this._filter.reset(this._track.pos);
	vec2.copy(this._pos0, this._filter.pos);
	vec2.copy(this._pos1, this._pos0);
};

/*
 * Advance the camera state one frame.
 */
Camera.prototype.step = function() {
	vec2.copy(this._pos0, this._pos1);
	this._track.update();
	this._filter.update(this._track.pos);
	vec2.copy(this._pos1, this._filter.pos);
};

/*
 * Set the camera tracking parameters.
 *
 * arg.target: Target to track
 * arg.targets: Targets to track
 * arg.targetX: Locked X position
 * arg.targetY: Locked Y position
 * arg.offsetX: X offset from tracked targets
 * arg.offsetY: Y offset from tracked targets
 */
Camera.prototype.set = function(arg) {
	if (arg.hasOwnProperty('leading')) {
		this._leading = arg.leading;
	}
	this._track.set(arg, this._leading + this._filter.leading);
};

/*
 * Get the model view projection matrix.
 */
Camera.prototype.update = function(frac) {
	vec2.lerp(this.pos, this._pos0, this._pos1, frac);
	vec2.negate(this._translate, this.pos);
	mat4.translate(this._mvp, this._proj, this._translate);
	this.MVP = this._mvp;
};

module.exports = {
	Camera: Camera,
};
