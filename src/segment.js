/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');

/*
 * A segment of a level.
 */
function Segment() {
	this.length = 1000;
}

/*
 * Activate the segment.
 */
Segment.prototype.activate = function(game) {
	game.tiles.clear();
	for (var i = 0; i < 10; i++) {
		game.tiles.add({
			x: Math.random() * 60 - 30,
			y: Math.random() * 20 - 10,
			w: 2 * (1 + Math.floor(Math.random() * 5)),
			h: 2 * (1 + Math.floor(Math.random() * 2)),
			color: color.rgb(0, 0.5, 0),
		});
	}
};

module.exports = {
	Segment: Segment,
};
