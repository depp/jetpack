/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var entity = require('./entity');
var physics = require('./physics');

/*
 * Base mixin for enemies.
 *
 * Spawn properties:
 * position: Enemy position
 */
var Enemy = {
	spawn: function(game, args) {
		var position = args.position;
		var body = new p2.Body({
			position: args.position,
			angle: Math.PI * 0.5,
			mass: this.mass,
			gravityScale: 0,
		});
		var shape = new p2.Circle({ radius: this.radius });
		shape.collisionGroup = physics.Mask.Enemy;
		shape.collisionMask = physics.Mask.World | physics.Mask.Player;
		body.addShape(shape);
		this.body = body;
	},
	emit: function(game) {
		game.sprites.add({
			position: this.body.interpolatedPosition,
			radius: 1.5,
			color: this.color,
			sprite: this.sprite,
			angle: this.body.interpolatedAngle - Math.PI * 0.5,
		});
	},
	onDamage: function(game, amt) {
		console.log('DAMAGE', this.health);
		if (this.initialHealth === 0) {
			return;
		}
		this.health -= amt;
		if (this.health <= 0) {
			console.log('DESTROY');
			entity.destroy(this.body);
		}
	},
	color: color.hex(0xffffff),
	sprite: 'PHurt',
	mass: 5,
	radius: 1,
	initialHealth: 2,
};

var Enemies = {
	Glider: {
		color: color.hex(0xDCE800),
		sprite: 'EGlider',
	},
	Horiz: {
		color: color.hex(0x1C72FC),
		sprite: 'EHoriz',
	},
	Silo: {
		color: color.hex(0xA7A4B3),
		sprite: 'ESilo',
	},
	Diamond: {
		color: color.hex(0x54EBB9),
		sprite: 'EDiamond',
	},
	Star: {
		color: color.hex(0xFFF8C4),
		sprite: 'EStar',
	},
	Ace: {
		color: color.hex(0xCB30FF),
		sprite: 'EAce',
	},
	Turret: {
		color: color.hex(0xAB8249),
		sprite: 'ETurret',
	},
};

entity.registerTypes(null, {
	Enemy: Enemy
});
