/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var Tiers = [];

function WeaponType() {}

WeaponType.prototype.create = function(game) {
	var obj = Object.create(this._obj);
	obj.init(game);
};

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
	if (!obj.enabled) {
		return;
	}
	var info = new WeaponType();
	info.sprite = obj.sprite;
	info._obj = obj;
	while (Tiers.length <= obj.tier) {
		Tiers.push([]);
	}
	Tiers[obj.tier].push(info);
}

/**********************************************************************/
/* Guns */

createType({
	init: function(game) {},
	name: 'Pellet Gun',
	tier: 0,
});

createType({
	init: function(game) {},
	sprite: 'WTriple',
	name: 'Triple Machine Gun',
	tier: 1,
	enabled: true,
});

/**********************************************************************/
/* Rockets */

createType({
	init: function(game) {},
	sprite: 'WRocket',
	name: 'Rocket Launcher',
	tier: 1,
	enabled: false,
});

createType({
	init: function(game) {},
	sprite: 'WHoming',
	name: 'Homing Missiles',
	tier: 1,
	enabled: false,
});

createType({
	init: function(game) {},
	sprite: 'WItano',
	name: 'Itano Battery',
	tier: 2,
	enabled: false,
});

/**********************************************************************/
/* Laser */

createType({
	init: function(game) {},
	sprite: 'WSingle',
	name: 'Laser Cannon',
	tier: 1,
	enabled: false,
});

createType({
	init: function(game) {},
	sprite: 'WReaper',
	name: 'Reaper Laser',
	tier: 2,
	enabled: false,
});

/**********************************************************************/
/* Other */

createType({
	init: function(game) {},
	sprite: 'WSnake',
	name: 'S.N.A.K.E. Launcher',
	tier: 2,
	enabled: false,
});

createType({
	init: function(game) {},
	sprite: 'WWave',
	name: 'Giga Wave Cannon',
	tier: 2,
	enabled: false,
});

/**********************************************************************/

console.log(Tiers);

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
