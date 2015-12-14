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

module.exports = {
	genIndexArray: genIndexArray,
	randInt: randInt,
	randomInCircle: randomInCircle,
	randomInBody: randomInBody,
};
