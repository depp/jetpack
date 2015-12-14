/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');

// Enemy base class.
function Enemy(type) {

}

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
	value.color = color.hex(value.color);
	value.sprite = 'E' + key;
});

/*
 * Enemy manager.
 */
function Enemies() {
	this._spawn = [];
}

/*
 * Create an enemy spawn point.
 *
 * obj.x: X position
 * obj.y: Y position
 * obj.type: Enemy type
 */
Enemies.prototype.spawn = function(obj) {
	if (typeof obj != 'object') {
		throw new TypeError('Invalid spawn');
	}
	if (!Types.hasOwnProperty(obj.type)) {
		console.warn('No such enemy type: ' + obj.type);
		return;
	}
	this._spawn.push(obj);
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
	var i, sp = this._spawn;
	for (i = 0; i < sp.length; i++) {
		var e = sp[i];
		var info = Types[e.type];
		game.sprites.add({
			x: e.x,
			y: e.y,
			radius: 1.5,
			sprite: info.sprite,
			color: info.color,
		});
	}
};

module.exports = {
	Enemies: Enemies,
	Types: _.keys(Types),
};
