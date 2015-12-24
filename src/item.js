/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;
var vec4 = glm.vec4;

var color = require('./color');
var entity = require('./entity');
var param = require('./param');
var physics = require('./physics');
var sprites = require('./sprites');
var text = require('./text');
var weapon = require('./weapon');
var util = require('./util');

var ItemSize = 3;
var BobPeriod = 2;
var BobDistance = 1;

var bob = vec2.create();
function getBobPos(obj, curTime) {
	vec2.copy(bob, obj.body.interpolatedPosition);
	bob[1] += (0.5 * BobDistance) *
		Math.sin(curTime * (2 * Math.PI / BobPeriod) + obj.bobShift);
	return bob;
}

/*
 * Item "corpse"
 */
function Corpse(game, args) {
	var base = args.base;
	this.body = base.body;
	this.sprite = base.type.sprite;
	this.bobShift = base.bobShift;
	this.color = vec4.clone(base.type.color);
	this.radius = 3;
	_.forEach(this.body.shapes, function(s) {
		s.contactGroup = 0;
		s.contactMask = 0;
	});
	game.tween(this)
		.to({
			radius: ItemSize * 5,
			color: color.Transparent
		}, this.lifetime, 'SineIn')
		.start();
}
Corpse.prototype = {
	emit: function(curTime) {
		sprites.world.add({
			position: getBobPos(this, curTime),
			radius: this.radius,
			color: this.color,
			sprite: this.sprite,
		});
	},
	lifetime: 0.3,
};

/**********************************************************************/

/*
 * Types of items we can pick up.
 */

function Weapon(game) {
	var tier = Math.random() < 0.3 ? 2 : 1;
	this.weapon = weapon.getWeapon(tier);
	this.sprite = this.weapon.sprite;
	this.name = this.weapon.name;
}
Weapon.prototype = {
	color: color.Weapon,
	pickup: function(game, e) {
		if (!e || !e.onGiveWeapon) {
			return false;
		}
		e.onGiveWeapon(game, this.weapon);
		return true;
	},
};

function Shield(game) {
	this.level = Math.random() < 0.25 ? 2 : 1;
	this.sprite = 'IShield' + this.level;
	this.name = this.level == 2 ? 'Super Shield' : 'Shield Recharge';
}
Shield.prototype = {
	color: color.Shield,
	pickup: function(game, e) {
		if (!e || !e.onGiveHealth) {
			return false;
		}
		e.onGiveHealth(game, this.level);
		return true;
	},
};

var BonusInfo = [{
	sprite: 'BHalf',
	weight: 1,
	value: 0.5,
	name: 'x1/2 Bonus',
	color: color.BonusHalf,
}, {
	sprite: 'BTwo',
	weight: 4,
	value: 2,
	name: 'x2 Bonus',
	color: color.BonusTwo,
}, {
	sprite: 'BThree',
	weight: 3,
	value: 3,
	name: 'x3 Bonus',
	color: color.BonusThree,
}, {
	sprite: 'BFour',
	weight: 2,
	value: 4,
	name: 'x4 Bonus',
	color: color.BonusFour,
}];
var BonusWeights = new util.WeightedRandom();
_.forEach(BonusInfo, function(b) { BonusWeights.add(b.weight, b); });

function Bonus(game) {
	this.bonus = BonusWeights.choose();
	this.sprite = this.bonus.sprite;
	this.color = this.bonus.color;
	this.name = this.bonus.name;
}
Bonus.prototype = {
	pickup: function(game, e) {
		if (!e || !e.onGiveBonus) {
			return false;
		}
		e.onGiveBonus(game, this.bonus);
		return true;
	},
};

function Death(game) {}
Death.prototype = {
	color: color.White,
	sprite: 'IDeath',
	name: '+10,000 Points',
	pickup: function(game, e) {
		if (!e || !e.onGiveHealth) {
			return false;
		}
		e.onGiveHealth(game, 0);
		return true;
	},
};

function Boost(game) {}
Boost.prototype = {
	color: color.Boost,
	sprite: 'ISpeed',
	name: 'Speed Boost',
	pickup: function(game, e) {
		if (!e || !e.onGiveBoost) {
			return false;
		}
		e.onGiveBoost(game);
		return true;
	},
};

var Items = {
	Weapon: Weapon,
	Shield: Shield,
	Bonus: Bonus,
	Death: Death,
	Boost: Boost,
};

/**********************************************************************/

/*
 * Class for items we can pick up.
 */
function Item(game, args, type) {
	var position = args.position;
	var body = new p2.Body({
		position: args.position,
		mass: this.mass,
		fixedRotation: true,
	});
	var shape = new p2.Circle({
		radius: ItemSize,
		sensor: true,
	});
	shape.collisionGroup = physics.Mask.Item;
	shape.collisionMask = physics.Mask.Player;
	body.addShape(shape);
	this.body = body;
	this.bobShift = Math.random() * (Math.PI * 2);
	this.type = type;
}
Item.prototype = {
	emit: function(curTime) {
		sprites.world.add({
			position: getBobPos(this, curTime),
			radius: ItemSize,
			color: this.type.color,
			sprite: this.type.sprite,
		});
	},
	onContact: function(game, eq, body) {
		if (!this.type.pickup(game, body.entity)) {
			return;
		}
		game.message(
			new text.Layout({
				position: [param.Width / 2, 32],
				color: this.type.color,
			}).addLine({
				text: this.type.name,
				scale: 3,
			}));
		game.spawnObj(new Corpse(game, { base: this }));
	},
};

/**********************************************************************/

entity.registerTypes(
	_.mapValues(Items, function(value) {
		return function(game, args) {
			/*jshint newcap: false*/
			return new Item(game, args, new value(game));
		};
	}),
	'Item');
