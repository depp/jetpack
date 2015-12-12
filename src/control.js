/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

/*
 * Control definitions.
 */

var input = require('./input');

function makeGroup(name, func) {
	var ctl = new input.ControlSet();
	var obj = func(ctl);
	obj.enable = function() {
		ctl.enable();
	};
	obj.disable = function() {
		ctl.disable();
	};
	obj.update = function() {
		ctl.update();
	};
	return obj;
}

var game = makeGroup('game', function(ctl) {
	ctl.addKey({
		name: 'Exit',
		key: 'escape',
		press: function() { console.log('Key ESCAPE'); },
	});

	return {
		move: ctl.add2D({
			name: 'Move',
			left: 'left a',
			right: 'right d',
			up: 'up w',
			down: 'down s',
		}),

		jump: ctl.addButton({
			name: 'Jump',
			key: 'space',
		}),
	};
});

module.exports = {
	game: game,
};
