/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var color = require('./color');
var entity = require('./entity');
var physics = require('./physics');

var BobPeriod = 2;
var BobDistance = 1;

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
			radius: 3,
			sensor: true,
		});
		shape.collisionGroup = physics.Mask.Item;
		shape.collisionMask = physics.Mask.Player;
		body.entity = this;
		body.addShape(shape);
		this.body = body;
		this.bob = -1;
		game.tween(this, { loop: true })
			.to({ bob: +1 }, 0.5 * BobPeriod, 'SineInOut')
			.to({ bob: -1 }, 0.5 * BobPeriod, 'SineInOut');
		this.pos = vec2.create();
	},
	emit: function(game) {
		vec2.copy(this.pos, this.body.interpolatedPosition);
		this.pos[1] += this.bob * (0.5 * BobDistance);
		game.sprites.add({
			position: this.pos,
			radius: 3,
			color: this.color,
			sprite: 'IShield2',
		});
	},
	onContact: function(game, eq, body) {
		console.log('PICKUP');
	},
	color: color.hex(0xffffff),
	sprite: 'PHurt',
};

entity.registerTypes(null, {
	Item: Item,
});
