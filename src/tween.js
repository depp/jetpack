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
	SineIn: function(t) {
		return 1 - Math.cos(0.5 * Math.PI * t);
	},
	SineOut: function(t) {
		return Math.sin(Math.PI * 0.5 * t);
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
	if (value instanceof Float32Array || _.isArray(value)) {
		return lerpArray;
	} else if (typeof value == 'number') {
		return lerpNumber;
	} else {
		return lerpDiscrete;
	}
}

/*
 * Copy a value.
 */
function copy(value) {
	if (value instanceof Float32Array) {
		return new Float32Array(value);
	} else if (_.isArray(value)) {
		return value.slice();
	} else {
		return value;
	}
}

/*
 * Manager for tweens.
 */
function TweenManager() {
	this._tweens = [];
	this._time = 0;
}

/*
 * Remove all tweens.
 */
TweenManager.prototype.clear = function() {
	this._tweens = [];
};

/*
 * Prune tweens whose objects don't match the predicate.
 */
TweenManager.prototype.prune = function(func, thisArg) {
	var tws = this._tweens, i, tw;
	for (i = tws.length; i > 0; i--) {
		tw = tws[i - 1];
		if (!func.call(thisArg, tw._target)) {
			// console.log('Killed a live tween');
			tws.splice(i - 1, 1);
		}
	}
};

/*
 * Update the current time without updating the tweens.
 */
TweenManager.prototype.updateTime = function(time) {
	this._time = time;
};

/*
 * Update all tweens.
 */
TweenManager.prototype.update = function(time) {
	this._time = time;
	var tws = this._tweens, i, tw;
	for (i = tws.length; i > 0; i--) {
		tw = tws[i - 1];
		tw._update(time);
		if (!tw.running) {
			// console.log('Killed a dead tween');
			tws.splice(i - 1, 1);
		}
	}
};

/*
 * Create a new tween.
 */
TweenManager.prototype.tween = function(target, props) {
	return new Tween(this, target, props);
};

/*
 * Automatically updated tween.
 *
 * target: The object to modify
 * curTime: The current time
 * options: Tween options (only 'loop' is an option)
 */
function Tween(mgr, target, props) {
	this._mgr = mgr;
	this._target = target;
	this.reset(props);
}

/*
 * Reset the tween.
 */
Tween.prototype.reset = function(props) {
	if (this.running) {
		this.update(this._mgr._time);
	}
	this.running = false;
	this._index = 0;     // current segment
	this._segs = [];     // tween segments
	this._vals = {};     // copies of latest target properties
	this._funcs = {};    // functions for interpolating target properties
	this._startTime = 0; // timestamp of starting time
	this._totalTime = 0; // length, in seconds
	this._loop = props && !!props.loop;
	return this;
};

/*
 * Start running the tween.
 */
Tween.prototype.start = function() {
	if (this.running) {
		return;
	}
	this.running = true;
	this._index = 0;
	this._startTime = this._mgr._time;
	this._mgr._tweens.push(this);
	return this;
};

/*
 * Update the tween.
 */
Tween.prototype._update = function(time) {
	if (!this._segs.length) {
		this.running = false;
		return;
	}
	var relTime = time - this._startTime;
	var t, key, done, target = this._target;
	while (true) {
		if (this._index >= this._segs.length) {
			if (this._loop) {
				this._index = 0;
				this._startTime += this._totalTime;
				relTime -= this._totalTime;
			} else {
				this.running = false;
				return;
			}
		}
		var seg = this._segs[this._index];
		if (relTime < seg.t0) {
			return;
		}
		if (relTime < seg.t1) {
			if (seg.easeFunc) {
				t = seg.easeFunc((relTime - seg.t0) / (seg.t1 - seg.t0));
				for (key in seg.v1) {
					target[key] = this._funcs[key](
						target[key], seg.v0[key], seg.v1[key], t);
				}
			}
			return;
		}
		if (seg.v1) {
			for (key in seg.v1) {
				target[key] = this._funcs[key](
					target[key], undefined, seg.v1[key], 1);
			}
		}
		if (seg.callback) {
			seg.callback(target);
		}
		this._index++;
	}
};

/*
 * Pause the tween for the given number of secons.
 */
Tween.prototype.wait = function(duration) {
	if (isNaN(duration)) {
		duration = 0;
	}
	var t0 = this._totalTime, t1 = Math.max(t0, t0 + duration);
	this._segs.push({ t0: t0, t1: t1 });
	this._totalTime = t1;
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
		} else if (key in this._target) {
			curValue = this._target[key];
			if (!this._target.hasOwnProperty(key)) {
				console.warn('Warning: tweening an inherited property');
				this._target[key] = copy(curValue);
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
	var t0 = this._totalTime, t1 = Math.max(t0, t0 + duration);
	this._segs.push({
		t0: t0,
		t1: t1,
		v0: v0,
		v1: v1,
		duration: duration,
		easeFunc: easeFunc,
	});
	this._totalTime = t1;
	return this;
};

module.exports = {
	TweenManager: TweenManager,
};
