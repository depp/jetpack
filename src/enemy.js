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
var param = require('./param');
var physics = require('./physics');
var util = require('./physics');

var StunTime = 0.3;

var shotDir = vec2.create();

function towardsPlayer(game, body, leading) {
	if (isNaN(leading)) {
		leading = 0.5;
	}
	var v = shotDir;
	var player = game.scan({
		team: 'player',
		position: body.position,
		angle: Math.PI,
	});
	if (!player || !player.body) {
		return null;
	}
	var pb = player.body;
	vec2.scale(v, pb.velocity, leading);
	vec2.add(v, v, pb.position);
	vec2.subtract(v, v, body.position);
	var len2 = vec2.squaredLength(v);
	if (len2 < 0.01) {
		return null;
	}
	return v;
}

function randomDirection() {
	var a = Math.random() * 2 * Math.PI;
	vec2.set(shotDir, Math.cos(a), Math.sin(a));
	return shotDir;
}

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
		mass: type.mass,
		gravityScale: 0,
	});
	var shape = new p2.Circle({ radius: 1 });
	shape.collisionGroup = physics.Mask.Enemy;
	shape.collisionMask = physics.Mask.World | physics.Mask.Player;
	body.addShape(shape);
	this.body = body;
	this.hurtTween = null;
	this.color = vec4.clone(type.color);
	this.type = type;
	this.health = type.health;
	this.lockCount = 0;
}
Enemy.prototype = {
	step: function(game) {
		this.type.step(game, this);
	},
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
				.to({ color: this.type.color, hurtTween: null }, StunTime)
				.start();
		} else {
			this.die(game);
		}
	},
	die: function(game) {
		game.spawnObj(new Corpse(game, this.body, this.type));
	},
	team: 'enemy',
};

/**********************************************************************/


var tempv0 = vec2.create();

function drive(amt) {
	return 1 - Math.pow(1 - amt, 1 / param.Rate);
}

function Glider() {
	// up, left, down, left
	this.state = 0;
	this.period = Math.round(0.75 * param.Rate);
	this.rem = 0;
	var a = Math.atan(this.slope), h = Math.PI;
	this.angles = [h - a, h, h + a, h];
}
Glider.prototype = {
	color: color.hex(0xDCE800),
	sprite: 'EGlider',
	mass: 2,
	health: 2,
	drive: drive(0.7),

	slope: 3,
	speed: 15,
	turnRate: 4,
	accel: 10,
	step: function(game, ent) {
		var y = ent.body.position[1] / param.Level.MaxGap;
		// console.log(y);
		switch (this.state) {
		default:
		case 0:
			if (y >= 0.1) {
				this.state++;
				this.rem = this.period;
			}
			break;
		case 3:
		case 1:
			if (--this.rem < 0) {
				this.state++;
			}
			break;
		case 2:
			if (y <= -0.1) {
				this.state++;
				this.rem = this.period;
			}
			break;
		}
		this.state = this.state & 3;
		var a = this.angles[this.state];
		physics.adjustAngle(ent.body, a, this.turnRate);
		a = ent.body.angle;
		var v = tempv0;
		v[0] = Math.cos(a) * this.speed;
		v[1] = Math.sin(a) * this.speed;
		physics.adjustVelocity(ent.body, v, this.accel);
	},
};

function Horiz() {}
Horiz.prototype = {
	color: color.hex(0x1C72FC),
	sprite: 'EHoriz',
	mass: 5,
	health: 2,
};

function Diamond() {}
Diamond.prototype = {
	color: color.hex(0x54EBB9),
	sprite: 'EDiamond',
	mass: 5,
	health: 2,
};

function Star() {}
Star.prototype = {
	color: color.hex(0xFFF8C4),
	sprite: 'EStar',
	mass: 5,
	health: 2,
};

function Ace() {}
Ace.prototype = {
	color: color.hex(0xCB30FF),
	sprite: 'EAce',
	mass: 5,
	health: 2,
};

function Silo() {}
Silo.prototype = {
	color: color.hex(0xA7A4B3),
	sprite: 'ESilo',
	mass: 0,
	health: 5,
};

function Turret() {
	this.reset();
}
Turret.prototype = {
	color: color.hex(0xAB8249),
	sprite: 'ETurret',
	mass: 100,
	health: 5,

	period1: 1.5 * param.Rate,
	period2: 0.5 * param.Rate,
	count: 2,
	reset: function() {
		this.state = 0;
		this.rem = Math.ceil((0.8 + 0.4 * Math.random()) * this.period1);
	},
	step: function(game, ent) {
		this.rem--;
		if (this.rem <= 0) {
			this.state++;
			if (this.state >= this.count) {
				this.reset();
			} else {
				this.rem = Math.ceil(this.period2);
			}
			game.spawn('Shot.SlowBullet', {
				source: ent.body,
				direction: towardsPlayer(game, ent.body, 0.5) || randomDirection(),
				isEnemy: true,
			});
		}
	},
};

var Enemies = {
	Glider: Glider,
	Horiz: Horiz,
	Diamond: Diamond,
	Star: Star,
	Ace: Ace,
	Silo: Silo,
	Turret: Turret,
};

entity.registerTypes(
	_.mapValues(Enemies, function(value) {
		return function(game, args) {
			/*jshint newcap:false*/
			return new Enemy(game, args, new value());
		};
	}), 'Enemy');
