/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var control = require('./control');
var param = require('./param');

var Tiers = [];

var shotDir = vec2.create();

function forwardDir(r, y) {
	if (isNaN(y)) {
		y = 0;
	}
	shotDir[0] = 1;
	shotDir[1] = y + (Math.random() - 0.5) * 2 * r;
	return shotDir;
}

/**************************************/

function WeaponType(sprite, name, ctor) {
	this.sprite = sprite;
	this.name = name;
	this._ctor = ctor;
}

WeaponType.prototype.create = function(game, player) {
	var obj = Object.create(this._ctor.prototype);
	Weapon.call(obj, game, player);
	this._ctor.call(obj, game, player);
	return obj;
};

/**************************************/

/*
 * Single action: one shot per button press, with cooldown.
 */
function ActionSingle(rate) {
	this.cooldown = Math.ceil(param.Rate / rate);
	this.remaining = 0;
	this.willFire = false;
}
ActionSingle.prototype.step = function(game, ctl) {
	if (ctl.press) {
		this.willFire = true;
	} else if (!ctl.state) {
		this.willFire = false;
	}
	if (this.remaining > 0) {
		this.remaining--;
	}
	if (this.willFire && this.remaining <= 0) {
		this.willFire = false;
		this.remaining = this.cooldown;
		return true;
	}
	return false;
};

/**************************************/

/*
 * Auto action: as long as you hold down the button
 */
function ActionAuto(rate) {
	this.period = Math.ceil(param.Rate / rate);
	this.remaining = 0;
}
ActionAuto.prototype.step = function(game, ctl) {
	if (this.remaining > 0) {
		this.remaining--;
	}
	if (ctl.state && this.remaining <= 0) {
		this.willFire = false;
		this.remaining = this.period;
		return true;
	}
	return false;
};

/**************************************/

function Weapon(game, player) {
	this.player = player;
	this.source = this.player.body;
}

Weapon.prototype.step = function(game) {
	if (this.action.step(game, control.game.fire)) {
		this.fire(game);
	}
};

/**************************************/

/*
 * Create a new weapon type.
 *
 * obj: The weapon class prototype
 * obj.init: Initialization function, takes (game) as parameter
 * name: Human-readable Name of the weapon
 * tier: Weapon tier, a non-negative integer
 * sprite: Weapon sprite
 */
function createType(obj) {
	var ctor = obj.init, name = obj.name, tier = obj.tier, sprite = obj.sprite;
	ctor.prototype = Object.create(Weapon.prototype);
	_.assign(ctor.prototype, obj);
	var type = new WeaponType(sprite, name, ctor);
	while (Tiers.length <= tier) {
		Tiers.push([]);
	}
	Tiers[obj.tier].push(type);
}

/**********************************************************************/
/* Guns */

createType({
	name: 'Pellet Gun',
	tier: 0,
	sprite: null,
	init: function(game, player) {
		this.action = new ActionSingle(5);
	},
	fire: function(game) {
		game.spawn({
			type: 'Shot.Bullet',
			source: this.source,
			direction: forwardDir(0.1),
		});
	},
});

createType({
	name: 'Triple Machine Gun',
	tier: 1,
	sprite: 'WTriple',
	init: function(game, player) {
		this.action = new ActionAuto(8);
	},
	fire: function(game) {
		for (var i = 0; i < 3; i++) {
			game.spawn({
				type: 'Shot.Bullet',
				source: this.source,
				direction: forwardDir(0.1, (i-1) * 0.25),
			});
		}
	},
});

if (false) {

/**********************************************************************/
/* Rockets */

createType({
	sprite: 'WRocket',
	name: 'Rocket Launcher',
	tier: 1,
	disabled: true,
});

createType({
	sprite: 'WHoming',
	name: 'Homing Missiles',
	tier: 1,
	disabled: true,
});

createType({
	sprite: 'WItano',
	name: 'Itano Battery',
	tier: 2,
	disabled: true,
});

/**********************************************************************/
/* Laser */

createType({
	sprite: 'WSingle',
	name: 'Laser Cannon',
	tier: 1,
	disabled: true,
});

createType({
	sprite: 'WReaper',
	name: 'Reaper Laser',
	tier: 2,
	disabled: true,
});

/**********************************************************************/
/* Other */

createType({
	sprite: 'WSnake',
	name: 'S.N.A.K.E. Launcher',
	tier: 2,
	disabled: true,
});

createType({
	sprite: 'WWave',
	name: 'Giga Wave Cannon',
	tier: 2,
	disabled: true,
});
}
/**********************************************************************/

/*
 * Get a random weapon at the given tier.
 *
 * tier: The weapon tier, a non-negative integer
 */
function getWeapon(tier) {
	tier = Math.max(0, Math.min(Tiers.length - 1, tier));
	while (!Tiers[tier].length) {
		tier--;
	}
	return _.sample(Tiers[tier]);
}

module.exports = {
	getWeapon: getWeapon
};
