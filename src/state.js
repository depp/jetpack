/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

/*
 * State manager.
 */

// The current screen.
var current = null;
// The pending screen, at the next update.
var pending = null;
// All screens: initially functions, later objects
var screens = {};

/*
 * Register screens.
 *
 * Each name maps to a screen object, or a function which returns a
 * screen object.
 */
function register(newScreens) {
	_.defaults(screens, newScreens);
}

/*
 * Set the active screen.
 *
 * name: The name of the screen to activate
 * args: Argument object to pass the screen's start method
 */
function set(name, args) {
	if (!screens.hasOwnProperty(name)) {
		console.error('No such screen: ' + name);
		return;
	}
	pending = { name: name, screen: screens[name], args: args };
}

/*
 * Render the active screen.
 */
function render(r) {
	var newScreen = pending;
	pending = null;
	if (newScreen) {
		if (current) {
			current.stop(r);
			current = null;
		}
		var obj = newScreen.screen;
		if (typeof obj == 'function') {
			obj = obj();
			screens[name] = obj;
		}
		obj.start(r, newScreen.args);
		current = obj;
	}
	if (current) {
		current.render(r);
	}
}

// This module is modified by other modules to register state classes
// here.  This breaks circular dependencies between the modules.
module.exports = {
	register: register,
	set: set,
	render: render,
};
