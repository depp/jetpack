/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;
var vec4 = glm.vec4;

var color = require('./color');
var sprites = require('./sprites');
var param = require('./param');
var poly = require('./poly');
var text = require('./text');
var util = require('./util');

var SpriteSize = 10;
var PosX = 12;
var PosY = 12;
var BarX = 12;
var BarH = 8;
var BarW = 180;
var Spacing = 20;

var BlankColor = color.rgb(0, 0, 0);

function mkPos(i) {
	var y = i > 0 ? param.Height - PosY : PosY;
	var x = PosX + (Math.abs(i) - 1) * (BarX + BarW + Spacing);
	return [x, y];
}

function Hud() {
	this.disable = false;
	this._score = -1;
	text.addLayout(new text.Layout({
		position: [650, param.Height - PosY],
		color: color.White,
	}).addLine({
		text: 'Score:',
		halign: +1,
	}));
	this._sctext = new text.Layout({
		position: [670, param.Height - PosY],
		color: color.White,
	});
	text.addLayout(this._sctext);

	this.shield1 = new Bar({
		color: color.Shield,
		maxValue: 5,
		sprite: 'IShield1',
		position: mkPos(+1),
	});
	this.shield2 = new Bar({
		color: color.Shield,
		sprite: 'IShield2',
		position: mkPos(+2),
	});
	this.weapon = new Bar({
		color: color.Weapon,
		position: mkPos(-1),
	});
	this.bonus = new Bar({
		color: color.BonusTwo,
		position: mkPos(-2),
	});
	this.boost = new Bar({
		sprite: 'ISpeed',
		color: color.Boost,
		position: mkPos(-3),
	});
	this.bars = [
		this.shield1, this.shield2, this.weapon, this.bonus, this.boost
	];
}

Hud.prototype.step = function(game) {
	if (this.disable) {
		return;
	}
	if (this._score != game.score) {
		this._score = game.score;
		this._sctext.clear().addLine({
			text: util.numberWithCommas(this._score),
			halign: -1,
		});
	}
};

Hud.prototype.emit = function() {
	if (this.disable) {
		return;
	}
	for (var i = 0; i < this.bars.length; i++) {
		this.bars[i].emit();
	}
};

function Bar(args) {
	this._color = vec4.create();
	if (args.color) {
		vec4.copy(this._color, args.color);
	}
	this._discrete = !!args.discrete;
	this._poly1 = new poly.Polygon({ color: this._color });
	this._poly2 = new poly.Polygon({ color: BlankColor });
	this._width = -1;
	this._position = args.position;

	this._sprite = args.sprite || null;
	this._maxValue = args._maxValue || 1;
	this._active = false;
	this._value = 0;
}

Bar.prototype.set = function(arg) {
	if (!arg) {
		this._active = false;
	} else if (typeof arg == 'number') {
		this._value = arg;
	} else {
		this._active = true;
		if (arg.hasOwnProperty('sprite')) {
			this._sprite = arg.sprite;
		}
		if (arg.hasOwnProperty('maxValue')) {
			this._maxValue = arg.maxValue;
		}
		if (arg.hasOwnProperty('value')) {
			this._value = arg.value;
		}
		if (arg.hasOwnProperty('color')) {
			vec4.copy(this._color, arg.color);
			vec4.copy(this._poly1.color, arg.color);
		}
	}
};

Bar.prototype.emit = function() {
	if (this._active) {
		var x = this._position[0], y = this._position[1];
		if (this._sprite) {
			sprites.ui.add({
				position: this._position,
				radius: SpriteSize,
				sprite: this._sprite,
				color: this._color,
			});
		}

		var width = this._value / this._maxValue;
		if (!isFinite(width)) {
			width = 0;
		} else {
			width = Math.max(0, Math.min(BarW, Math.round(BarW * width)));
		}

		if (width != this._width) {
			var x0 = x + BarX, x1 = x + BarX + width, x2 = x + BarX + BarW;
			var y0 = y - 0.5 * BarH, y1 = y0 + BarH;
			this._poly1.clear().addRect(x0, x1, y0, y1);
			this._poly2.clear().addRect(x1, x2, y0, y1);
			this._width = width;
		}

		poly.ui.addPolygon(this._poly1);
		poly.ui.addPolygon(this._poly2);
	} else {
		poly.ui.removePolygon(this._poly1);
		poly.ui.removePolygon(this._poly2);
	}
};

module.exports = {
	Hud: Hud,
};
