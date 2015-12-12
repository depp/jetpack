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

function set(screen) {
	pending = screen;
}

function render(r) {
	var newScreen = pending;
	pending = null;
	if (newScreen) {
		if (current) {
			current.destroy(r);
			current = null;
		}
		newScreen.init(r);
		current = newScreen;
	}
	if (current) {
		current.render(r);
	}
}

// This module is modified by other modules to register state classes
// here.  This breaks circular dependencies between the modules.
module.exports = {
	set: set,
	render: render,
};
