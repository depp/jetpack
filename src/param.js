/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

module.exports = {
	// Physics update rate, in Hz.
	Rate: 30,

	// Height of level
	LevelY: 32,
	// Span of vertical field of view
	FovY: 36,

	// Maximum update interval, in s.  If this much time passes without
	// an update, the game temporarily pauses.
	MaxUpdateInterval: 0.5,

	// Game camera parameters
	Camera: {
		// Number of filter stages for camera smoothing
		FilterOrder: 3,
		// Filter constant for filter stages
		FilterTime: 0.001,
	},

	// Game parameters
	Game: {
		// Gravity acceleration
		Gravity: 75,
		// Distance to lead the player by, at full velocity
		Leading: 2,
		// Player mass
		Mass: 5,
		// Air drag coefficient (must not be zero, or max speed is infinite)
		Drag: 0.1,
		// Maximum forward speed
		Speed: 50,
		// Jetpack acceleration
		Jetpack: 150,
		// Friction coefficient
		Friction: 0.5,
		// Maximum angle, in degrees, which is considered "ground"
		GroundAngle: 30,
	},
};
