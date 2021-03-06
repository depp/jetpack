/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var param = require('./param');

// GroundAngle expressed as a dot product
var GroundThreshold = Math.cos(param.Game.GroundAngle * (Math.PI / 180));

/*
 * Materials
 */
var Material = {
	World: new p2.Material(),
	Player: new p2.Material(),
	Bouncy: new p2.Material(),
};

/*
 * Contact materials (private)
 */
var Contact = [
	new p2.ContactMaterial(Material.Player, Material.World, {
		friction: param.Game.Friction,
	}),
	new p2.ContactMaterial(Material.Bouncy, Material.World, {
		restitution: 0.4,
	}),
];

/*
 * Collision masks
 */
var Mask = {
	// The world and obstacles
	World: 1,
	// The player and player shots
	Player: 2,
	// The enemy and enemy shots
	Enemy: 4,
	// Items
	Item: 8,
};

/*
	World mask: Player | Enemy
	Player mask: World | Enemy
	Enemy mask: World | Enemy
	Item mask: Player
*/

/*
 * Reset the world.
 */
function resetWorld(world) {
	var g = param.Game, i;
	world.clear();
	world.gravity[1] = - g.Gravity;
	for (i = 0; i < Contact.length; i++) {
		world.addContactMaterial(Contact[i]);
	}
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


/*
 * Test wether a body is touching the ground.
 */
function isGrounded(world, body) {
	if (body.sleepState === body.SLEEPING) {
		return true;
	}
	var eqs = world.narrowphase.contactEquations;
	var thresh = GroundThreshold;
	for (var i = 0; i < eqs.length; i++){
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
}

/*
 * Compute angle a2 - a1.
 */
function deltaAngle(a1, a2) {
	var d = a2 - a1;
	d = d % (2 * Math.PI);
	if (d > Math.PI) {
		d -= 2 * Math.PI;
	} else if (d < -Math.PI) {
		d += 2 * Math.PI;
	}
	return d;
}

/*
 * Adjust a body angle to the given heading.
 */
function adjustAngle(body, a, turnRate) {
	var limit = turnRate / param.Rate;
	var delta = deltaAngle(body.angle, a);
	var d = Math.max(-limit, Math.min(+limit, delta));
	body.angle += d;
}

/*
 * Adjust a body angle to the given heading.
 */
function adjustVelocity(body, vel, accel) {
	var limit = accel / param.Rate;
	var v = body.velocity;
	var dx = vel[0] - v[0], dy = vel[1] - v[1];
	var d2 = dx * dx + dy * dy;
	if (d2 < 0.01) {
		return;
	}
	if (d2 > limit * limit) {
		var a = limit / Math.sqrt(d2);
		dx *= a;
		dy *= a;
	}
	v[0] += dx;
	v[1] += dy;
}

/*
 * Change the properties of a body to make it behave like a corpse.
 */
function corpsify(body) {
	body.gravityScale = 1;
	body.mass *= 0.5;
	body.fixedRotation = false;
	body.updateMassProperties();
	_.forEach(body.shapes, function(s) {
		s.material = Material.Bouncy;
	});
}

module.exports = {
	Material: Material,
	Mask: Mask,
	resetWorld: resetWorld,
	settle: settle,
	isGrounded: isGrounded,
	deltaAngle: deltaAngle,
	adjustAngle: adjustAngle,
	adjustVelocity: adjustVelocity,
	corpsify: corpsify,
};
