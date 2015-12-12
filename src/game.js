/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var camera = require('./camera');
var control = require('./control');
var filter = require('./filter');
var sprites = require('./sprites');
var state = require('./state');
var time = require('./time');

var GRAVITY = 50;
var PLAYER_MASS = 5;
var PLAYER_DRAG = 0.5;
var PLAYER_SPEED = 25;
var FOV_Y = 18;

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

	this._bg = new filter.Filter({
		shader: 'game_bg',
		uniforms: 'Xform Grid Color',
		func: this._bgUniforms,
		target: this,
	});
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
	this.camera.update(frac);

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
	var fdrag = vmag2 * PLAYER_DRAG;
	var a = vmag2 > 1e-3 ? 1.0 / Math.sqrt(vmag2) : 0;
	var fx = -fdrag * a * vx, fy = -fdrag * a * vy;
	if (ctl.jet.state) {
		fy += PLAYER_MASS * GRAVITY * 2;
	}
	fx += PLAYER_SPEED * PLAYER_SPEED * PLAYER_DRAG;
	this.bbody.applyForce([fx, fy]);
	this.world.step(dt);
	this.camera.step();
};

/*
 * Update the uniforms for the background.
 */
Game.prototype._bgUniforms = function(r, p) {
	var gl = r.gl;
	var fov_y = FOV_Y, fov_x = fov_y * r.aspect;
	var pos = this.camera.pos;
	gl.uniform4fv(p.Xform, [
		fov_x / r.width, fov_y / r.height,
		pos[0] - fov_x * 0.5, pos[1] - fov_y * 0.5,
	]);
	gl.uniform2fv(p.Grid, [
		0.1, 1 / 2,
	]);
	gl.uniform4fv(p.Color, [
		0.2, 0.2, 0.2, 1.0,
		0.3, 0.4, 0.5, 1.0,
	]);
};

// We export through the state module.
state.Game = Game;
