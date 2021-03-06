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
var hud = require('./hud');
var lights = require('./lights');
var param = require('./param');
var physics = require('./physics');
var poly = require('./poly');
var segment = require('./segment');
var sprites = require('./sprites');
var state = require('./state');
var text = require('./text');
var tiles = require('./tiles');
var time = require('./time');
var tween = require('./tween');

/*
 * Main game screen.
 */
function GameScreen() {
	this.levelIndex = 0;
	this.time = null;
	this._tweens = null;
	this.hud = null;
	this.buffers = null;
	this.world = new p2.World();
	this.world.on("beginContact", this._beginContact.bind(this));
	this.teams = {player: [], enemy: []};
	this.camera = null;
}

/*
 * Start the screen.
 */
GameScreen.prototype.start = function(r) {
	var g = param.Game;

	this.levelIndex = 0;

	// Initialize graphics layers and controls
	text.init(r);
	background.init(r);
	tiles.init(r);
	sprites.init(r);
	poly.init(r);
	control.game.enable();
	text.clear();

	// Set base graphics
	poly.ui.clear();
	lights.clear();
	lights.addGlobal([{
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

	// Create level structures
	this.time = new time.Time(this);
	this._tweens = new tween.TweenManager();
	this.hud = new hud.Hud();
	this.buffers = [vec2.create(), vec2.create()];
	this.world.clear();
	this.camera = new camera.Camera({
		leading: g.Leading / g.Speed,
		offsetX: 20,
	});
	this.nextSegment();
	this.spawn('Player', {});
	this.camera.reset();
	this.score = 0;
	this.bonus = 1;

	this.message(
		new text.Layout({
			position: [param.Width / 2, param.Height / 2],
		}).addLine({ text: 'Blast Off!', scale: 4 })
	);
};

/*
 * Stop the screen
 */
GameScreen.prototype.stop = function(r) {
	this.world.clear();
	this.time = null;
	this._tweens = null;
	_.forOwn(this.teams, function(value) { value.length = 0; });

	text.clear();
	tiles.clear();
	sprites.world.clear();
	poly.ui.clear();
	control.game.disable();
};

/*
 * Render the game screen, updating the game state as necessary.
 */
GameScreen.prototype.render = function(r) {
	var gl = r.gl;
	this.time.update(r.time);
	var frac = this.time.frac, curTime = this.time.elapsed;
	var bodies = this.world.bodies, i, b, e;

	sprites.world.clear();
	sprites.ui.clear();
	lights.clearLocal();
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
			e.emit(curTime);
		}
	}
	this.hud.emit();

	this.camera.update(r, frac);
	lights.update(this.camera);
	background.render(r, this.camera);
	tiles.render(r, this.camera);
	sprites.world.render(r, this.camera);
	sprites.ui.render(r, this.camera);
	poly.ui.render(r, this.camera);
	text.render(r, this.camera);
};

/*
 * Advance the game by one frame.  Called by the timing manager.
 *
 * dt: The timestep, in s
 */
GameScreen.prototype.step = function(dt) {
	var bodies = this.world.bodies, i, ents, e, team, lock;

	if (this.camera._pos1[0] > this.buffers[1][0]) {
		this.nextSegment();
	}

	control.game.update();

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

	this.hud.step(this);
	this.world.step(dt);
	this.camera.step();
};

/*
 * Transition to the next segment.
 */
GameScreen.prototype.nextSegment = function() {
	// console.log('Next segment');

	// Figure out which bodies to keep
	var bodies = this.world.bodies, i, b, e, keep = [];
	var keepMinX = this.buffers[1][0] - param.Level.BufferWidth * 0.5 - 10;
	var keepMaxX = this.buffers[1][0] + param.Level.BufferWidth * 0.5;
	for (i = 0; i < bodies.length; i++) {
		b = bodies[i];
		e = b.entity;
		if (!e) {
			continue;
		}
		if (e.alwaysKeep ||
				(b.position[0] >= keepMinX && b.position[0] <= keepMaxX)) {
			keep.push(b);
		}
	}

	// Create the next segment
	var offset = vec2.create();
	physics.resetWorld(this.world);
	vec2.negate(offset, this.buffers[1]);
	segment.makeSegment(this);
	vec2.add(offset, offset, this.buffers[0]);
	for (i = 0; i < keep.length; i++) {
		b = keep[i];
		vec2.add(b.position, b.position, offset);
		this.world.addBody(b);
	}
	background.addOffset(offset);
	this.camera.addOffset(offset);
};

GameScreen.prototype._beginContact = function(evt) {
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
GameScreen.prototype.spawn = function(type, args) {
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
GameScreen.prototype.spawnObj = function(ent) {
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
GameScreen.prototype.scan = function(options) {
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
GameScreen.prototype.tween = function() {
	return this._tweens.tween.apply(this._tweens, arguments);
};

/*
* Display a message on the screen.
*/
GameScreen.prototype.message = function(layout) {
	var pos = vec2.clone(layout.position);
	layout.position[1] = -100;
	text.addLayout(layout);
	this.tween(layout)
		.to({ position: pos }, 1.0, 'SwiftOut')
		.wait(0.3)
		.to({ color: color.Transparent }, 0.5)
		.callback(function() { text.removeLayout(layout); })
		.start();
};

GameScreen.prototype.award = function(pts) {
	if (isNaN(pts)) {
		return;
	}
	var amt = this.bonus * pts;
	if (amt > 0) {
		this.score += amt;
	}
};

module.exports = {
	GameScreen: GameScreen,
};
