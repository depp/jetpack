/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var param = require('./param');

/*
 * Materials
 */
var Material = {
	World: new p2.Material(),
	Player: new p2.Material(),
};

/*
 * Contact materials (private)
 */
var Contact = [
	new p2.ContactMaterial(Material.Player, Material.World, {
		friction: 0.1,
	}),
];

/*
 * Create a new world.
 */
function createWorld() {
	var g = param.Game, i;
	var world = new p2.World({
		gravity: [0, -g.Gravity]
	});
	for (i = 0; i < Contact.length; i++) {
		world.addContactMaterial(Contact[i]);
	}
	return world;
}

/*
 * Run the simulation until all bodies are settled.
 *
 * world: The world
 * dt: Timestep
 * maxTime: Maximum settling time
 */
function settle(world, dt, maxTime) {
	var oldSleep = world.sleepMode;
	world.sleepMode = p2.World.BODY_SLEEPING;
	var bodies = world.bodies, i, b;
	var iter, maxIter = Math.ceil(maxTime / dt);
	/*jshint -W018*/
	if (!(maxIter < 1000)) {
		maxIter = 1000;
	}
	if (!(maxIter > 0)) {
		maxIter = 1;
	}
	var SLEEPING = p2.Body.SLEEPING, STATIC = p2.Body.STATIC;
	var numAwake;
	for (iter = 0; iter < maxIter; iter++) {
		numAwake = 0;
		for (i = 0; i < bodies.length; i++) {
			b = bodies[i];
			if (b.type !== STATIC && b.sleepState !== SLEEPING) {
				numAwake++;
			}
		}
		if (numAwake === 0) {
			break;
		}
		world.step(dt);
	}
	if (iter >= maxIter) {
		console.warn('Could not settle simulation, awake:', numAwake);
	} else {
		// console.log('Settling time: ', iter * dt);
	}
	var AWAKE = p2.Body.AWAKE;
	for (i = 0; i < bodies.length; i++) {
		bodies[i].sleepState = AWAKE;
	}
	// Doesn't work without waking all the bodies up
	world.sleepMode = oldSleep;
}

module.exports = {
	Material: Material,
	createWorld: createWorld,
	settle: settle,
};
