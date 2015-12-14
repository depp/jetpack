/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

// Load all entity types
require('./enemy');
require('./item');
require('./shot');
require('./player');

var background = require('./background');
var camera = require('./camera');
var color = require('./color');
var control = require('./control');
var entity = require('./entity');
var lights = require('./lights');
var param = require('./param');
var physics = require('./physics');
var segment = require('./segment');
var sprites = require('./sprites');
var state = require('./state');
var tiles = require('./tiles');
var time = require('./time');
var tween = require('./tween');
var util = require('./util');

/*
 * Main game screen.
 */
function Game() {
	var g = param.Game;

	// Timing manager
	this.time = new time.Time(this);
	this._tweens = new tween.TweenManager();

	// Graphics layers
	this.background = new background.Background();
	this.background.setGrid();
	this.tiles = new tiles.Tiles();
	this.sprites = new sprites.Sprites();
	this.lights = new lights.Lights();
	this.lights.addGlobal([{
		color: color.rgb(1.0, 0.9, 0.2),
		intensity: 0.6,
		direction: [1, 5, 5],
	}, {
		color: color.rgb(0.4, 0.3, 1.0),
		intensity: 0.4,
		direction: [-7, -4, +10],
	}, {
		color: color.rgb(0.3, 0.5, 0.9),
		intensity: 0.4,
		direction: [7, -4, +8],
	}]);

	// Physics engine and entities
	this.teams = {player: [], enemy: []};
	this.world = new p2.World();
	this.camera = new camera.Camera({
		leading: g.Leading / g.Speed,
		offsetX: 20,
	});
	this.buffers = [
		vec2.create(),
		vec2.create(),
	];

	// Initial state
	this.nextSegment();
	this.spawn('Player', {});
	physics.settle(this.world, 1 / param.Rate, 3.0);
	this.camera.reset();
	this.world.on("beginContact", this._beginContact.bind(this));
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
	var bodies = this.world.bodies, i, b, e, curTime;

	this.sprites.clear();
	this.lights.clearLocal();
	this._tweens.update(this.time.elapsed);

	// If we relied on p2.js to manage update timing, then it would
	// interpolate the positions for us.  We do it ourselves because
	// p2.js does not expose the interface.  I should file an
	// enhancement request.
	for (i = 0; i < bodies.length; i++) {
		b = bodies[i];
		e = b.entity;
		if (!e) {
			continue;
		}
		vec2.lerp(b.interpolatedPosition, b.previousPosition, b.position, frac);
		b.interpolatedAngle = b.previousAngle + frac * (b.angle - b.previousAngle);
	}
	for (i = 0; i < bodies.length; i++) {
		e = bodies[i].entity;
		if (e && e.emit) {
			e.emit(this);
		}
	}

	this.camera.update(r, frac);
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
	var bodies = this.world.bodies, i, ents, e, team, lock;

	if (this.camera._pos1[0] > this.buffers[1][0]) {
		this.nextSegment();
	}

	control.game.update();

	this._tweens.prune(function(e) { return e.body && e.body.world; });
	this._tweens.updateTime(this.time.elapsed);

	ents = [];
	_.forOwn(this.teams, function(value) { value.length = 0; });
	// Get all entities, discard expired entities, assign to teams
	var fr = this.time.frame;
	for (i = 0; i < bodies.length; i++) {
		e = bodies[i].entity;
		if (e) {
			if (e.endFrame && fr >= e.endFrame) {
				entity.destroy(e.body);
			} else {
				ents.push(e);
				if (e.team) {
					this.teams[e.team].push(e);
				}
			}
		}
	}
	// Update lock count on enemies
	team = this.teams.enemy;
	for (i = 0; i < team.length; i++) {
		team[i].lockCount = 0;
	}
	for (i = 0; i < ents.length; i++) {
		e = ents[i];
		lock = e.targetLock;
		if (lock) {
			if (!lock.body || !lock.body.world) {
				e.targetLock = null;
			} else {
				if (lock.team == 'enemy') {
					lock.lockCount++;
				}
			}
		}
	}
	// Advance all entities one step
	for (i = 0; i < ents.length; i++) {
		e = ents[i];
		if (e.step) {
			e.step(this);
		}
	}

	this.world.step(dt);
	this.camera.step();
};

