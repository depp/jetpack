/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

var shader_sources = require('../shader/all');

/*
 * Load a WebGL shader, null on error.
 * gl: WebGL context
 * s.type: Shader type
 * s.name: Name of shader source file
 */
function loadShader(gl, s) {
	var source = shader_sources[s.source];
	if (!source) {
		console.error('No such shader: ' + s.source);
		return null;
	}
	var shader = gl.createShader(s.type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log('Errors for shader: ' + s.source);
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

/*
 * Load a complete WebGL program, null on error.
 * gl: WebGL context
 * p.vert: Name of vertex shader
 * p.frag: Name of fragment shader
 * p.attributes: Program attributes, separated by space, in order
 * p.uniforms: Program uniforms, separated by space
 */
function loadProgram(gl, p) {
	var name = p.vert + ',' + p.frag;
	var specs = [{
		type: gl.VERTEX_SHADER,
		source: p.vert,
	}, {
		type: gl.FRAGMENT_SHADER,
		source: p.frag,
	}];
	var i;
	var program = gl.createProgram();
	for (i = 0; i < specs.length; i++) {
		var shader = loadShader(gl, specs[i]);
		if (!shader) {
			gl.deleteProgram(program);
			return null;
		}
		gl.attachShader(program, shader);
		gl.deleteShader(shader);
	}
	var attrib = p.attributes.split(' ');
	for (i = 0; i < attrib.length; i++) {
		gl.bindAttribLocation(program, i, attrib[i]);
	}
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log('Errors for program: ', p.name);
		console.log(gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}
	var obj = {
		program: program,
		destroy: function(r) {
			if (this.program) {
				gl.deleteProgram(this.program);
			}
		},
	};
	if (p.uniforms) {
		var uniform = p.uniforms.split(' ');
		for (i = 0; i < uniform.length; i++) {
			var uname = uniform[i];
			var loc = gl.getUniformLocation(program, uname);
			if (!loc) {
				console.log('Missing uniform: ' + uname + ' (' + name + ')');
			}
			obj[uname] = loc;
		}
	}
	return obj;
}

module.exports = {
	loadProgram: loadProgram,
};
