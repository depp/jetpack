/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var color = require('./color');
var entity = require('./entity');
var param = require('./param');
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
	this.damage = args.damage;
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
			e.onDamage(game, this.damage);
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
	this._vec = dir;
}
Shot.prototype = {
	step: function(game) {
		var t = this.type;
		if (t.guidance) {
			t.guidance.step(game, this);
		}
		/*
		if (t.accel) {
			var b = this.body;
			vec2.set(this._vec, Math.cos(b.angle), Math.sin(b.angle));
			vec2.scale(this._vec, this._vec, t.accel * t.mass);
			b.applyForce(this._vec);
		}
		*/
	},
	emit: function(game) {
		var t = this.type;
		game.sprites.add({
			position: this.body.interpolatedPosition,
			radius: 1.5,
			color: t.color,
			sprite: t.sprite,
			angle: this.body.interpolatedAngle - Math.PI * 0.5,
		});
		if (t.guidance && !this.isEnemy) {
			t.guidance.emit(game, this);
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
function ExplosivePayload(damage, radius) {
	this.damage = damage;
	this.radius = radius;
}
ExplosivePayload.prototype = {
	onContact: function(game, eq, body, shot) {
		game.spawnObj(new Explosion(game, {
			position: shot.body.position,
			isEnemy: shot.isEnemy,
			damage: this.damage,
			radius: this.radius,
		}));
		entity.destroy(shot.body);
	},
};

/*
 * Component for shots that home in on targets.
 *
 * turnSpeed: Maximum rate of turning (radians / sec)
 */
function Homing(turnSpeed) {
	this.hasTarget = false;
	this.period = Math.ceil(param.Rate * 0.2);
	this.rem = 0;
	this.interceptAngle = null;
	this._vec1 = vec2.create();
	this._vec2 = vec2.create();
	this.turnSpeed = turnSpeed;
}
Homing.prototype = {
	getTarget: function(game, shot) {
		if (this.hasTarget) {
			return shot.targetLock;
		}
		this.hasTarget = true;
		var body = shot.body;
		var target = game.scan({
			team: shot.isEnemy ? 'player' : 'enemy',
			position: body.position,
			angel: body.angle,
		});
		if (target) {
			shot.targetLock = target;
			this.rem = 0;
		}
		return target;
	},
	calculateInterceptVector: function(body1, body2, speed) {
		// vec1: Direction of target
		vec2.subtract(this._vec1, body2.position, body1.position);
		if (vec2.squaredLength(this._vec1) < 0.01) {
			return null;
		}
		vec2.normalize(this._vec1, this._vec1);
		// vec2: Perpendicular to direction of target
		vec2.set(this._vec2, -this._vec2[1], this._vec2[0]);
		// Velocity of target projected onto perp vector
		var dperp = vec2.dot(this._vec2, body2.velocity);
		// Magnitude of velocity
		// var vmag = vec2.length(body1.velocity);
		if (dperp >= speed * 0.9) {
			// No intercept, just go straight towards target
			return this._vec1;
		}
		var dpar = Math.sqrt(1 - dperp * dperp);
		// Target velocity, assuming no speed changes
		vec2.scale(this._vec1, this._vec1, dpar);
		vec2.scale(this._vec2, this._vec2, dperp);
		vec2.add(this._vec1, this._vec1, this._vec2);
		return this._vec1;
	},
	getInterceptAngle: function(game, shot) {
		var target = this.getTarget(game, shot);
		if (!target) {
			return null;
		}
		var vec = this.calculateInterceptVector(shot.body, target.body);
		if (!vec) {
			return null;
		}
		return Math.atan2(vec[1], vec[0]);
	},
	step: function(game, shot) {
		var speed = shot.type.speed;
		this.rem--;
		if (this.rem <= 0) {
			this.rem = this.period;
			this.interceptAngle = this.getInterceptAngle(game, shot);
			if (false) {
				console.log(
					'Angle:' +
						(this.interceptAngle !== null ?
						 Math.round(this.interceptAngle * (180 / Math.PI)) : '<null>'));
			}
		}
		if (this.interceptAngle !== null) {
			var delta = (this.interceptAngle - shot.body.angle) % (Math.PI * 2);
			if (delta > Math.PI) {
				delta -= 2 * Math.PI;
			} else if (delta < -Math.PI) {
				delta += 2 * Math.PI;
			}
			var rate = this.turnSpeed * (1 / param.Rate);
			if (Math.abs(delta) > rate) {
				delta = delta > 0 ? rate : -rate;
			}
			shot.body.angle += delta;
		}
		var a = shot.body.angle;
		vec2.set(
			shot.body.velocity,
			Math.cos(a) * speed,
			Math.sin(a) * speed);
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

function SlowBullet(game, args) {
	return new Shot(game, args, {
		payload: new SimplePayload(1),
		color: color.hex(0xffffff),
		sprite: 'SDot',
		speed: 25,
	});
}

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
		payload: new ExplosivePayload(2, 4),
		color: color.hex(0xffffff),
		sprite: 'SRocket2',
		speed: 45,
	});
}

function HomingMissile(game, args) {
	return new Shot(game, args, {
		guidance: new Homing(4),
		payload: new ExplosivePayload(2, 4),
		color: color.hex(0xffffff),
		sprite: 'SRocket2',
		speed: 50,
	});
}

function ItanoMissile(game, args) {
	return new Shot(game, args, {
		guidance: new Homing(4),
		payload: new ExplosivePayload(1),
		color: color.hex(0xffffff),
		sprite: 'SRocket1',
		speed: 50,
	});
}

function SlowHoming(game, args) {
	return new Shot(game, args, {
		guidance: new Homing(4),
		payload: new ExplosivePayload(2, 4),
		color: color.hex(0xffffff),
		sprite: 'SRocket2',
		speed: 20,
	});
}

/**********************************************************************/

entity.registerTypes({
	SlowBullet: SlowBullet,
	Bullet: Bullet,
	Rocket: Rocket,
	HomingMissile: HomingMissile,
	SlowHoming: SlowHoming,
	ItanoMissile: ItanoMissile,
}, 'Shot');
