/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var color = require('./color');
var control = require('./control');
var entity = require('./entity');
var param = require('./param');
var physics = require('./physics');

var PlayerColor = [1, 0, 0.5];
var PlayerColorU32 = color.rgb.apply(null, PlayerColor);

/*
 * Player object.
 */
var Player = {
	spawn: function(game, args) {
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
		body.entity = this;
		this.body = body;
		this._drag = g.Drag;
		this._jetForceUp = g.Mass * g.Jetpack;
		this._jetForceForward = g.Speed * g.Speed * g.Drag;
		this._isFlying = false;
		game.world.addBody(body);
		game.camera.set({ target: body });
	},
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
			fx += this._jetForceForward;
		}
		this.body.applyForce([fx, fy]);
		if (ctl.fire.press) {
			game.spawn({
				type: 'Shot',
				source: this.body,
			});
		}
	},
	emit: function(game) {
		var pos = this.body.interpolatedPosition;
		game.sprites.add({
			position: pos,
			radius: 1.5,
			color: PlayerColorU32,
			sprite: this._isFlying ? 'PForward' : 'PStand',
		});
		game.lights.addLocal({
			color: PlayerColor,
			intensity: 20,
			position: pos,
			height: 2,
		});
	},
	// Always keep player across level transitions
	alwaysKeep: true,
};

entity.registerTypes(null, {
	Player: Player,
});
