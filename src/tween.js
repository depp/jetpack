/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var bezierEasing = require('bezier-easing');

/*
 * The only easing functions we care about.
 */
var Easing = {
	Linear: function(t) {
		return t;
	},
	SineInOut: function(t) {
		return -0.5 * (Math.cos(Math.PI * t) - 1);
	},
	SwiftOut: bezierEasing(0.55, 0, 0.1, 1).get,
};

/*
 * Interpolate discrete values.
 */
function lerpDiscrete(out, v0, v1, t) {
	if (t < 1) {
		return v0;
	} else {
		return v1;
	}
}

/*
 * Interpolate numbers.
 */
function lerpNumber(out, v0, v1, t) {
	if (t < 1) {
		if (t > 0) {
			return v0 + t * (v1 - v0);
		} else {
			return v0;
		}
	} else {
		return v1;
	}
}

/*
 * Interpolate continuous arrays.
 */
function lerpArray(out, v0, v1, t) {
	var i, n = out.length;
	if (t < 1) {
		if (t > 0) {
			for (i = 0; i < n; i++) {
				out[i] = v0[i] + t * (v1[i] - v0[i]);
			}
		} else {
			for (i = 0; i < n; i++) {
				out[i] = v0[i];
			}
		}
	} else {
		for (i = 0; i < n; i++) {
			out[i] = v1[i];
		}
	}
	return out;
}

/*
 * Get the interpolator for a value.
 */
function interpolator(value) {
	if (value instanceof Float32Array) {
		return lerpArray;
	} else if (typeof value == 'number') {
		return lerpDiscrete;
	} else {
		return lerpArray;
	}
}

/*
 * Copy a value.
 */
function copy(value) {
	if (value instanceof Float32Array) {
		return new Float32Array(value);
	}
	return value;
}

/*
 * Automatically updated tween.
 *
 * target: The object to modify
 * curTime: The current time
 * options: Tween options (only 'loop' is an option)
 */
function Tween(target, initTime, props) {
	this.done = false;
	this.target = target;
	this._segs = [];
	this._vals = {};
	this._funcs = {};
	this._time = initTime;
}

/*
 * Update the tween.
 */
Tween.prototype.update = function(time) {
	var t, key, done, target = this.target;
	for (; this._segs.length > 0; this._segs.shift()) {
		var seg = this._segs[0];
		if (time < seg.t0) {
			return;
		}
		if (time < seg.t1) {
			if (seg.easeFunc) {
				t = seg.easeFunc((time - seg.t0) / (seg.t1 - seg.t0));
				for (key in seg.v1) {
					target[key] = this._funcs[key](
						target[key], seg.v0[key], seg.v1[key], t);
				}
			}
			return;
		}
		for (key in seg.v1) {
			target[key] = this._funcs[key](
				target[key], undefined, seg.v1[key], 1);
		}
		if (seg.callback) {
			seg.callback(target);
		}
	}
	if (time >= this._time) {
		this.done = true;
	}
};

/*
 * Pause the tween for the given number of secons.
 */
Tween.prototype.wait = function(duration) {
	if (isNaN(duration)) {
		this._time += Math.max(duration, 0);
	}
	return this;
};

/*
 * Pause the tween for the given number of secons.
 */
Tween.prototype.to = function(props, duration, ease) {
	if (isNaN(duration)) {
		duration = 0;
	}
	var v0 = {}, v1 = {};
	_.forOwn(props, function(value, key) {
		var curValue;
		value = copy(value);
		if (this._vals.hasOwnProperty(key)) {
			v0[key] = this._vals[key];
		} else if (key in this.target) {
			curValue = this.target[key];
			if (!this.target.hasOwnProperty(key)) {
				console.log('Warning: tweening an inherited property');
				this.target[key] = copy(curValue);
			}
			this._funcs[key] = interpolator(curValue);
			v0[key] = copy(curValue);
		} else {
			console.warn('Tween introduces unknown property: ' + key);
			return;
		}
		v1[key] = value;
		this._vals[key] = value;
	}, this);
	var easeFunc = Easing.Linear;
	if (ease) {
		if (!Easing.hasOwnProperty(ease)) {
			console.error('Unknown easing function: ' + ease);
		} else {
			easeFunc = Easing[ease];
		}
	}
	if (duration <= 0) {
		v0 = null;
		easeFunc = null;
	}
	var t0 = this._time, t1 = Math.max(t0, t0 + duration);
	this._segs.push({
		t0: t0,
		t1: t1,
		v0: v0,
		v1: v1,
		duration: duration,
		easeFunc: easeFunc,
	});
	this._time = t1;
	return this;
};

module.exports = {
	Tween: Tween,
};
