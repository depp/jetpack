/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;
var vec4 = glm.vec4;

var color = require('./color');
var control = require('./control');
var entity = require('./entity');
var lights = require('./lights');
var param = require('./param');
var poly = require('./poly');
var physics = require('./physics');
var sprites = require('./sprites');
var state = require('./state');
var text = require('./text');
var util = require('./util');
var weapon = require('./weapon');

var PlayerColor = color.rgb(1, 0, 0.5);
var ItemTime = Math.ceil(param.Game.ItemTime * param.Rate);
var HurtTime = Math.ceil(param.Game.HurtTime * param.Rate);
var ShieldColor = vec4.create();

vec4.scale(ShieldColor, color.Shield, 0.2);

function Corpse(game, body) {
	var sc = 10  ;
	var a = (0.5 * Math.random() + 0.25) * Math.PI;
	var im = vec2.fromValues(sc * Math.cos(a), sc * Math.sin(a));
	var pt = vec2.create();
	util.randomInCircle(pt, body.boundingRadius);
	physics.corpsify(body);
	body.damping = 0.2;
	body.angularDamping = 0.2;
	body.applyImpulse(im, pt);
	this.body = body;
	this.timeOut = game.time.realTime + 3000;
}
Corpse.prototype = {
	emit: function(curTime) {
		sprites.world.add({
			position: this.body.interpolatedPosition,
			radius: 1.5,
			color: PlayerColor,
			sprite: 'PHurt',
			angle: this.body.angle,
		});
	},
	step: function(game) {
		if (this.timeOut !== null) {
			if (game.time.realTime > this.timeOut) {
				var ll = new text.Layout();
				ll.addLine({
					text: 'Press space to restart',
					x: param.Width * 0.5,
					y: 30,
					scale: 2,
				});
				text.addLayout(ll);
				this.timeOut = null;
			}
		} else {
			if (control.game.jet.press) {
				state.set('Game', null);
			}
		}
	}
};

/*
 * Player object.
 */