/*
 * Transition to the next segment.
 */
Game.prototype.nextSegment = function() {
	console.log('Next segment');

	// Figure out which bodies to keep
	var bodies = this.world.bodies, i, b, e, keep = [];
	var keepMinX = this.buffers[1][0] - param.Level.BufferWidth * 0.5 - 10;
	for (i = 0; i < bodies.length; i++) {
		b = bodies[i];
		e = b.entity;
		if (e && (e.alwaysKeep || b.position[0] >= keepMinX)) {
			keep.push(b);
		}
	}

	// Create the next segment
	var offset = vec2.create();
	physics.resetWorld(this.world);
	vec2.negate(offset, this.buffers[1]);
	segment.makeSegment(this, util.randInt(0, 2));
	vec2.add(offset, offset, this.buffers[0]);
	for (i = 0; i < keep.length; i++) {
		b = keep[i];
		vec2.add(b.position, b.position, offset);
		this.world.addBody(b);
	}
	this.background.addOffset(offset);
	this.camera.addOffset(offset);
};

Game.prototype._beginContact = function(evt) {
	var a = evt.bodyA, b = evt.bodyB, eq = evt.contactEquations;
	if (a.entity && a.entity.onContact) {
		a.entity.onContact(this, eq, b);
	}
	if (b.entity && b.entity.onContact) {
		b.entity.onContact(this, eq, a);
	}
};

/*
 * Construct an entity and spawn it.
 */
Game.prototype.spawn = function(type, args) {
	var ctor = entity.getType(type);
	if (!ctor) {
		console.error('No such type: ' + type);
		return;
	}
	this.spawnObj(ctor(this, args));
};

/*
 * Spawn an entity which is already constructed.
 */
Game.prototype.spawnObj = function(ent) {
	var body = ent.body;
	if (!body) {
		console.warn('Could not spawn entity');
		return;
	}
	body.entity = ent;
	if (!body.world) {
		this.world.addBody(body);
		// Workaround (might be a bug in p2.js...)
		vec2.copy(body.previousPosition, body.position);
	}
	if ('lifespan' in ent) {
		ent.endFrame = this.time.frame + Math.ceil(ent.lifespan * param.Rate);
	}
};

/*
 * Scan for a member of the given team.
 *
 * options.team: The team to search for
 * options.position: Position to start searching
 * options.direction: Direction to favor in search
* options.angle
 */
Game.prototype.scan = function(options) {
	var team = this.teams[options.team];
	if (team.length === 0) {
		// console.log('Nothing to scan for');
		return null;
	}

	var pos = options.position;
	var delta = vec2.create();
	var dir = vec2.create();
	if (options.hasOwnProperty('direction')) {
		vec2.normalize(dir, options.direction);
	} else if (options.hasOwnProperty('angle')) {
		vec2.set(
			dir, Math.cos(options.angle), Math.sin(options.angle));
	}
	var maxDist2 = param.ScanDistance * param.ScanDistance;

	function evaluate(ent) {
		if (!ent.body || !ent.body.world) {
			return Infinity;
		}
		vec2.subtract(delta, ent.body.position, pos);
		var dist2 = vec2.squaredLength(delta);
		if (dist2 > maxDist2) {
			return Infinity;
		}
		var dist = Math.sqrt(dist2);
		var value = (dist + 10) * (2 - vec2.dot(delta, dir) / dist);
		if (ent.lockCount) {
			value *= 1 + 0.5 * ent.lockCount;
		}
		// console.log('VALUE', value);
		return value;
	}
	var best = team.length > 1 ? _.min(team, evaluate) : team[0];
	var value = evaluate(best);
	if (!isFinite(value) && value > 0) {
		if (false) {
			console.log('Nothing found (scanned: ' + team.length + ')');
		}
		return null;
	}
	// console.log('Found value = ' + value);
	if (best.team == 'enemy') {
		if (!best.hasOwnProperty('lockCount')) {
			console.error('no lock count');
		} else {
			best.lockCount++;
		}
	}
	return best;
};

/*
 * Create a tween.
 *
 * target: Entity to modify (must be an entity!)
 * props: Options ('loop' is one)
 */
Game.prototype.tween = function() {
	return this._tweens.tween.apply(this._tweens, arguments);
};

// We export through the state module.
state.Game = Game;
