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

var ReticleColor = color.rgb(0.9, 0.1, 0.1);

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
function Explosion(game, args) {
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
	body.addShape(shape);
	this.body = body;
	this.state = 0;
}
Explosion.prototype = {
	emit: function(game) {
		game.sprites.add({
			position: this.body.interpolatedPosition,
			radius: 3.0,
			color: color.White,
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

/**********************************************************************/

/*
 * Projectiles / shots.
 *
 * The 'target', 'direction', and 'angle' properties are exclusive.
 *
 * Spawn properties:
 * source: A body
 * direction: Direction to fire in, vec2
 * angle: Alternative to direction
 * isEnemy: True for enemy shots, false for player shots
 */
function Shot(game, args, type) {
	_.defaults(type, {
		color: null,
		sprite: null,
		mass: 1,
		radius: 0.5,
		lifespan: 2
	});
	var source = args.source;
	var dir = vec2.create(), angle;
	if (args.hasOwnProperty('direction')) {
		vec2.normalize(dir, args.direction);
		angle = Math.atan2(dir[1], dir[0]);
	} else if (args.hasOwnProperty('angle')) {
		angle = args.angle;
		vec2.set(dir, Math.cos(angle), Math.sin(angle));
	} else {
		console.error('Bad direction');
		return;
	}
	var vel = vec2.create();
	vec2.scale(vel, dir, type.speed);
	vec2.add(vel, vel, source.velocity);
	var pos = vec2.create();
	vec2.scale(pos, dir, 1.0);
	vec2.add(pos, pos, source.position);
	var body = new p2.Body({
		position: pos,
		angle: angle,
		velocity: vel,
		mass: type.mass,
		fixedRotation: true,
		gravityScale: 0,
		// ccdSpeedThreshold: 10,
	});
	var shape = new p2.Circle({ radius: type.radius });
	setTeam(shape, args.isEnemy);
	body.addShape(shape);
	this.isEnemy = !!args.isEnemy;
	this.body = body;
	this.type = type;
}
Shot.prototype = {
	step: function(game) {
		if (this.type.guidance) {
			this.type.guidance.step(game, this);
		}
	},
	emit: function(game) {
		game.sprites.add({
			position: this.body.interpolatedPosition,
			radius: 1.5,
			color: this.type.color,
			sprite: this.type.sprite,
			angle: this.body.interpolatedAngle - Math.PI * 0.5,
		});
		if (this.type.guidance) {
			this.type.guidance.emit(game, this);
		}
	},
	onContact: function(game, eq, body) {
		this.type.payload.onContact(game, eq, body, this);
	},
	lifespan: 3,
};

/**********************************************************************/

/*
 * Component for shots that hurt on contact.
 */
function SimplePayload(damage) {
	this.damage = damage;
}
SimplePayload.prototype = {
	onContact: function(game, eq, body, shot) {
		var e = body.entity;
		if (e && e.onDamage) {
			e.onDamage(game, this.damage);
		}
		entity.destroy(shot.body);
	},
};

/*
 * Component for shots that explode on contact.
 */
function ExplosivePayload(shot, damage) {
	this.shot = shot;
	this.damage = damage;
}
ExplosivePayload.prototype = {
	onContact: function(game, eq, body, shot) {
		game.spawnObj(new Explosion(game, {
			position: shot.body.position,
			isEnemy: shot.isEnemy,
			damage: this.damage,
		}));
		entity.destroy(shot.body);
	},
};

/*
 * Component for shots that home in on targets.
 */
function Homing(game, args) {
	this.hasTarget = false;
}
Homing.prototype = {
	step: function(game, shot) {
		if (!this.hasTarget) {
			this.hasTarget = true;
			var body = shot.body;
			var target = game.scan({
				team: shot.isEnemy ? 'player' : 'enemy',
				position: body.position,
				angel: body.angle,
			});
			if (target) {
				shot.targetLock = target;
			}
		}
	},
	emit: function(game, shot) {
		var target = shot.targetLock;
		if (!target || !target.body) {
			return;
		}
		game.sprites.add({
			position: target.body.interpolatedPosition,
			radius: 2.0,
			color: ReticleColor,
			sprite: 'Reticle',
		});
	}
};

/**********************************************************************/

function Bullet(game, args) {
	return new Shot(game, args, {
		payload: new SimplePayload(1),
		color: color.hex(0xffffff),
		sprite: 'SDot',
		speed: 60,
	});
}

function Rocket(game, args) {
	return new Shot(game, args, {
		payload: new ExplosivePayload(2),
		color: color.hex(0xffffff),
		sprite: 'SRocket2',
		speed: 45,
	});
}

function HomingMissile(game, args) {
	return new Shot(game, args, {
		guidance: new Homing(game, args),
		payload: new ExplosivePayload(2),
		color: color.hex(0xffffff),
		sprite: 'SRocket2',
		speed: 32,
	});
}

/**********************************************************************/

entity.registerTypes({
	Bullet: Bullet,
	Rocket: Rocket,
	HomingMissile: HomingMissile,
}, 'Shot');
