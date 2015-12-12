/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var camera = require('./camera');
var control = require('./control');
var sprites = require('./sprites');
var state = require('./state');
var time = require('./time');

var GRAVITY = 30;
var PLAYER_MASS = 5;
var PLAYER_DRAG = 0.5;
var PLAYER_SPEED = 10;

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
	// Timing manager
	this.time = null;

	// Sprite layer
	this.sprites = new sprites.Sprites();

	// Physics engine
	this.world = new p2.World({
		gravity: [0, -GRAVITY],
	});

	// Occupants
	this.bbody = new p2.Body({
		mass: PLAYER_MASS,
		position: [0, 0],
	});
	this.bbody.addShape(new p2.Circle({ radius: 1 }));
	this.world.addBody(this.bbody);

	this.plane0 = new p2.Body({
		mass: 0,
		position: [0, -16],
	});
	this.plane0.addShape(new p2.Plane());
	this.world.addBody(this.plane0);
	this.plane1 = new p2.Body({
		mass: 0,
		position: [0, 16],
		angle: Math.PI,
	});
	this.plane1.addShape(new p2.Plane());
	this.world.addBody(this.plane1);

	// Camera
	this.camera = new camera.Camera({
		target: this.bbody,
		targetY: 0,
	});
}

/*
 * Initialize the screen.
 */
Game.prototype.init = function(curTime) {
	this.time = new time.Time(this, curTime);
	control.game.enable();
};

/*
 * Destroy the screen
 */
Game.prototype.destroy = function() {
	control.game.disable();
};

/*
 * Render the game screen, updating the game state as necessary.
 */
Game.prototype.render = function(curTime, gl, width, height, aspect) {
	this.time.update(curTime);
	var frac = this.time.frac;
	var mvp = this.camera.mvp(frac);

	gl.viewport(0, 0, width, height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	this.sprites.clear();
	var pos = bodyPos(this.bbody, frac);
	this.sprites.add({ x: pos[0], y: pos[1], radius: 1.0, color: 0xff007fff });
	this.sprites.draw(gl, mvp);
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
	var fdrag = vmag2 * PLAYER_DRAG;
	var a = vmag2 > 1e-3 ? 1.0 / Math.sqrt(vmag2) : 0;
	var fx = -fdrag * a * vx, fy = -fdrag * a * vy;
	if (ctl.jet.state) {
		fy += PLAYER_MASS * GRAVITY * 2;
	}
	fx += PLAYER_SPEED * PLAYER_SPEED * PLAYER_DRAG;
	// console.log(fx, fy);
	this.bbody.applyForce([fx, fy]);
	this.world.step(dt);
	this.camera.step();
};

// We export through the state module.
state.Game = Game;
