/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var background = require('./background');
var camera = require('./camera');
var control = require('./control');
var param = require('./param');
var physics = require('./physics');
var sprites = require('./sprites');
var state = require('./state');
var time = require('./time');

/*
 * Calculate the interpolated position of a body.
 */
function bodyPos(body, frac) {
	// P2 can do this for us, but we will figure that out later.
	var p = body.position, pp = body.previousPosition;
	return [pp[0] + (p[0] - pp[0]) * frac, pp[1] + (p[1] - pp[1]) * frac];
}

/*
 * Main game screen.
 */
function Game() {
	var g = param.Game;

	// Timing manager
	this.time = null;

	// Sprite layer
	this.sprites = new sprites.Sprites();

	// Physics engine
	this.world = physics.createWorld();

	// Occupants
	var shape;
	this.bbody = new p2.Body({
		mass: g.Player.Mass,
		position: [0, 0],
		fixedRotation: true,
	});
	shape = new p2.Circle({ radius: 1 });
	shape.material = physics.Material.Player;
	this.bbody.addShape(shape);
	this.world.addBody(this.bbody);

	this.plane0 = new p2.Body({
		mass: 0,
		position: [0, -16],
	});
	shape = new p2.Plane();
	shape.material = physics.Material.World;
	this.plane0.addShape(shape);
	this.world.addBody(this.plane0);
	this.plane1 = new p2.Body({
		mass: 0,
		position: [0, 16],
		angle: Math.PI,
	});
	shape = new p2.Plane();
	shape.material = physics.Material.World;
	this.plane1.addShape(shape);
	this.world.addBody(this.plane1);

	physics.settle(this.world, 1 / param.Rate, 3.0);

	// Camera
	this.camera = new camera.Camera({
		target: this.bbody,
		targetY: 0,
		leading: g.Leading / g.Player.Speed,
	});

	this._bg = new background.Background(this.camera);
	this._bg.setGrid();

	// Minimum dot product which is considered "ground"
	this._groundThreshold = Math.cos(g.GroundAngle * (Math.PI / 180));
	this._drag = g.Player.Drag;
	this._jetForceUp = g.Player.Mass * g.Player.Jetpack;
	this._jetForceForward = g.Player.Speed * g.Player.Speed * g.Player.Drag;
}

/*
 * Initialize the screen.
 */
Game.prototype.init = function(r) {
	this._bg.init(r);
	this.time = new time.Time(this, r.time);
	control.game.enable();
};

/*
 * Destroy the screen
 */
Game.prototype.destroy = function(r) {
	this._bg.destroy(r);
	control.game.disable();
};

/*
 * Render the game screen, updating the game state as necessary.
 */
Game.prototype.render = function(r) {
	var gl = r.gl;
	this.time.update(r.time);
	var frac = this.time.frac;
	this.camera.update(r, frac);

	this._bg.render(r);
	this.sprites.clear();
	var pos = bodyPos(this.bbody, frac);
	this.sprites.add({ x: pos[0], y: pos[1], radius: 1.0, color: 0xff007fff });
	this.sprites.draw(gl, this.camera.MVP);
};

/*
 * Advance the game by one frame.  Called by the timing manager.
 *
 * dt: The timestep, in s
 */
Game.prototype.step = function(dt) {
	var ctl = control.game;
	ctl.update();
	var vx = this.bbody.velocity[0], vy = this.bbody.velocity[1];
	var vmag2 = vx * vx + vy * vy;
	var fdrag = vmag2 * this._drag;
	var a = vmag2 > 1e-3 ? 1.0 / Math.sqrt(vmag2) : 0;
	var fx = -fdrag * a * vx, fy = -fdrag * a * vy;
	if (ctl.jet.state) {
		fy += this._jetForceUp;
	}
	var grounded = this.isGrounded(this.bbody);
	if (!grounded) {
		fx += this._jetForceForward;
	}
	this.bbody.applyForce([fx, fy]);
	this.world.step(dt);
	this.camera.step();
};

/*
 * Test wether a body is touching the ground.
 */
Game.prototype.isGrounded = function(body) {
	if (body.sleepState === body.SLEEPING) {
		return true;
	}
	var eqs = this.world.narrowphase.contactEquations;
	var thresh = this._groundThreshold;
	for (var i = 0; i< eqs.length; i++){
		var eq = eqs[i];
		if (eq.bodyA === body) {
			if (-eq.normalA[1] >= thresh) {
				return true;
			}
		} else if (eq.bodyB === body) {
			if (eq.normalA[1] >= thresh) {
				return true;
			}
		}
	}
	return false;
};

/*
 * Update the uniforms for the background.
 */
Game.prototype._bgUniforms = function(r, p) {
};

// We export through the state module.
state.Game = Game;