function Player(game, args) {
	var g = param.Game;
	var position = vec2.fromValues(0, -param.Level.MaxGap * 0.5 + 1);
	vec2.add(position, position, game.buffers[0]);
	var body = new p2.Body({
		mass: g.Mass,
		position: position,
		fixedRotation: true,
	});
	var shape = new p2.Circle({ radius: 1 });
	shape.material = physics.Material.Player;
	shape.collisionGroup = physics.Mask.Player;
	shape.collisionMask = physics.Mask.World |
		physics.Mask.Enemy | physics.Mask.Item;
	body.addShape(shape);
	this.body = body;
	this._drag = g.Drag;
	this._jetForceUp = g.Mass * g.Jetpack;
	this._jetForceForward = g.Speed * g.Speed * g.Drag;
	this._isFlying = false;
	game.camera.set({ target: body });
	this.onGiveWeapon(game, weapon.getWeapon(0));
	this.shieldTime = null;
	this.bonusTime = null;
	this.boostTime = null;
	this.hurtTime = null;
	this.maxHealth = g.MaxHealth;
	this.health = this.maxHealth;
	game.hud.shield1.set({
		maxValue: this.maxHealth,
		value: this.health,
	});
}
Player.prototype = {
	team: 'player',
	step: function(game) {
		var ctl = control.game;
		var vx = this.body.velocity[0], vy = this.body.velocity[1];
		var vmag2 = vx * vx + vy * vy;
		var fdrag = vmag2 * this._drag;
		var a = vmag2 > 1e-3 ? 1.0 / Math.sqrt(vmag2) : 0;
		var fx = -fdrag * a * vx, fy = -fdrag * a * vy;
		if (ctl.jet.state) {
			fy += this._jetForceUp;
		}
		var grounded = physics.isGrounded(game.world, this.body);
		this._isFlying = !grounded;
		if (!grounded) {
			fx += this._jetForceForward * (this.boostTime !== null ? 3 : 1);
		}
		this.body.applyForce([fx, fy]);
		if (this.weapon) {
			this.weapon.step(game, this);
			if (this.weapon.empty) {
				this.onGiveWeapon(game, weapon.getWeapon(0));
			}
		}
		if (this.shieldTime !== null) {
			this.shieldTime--;
			if (this.shieldTime <= 0) {
				game.hud.shield2.set();
				this.shieldTime = null;
			} else {
				game.hud.shield2.set(this.shieldTime);
			}
		}
		if (this.bonusTime !== null) {
			this.bonusTime--;
			if (this.bonusTime <= 0) {
				game.hud.bonus.set();
				this.bonusTime = null;
				game.bonus = 1;
			} else {
				game.hud.bonus.set(this.bonusTime);
			}
		}
		if (this.boostTime !== null) {
			this.boostTime--;
			if (this.boostTime <= 0) {
				game.hud.boost.set();
				this.boostTime = null;
			} else {
				game.hud.boost.set(this.boostTime);
			}
		}
		if (this.hurtTime !== null && --this.hurtTime <= 0) {
			this.hurtTime = null;
		}
	},
	emit: function(curTime) {
		var pos = this.body.interpolatedPosition;
		sprites.world.add({
			position: pos,
			radius: 1.5,
			color: this.hurtTime !== null ? color.White : PlayerColor,
			sprite: this.hurtTime !== null ? 'PHurt' :
				(this._isFlying ? 'PForward' : 'PStand'),
		});
		lights.addLocal({
			color: PlayerColor,
			intensity: 20,
			position: pos,
			height: 2,
		});
		if (this.shieldTime !== null) {
			sprites.world.add({
				position: pos,
				radius: 2,
				color: ShieldColor,
				sprite: 'IShield2',
			});
		}
	},
	onGiveWeapon: function(game, w) {
		var ww = w.create(game, this);
		this.weapon = ww;
		if (ww.maxAmmo) {
			game.hud.weapon.set({
				sprite: ww.sprite,
				maxValue: ww.maxAmmo,
				value: ww.ammo,
			});
		} else {
			game.hud.weapon.set();
		}
	},
	onGiveHealth: function(game, level) {
		switch (level) {
		case 0:
			this._setHealth(game, 1);
			if (this.shieldTime !== null) {
				this.shieldTime = null;
				this.hud.shield2.set();
			}
			game.award(10000);
			break;
		case 1:
			this._setHealth(game, this.maxHealth);
			break;
		case 2:
			this.shieldTime = ItemTime;
			game.hud.shield2.set({ maxValue: ItemTime, value: ItemTime });
			break;
		}
	},
	onGiveBonus: function(game, bonus) {
		game.hud.bonus.set({
			sprite: bonus.sprite,
			maxValue: ItemTime,
			value: ItemTime,
			color: bonus.color,
		});
		this.bonusTime = ItemTime;
		console.log(ItemTime);
		game.bonus = bonus.value;
	},
	onGiveBoost: function(game) {
		game.hud.boost.set({
			maxValue: ItemTime,
			value: ItemTime,
		});
		this.boostTime = ItemTime;
	},
	_setHealth: function(game, value) {
		if (isNaN(value)) {
			throw new TypeError('bad health value');
		}
		value = Math.max(0, Math.min(value, this.maxHealth));
		if (value > 0) {
			this.health = value;
			game.hud.shield1.set(value);
			return;
		}
		game.bonus = 0;
		text.clear();
		sprites.ui.clear();
		poly.ui.clear();
		game.hud.disable = true;
		var ll = new text.Layout({
			position: [param.Width / 2, param.Height / 2],
			color: color.Transparent,
		}).addLine({
			text: 'You are dead',
			scale: 4,
		}).addLine({
			text: 'Final score: ' + util.numberWithCommas(game.score),
			scale: 2,
			y: -42,
		});
		game.time.scale = 3.0;
		text.addLayout(ll);
		game.tween(ll)
			.to({ color: color.White}, 0.5).start();
		game.spawnObj(new Corpse(game, this.body, this.type));
		game.camera.set({
			targetY: null,
			offsetX: 0,
			offsetY: 0,
			leading: -0.2,
		});
		game.tween(game.camera)
			.to({ zoom: 3 }, 3.0, 'SineInOut').start();
	},
	onDamage: function(game, amt) {
		if (!isFinite(amt)) {
			return;
		}
		if (this.shieldTime !== null) {
			return;
		}
		this._setHealth(game, this.health - amt);
		this.hurtTime = HurtTime;
	},
	// Always keep player across level transitions
	alwaysKeep: true,
};

entity.registerTypes({
	Player: function(game, args) { return new Player(game, args); },
});
