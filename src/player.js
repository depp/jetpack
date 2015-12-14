/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var control = require('./control');
var param = require('./param');
var physics = require('./physics');

var PlayerColor = [1, 0, 0.5];
var PlayerColorU32 = color.rgb.apply(null, PlayerColor);

/*
 * Player object.
 */
function Player(args) {
	var g = param.Game;

	this.body = new p2.Body({
		mass: g.Mass,
		position: args.position,
		fixedRotation: true,
	});
	var shape = new p2.Circle({ radius: 1 });
	shape.material = physics.Material.Player;
	shape.collisionGroup = physics.Mask.Player;
	shape.collisionMask = physics.Mask.World | physics.Mask.Enemy;
	this.body.addShape(shape);

	this._drag = g.Drag;
	this._jetForceUp = g.Mass * g.Jetpack;
	this._jetForceForward = g.Speed * g.Speed * g.Drag;
	this._isFlying = false;
}

/*
 * Advance by one frame.
 */
Player.prototype.step = function(game) {
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
};

/*
 * Emit graphics data.
 */
Player.prototype.emit = function(game, frac) {
	var pos = physics.bodyPos(this.body, frac);
	game.sprites.add({
		x: pos[0],
		y: pos[1],
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
};

module.exports = {
	Player: Player
};
