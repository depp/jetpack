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
var entity = require('./entity');
var lights = require('./lights');
var param = require('./param');
var physics = require('./physics');
var player = require('./player');
var segment = require('./segment');
var sprites = require('./sprites');
var state = require('./state');
var tiles = require('./tiles');
var time = require('./time');
var util = require('./util');

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

	// Physics engine and entities
	this.world = null;
	this.player = null;
	this.camera = new camera.Camera({
		leading: g.Leading / g.Speed,
		offsetX: 20,
	});
	this.buffers = null;
	this.enemies = null;
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
y * Destroy the screen
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
	this.enemies.emit(this, frac);
	var b = this.world.bodies, i;
	for (i = 0; i < b.length; i++) {
		var e = b[i].entity;
		if (e) {
			e.emit(this, frac);
		}
	}
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
	if (!this.world) {
		this.nextSegment(true);
	} else {
		if (this.camera._pos1[0] > this.buffers[1][0]) {
			this.nextSegment(false);
		}
	}
	control.game.update();
	this.player.step(this);
	this.enemies.step(this);
	this.world.step(dt);
	this.camera.step();
};

/*
 * Transition to the next segment.
 */
Game.prototype.nextSegment = function(isFirst) {
	var offset, b;
	if (isFirst) {
		this.player = new player.Player();
		offset = [0, -param.Level.MaxGap * 0.5 + 1];
	} else {
		b = this.buffers[1];
		offset = [-b[0], -b[1]];
	}
	this.world = physics.createWorld();
	segment.makeSegment(this, util.randInt(0, 2));
	b = this.buffers[0];
	offset[0] += b[0];
	offset[1] += b[1];
	this.player.addToWorld(this.world, offset);
	this.camera.set({ target: this.player.body });
	if (isFirst) {
		physics.settle(this.world, 1 / param.Rate, 3.0);
		this.camera.reset();
	} else {
		this.background.addOffset(offset);
		this.camera.addOffset(offset);
	}
};

/*
 * Spawn an entity.
 */
Game.prototype.spawn = function(args) {
	entity.spawn(this, args);
};

// We export through the state module.
state.Game = Game;
