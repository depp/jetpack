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
var lights = require('./lights');
var param = require('./param');
var physics = require('./physics');
var player = require('./player');
var segment = require('./segment');
var sprites = require('./sprites');
var state = require('./state');
var tiles = require('./tiles');
var time = require('./time');

/*
 * Main game screen.
 */
function Game() {
	var g = param.Game;

	// Timing manager
	this.time = new time.Time(this);

	// Graphics layers
	this.background = new background.Background();
	this.background.setGrid();
	this.tiles = new tiles.Tiles();
	this.sprites = new sprites.Sprites();
	this.lights = new lights.Lights();
	this.lights.addGlobal([{
		color: [1.0, 0.9, 0.2],
		intensity: 0.6,
		direction: [1, 5, 5],
	}, {
		color: [0.4, 0.3, 1.0],
		intensity: 0.4,
		direction: [-7, -4, +10],
	}, {
		color: [0.3, 0.5, 0.9],
		intensity: 0.4,
		direction: [7, -4, +8],
	}]);

	// Physics engine
	this.world = physics.createWorld();

	// Occupants
	this.segment = segment.makeSegment(2);
	this.player = new player.Player();
	this.world.addBody(this.player.body);

	// Camera
	this.camera = new camera.Camera({
		target: this.player.body,
		leading: g.Leading / g.Speed,
		offsetX: 20,
	});

	this.segment.emit(this);
	physics.settle(this.world, 1 / param.Rate, 3.0);
}

/*
 * Initialize the screen.
 */
Game.prototype.init = function(r) {
	this.background.init(r);
	this.tiles.init(r);
	this.sprites.init(r);
	control.game.enable();
};

/*
 * Destroy the screen
 */
Game.prototype.destroy = function(r) {
	this.background.destroy(r);
	this.tiles.destroy();
	this.sprites.destroy();
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
	this.sprites.clear();
	this.lights.clearLocal();
	this.player.emit(this, frac);
	this.lights.update(this.camera);

	this.background.render(r, this.camera);
	this.tiles.render(r, this.camera, this.lights);
	this.sprites.render(r, this.camera);
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

// We export through the state module.
state.Game = Game;
