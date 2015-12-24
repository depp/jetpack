/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec4 = glm.vec4;

var color = require('./color');
var param = require('./param');
var physics = require('./physics');
var tiles = require('./tiles');
var util = require('./util');

function initShape(s) {
	s.collisionGroup = physics.Mask.World;
	s.collisionMask = physics.Mask.Player | physics.Mask.Enemy;
	s.material = physics.Material.World;
}

var Colors = {
	Buffer: {
		Floor: color.rgb(0.2, 0.2, 0.2),
		Ceiling: color.rgb(0.8, 0.8, 0.8),
	},
	Open: {
		Floor: color.rgb(0.2, 0.6, 0.2),
		Ceiling: color.rgb(0.6, 1.0, 0.6),
	},
	Medium: {
		Floor: color.rgb(0.6, 0.5, 0.2),
		Ceiling: color.rgb(1.0, 0.9, 0.5),
	},
	Closed: {
		Floor: color.rgb(0.6, 0.1, 0.2),
		Ceiling: color.rgb(1.0, 0.5, 0.5),
	},
};

/*
 * Block: either a floor or a ceiling.
 */
function Border(x0, x1, y, isCeiling, isBuffer) {
	this.x0 = x0;
	this.x1 = x1;
	this.y = y;
	this.y0 = y;
	this.y1 = y;
	this.isCeiling = isCeiling;
	this.isBuffer = !!isBuffer;
}

function emitBody(world, x0, x1, y0, y1) {
	var shape = new p2.Box({
		width: x1 - x0,
		height: y1 - y0,
	});
	initShape(shape);
	var body = new p2.Body({
		position: [(x0 + x1) * 0.5, (y0 + y1) * 0.5],
	});
	body.addShape(shape);
	world.addBody(body);
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
	if (y0 < y1) {
		return;
	}
	emitBody(world, x0, x1, y0, y1);
};

function tweakColor(out, x) {
	color.tintShade(
		out, x,
		Math.random() * 0.2, Math.random() * 0.2);
}

/*
 * Emit the border tile graphics.
 */
