/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var param = require('./param');
var util = require('./util');

/*
 * Emit the floor and ceiling tiles.
 *
 * tiles: The tiles layer
 * minX: The leftmost edge to generate
 * maxX: The right edge to generate
 * dirY: The vertical direction of tiles (ceiling +1, floor -1)
 * posY: The edge of the tile, vertically
 */
function emitBorder(tiles, minX, maxX, dirY, posY) {
	var newTiles = [];
	var x = minX, remW = Math.floor((1 + maxX - minX) * 0.5);
	while (remW > 0) {
		var tw = util.randInt(2, 10);
		remW -= tw;
		if (remW <= 1) {
			if (tw <= 4 || remW <= 0) {
				tw += remW;
				remW = 0;
			} else {
				tw -= 2;
				remW += 2;
			}
		}
		newTiles.push({
			x: x + tw,
			y: posY + dirY,
			w: tw * 2,
			h: 2,
			color: color.rgb(Math.random(), Math.random(), Math.random()),
		});
		x += tw * 2;
	}
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
	var height = param.LevelY;
	var floor = height * -0.5, ceiling = height * 0.5;
	emitBorder(game.tiles, -32, +32, -1, floor);
	emitBorder(game.tiles, -32, +32, +1, ceiling);
};

module.exports = {
	Segment: Segment,
};
