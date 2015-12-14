/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;

var color = require('./color');
var param = require('./param');
var physics = require('./physics');

function destroy(body) {
	if (body.world) {
		body.world.removeBody(body);
	}
}

var Types = {};

/*
 * Register entity types.
 *
 * category: The category name, or null.
 * types: Mapping from type names to types
 */
function registerTypes(category, types) {
	var prefix = category ? category + '.' : '';
	_.forOwn(types, function(value, key) {
		var tname = prefix + key;
		if (Types.hasOwnProperty(tname)) {
			console.error('Duplicate type registered: ' + tname);
			return;
		}
		Types[tname] = value;
	});
}

/*
 * Spawn an entity.
 *
 * game: The game screen
 * args: The spawn arguments, including 'type'
 */
function spawn(game, args) {
	var type = args.type;
	if (!Types.hasOwnProperty(type)) {
		console.warn('No such entity type: ' + type);
		return;
	}
	var cls = Types[type];
	var obj = Object.create(cls);
	obj.spawn(game, args);
	var body = obj.body;
	if (!body) {
		console.warn('Could not spawn entity: ' + type);
		return;
	}
	if (!body.world) {
		game.world.addBody(body);
		// Workaround (might be a bug in p2.js...)
		vec2.copy(body.previousPosition, body.position);
	}
	if ('initialHealth' in obj) {
		obj.health = obj.initialHealth;
	}
	if ('lifespan' in obj) {
		obj.endFrame = game.time.frame + Math.ceil(obj.lifespan * param.Rate);
	}
}

module.exports = {
	destroy: destroy,
	registerTypes: registerTypes,
	spawn: spawn,
};
