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
	var remW = Math.floor((1 + maxX - minX) * 0.5);
	var state = Math.random() < 0.5 || remW <= 5;
	var x = minX;
	var newTiles = [];
	while (remW > 0) {
		var tw, th;
		if (state) {
			tw = util.randInt(3, 5);
			th = 3;
			state = false;
		} else {
			tw = util.randInt(5, 10);
			th = 2;
			state = true;
		}
		if (tw >= remW) {
			tw = remW;
		} else if (tw >= remW - 2) {
			if (tw < 5) {
				tw = remW;
			} else {
				tw -= 2;
			}
		}
		remW -= tw;
		newTiles.push({
			x: x + tw,
			y: posY + th * dirY,
			w: tw * 2,
			h: th * 2,
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
	var height = param.LevelY * 0.5;
	var floor = height * -0.5, ceiling = height * 0.5;
	emitBorder(game.tiles, -32, +128, -1, floor);
	emitBorder(game.tiles, -32, +128, +1, ceiling);
};

module.exports = {
	Segment: Segment,
};
