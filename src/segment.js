/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var param = require('./param');
var physics = require('./physics');
var util = require('./util');

/*
 * Border: either a floor or a ceiling.
 */
function Border(x0, x1, y, isCeiling) {
	this.x0 = x0;
	this.x1 = x1;
	this.y = y;
	this.y0 = y;
	this.y1 = y;
	this.isCeiling = isCeiling;
}

/*
 * Emit the border collision bodies.
 *
 * yLimit: Minimum floor or maximum ceiling height
 */
Border.prototype.emitBody = function(world, yLimit) {
	var x0 = this.x0, x1 = this.x1, y0, y1;
	if (this.isCeiling) {
		y0 = this.y;
		y1 = yLimit;
	} else {
		y0 = yLimit;
		y1 = this.y;
	}
	if (y0 >= y1) {
		return;
	}
	var shape = new p2.Box({
		width: x1 - x0,
		height: y1 - y0,
	});
	shape.material = physics.Material.World;
	var body = new p2.Body({
		position: [(x0 + x1) * 0.5, (y0 + y1) * 0.5],
	});
	body.addShape(shape);
	world.addBody(body);
};

/*
 * Emit the border tile graphics.
 */
Border.prototype.emitTiles = function(tiles) {
	var remW = Math.floor((1 + this.x1 - this.x0) * 0.5);
	var state = Math.random() < 0.5 || remW <= 5;
	var x = this.x0, y = this.y, dirY = this.isCeiling ? +1 : -1;
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
			y: y + th * dirY,
			w: tw * 2,
			h: th * 2,
			color: color.rgb(Math.random(), Math.random(), Math.random()),
		});
		x += tw * 2;
	}
	tiles.add(newTiles);
};

/*
 * A segment of a level.
 */
function Segment(x0) {
	var level = param.Level;
	var y1 = level.Height * 0.5, y0 = -y1;
	this.x0 = x0;
	this.floor = {
		x: x0,
		y: y0,
		items: [new Border(x0 - level.Buffer, x0, y0, false)],
	};
	this.ceiling = {
		x: x0,
		y: level.Height * 0.5,
		items: [new Border(x0 - level.Buffer, x0, y1, true)],
	};
}

/*
 * Add a border to the segment.
 */
Segment.prototype.addBorder = function(y, x1, isCeiling) {
	var b = isCeiling ? this.ceiling : this.floor;
	if (x1 < b.x) {
		console.error('Bad border');
		return;
	}
	if (b.items.length > 1 && b.y == y) {
		b.items[b.items.length - 1].x1 = x1;
	} else {
		b.items.push(new Border(b.x, x1, y, isCeiling));
	}
	b.x = x1;
};

/*
 * Activate the segment.
 */
Segment.prototype.emit = function(game) {
	var world = game.world;

	var y, body, shape;

	y = _.min(this.floor.items, function(it) { return it.y; }).y;
	body = new p2.Body({
		position: [0, y],
	});
	shape = new p2.Plane();
	shape.material = physics.Material.World;
	body.addShape(shape);
	world.addBody(body);
	_.forEach(this.floor.items, function(it) { it.emitBody(world, y); });

	y = _.max(this.ceiling.items, function(it) { return it.y; }).y;
	body = new p2.Body({
		position: [0, y],
		angle: Math.PI,
	});
	shape = new p2.Plane();
	shape.material = physics.Material.World;
	body.addShape(shape);
	world.addBody(body);
	 _.forEach(this.ceiling.items, function(it) { it.emitBody(world, y); });

	var tiles = game.tiles;
	tiles.clear();
	_.forEach(this.floor.items, function(it) { it.emitTiles(tiles); });
	_.forEach(this.ceiling.items, function(it) { it.emitTiles(tiles); });
};

function makeSegment() {
	var seg = new Segment(0);
	var y0 = seg.floor.y, y1 = seg.ceiling.y;
	var x = 0;
	for (var i = 0; i < 10; i++) {
		x += 32;
		seg.addBorder(y0, x, false);
		seg.addBorder(y1, x, true);
		y0 += 1;
		y1 -= 1;
	}
	return seg;
}

module.exports = {
	makeSegment: makeSegment,
};
