/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var color = require('./color');
var control = require('./control');
var param = require('./param');
var physics = require('./physics');

/*
 * Player object.
 */
function Player() {
	var g = param.Game;
	this.body = new p2.Body({
		mass: g.Mass,
		position: [0, 0],
		fixedRotation: true,
	});
	var shape = new p2.Circle({ radius: 1 });
	shape.material = physics.Material.Player;
	this.body.addShape(shape);

	this._drag = g.Drag;
	this._jetForceUp = g.Mass * g.Jetpack;
	this._jetForceForward = g.Speed * g.Speed * g.Drag;
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
	if (!grounded) {
		fx += this._jetForceForward;
	}
	this.body.applyForce([fx, fy]);
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
		color: color.rgb(1, 0, 0.5),
		sprite: 'PStand',
	});
};

module.exports = {
	Player: Player
};
