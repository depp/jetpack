'use strict';

var param = require('./param');

/*
 * Materials
 */
var Material = {
	World: new p2.Material(),
	Player: new p2.Material(),
};

/*
 * Contact materials (private)
 */
var Contact = [
	new p2.ContactMaterial(Material.Player, Material.World, {
		friction: 10.0,
	}),
];

/*
 * Create a new world.
 */
function createWorld() {
	var g = param.Game, i;
	var world = new p2.World({
		gravity: [0, -g.Gravity]
	});
	for (i = 0; i < Contact.length; i++) {
		world.addContactMaterial(Contact[i]);
	}
	return world;
}

module.exports = {
	Material: Material,
	createWorld: createWorld,
};
