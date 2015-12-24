/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var glm = require('gl-matrix');
var vec2 = glm.vec2;
var vec4 = glm.vec4;

var color = require('./color');
var shader = require('./shader');

// Attribute offsets
var APos = 0;       // i16 x 2
var AColor = 4;     // u8 x 4
var ATotal = 8;

var Loaded = false;
var Program = null;

function init(r) {
	if (Loaded) {
		return;
	}
	Loaded = true;
	var gl = r.gl;

	Program = shader.loadProgram(r.gl, {
		vert: 'poly.vert',
		frag: 'poly.frag',
		attributes: 'Pos Color',
		uniforms: 'MVP Offset BlendColor BlendAmount',
	});
}

function PolyLayer() {
	this._count = 0;
	this._vbuffer = null;
	this._dirty = false;
	this._polys = [];
}

PolyLayer.prototype.clear = function() {
	for (var i = 0; i < this._polys.length; i++) {
		this._polys[i]._parent = null;
	}
	this._polys.length = 0;
	this._count = 0;
	this._dirty = false;
};

PolyLayer.prototype.render = function(r, camera) {
	var gl = r.gl, p = Program;
	var i;

	if (!Program || !this._polys.length) {
		return;
	}

	for (i = 0; i < this._polys.length; i++) {
		updatePoly(this._polys[i]);
	}

	if (this._dirty) {
		this._dirty = false;
		this._count = 0;

		var count = 0;
		for (i = 0; i < this._polys.length; i++) {
			count += this._polys[i]._count;
		}
		if (!count) {
			return;
		}

		if (!this._vbuffer) {
			this._vbuffer = gl.createBuffer();
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, count * ATotal * 3, gl.DYNAMIC_DRAW);
		var offset = 0;
		for (i = 0; i < this._polys.length; i++) {
			var pcount = this._polys[i]._count;
			if (!pcount) {
				continue;
			}
			gl.bufferSubData(
				gl.ARRAY_BUFFER,
				offset * ATotal * 3,
				this._polys[i]._u32.subarray(0, pcount * (ATotal / 4) * 3));
			offset += pcount;
		}
		this._count = count;
	} else {
		if (!this._count) {
			return;
		}
	}

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.useProgram(p.program);
	gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuffer);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.SHORT, false, ATotal, APos);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, ATotal, AColor);

	gl.uniformMatrix4fv(p.MVP, false, camera.uiMVP);

	color.dropShadow(gl, p, function() {
		gl.drawArrays(gl.TRIANGLES, 0, this._count * 3);
	}, this);

	gl.disableVertexAttribArray(0);
	gl.disableVertexAttribArray(1);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.useProgram(null);
	gl.disable(gl.BLEND);
};

PolyLayer.prototype.addPolygon = function(poly) {
	if (!(poly instanceof Polygon)) {
		throw new TypeError('bad polygon');
	}
	if (this._polys.indexOf(poly) === -1) {
		poly._parent = this;
		this._polys.push(poly);
		if (poly._count) {
			this._dirty = true;
		}
	}
};

PolyLayer.prototype.removePolygon = function(poly) {
	if (!(poly instanceof Polygon)) {
		throw new TypeError('bad polygon');
	}
	var idx = this._polys.indexOf(poly);
	if (idx !== -1) {
		poly._parent = null;
		this._polys.splice(idx, 1);
		if (poly._count) {
			this._dirty = true;
		}
	}
};

function Polygon(arg) {
	this._parent = null;
	this._data = null;
	this._i16 = null;
	this._u32 = null;
	this._count = 0;
	this._capacity = 0;
	// Values currently baked into the array
	this._xoff = 0;
	this._yoff = 0;
	this._color = null;
	// Values specified by the user
	this.position = vec2.create();
	this.color = vec4.fromValues(1, 1, 1, 1);
	if (arg) {
		if (arg.position) {
			vec2.copy(this.position, arg.position);
		}
		if (arg.color) {
			vec4.copy(this.color, arg.color);
		}
	}
}

function updatePoly(poly) {
	var i, n = poly._count * 3;
	if (!n) {
		return;
	}

	// Update positions
	var x = Math.round(poly.position[0]);
	var y = Math.round(poly.position[1]);
	var dx = x - poly._xoff, dy = y - poly._yoff;
	if (dx !== 0 || dy !== 0) {
		var i16 = poly._i16;
		for (i = 0; i < n; i++) {
			i16[i*4+0] += dx;
			i16[i*4+1] += dy;
		}
		poly._xoff = x;
		poly._yoff = y;
		markDirty(poly);
	}

	// Update color
	var c = color.toU32(poly.color);
	if (c != poly._color) {
		var u32 = poly._u32;
		for (i = 0; i < n; i++) {
			u32[i*2+1] = c;
		}
		poly._color = c;
		markDirty(poly);
	}
}

function markDirty(poly) {
	if (poly._parent) {
		poly._parent._dirty = true;
	}
}

Polygon.prototype.clear = function() {
	this._count = 0;
	this._color = null;
	markDirty(this);
	return this;
};

Polygon.prototype.addRect = function(x0, x1, y0, y1) {
	var xo = this._xoff, yo = this._yoff;
	x0 = Math.round(x0) + xo;
	x1 = Math.round(x1) + xo;
	y0 = Math.round(y0) + yo;
	y1 = Math.round(y1) + yo;

	var count = 2;
	if (count + this._count > this._capacity) {
		var newCapacity = Math.max(this._capacity, 4);
		while (count + this._count > newCapacity) {
			newCapacity *= 2;
		}
		var oldU32 = this._u32;
		this._capacity = newCapacity;
		this._data = new ArrayBuffer(newCapacity * ATotal * 3);
		this._i16 = new Int16Array(this._data);
		this._u32 = new Uint32Array(this._data);
		if (oldU32) {
			this._u32.set(oldU32);
		}
	}

	var i16 = this._i16;
	var i = this._count * 3 * (ATotal / 2);
	i16[i+ 0] = x0; i16[i+ 1] = y0;
	i16[i+ 4] = x1; i16[i+ 5] = y0;
	i16[i+ 8] = x0; i16[i+ 9] = y1;
	i16[i+12] = x0; i16[i+13] = y1;
	i16[i+16] = x1; i16[i+17] = y0;
	i16[i+20] = x1; i16[i+21] = y1;

	this._count += count;
	this._color = null;
	markDirty(this);

	return this;
};

module.exports = {
	init: init,
	ui: new PolyLayer(),
	Polygon: Polygon,
};
