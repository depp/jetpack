/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

/*
 * Quick and dirty OpenGL text layout
 *
 * Font is Upheaval by AEnigma, 100% free according to DaFont, at
 * 20px.  The font was converted using a quick and dirty Python
 * script and py-freetype.
 *
 * http://www.dafont.com/upheaval.font
 */

var glm = require('gl-matrix');
var vec2 = glm.vec2;
var vec4 = glm.vec4;

var color = require('./color');
var load = require('./load');
var shader = require('./shader');
var util = require('./util');

// Attribute offsets
var APos = 0;       // int16 x 2
var ATexCoord = 4;  // int16 x 2
var AColor = 8;     // u8 x 4
var ATotal = 12;

function Text() {
	this._program = null;

	this._tex = null;
	this._count = 0;
	this._vbuffer = null;
	this._dirty = false;
	this._layouts = [];
	this._texScale = vec2.create();
}

/*
 * Initialize the text layer.
 */
Text.prototype.init = function(r) {
	if (this._program) {
		return;
	}
	var gl = r.gl;

	this._program = shader.loadProgram(r.gl, {
		vert: 'text.vert',
		frag: 'text.frag',
		attributes: 'Pos TexCoord Color',
		uniforms: 'MVP TexScale Offset BlendColor BlendAmount Font',
	});

	var img = load.getImage('Font');
	if (img && !this._tex) {
		this._tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this._tex);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(
      gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		vec2.set(this._texScale, 1 / img.width, 1 / img.height);
	}
};

/*
 * Remove all layouts from the text layer.
 */
Text.prototype.clear = function() {
	for (var i = 0; i < this._layouts.length; i++) {
		this._layouts[i]._parent = null;
	}
	this._layouts.length = 0;
	this._count = 0;
	this._dirty = false;
};

/*
 * Render the text layer.
 */
Text.prototype.render = function(r, camera) {
	var gl = r.gl;
	var i;

	if (!this._program || !this._layouts.length) {
		return;
	}

	for (i = 0; i < this._layouts.length; i++) {
		updateLayout(this._layouts[i]);
	}

	if (this._dirty) {
		this._dirty = false;
		this._count = 0;

		var count = 0;
		for (i = 0; i < this._layouts.length; i++) {
			count += this._layouts[i]._count;
		}
		if (!count) {
			return;
		}

		if (!this._vbuffer) {
			this._vbuffer = gl.createBuffer();
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, count * ATotal * 6, gl.DYNAMIC_DRAW);
		var offset = 0;
		for (i = 0; i < this._layouts.length; i++) {
			var lcount = this._layouts[i]._count;
			if (!lcount) {
				continue;
			}
			gl.bufferSubData(
				gl.ARRAY_BUFFER,
				offset * ATotal * 6,
				this._layouts[i]._u32.subarray(0, lcount * (ATotal / 4) * 6));
			offset += lcount;
		}
		this._count = count;
	} else {
		if (!this._count) {
			return;
		}
	}

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.useProgram(this._program.program);
	gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuffer);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.SHORT, false, ATotal, APos);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 2, gl.SHORT, false, ATotal, ATexCoord);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, ATotal, AColor);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this._tex);

	gl.uniformMatrix4fv(this._program.MVP, false, camera.uiMVP);
	gl.uniform2fv(this._program.TexScale, this._texScale);
	gl.uniform1i(this._program.Font, 0);

	color.dropShadow(gl, this._program, function() {
		gl.drawArrays(gl.TRIANGLES, 0, this._count * 6);
	}, this);

	gl.disableVertexAttribArray(0);
	gl.disableVertexAttribArray(1);
	gl.disableVertexAttribArray(2);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.useProgram(null);
	gl.disable(gl.BLEND);
};

/*
 * Add a layout to the text layer.
 */
Text.prototype.addLayout = function(layout) {
	if (this._layouts.indexOf(layout) === -1) {
		layout._parent = this;
		this._layouts.push(layout);
		if (layout._count) {
			this._dirty = true;
		}
	}
};

/*
 * Remove a layout from the text layer.
 */
Text.prototype.removeLayout = function(layout) {
	var idx = this._layouts.indexOf(layout);
	if (idx !== -1) {
		layout._parent = null;
		this._layouts.splice(idx, 1);
		if (layout._count) {
			this._dirty = true;
		}
	}
};

/********************************************************************/

