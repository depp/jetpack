/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

module.exports = {
	// Physics update rate, in Hz.
	RATE: 30,
	// Maximum update interval, in s.  If this much time passes without
	// an update, the game temporarily pauses.
	MAX_UPDATE_INTERVAL: 0.5,

	CAMERA: {
		FILTER_ORDER: 3,
		FILTER_TIME: 0.001,
	},
};
