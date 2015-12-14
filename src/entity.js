/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var color = require('./color');
var physics = require('./physics');

function destroy(body) {
	if (body.world) {
		body.world.removeBody(body);
	}
}



/*
 * Base mixin for shots.
 *
 * The 'target', 'direction', and 'angle' properties are exclusive.
 *
 * Spawn properties:
 * source: A body
 * target: Target to aim at, vec2
 * direction: Direction to fire in, vec2
 * angle: Angle to fire at, float
 * isEnemy: True for enemy shots, false for player shots
 */
var Shot = {
	spawn: function(game, args) {
		var source = args.source;
		var vel = vec2.create(), speed = this.speed;
		var angle, len2, hasDir = false;
		// Prefer to use 'target'
		if (!hasDir && args.hasOwnProperty('target')) {
			vec2.subtract(vel, args.target, source.position);
			len2 = vec2.squaredLength(vel);
			if (len2 >= 0.01) {
				hasDir = true;
			}
		}
		// Fall back on 'direction'
		if (!hasDir && args.hasOwnProperty('direction')) {
			vec2.copy(vel, args.direction);
			len2 = vec2.squaredLength(vel);
			if (len2 >= 0.01) {
				hasDir = true;
			}
		}
		// Fall back on 'angle'
		if (!hasDir) {
			if (args.hasOwnProperty('angle')) {
				angle = args.angle;
			} else {
				// Fall back on a random angle
				angle = (2 * Math.random() - 1) * Math.PI;
			}
			vel[0] = Math.cos(angle) * speed;
			vel[1] = Math.sin(angle) * speed;
		} else {
			angle = Math.atan2(vel[1], vel[0]);
			vec2.scale(vel, vel, this.speed / Math.sqrt(len2));
		}
		vec2.add(vel, vel, source.velocity);
		var body = new p2.Body({
			position: source.position,
			angle: angle,
			velocity: vel,
			mass: this.mass,
			fixedRotation: true,
			gravityScale: 0,
		});
		var shape = new p2.Circle({ radius: this.radius });
		if (args.isEnemy) {
			shape.collisionGroup = physics.Mask.Enemy;
			shape.collisionMask = physics.Mask.World | physics.Mask.Player;
		} else {
			shape.collisionGroup = physics.Mask.Player;
			shape.collisionMask = physics.Mask.World | physics.Mask.Enemy;
		}
		body.entity = this;
		body.addShape(shape);
		this.body = body;
		game.world.addBody(body);
	},
	emit: function(game, frac) {
		var pos = physics.bodyPos(this.body, frac);
		game.sprites.add({
			x: pos[0],
			y: pos[1],
			radius: 1.5,
			color: this.color,
			sprite: 'SRocket2',
			angle: this.body.angle - Math.PI * 0.5,
		});
	},
	onContact: function(game, eq, other) {
		destroy(this.body);
	},
	color: color.hex(0xffffff),
	sprite: null,
	mass: 1,
	speed: 30,
	radius: 0.5,
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
		body.entity = this;
		body.addShape(shape);
		this.body = body;
		game.world.addBody(body);
	},
	emit: function(game, frac) {
		var pos = physics.bodyPos(this.body, frac);
		game.sprites.add({
			x: pos[0],
			y: pos[1],
			radius: 1.5,
			color: this.color,
			sprite: this.sprite,
			angle: this.body.angle - Math.PI * 0.5,
		});
	},
	color: color.hex(0xffffff),
	sprite: 'PHurt',
	mass: 5,
	radius: 1,
};

// Index of all types.
var Types = {
	Shot: Shot,

	Enemy: Enemy,
};

/*
 * Spawn an entity.
 *
 * game: The game screen
 * args: The spawn arguments, including 'type'
 */
function spawn(game, args) {
	var type = args.type;
	if (!Types.hasOwnProperty(type)) {
		console.warn('No such entity type: ' + type);
		return;
	}
	var cls = Types[type];
	var obj = Object.create(cls);
	obj.spawn(game, args);
}

module.exports = {
	spawn: spawn,
};
