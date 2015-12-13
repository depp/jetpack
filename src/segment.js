/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var param = require('./param');

function emitBorder(tiles, minX, maxX) {
	var yoff = param.LevelY * 0.5 + 1;
	var newTiles = [];
	for (var i = 0; i < 2; i++) {
		var isFloor = i === 0;
		var y = isFloor ? -yoff : yoff, x = minX;
		while (x < maxX) {
			var tw = 2 + Math.floor(Math.random() * 9);
			newTiles.push({
				x: x + tw,
				y: y,
				w: tw * 2,
				h: 2,
				color: color.rgb(Math.random(), Math.random(), Math.random()),
			});
			x += tw * 2;
		}
	}
	console.log(newTiles);
	tiles.add(newTiles);
}

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
	emitBorder(game.tiles, -32, +32);
};

module.exports = {
	Segment: Segment,
};
