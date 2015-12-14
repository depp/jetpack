/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var physics = require('./physics');

function Enemy() {}

/*
 * Emit the sprite for an enemy.
 */
Enemy.prototype.emitSprite = function(game, frac) {
	var pos = this.position;
	game.sprites.add({
		x: pos[0],
		y: pos[1],
		radius: 1.5,
		sprite: this.sprite,
		color: this.color,
	});
};

// Mapping from type names to types.
var Types = {
	Glider: {
		color: 0xDCE800,
	},
	Horiz: {
		color: 0x1C72FC,
	},
	Silo: {
		color: 0xA7A4B3,
	},
	Diamond: {
		color: 0x54EBB9,
	},
	Star: {
		color: 0xFFF8C4,
	},
	Ace: {
		color: 0xCB30FF,
	},
	Turret: {
		color: 0xAB8249,
	},
};

_.forOwn(Types, function(value, key) {
	var e = Object.create(Enemy.prototype);
	_.assign(e, value);
	e.color = color.hex(e.color);
	e.sprite = 'E' + key;
	Types[key] = e;
});

/*
 * Enemy manager.
 */
function Enemies() {
	this._enemies = [];
}

/*
 * Create an enemy spawn point.
 *
 * obj.x: X position
 * obj.y: Y position
 * obj.type: Enemy type
 */
Enemies.prototype.spawn = function(obj) {
	if (!Types.hasOwnProperty(obj.type)) {
		console.warn('No such enemy type: ' + obj.type);
		return;
	}
	var type = Types[obj.type];
	var e = Object.create(type);
	e.position = [obj.x, obj.y];
	this._enemies.push(e);
};

/*
 * Advance the simulation by one frame.
 */
Enemies.prototype.step = function(game) {

};

/*
 * Emit graphics data.
 */
Enemies.prototype.emit = function(game, frac) {
	var i, es = this._enemies;
	for (i = 0; i < es.length; i++) {
		es[i].emitSprite(game, frac);
	}
};

module.exports = {
	Enemies: Enemies,
	Types: _.keys(Types),
};
