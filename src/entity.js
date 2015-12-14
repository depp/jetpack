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
function registerTypes(types, category) {
	var prefix = category ? category + '.' : '';
	_.forOwn(types, function(value, key) {
		var inh = value.inherit, i;
		if (inh) {
			for (i = 0; i < inh.length; i++) {
				_.defaults(value, inh[i]);
			}
			delete value.inherit;
		}
		var tname = prefix + key;
		if (Types.hasOwnProperty(tname)) {
			console.error('Duplicate type registered: ' + tname);
			return;
		}
		Types[tname] = value;
	});
}

function getType(type) {
	return Types[type];
}

module.exports = {
	destroy: destroy,
	registerTypes: registerTypes,
	getType: getType,
};
