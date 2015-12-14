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
var util = require('./util');

function setTeam(shape, isEnemy) {
	if (isEnemy) {
		shape.collisionGroup = physics.Mask.Enemy;
		shape.collisionMask = physics.Mask.World | physics.Mask.Player;
	} else {
		shape.collisionGroup = physics.Mask.Player;
		shape.collisionMask = physics.Mask.World | physics.Mask.Enemy;
	}
}

/*
 * Calculate an impact vector between the origin body and the target body.
 */
function impactVector(vec, source, target, scale, jitter) {
	var angle = Math.random() * 2 * Math.PI;
	var c = Math.cos(angle), s = Math.sin(angle);
	vec2.subtract(vec, target.position, source.position);
	vec[0] += c * jitter;
	vec[1] += s * jitter;
	var len2 = vec2.squaredLength(vec);
	if (len2 < 0.01) {
		vec[0] = c * scale;
		vec[1] = s * scale;
	} else {
		var a = scale / Math.sqrt(len2);
		vec[0] *= a;
		vec[1] *= a;
	}
}

/*
 * Explosion object.
 *
 * Spawn properties:
 * position: vec2 position
 * radius: float explosion radius
 */
var Explosion = {
	spawn: function(game, args) {
		var body = new p2.Body({
			position: args.position,
		});
		var shape = new p2.Circle({
			radius: args.radius,
			sensor: true,
		});
		if (args.isEnemy) {
			shape.collisionGroup = physics.Mask.Enemy;
			shape.collisionMask = physics.Mask.Player;
		} else {
			shape.collisionGroup = physics.Mask.Player;
			shape.collisionMask = physics.Mask.Enemy;
		}
		setTeam(shape, args.isEnemy);
		body.entity = this;
		body.addShape(shape);
		this.body = body;
		this.state = 0;
	},
	emit: function(game) {
		game.sprites.add({
			position: this.body.interpolatedPosition,
			radius: 3.0,
			color: 0xffffffff,
			sprite: 'SStar',
		});
	},
	onContact: function(game, eq, body) {
		var e = body.entity;
		if (e && e.onDamage) {
			e.onDamage(game, 1);
		}
		var impulse = vec2.create(), point = vec2.create();
		impactVector(impulse, this.body, body, 50, 0.2);
		util.randomInCircle(point, body.boundingRadius);
		body.applyImpulse(impulse, point);
	},
	step: function(game) {
		this.state++;
		if (this.state === 2) {
			this.onContact = null;
		}
	},
	lifespan: 0.25,
};

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
		setTeam(shape, args.isEnemy);
		body.entity = this;
		body.addShape(shape);
		this.isEnemy = !!args.isEnemy;
		this.body = body;
	},
	emit: function(game) {
		game.sprites.add({
			position: this.body.interpolatedPosition,
			radius: 1.5,
			color: this.color,
			sprite: 'SRocket2',
			angle: this.body.interpolatedAngle - Math.PI * 0.5,
		});
	},
	onContact: function(game, eq, body) {
		entity.spawn(game, {
			type: 'Explosion',
			position: this.body.position,
			isEnemy: this.isEnemy,
		});
		entity.destroy(this.body);
	},
	color: color.hex(0xffffff),
	sprite: null,
	mass: 1,
	speed: 30,
	radius: 0.5,
	lifespan: 2,
};

entity.registerTypes(null, {
	Explosion: Explosion,
	Shot: Shot,
});