Border.prototype.emitTiles = function(baseColor) {
	var remW = Math.floor((1 + this.x1 - this.x0) * 0.5);
	var x = this.x0, y = this.y, dirY = this.isCeiling ? +1 : -1;
	if (this.isBuffer) {
		tiles.add([{
			x: x + remW,
			y: y + dirY,
			w: remW * 2,
			h: 2,
			color: this.isCeiling ? Colors.Buffer.Ceiling : Colors.Buffer.Floor,
		}]);
		return;
	}
	var state = Math.random() < 0.5 || remW <= 5;
	var newTiles = [];
	while (remW > 0) {
		var tw = 0, th = 1;
		if (!newTiles.length) {
			tw = 1;
			th = Math.max(th, Math.floor(dirY * (this.y0 - this.y) * 0.5 + 1));
		}
		if (remW <= 1) {
			tw = 1;
			th = Math.max(th, Math.floor(dirY * (this.y1 - this.y) * 0.5 + 1));
		}
		if (tw === 0) {
			th = 0;
			if (state) {
				tw = util.randInt(3, 5);
				state = false;
			} else {
				tw = util.randInt(5, 10);
				state = true;
			}
			if (tw >= remW - 1) {
				tw = remW - 1;
			} else if (tw >= remW - 3) {
				if (tw < 5) {
					tw = remW - 1;
				} else {
					tw -= 3;
				}
			}
		}
		th = Math.max(th, 24);
		remW -= tw;
		var tileColor = vec4.create();
		tweakColor(tileColor, baseColor);
		newTiles.push({
			x: x + tw,
			y: y + th * dirY,
			w: tw * 2,
			h: th * 2,
			color: tileColor,
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
	var y1 = level.MaxGap * 0.5, y0 = -y1;
	this.x0 = x0;
	this.x1 = x0;
	this.floor = { x: x0, y: y0, items: [] };
	this.ceiling = { x: x0, y: y1, items: [] };
	this.colors = null;
	this.blocks = [];
}

Segment.prototype.addBlock = function(x0, x1, y0, y1) {
	this.blocks.push({x0: x0, x1: x1, y0: y0, y1: y1});
};

/*
 * Add a border to the segment.
 */
Segment.prototype.addBorder = function(y, x1, isCeiling, isBuffer) {
	if (typeof y != 'number' || !isFinite(y)) {
		throw new TypeError('invalid Y');
	}
	if (typeof x1 != 'number' || !isFinite(x1)) {
		throw new TypeError('invalid X1');
	}
	var b = isCeiling ? this.ceiling : this.floor;
	if (x1 < b.x) {
		console.error('Bad border');
		return;
	}
	if (b.items.length > 1 && b.y == y && !isBuffer) {
		b.items[b.items.length - 1].x1 = x1;
	} else {
		b.items.push(new Border(b.x, x1, y, isCeiling, isBuffer));
	}
	b.x = x1;
	b.y = y;
	this.x1 = Math.max(x1, this.x1);
};

/*
 * Extend borders to the given X position.
 */
Segment.prototype.extendBorders = function(x) {
	if (this.floor.x < x) {
		this.addBorder(this.floor.y, x, false);
	}
	if (this.ceiling.x < x) {
		this.addBorder(this.ceiling.y, x, true);
	}
};

/*
 * Add borders at different heights.
 */
Segment.prototype.addVaryingBorders = function() {
	var level = param.Level;
	var r;

	var x = this.x1;
	this.extendBorders(x);
	// Ways to vary the floor and ceiling
	var SHRINK = 0, GROW = 1, MOVE_UP = 2, MOVE_DOWN = 3;
	// Range of gaps
	var minH = level.MinGap, maxH = level.MaxGap;
	// Current floor and ceiling
	var initY0 = this.floor.y, initY1 = this.ceiling.y;
	var initH = initY1 - initY0;
	// Current state and target state
	var gap0 = (initH - minH) / (maxH - minH), type, gap1;
	if (gap0 > 0.75) {
		type = SHRINK;
	} else if (gap0 < 0.25) {
		type = GROW;
	} else {
		r = Math.random();
		if (r < 0.5) {
			type = gap0 > 0.5 ? SHRINK : GROW;
		} else {
			if (y0 < -30) {
				type = MOVE_UP;
			} else if (y1 > 30) {
				type = MOVE_DOWN;
			} else {
				type = r < 0.25 ? MOVE_UP : MOVE_DOWN;
			}
		}
	}
	switch (type) {
	case SHRINK:
		gap1 = gap0 - 0.25 - 0.75 * Math.random();
		break;
	case GROW:
		gap1 = gap0 + 0.25 + 0.75 * Math.random();
		break;
	default:
		gap1 = gap0 + Math.random() - 0.5;
		gap1 = Math.min(0.75, Math.max(0.25, gap1));
		break;
	}
	var targetH = Math.round(minH + gap1 * (maxH - minH));
	targetH = Math.min(maxH, Math.max(minH, targetH));
	var deltaH = Math.abs(targetH - initH);
	var stepW, off, targetY0, targetY1, deltaY, length;
	var y0 = initY0, y1 = initY1, newY1, newY0, x0 = x, x1 = x, h, i;
	var lockY0 = false, lockY1 = false;

	if (type == SHRINK || type == GROW) {
		if (true || Math.random() < 0.5) {
			// console.log((type == SHRINK ? 'SHRINK' : 'GROW') + ' SUDDEN');
			// Sudden changes
			r = Math.random();
			if (r < 0.3) {
				// Offset floor and ceiling
				x += 2;
				if (r < 0.15) {
					this.addBorder(y0, x, false);
				} else {
					this.addBorder(y1, x, true);
				}
			}
			r = Math.random();
			if (r < 0.8) {
				off = util.randInt(0, deltaH);
			} else if (r < 0.9) {
				off = 0;
			} else {
				off = deltaH;
			}
			if (type == SHRINK) {
				y0 += off;
				y1 -= deltaH - off;
				x += util.randInt(3, 5) * 2;
			} else {
				y0 -= off;
				y1 += deltaH - off;
				x += util.randInt(12, 20) * 2;
			}
			this.addBorder(y0, x, false);
			this.addBorder(y1, x, true);
			return x;
		} else {
			// Gradual changes
			// console.log((type == SHRINK ? 'SHRINK' : 'GROW') + ' GRADUAL');
			if (Math.random() < 0.5) {
				targetY0 = initY0;
				lockY0 = true;
			} else {
				targetY1 = initY1;
				lockY1 = true;
			}
			length = Math.round(deltaH * (0.25 + 0.25 * Math.random()));
			length = Math.max(1, length);
		}
	} else {
		// console.log('MOVE ' + (type == MOVE_UP ? 'UP' : 'DOWN'));
		off = util.randInt(0, deltaH);
		length = util.randInt(1, 5);
		deltaY = Math.round(length * (1 + Math.random()));
		if (type == MOVE_UP) {
			targetY0 = initY0 + deltaY;
			targetY1 = initY1 + deltaY;
		} else {
			targetY0 = initY0 - deltaY;
			targetY1 = initY1 - deltaY;
		}
		off = util.randInt(0, deltaH);
		if (initH < targetH) {
			targetY0 -= off;
			targetY1 += deltaH - off;
		} else {
			targetY0 += off;
			targetY1 -= deltaH - off;
		}
	}

	/*
	console.log(
		'Move: [' + initY0 + ',' + initY1 + '] -> [' +
			targetY0 + ',' + targetY1 + '], steps = ' + length);
	*/
	stepW = util.randInt(5, 7) * 2;
	for (i = 0; i < length; i++) {
		// Choose step X position
		x += stepW;
		x0 = x + util.randInt(-1, +1) * 2;
		x1 = x + util.randInt(-1, +1) * 2;
		// Choose target Y positions
		if (i < length - 1) {
			newY0 = Math.round(
				initY0 + ((i + 1) / length) * (targetY0 - initY0)) +
				util.randInt(-1, +1);
			newY1 = Math.round(
				initY0 + ((i + 1) / length) * (targetY1 - initY1)) +
				util.randInt(-1, 1);
		} else {
			newY0 = targetY0;
			newY1 = targetY1;
		}
		// Ensure minimum gap
		var maxY0 = Math.max(y0, newY0), minY1 = Math.min(y1, newY1);
		if (minY1 - newY0 < minH) {
			newY0 = minY1 - minH;
		}
		if (newY1 - maxY0 < minH) {
			newY1 = maxY0 + minH;
		}
		// Limit to maximum size
		if (newY1 - newY0 > maxH) {
			// Reduce in the direction we're moving
			if (newY0 + newY1 > y0 + y1) {
				newY1 = newY0 + maxH;
			} else {
				newY0 = newY1 - maxH;
			}
		}
		y0 = newY0;
		y1 = newY1;
		this.addBorder(y0, x0, false);
		this.addBorder(y1, x1, true);
	}
	return Math.max(x0, x1);
};

/*
 * Fill in border neighbor heights.
 */
function getNeighborHeights(its) {
	if (!its.length) {
		return;
	}
	var it0, it1, i;
	it1 = its[0];
	it1.y0 = it1.y;
	for (i = 1; i < its.length; i++) {
		it0 = it1;
		it1 = its[i];
		it0.y1 = it1.y;
		it1.y0 = it0.y;
	}
	it1.y1 = it1.y;
}

/*
 * Get the height array of the border.
 */
function getHeightArray(its, x0, x1) {
	var a = new Int16Array(x1 - x0);
	var x = x0, y = 0, tx;
	for (var i = 0; i < its.length; i++) {
		tx = its[i].x1;
		y = its[i].y;
		while (x < tx) {
			a[x - x0] = y;
			x++;
		}
	}
	while (x < x1) {
		a[x - x0] = y;
		x++;
	}
	return a;
}

/*
 * Dilate the array with a 32-width kernel.
 */
function erodeArray(a) {
	var i, j, n;
	for (i = 0; i < 5; i++) {
		n = 1 << i;
		for (j = 0; j < a.length - n; j++) {
			a[j] = Math.min(a[j], a[j+n]);
		}
	}
}

/*
 * Dilate the array with a 32-width kernel.
 */
function dilateArray(a) {
	var i, j, n;
	for (i = 0; i < 5; i++) {
		n = 1 << i;
		for (j = 0; j < a.length - n; j++) {
			a[j] = Math.max(a[j], a[j+n]);
		}
	}
}

/*
 * Emit segment data.
 */
Segment.prototype.emit = function(game) {
	var world = game.world;

	var y, body, shape;

	getNeighborHeights(this.floor.items);
	getNeighborHeights(this.ceiling.items);

	y = _.min(this.floor.items, function(it) { return it.y; }).y;
	body = new p2.Body({
		position: [0, y],
	});
	shape = new p2.Plane();
	initShape(shape);
	body.addShape(shape);
	world.addBody(body);
	_.forEach(this.floor.items, function(it) { it.emitBody(world, y); });

	y = _.max(this.ceiling.items, function(it) { return it.y; }).y;
	body = new p2.Body({
		position: [0, y],
		angle: Math.PI,
	});
	shape = new p2.Plane();
	initShape(shape);
	body.addShape(shape);
	world.addBody(body);
	_.forEach(this.ceiling.items, function(it) { it.emitBody(world, y); });

	body = new p2.Body({ position: [this.x1, 0], angle: Math.PI * 0.5 });
	shape = new p2.Plane();
	initShape(shape);
	body.addShape(shape);
	world.addBody(body);

	body = new p2.Body({ position: [this.x0, 0], angle: Math.PI * 1.5 });
	shape = new p2.Plane();
	initShape(shape);
	body.addShape(shape);
	world.addBody(body);

	_.forEach(this.blocks, function(it) {
		emitBody(world, it.x0, it.x1, it.y0, it.y1);
	});

	tiles.clear();
	var color;
	color = this.colors.Floor;
	_.forEach(this.floor.items, function(it) { it.emitTiles(color); });
	color = this.colors.Ceiling;
	_.forEach(this.ceiling.items, function(it) { it.emitTiles(color); });
	color = vec4.create();
	vec4.lerp(color, this.colors.Floor, this.colors.Ceiling, 0.5);
	tiles.add(_.map(this.blocks, function(it) {
		var c = vec4.create();
		tweakColor(c, color);
		return {
			x: (it.x0 + it.x1) * 0.5,
			y: (it.y0 + it.y1) * 0.5,
			w: it.x1 - it.x0,
			h: it.y1 - it.y0,
			color: c
		};
	}, this));

	var x0 = this.x0, x1 = this.x1;
	var arr0 = getHeightArray(this.floor.items, x0, x1);
	var arr1 = getHeightArray(this.ceiling.items, x0, x1);
	erodeArray(arr0);
	dilateArray(arr1);
	var arr2 = new Int16Array(arr0.length);
	for (var i = 0; i < arr0.length; i++) {
		arr2[i] = Math.floor((arr0[i] + arr1[i]) * 0.5);
	}
	var ymin = _.min(arr0), ymax = _.max(arr2);
	if (ymin == ymax) {
		game.camera.setTrackY(x0, ymin);
	} else {
		game.camera.setTrackY(x0, arr2);
	}
};

function genPoints(x0, x1, dist, func, thisArg) {
	var n = Math.ceil(
		(x1 - x0 + dist * 0.5) / (dist * (0.8 + 0.3 * Math.random())));
	if (n < 1) {
		return;
	}
	for (var i = 0; i < n; i++) {
		func.call(thisArg, x0 + ((2 * i + 1) / (n * 2)) * (x1 - x0));
	}
}

function distribute(x0, y0, x1, y1, count, func, thisArg) {
	if (count <= 1) {
		if (count == 1) {
			func.call(thisArg, 0.5 * (x0 + x1), 0.5 * (y0 + y1));
		}
		return;
	}
	for (var i = 0; i < count; i++) {
		var x = x0 + (x1 - x0) * (i / (count - 1));
		var y = y0 + (y1 - y0) * (i / (count - 1));
		func.call(thisArg, x, y);
	}
}

var ItemWeights = new util.WeightedRandom()
		.add(1, 'Death')
		.add(1, 'Boost')
		.add(4, 'Weapon')
		.add(2, 'Weapon')
		.add(4, 'Shield')
		.add(6, 'Bonus');

function spawnItems(game, locs) {
	var itLocs = _.sample(locs, 2);
	var itTypes = ItemWeights.sample(itLocs.length);
	var n = Math.min(itLocs.length, itTypes.length);
	for (var i = 0; i < n; i++) {
		game.spawn('Item.' + itTypes[i], { position: itLocs[i] });
	}
}

/*
 * Generate "open" level geometry: no obstacles
 */
Segment.prototype.generateOpen = function(game) {
	var Types = ['Enemy.Glider', 'Enemy.Star', 'Enemy.Diamond'];
	var x0 = this.x1, x1 = x0 + util.randInt(150, 225) * 2, x;
	this.colors = Colors.Open;
	this.extendBorders(x1);

	// Generate monster groups
	var itemLocs = [];
	genPoints(x0, x1, 50, function(x) {
		var t;
		function spawn(x, y) { game.spawn(t, { position: [x, y] }); }
		t = _.sample(Types);
		distribute(
			x - 8, util.randInt(-12, +12),
			x + 8, util.randInt(-12, +12),
			util.randInt(3, 8),
			spawn, null);
		itemLocs.push([x, util.randInt(-12, +12)]);
	});
	spawnItems(game, itemLocs);
};

/*
 * Generate "open" level geometry: no obstacles
 */
Segment.prototype.generateMedium = function(game) {
	var Types = ['Enemy.Star', 'Enemy.Diamond'];

	var x0 = this.x1, x1 = x0 + util.randInt(150, 225) * 2;
	this.colors = Colors.Medium;
	this.extendBorders(x1);

	// Generate obstacles and turrets
	var doNotPlace = true;
	var itemLocs = [];
	genPoints(x0, x1, 50, function(x) {
		var w = util.randInt(4, 8), y0, y1, h;
		var x0 = x - w, x1 = x + w;
		var bi = util.randInt(1, 5);
		var surf = null, type;

		switch (bi) {
		default:
		case 1:
			// Empty
			y0 = -16;
			y1 = +16;
			x0 -= w * 2;
			x1 += w * 2;
			type = _.sample(Types);
			distribute(
				x0, 0,
				x1, 0,
				util.randInt(3, 5),
				function(x, y) { game.spawn(type, { position: [x, y] }); });
			itemLocs.push([
				util.randInt(x0, x1),
				Math.random() < 0.5 ? -12 : +12,
			]);
			break;
		case 2:
			// Island
			x0 -= w;
			x1 += w;
			h = util.randInt(4, 6);
			y0 = (util.randInt(4, 12 - h) - 8) * 2;
			y1 = y0 + h * 2;
			this.addBlock(x0, x1, y0, y1);
			itemLocs.push([
				util.randInt(x0, x1),
				Math.random() < 0.5 ? -12 : +12,
			]);
			break;
		case 3:
			y0 = util.randInt(0, 3) * 2;
			y1 = 16;
			this.addBlock(x0, x1, -16, y0);
			surf = y1;
			break;
		case 4:
			y0 = -16;
			y1 = util.randInt(-3, 0) * 2;
			this.addBlock(x0, x1, y1, 16);
			surf = y0;
			break;
		case 5:
			y0 = util.randInt(-6, -4) * 2;
			y1 = util.randInt(3, 6) * 2;
			this.addBlock(x0, x1, -16, y0);
			this.addBlock(x0, x1, y1, 16);
			surf = Math.random() < 0.5 ? y0 : y1;
			break;
		}

		if (surf !== null && !doNotPlace) {
			doNotPlace = true;
			type = Math.random() < 0.3 ? 'Enemy.Silo' : 'Enemy.Turret';
			var angle;
			if (surf == y0) {
				angle = 0;
				surf += 1;
			} else {
				angle = -Math.PI;
				surf -= 1;
			}
			distribute(
				x0 + 2, surf,
				x1 - 2, surf,
				Math.ceil((x1 - x0) / 6),
				function(x, y) {
					game.spawn(type, {
						position: [x, y],
						angle: angle,
					});
				});
		} else {
			doNotPlace = false;
		}
	}, this);

	spawnItems(game, itemLocs);
};

/*
 * Generate "closed" level geometry: twisty passages.
 */
Segment.prototype.generateClosed = function(game) {
	var x0 = this.x1, x1 = x0 + util.randInt(100, 125) * 2, x;
	this.colors = Colors.Closed;
	for (var j = 0; j < 100; j++) {
		x = this.addVaryingBorders();
		if (x >= x1) {
			break;
		}
	}
};

/*
 * Create a random level segment.
 */
function makeSegment(game) {
	var bufW = param.Level.BufferWidth, x = -128;
	var seg = new Segment(x);
	var y0 = seg.floor.y, y1 = seg.ceiling.y;
	var buffers = [[x + 0.5 * bufW, 0.5 * (y0 + y1)]];
	x += bufW;
	seg.addBorder(y0, x, false, true);
	seg.addBorder(y1, x, true, true);

	var type = util.randInt(0, 1);
	switch (type) {
	default:
	case 0: seg.generateOpen(game); break;
	case 1: seg.generateMedium(game); break;
	case 2: seg.generateClosed(game); break;
	}

	y0 = seg.floor.y;
	y1 = y0 + param.Level.MaxGap;
	x = seg.x1;
	seg.extendBorders(x);
	buffers.push([x + 0.5 * bufW, 0.5 * (y0 + y1)]);
	x += bufW;
	seg.addBorder(y0, x, false, true);
	seg.addBorder(y1, x, true, true);

	seg.emit(game);
	game.buffers = buffers;
}

module.exports = {
	makeSegment: makeSegment,
};
