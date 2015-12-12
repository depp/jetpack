/* Copyright 2015 Dietrich Epp.

   This file is part of Dash and the Jetpack Space Pirates.  The Dash
   and the Jetpack Space Pirates source code is distributed under the
   terms of the MIT license.  See LICENSE.txt for details. */
'use strict';

/*
 * Utility functions.
 *
 * Includes a wrapper which allows you to use console.log and friends.
 */

if (!window.console) {
	window.console = {};
}
var con = window.console;

function dummy() {}

if (!con.log) {
	con.log = dummy;
}

if (!con.debug) { con.debug = con.log; }
if (!con.info) { con.info = con.log; }
if (!con.warn) { con.warn = con.log; }
if (!con.error)  {con.error = con.log; }
