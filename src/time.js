/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var param = require('./param');

/*
 * Timing manager.  Calculates when to advance the simulation and what
 * the timestep is.
 *
 * Has a 'frac' property, for interpolating between successive
 * simulation frames.  It is between 0 and 1.
 *
 * target: An object with a 'step' method, which is passed the
 * timestep
 */
function Time(target) {
	// The object to periodically update
	this._target = target;

	// Target update frequency, in Hz
	this._rate = param.Rate;
	// Target update interval, in s
	this._dt = 1.0 / param.Rate;
	// Target update interval, in ms
	this._dtMsec = 1e3 * this._dt;

	// Previous update timestamp
	this._step0 = -1;
	// Next update timestamp
	this._step1 = -1;
	// Last update timestamp
	this._lastTime = -1;
	// The current fractional position between updates, in the range 0-1
	this.frac = 0;

	// Frame count as of last step
	this.frame = 0;
	// The total elapsed time
	this.elapsed = 0;
}

/*
 * Update the timer state.
 *
 * time: Timestamp in ms
 */
Time.prototype.update = function(curTime) {
	var lastTime = this._lastTime;
	this._lastTime = curTime;
	if (this._step1 < 0) {
		this._step(curTime);
		this.frac = 0;
		this.elapsed = 0;
		return;
	}

	if (curTime >= this._step1) {
		// At least one update
		if (curTime > lastTime + param.MaxUpdateInterval * 1e3) {
			// Too much time since last call, skip missing time
			console.warn('Lag');
			this._target.step(this._dt);
			this._step(curTime);
			this.frac = 0;
			this.elapsed = this._frame * this._dt;
			return;
		}
		do {
			this._target.step(this._dt);
			this._step(this._step1);
		} while (curTime >= this._step1);
	}

	var frac = (curTime - this._step0) / (this._step1 - this._step0);
	this.frac = Math.max(0, Math.min(1, frac));
	this.elapsed = (this._frame + this.frac) * this._dt;
};

/*
 * Advance the timing by one frame.
 *
 * time: The time at which the update takes place, in ms
 */
Time.prototype._step = function(stepTime) {
	this._step0 = stepTime;
	this._step1 = stepTime + this._dt * 1e3;
};

module.exports = {
	Time: Time,
};
