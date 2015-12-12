/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

// This is first, so we get console.log.
require('./util');

// Register states.
require('./game');
require('./load');

var input = require('./input');
var state = require('./state');

// The canvas DOM element.
var canvas = null;
// The requestAnimationFrame handle.
var handle = null;
// The WebGL rendering context.
var gl = null;
// The current canvas height.
var canvasHeight = 0;
// The last size of the canvas.
var lastWidth = 0, lastHeight = 0;
// The delay in millis before automatically resizing.
var RESIZE_DELAY = 500;
// The timestamp of the last resize.
var lastResize = -1;

/*
 * Initialize the application.
 *
 * c: The canvas object to use
 * g: The WebGL context to use
 */
function init(c, g) {
	if (canvas && gl) {
		return;
	}
	canvas = c;
	gl = g;
	window.addEventListener('resize', resize, false);
	input.init();
	resize();
	state.set(new state.Load());
	start();
}

/*
 * Start running the application, if it is not running already.
 */
function start() {
	if (handle) {
		return;
	}
	handle = window.requestAnimationFrame(render);
}

/*
 * Stop running the application if it is running.
 */
function stop() {
	if (!handle) {
		return;
	}
	window.cancelAnimationFrame(handle);
	handle = undefined;
}

/*
 * Handle resize events.
 */
function resize() {
	var w = canvas.clientWidth;
	var h = Math.max(1, Math.round(w * 9 / 16));
	if (h != canvasHeight) {
		canvas.style.height = h + 'px';
		canvasHeight = h;
	}
}

/*
 * Main rendering loop.
 */
function render(curTime) {
	var w = canvas.clientWidth, h = canvas.clientHeight;
	var needsResize = lastResize < 0 ||
			(curTime > lastResize + RESIZE_DELAY &&
			 (w != lastWidth || h != lastHeight));
	if (needsResize) {
		canvas.width = lastWidth = w;
		canvas.height = lastHeight = h;
		lastResize = curTime;
	}

	handle = window.requestAnimationFrame(render);
	state.render(
		curTime,
		gl,
		gl.drawingBufferWidth,
		gl.drawingBufferHeight,
		w / h);
}

window.Game = {
	init: init,
	start: start,
	stop: stop,
	resize: resize
};
