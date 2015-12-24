/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

module.exports = {
	// Physics update rate, in Hz.
	Rate: 60,

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
		Gravity: 50,
		// Distance to lead the player by, at full velocity
		Leading: 2,
		// Player mass
		Mass: 5,
		// Air drag coefficient (must not be zero, or max speed is infinite)
		Drag: 0.1,
		// Maximum forward speed
		Speed: 30,
		// Jetpack acceleration
		Jetpack: 100,
		// Friction coefficient
		Friction: 0.5,
		// Maximum angle, in degrees, which is considered "ground"
		GroundAngle: 30,
		// Length of time an item lasts
		ItemTime: 12,
		// Length of time we show hurt animation
		HurtTime: 0.2,
		// Maximum / starting health
		MaxHealth: 8,
	},

	// Level generation
	Level: {
		// Maximum gap between floor and ceiling
		MaxGap: 32,
		// Minimum gap between floor and ceiling
		MinGap: 12,
		// Width of buffer between segments
		// A little wider than the screen, so we can hide transitions
		BufferWidth: 70,
	},

	// Maximum distance to scan for objects.
	ScanDistance: 50,

	// Screen width
	Width: 800,
	// Screen height
	Height: 450,

};
