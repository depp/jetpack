/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec4 = glm.vec4;

/*
 * Convert floating-point to normalized uint8.
 */
function u8(x) {
	var y = Math.floor(x * 256);
	if (y >= 0) {
		if (y < 256) {
			return y;
		} else {
			return 255;
		}
	} else {
		return 0;
	}
}

/*
 * Create an RGB color vector.
 */
function rgb(r, g, b) {
	return vec4.fromValues(r, g, b, 1);
}

/*
 * Create an RGBA color vector.
 */
function rgba(r, g, b, a) {
	return vec4.fromValues(r, g, b, a);
}

/*
 * Convert a hexadecimal value to a color vector.
 */
function hex(x) {
	var s = 1 / 255;
	return vec4.fromValues(
		s * ((x >> 16) & 0xff),
		s * ((x >> 8) & 0xff),
		s * (x & 0xff),
		1);
}

/*
 * Convert a color to a packed uint32.
 */
function toU32(color) {
	/* FIXME: broken on big endian */
	return (u8(color[3]) << 24) | (u8(color[2]) << 16) |
		(u8(color[1]) <<  8) | u8(color[0]);
}

/*
 * Tint a color towards white by the given amount, 0-1.
 */
function tint(out, color, amount) {
	var i, a = color[3];
	for (i = 0; i < 3; i++) {
		out[i] = (1 - amount) * color[i] + amount;
	}
	out[3] = a;
}

/*
 * Shade a color towards black by the given amount, 0-1.
 */
function shade(out, color, amount) {
	var i, a = color[3];
	for (i = 0; i < 3; i++) {
		out[i] = color[i] * amount;
	}
	out[3] = a;
}

/*
 * Tint and shade a color.
 */
function tintShade(out, color, tint, shade) {
	var rem = 1 - tint - shade;
	if (tint + shade > 1) {
		var s = 1 / (tint + shade);
		tint *= s;
		shade *= s;
		rem = 0;
	}
	var i, a = color[3];
	for (i = 0; i < 3; i++) {
		out[i] = color[i] * rem + tint;
	}
	out[3] = a;
}

module.exports = {
	rgb: rgb,
	rgba: rgba,
	hex: hex,
	toU32: toU32,
	tint: tint,
	shade: shade,
	tintShade: tintShade,

	White: rgb(1, 1, 1),
	Gray: rgb(0.5, 0.5, 0.5),
	Black: rgb(0, 0, 0),
};
