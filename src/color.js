/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

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

/* FIXME: broken on big endian */

/*
 * Convert floating-point RGBA to packed RGB value.
 */
function rgba(r, g, b, a) {
	return (u8(a) << 24) | (u8(b) << 16) | (u8(g) <<  8) | u8(r);
}

/*
 * Convert floating-point RGBA to packed RGB value.
 */
function rgb(r, g, b) {
	return 0xff000000 | (u8(b) << 16) | (u8(g) <<  8) | u8(r);
}

/*
 * Convert hex to the a packed RGB value.
 */
function hex(x) {
	return 0xff000000 |
		((x << 16) & 0x00ff0000) |
		(x & 0x0000ff00) |
		((x >> 16) & 0x000000ff);
}

module.exports = {
	rgba: rgba,
	rgb: rgb,
	hex: hex,
};
