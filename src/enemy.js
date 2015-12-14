/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec4 = glm.vec4;

var color = require('./color');
var entity = require('./entity');
var physics = require('./physics');

function emitEnemy(obj, game) {
	game.sprites.add({
		position: obj.body.interpolatedPosition,
		radius: 1.5,
		color: obj.color,
		sprite: obj.sprite.sprite,
		angle: obj.body.interpolatedAngle - Math.PI * 0.5,
	});
}

/*
 * Class for enemy corpses.
 */
var Corpse = {
	spawn: function(game, args) {
		var body = args.body;
		body.gravityScale = 1;
		body.mass *= 0.5;
		body.updateMassProperties();
		_.forEach(body.shapes, function(s) {
			s.material = physics.Material.Bouncy
		});
		this.body = body;
		this.sprite = args.sprite;
		this.color = vec4.clone(color.White);
	},
	emit: function(game) {
		emitEnemy(this, game);
	},
	lifespan: 3,
};

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
		this.hurtTween = null;
		this.color = vec4.clone(this.sprite.color);
	},
	emit: function(game) {
		emitEnemy(this, game);
	},
	onDamage: function(game, amt) {
		if (this.initialHealth === 0) {
			// Invincible
			return;
		}
		this.health -= amt;
		if (this.health > 0) {
			this.hurtTween =
				(this.hurtTween ? this.hurtTween.reset() : game.tween(this))
				.to({ color: color.White }, 0.1)
				.to({ color: this.sprite.color, hurtTween: null }, 0.3)
				.start();
		} else {
			this.die(game);
		}
	},
	die: function(game) {
		entity.spawn(game, {
			type: Corpse,
			body: this.body,
			sprite: this.sprite,
			color: this.color,
		});
	},
	baseColor: color.hex(0x808080),
	sprite: {
		color: color.Gray,
		sprite: 'PHurt',
	},
	mass: 5,
	radius: 1,
	initialHealth: 4,
};

var Enemies = {
	Glider: {
		sprite: {
			color: color.hex(0xDCE800),
			sprite: 'EGlider',
		},
	},
	Horiz: {
		sprite: {
			color: color.hex(0x1C72FC),
			sprite: 'EHoriz',
		},
	},
	Silo: {
		sprite: {
			color: color.hex(0xA7A4B3),
			sprite: 'ESilo',
		},
	},
	Diamond: {
		sprite: {
			color: color.hex(0x54EBB9),
			sprite: 'EDiamond',
		},
	},
	Star: {
		sprite: {
			color: color.hex(0xFFF8C4),
			sprite: 'EStar',
		},
	},
	Ace: {
		sprite: {
			color: color.hex(0xCB30FF),
			sprite: 'EAce',
		},
	},
	Turret: {
		sprite: {
			color: color.hex(0xAB8249),
			sprite: 'ETurret',
		},
	},
};

entity.registerTypes({
	Enemy: Enemy
});
