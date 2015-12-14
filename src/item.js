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
var physics = require('./physics');

var ItemSize = 3;
var BobPeriod = 2;
var BobDistance = 1;

var bob = vec2.create();
function getBobPos(obj, game) {
	vec2.copy(bob, obj.body.interpolatedPosition);
	bob[1] += (0.5 * BobDistance) *
		Math.sin(game.time.elapsed * (2 * Math.PI / BobPeriod) + obj.bobShift);
	return bob;
}

/*
 * Item "corpse"
*/
var Corpse = {
	spawn: function(game, args) {
		var base = args.base;
		this.body = base.body;
		this.sprite = base.sprite;
		this.bobShift = base.bobShift;
		this.color = vec4.clone(base.color);
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
	},
	emit: function(game) {
		game.sprites.add({
			position: getBobPos(this, game),
			radius: this.radius,
			color: this.color,
			sprite: 'IShield2',
		});
	},
	lifetime: 0.3,
};

/*
 * Base mixin for items.
 */
var Item = {
	spawn: function(game, args) {
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
	},
	emit: function(game) {
		game.sprites.add({
			position: getBobPos(this, game),
			radius: ItemSize,
			color: this.color,
			sprite: 'IShield2',
		});
	},
	onContact: function(game, eq, body) {
		console.log('PICKUP');
		game.spawn({
			type: Corpse,
			base: this,
		});
	},
	color: color.hex(0xffffff),
	sprite: 'PHurt',
};

entity.registerTypes(null, {
	Item: Item,
});
