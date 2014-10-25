/*\
title: $:/plugins/wshallum/couchadaptor/loadsystemtiddlers.js
type: application/javascript
module-type: startup

Loads system tiddlers from CouchDB on startup

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "couchadaptor_loadsystemtiddlers";
exports.platforms = ["browser"];
exports.after = ["startup"]; // need that to set up $tw.syncadaptor
exports.before = ["favicon", "rootwidget"]; // implies before: story, render, commands
exports.synchronous = false;

var adaptor = require("$:/plugins/wshallum/couchadaptor/couchadaptor.js");

exports.startup = function(continueStartupCallback) {
	// ensure we only run when the adaptor is loaded and currently selected
	if (!adaptor || !adaptor.adaptorClass) {
		return continueStartupCallback();
	}
	if (!$tw.syncadaptor || !($tw.syncadaptor instanceof adaptor.adaptorClass)) {
		return continueStartupCallback();
	}
	$tw.syncadaptor.loadSystemTiddlers(function(err, tiddlerHashmaps) {
		if (err) {
			// must log this somehow?
			return continueStartupCallback();
		}
		// add the tiddlers to the wiki, without enqueueing change events
		var originalEnqueue = $tw.wiki.enqueueTiddlerEvent;
		try {
			$tw.wiki.enqueueTiddlerEvent = function() { };
			$tw.wiki.addTiddlers(tiddlerHashmaps); // should automatically be converted to $tw.Tiddler instances
		}
		finally {
			$tw.wiki.enqueueTiddlerEvent = originalEnqueue;
		}
		return continueStartupCallback();
	});
}

// vim: ts=8:sts=8:sw=8:noet

})();
