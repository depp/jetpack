/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var control = require('./control');
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
	// Timing manager
	this.time = null;

	// Sprite layer
	this.sprites = new sprites.Sprites();

	// Physics engine
	this.world = new p2.World({
		gravity: [0, -9.82],
	});

	// Occupants
	this.bbody = new p2.Body({
		mass: 5,
		position: [0, 5],
	});
	this.bbody.addShape(new p2.Circle({ radius: 1 }));
	this.world.addBody(this.bbody);
	this.gbody = new p2.Body({
		mass: 0,
		position: [0, -5],
	});
	this.gbody.addShape(new p2.Plane());
	this.world.addBody(this.gbody);
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

	gl.viewport(0, 0, width, height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	this.sprites.clear();
	var pos = bodyPos(this.bbody, frac);
	this.sprites.add({
		x: pos[0] * 32,
		y: pos[1] * 32,
	});
	this.sprites.draw(gl);
};

/*
 * Advance the game by one frame.  Called by the timing manager.
 *
 * dt: The timestep, in s
 */
Game.prototype.step = function(dt) {
	var ctl = control.game;
	ctl.update();
	if (ctl.jump.press) {
		console.log('JUMP');
		this.bbody.applyImpulse([0, 50]);
	}
	var move = ctl.move.value;
	this.bbody.applyForce([move[0] * 50, move[1] * 50]);
	this.world.step(dt);
};

// We export through the state module.
state.Game = Game;
