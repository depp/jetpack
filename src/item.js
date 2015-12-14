/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var entity = require('./entity');
var physics = require('./physics');

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
	},
	emit: function(game) {
		game.sprites.add({
			position: this.body.interpolatedPosition,
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
