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
var player = require('./player');
var sprites = require('./sprites');
var state = require('./state');
var time = require('./time');

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
	this.player = new player.Player();
	this.world.addBody(this.player.body);

	var shape;
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
		target: this.player.body,
		targetY: 0,
		leading: g.Leading / g.Speed,
	});

	this._bg = new background.Background(this.camera);
	this._bg.setGrid();
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
	this.player.emit(this, frac);
	this.sprites.draw(gl, this.camera.MVP);
};

/*
 * Advance the game by one frame.  Called by the timing manager.
 *
 * dt: The timestep, in s
 */
Game.prototype.step = function(dt) {
	control.game.update();
	this.player.step(this);
	this.world.step(dt);
	this.camera.step();
};

/*
 * Update the uniforms for the background.
 */
Game.prototype._bgUniforms = function(r, p) {
};

// We export through the state module.
state.Game = Game;
