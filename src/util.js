/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

/*
 * Utility functions.
 *
 * Includes a wrapper which allows you to use console.log and friends.
 */

if (!window.console) {
	window.console = {};
}
var con = window.console;

function dummy() {}

if (!con.log) {
	con.log = dummy;
}

if (!con.debug) { con.debug = con.log; }
if (!con.info) { con.info = con.log; }
if (!con.warn) { con.warn = con.log; }
if (!con.error)  {con.error = con.log; }

/*
 * Generate indexes for drawing quads.
 *
 * n: The number of quads
 */
function genIndexArray(n) {
	var a = new Uint16Array(n * 6), i;
	for (i = 0; i < n; i++) {
		a.set([
			i*4+0, i*4+1, i*4+2,
			i*4+2, i*4+1, i*4+3,
		], i * 6);
	}
	return a;
}

/*
 * Generate a random integer in an inclusive range.
 */
function randInt(min, max) {
	return min + Math.floor(Math.random() * (1 + max - min));
}

/*
 * Create a random vector selected uniformly from a circle.
 *
 * radius: default 1
 * center: default origin
 */
function randomInCircle(vec, radius, center) {
	var x, y;
	do {
		x = 2 * Math.random() - 1;
		y = 2 * Math.random() - 1;
	} while (x * x + y * y > 1);
	if (typeof radius != 'undefined') {
		x *= radius;
		y *= radius;
	}
	if (typeof center != 'undefined') {
		x += center[0];
		y += center[1];
	}
	vec[0] = x;
	vec[1] = y;
}

/*
 * Create a random vector in the bounding radius of a body.
 */
function randomInBody(vec, body, scale) {
	var radius = body.boundingRadius;
	if (typeof scale != 'undefined') {
		radius *= scale;
	}
	randomInCircle(vec, radius, body.position);
}

function WeightedRandom() {
	this._weight = 0;
	this._items = [];
}

WeightedRandom.prototype.add = function(weight, item) {
	if (isNaN(weight)) {
		throw new TypeError('Invalid weight');
	}
	if (weight <= 0) {
		return;
	}
	this._weight += weight;
	this._items.push({ item: item, weight: weight, mark: false });
	return this;
};

WeightedRandom.prototype.choose = function() {
	if (this._items.length <= 1) {
		return this._items.length === 0 ? null : 0;
	}
	var r = Math.random() * this._weight;
	for (var i = 0; i < this._items.length; i++) {
		r -= this._items[i].weight;
		if (r <= 0) {
			return this._items[i].item;
		}
	}
	return null;
};

WeightedRandom.prototype.sample = function(count) {
	var items = this._items, result = [];
	var i, j, r, w;
	if (items.length === 0) {
		return result;
	}
	if (count >= items.length) {
		for (i = 0; i < items.length; i++) {
			result.push(i);
		}
	} else {
		w = this._weight;
		for (j = 0; j < items.length; j++) {
			items[j].mark = false;
		}
		for (i = 0; i < count; i++) {
			r = Math.random() * w;
			var it;
			for (j = 0; j < items.length - 1; j++) {
				it = items[j];
				if (it.mark) {
					continue;
				}
				r -= it.weight;
				if (r <= 0) {
					break;
				}
			}
			it = items[j];
			w -= it.weight;
			it.mark = true;
			result.push(j);
		}
	}
	for (i = 1; i < result.length; i++) {
		r = Math.floor(Math.random() * items.length);
		if (r < i) {
			var t = result[i];
			result[i] = result[r];
			result[r] = t;
		}
	}
	for (i = 0; i < result.length; i++) {
		result[i] = items[result[i]].item;
	}
	return result;
};

function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = {
	genIndexArray: genIndexArray,
	randInt: randInt,
	randomInCircle: randomInCircle,
	randomInBody: randomInBody,
	WeightedRandom: WeightedRandom,
	numberWithCommas: numberWithCommas,
};
