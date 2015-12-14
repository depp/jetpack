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
	var type = obj.type;
	game.sprites.add({
		position: obj.body.interpolatedPosition,
		radius: 1.5,
		color: obj.color,
		sprite: type.sprite,
		angle: obj.body.interpolatedAngle - Math.PI * 0.5,
	});
}

/*
 * Class for enemy corpses.
 */
function Corpse(game, body, type) {
	body.gravityScale = 1;
	body.mass *= 0.5;
	body.updateMassProperties();
	_.forEach(body.shapes, function(s) {
		s.material = physics.Material.Bouncy;
	});
	this.body = body;
	this.type = type;
	this.color = vec4.clone(color.White);
}
Corpse.prototype = {
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
function Enemy(game, args, type) {
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
	this.color = vec4.clone(type.color);
	this.type = type;
	this.health = type.health;
}
Enemy.prototype = {
	emit: function(game) {
		emitEnemy(this, game);
	},
	onDamage: function(game, amt) {
		if (this.health <= 0) {
			return;
		}
		this.health -= amt;
		if (this.health > 0) {
			this.hurtTween =
				(this.hurtTween ? this.hurtTween.reset() : game.tween(this))
				.to({ color: color.White }, 0.1)
				.to({ color: this.type.color, hurtTween: null }, 0.3)
				.start();
		} else {
			this.die(game);
		}
	},
	die: function(game) {
		game.spawnObj(new Corpse(game, this.body, this.type));
	},
	baseColor: color.hex(0x808080),
	sprite: {
		color: color.Gray,
		sprite: 'PHurt',
	},
	mass: 5,
	radius: 1,
};

var Enemies = {
	Glider: function (game, args) {
		return new Enemy(game, args, {
			color: color.hex(0xDCE800),
			sprite: 'EGlider',
			mass: 2,
			health: 2,
		});
	},
	Horiz: function(game, args) {
		return new Enemy(game, args, {
			color: color.hex(0x1C72FC),
			sprite: 'EHoriz',
			mass: 5,
			health: 2,
		});
	},
	Diamond: function(game, args) {
		return new Enemy(game, args, {
			color: color.hex(0x54EBB9),
			sprite: 'EDiamond',
			mass: 5,
			health: 2,
		});
	},
	Star: function(game, args) {
		return new Enemy(game, args, {
			color: color.hex(0xFFF8C4),
			sprite: 'EStar',
			mass: 5,
			health: 2,
		});
	},
	Ace: function(game, args) {
		return new Enemy(game, args, {
			color: color.hex(0xCB30FF),
			sprite: 'EAce',
			mass: 5,
			health: 2,
		});
	},
	Silo: function(game, args) {
		return new Enemy(game, args, {
			color: color.hex(0xA7A4B3),
			sprite: 'ESilo',
			mass: 0,
			health: 5,
		});
	},
	Turret: function(game, args) {
		return new Enemy(game, args, {
			color: color.hex(0xAB8249),
			sprite: 'ETurret',
			mass: 0,
			health: 5,
		});
	},
};

entity.registerTypes(Enemies, 'Enemy');
