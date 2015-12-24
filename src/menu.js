/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var background = require('./background');
var camera = require('./camera');
var color = require('./color');
var control = require('./control');
var param = require('./param');
var state = require('./state');
var text = require('./text');

function MenuScreen() {
	this._startTime = 0;
	this.camera = null;
}

MenuScreen.prototype.start = function(r) {
	control.game.enable();
	background.init(r);
	background.setBoxes();
	text.init(r);
	this._startTime = r.time;
	this.camera = new camera.Camera();

	var x = param.Width / 2;
	var y = param.Height * 0.75;
	text.addLayout(
		new text.Layout({
			color: color.rgb(0.9, 0.1, 0.9),
		}).addLine({
			text: 'Jetpack Every Day',
			x: x,
			y: y,
			scale: 4,
		}));

	y = param.Height * 0.5;
	var lines = [
		'---- Controls ----',
		'Jetpack: space q a z',
		'Fire: w s x',
		null,
		'Press space to start',
	];
	var ll = new text.Layout();
	for (var i = 0; i < lines.length; i++) {
		if (lines[i]) {
			ll.addLine({
				text: lines[i],
				x: x,
				y: y - 40 * i,
				scale: 2
			});
		}
	}
	text.addLayout(ll);
};

MenuScreen.prototype.stop = function() {
	control.game.disable();
	text.clear();
	this._startTime = 0;
};

MenuScreen.prototype.render = function(r) {
	control.game.update();
	if (control.game.jet.press) {
		state.set('Game', null);
	}
	this.camera.update(r, 0);
	background.render(r, this.camera);
	text.render(r, this.camera);
};

module.exports = {
	MenuScreen: MenuScreen,
};