/*
 * Layout object for a single block of text.
 *
 * The 'position' and 'color' attributes can be animated with tweens.
*/
function Layout(arg) {
	this._parent = null;
	this._data = null;
	this._i16 = null;
	this._u32 = null;
	this._count = 0;
	this._capacity = 0;
	this._glyphs = [];
	this._gadv = [];
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

function updateLayout(layout) {
	var i, n = layout._count * 6;
	if (!n) {
		return;
	}

	// Update positions
	var x = Math.round(layout.position[0]);
	var y = Math.round(layout.position[1]);
	var dx = x - layout._xoff, dy = y - layout._yoff;
	if (dx !== 0 || dy !== 0) {
		var i16 = layout._i16;
		for (i = 0; i < n; i++) {
			i16[i*6+0] += dx;
			i16[i*6+1] += dy;
		}
		layout._xoff = x;
		layout._yoff = y;
		markDirty(layout);
	}

	// Update color
	var c = color.toU32(layout.color);
	if (c != layout._color) {
		var u32 = layout._u32;
		for (i = 0; i < n; i++) {
			u32[i*3+2] = c;
		}
		layout._color = c;
		markDirty(layout);
	}
}

function markDirty(layout) {
	if (layout._parent) {
		layout._parent._dirty = true;
	}
}

/*
 * Add to the block of text.  Line breaks are not parsed.
 *
 * arg.text: The text to add (required)
 * arg.x: X origin (default 0)
 * arg.y: Y origin (default 0)
 * arg.halign: -1 for left alignment, 0 for center (default), +1 for right
 * arg.valign: -1 for bottom alignment, 0 for center (default), +1 for top
 * arg.scale: Scaling factor to apply to the text (default 1)
 */
Layout.prototype.addLine = function(arg) {
	var i, j, g;
	var font = window.AssetInfo.Font;
	var glyphs = this._glyphs, xadv = 0, yadv = 10, gadv = this._gadv;
	glyphs.length = 0;
	gadv.length = 0;
	var text = arg.text.toUpperCase();
	for (i = 0; i < text.length; i++) {
		g = font.Chars.indexOf(text[i]);
		if (g < 0) {
			continue;
		}
		if (g) {
			glyphs.push(g);
			gadv.push(xadv);
		}
		xadv += font.Data[g*5];
	}

	if (!glyphs.length) {
		return;
	}

	if (glyphs.length + this._count > this._capacity) {
		var newCapacity = Math.max(this._capacity, 16);
		while (glyphs.length + this._count > newCapacity) {
			newCapacity *= 2;
		}
		var oldU32 = this._u32;
		this._capacity = newCapacity;
		this._data = new ArrayBuffer(this._capacity * ATotal * 6);
		this._i16 = new Int16Array(this._data);
		this._u32 = new Uint32Array(this._data);
		if (oldU32) {
			this._u32.set(oldU32);
		}
	}

	var scale = 1;
	if (arg.hasOwnProperty('scale') && isFinite(arg.scale)) {
		scale = arg.scale;
	}
	var xorig = this._xoff;
	if (isFinite(arg.x)) {
		xorig += arg.x;
	}
	if (!arg.hasOwnProperty('halign') || arg.halign === 0) {
		xorig -= Math.round(xadv * 0.5 * scale);
	} else if (arg.halign > 0) {
		xorig -= xadv * scale;
	}
	var yorig = this._yoff;
	if (isFinite(arg.y)) {
		yorig += arg.y;
	}
	if (!arg.hasOwnProperty('valign') || arg.valign === 0) {
		yorig -= Math.round(yadv * 0.5 * scale);
	} else if (arg.valign > 0) {
		yorig -= yadv * scale;
	}

	var i16 = this._i16;
	for (i = 0; i < glyphs.length; i++) {
		j = (i + this._count) * 36;
		g = glyphs[i];
		var bx = font.Data[g*5+1], by = font.Data[g*5+2];
		var sx = font.Data[g*5+3], sy = font.Data[g*5+4];
		var x0 = xorig + scale * (gadv[i] + bx), x1 = x0 + scale * sx;
		var y1 = yorig + scale * by, y0 = y1 - scale * sy;
		var u0 = (g & 7) * 16, u1 = u0 + sx;
		var v1 = (g >> 3) * 16, v0 = v1 + sy;

		i16[j+ 0] = x0; i16[j+ 1] = y0; i16[j+ 2] = u0; i16[j+ 3] = v0;
		i16[j+ 6] = x1; i16[j+ 7] = y0; i16[j+ 8] = u1; i16[j+ 9] = v0;
		i16[j+12] = x0; i16[j+13] = y1; i16[j+14] = u0; i16[j+15] = v1;
		i16[j+18] = x0; i16[j+19] = y1; i16[j+20] = u0; i16[j+21] = v1;
		i16[j+24] = x1; i16[j+25] = y0; i16[j+26] = u1; i16[j+27] = v0;
		i16[j+30] = x1; i16[j+31] = y1; i16[j+32] = u1; i16[j+33] = v1;
	}

	this._count += glyphs.length;
	this._glyphs.length = 0;
	this._gadv.length = 0;
	this._color = null;
	markDirty(this);

	return this;
};

Layout.prototype.clear = function(arg) {
	this._count = 0;
	markDirty(this);
	return this;
};

/********************************************************************/

module.exports = new Text();
module.exports.Layout = Layout;
