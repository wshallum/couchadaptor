/*\
title: $:/plugins/wshallum/couchadaptor/couchadaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising with CouchDB

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function CouchAdaptor(options) {
	this.wiki = options.wiki;
	this.logger = new $tw.utils.Logger("CouchAdaptor");
	this.urlPrefix = '/tw/'; // TODO make configurable
	this.designDocName = '_design/tw'; // TODO make configurable
}

/*
getTiddlerInfo(tiddler)
getSkinnyTiddlers(callback(err,data)) data is array of {title: ..., revision: ...}
saveTiddler(tiddler, callback(err, adaptorInfo, revision), options) options has options.tiddlerInfo
loadTiddler(tiddler, callback(err, tiddlerFields))
deleteTiddler(title, callback(err), options) options has options.tiddlerInfo
*/

CouchAdaptor.prototype.getTiddlerInfo = function(tiddler) {
	return {_rev: tiddler.fields.revision};
};


CouchAdaptor.prototype.getSkinnyTiddlers = function(callback) {
	var self = this;
	$tw.utils.httpRequest({
		url: this.urlPrefix + this.designDocName + "/_view/skinny-tiddlers",
		callback: function(err, data) {
			// Check for errors
			if(err) {
				return callback(err);
			}
			// Process the tiddlers to make sure the revision is a string
			var tiddlers = JSON.parse(data).rows;
			for(var i=0; i < tiddlers.length; i++) {
				tiddlers[i] = self.convertFromSkinnyTiddler(tiddlers[i]);
			}
			// Invoke the callback with the skinny tiddlers
			callback(null, tiddlers);
		}
	});
};

CouchAdaptor.prototype.saveTiddler = function(tiddler, callback, options) {
	var self = this;
	var convertedTiddler = this.convertToCouch(tiddler)
	var tiddlerInfo = options.tiddlerInfo;
	this.logger.log(tiddler);
	this.logger.log(convertedTiddler);
	this.logger.log(tiddlerInfo);
	delete convertedTiddler._rev;
	if (tiddlerInfo.adaptorInfo && tiddlerInfo.adaptorInfo._rev) {
		convertedTiddler._rev = tiddlerInfo.adaptorInfo._rev;
	}
	convertedTiddler = JSON.stringify(convertedTiddler, null, false);
	$tw.utils.httpRequest({
		url: this.urlPrefix +  "/" + encodeURIComponent(tiddler.fields.title),
		type: "PUT",
		headers: {
			"Content-type": "application/json"
		},
		data: convertedTiddler,
		callback: function(err,data,request) {
			if(err) {
				return callback(err);
			}
			var returnedData = JSON.parse(data);
			var newRevision = returnedData.rev;
			// Invoke the callback
			callback(null, { _rev: newRevision }, newRevision);
		}
	});
};

CouchAdaptor.prototype.loadTiddler = function(title, callback) {
	var self = this;
	$tw.utils.httpRequest({
		url: this.urlPrefix + "/" + encodeURIComponent(title),
		callback: function(err, data, request) {
			if(err) {
				return callback(err);
			}
			// Invoke the callback
			callback(null, self.convertFromCouch(JSON.parse(data)));
		}
	});
};

CouchAdaptor.prototype.deleteTiddler = function(title, callback, options) {
	var self = this;
	if (!options.tiddlerInfo || !options.tiddlerInfo.adaptorInfo || typeof options.tiddlerInfo.adaptorInfo._rev == "undefined") {
		/* not on server, just return OK */
		callback(null);
	}
	// Issue HTTP request to delete the tiddler
	$tw.utils.httpRequest({
		url: this.urlPrefix +  "/" + encodeURIComponent(title),
		type: "DELETE",
		callback: function(err, data, request) {
			if(err) {
				return callback(err);
			}
			// Invoke the callback
			callback(null);
		},
		headers: { "If-Match": options.tiddlerInfo.adaptorInfo._rev }
	});
};

CouchAdaptor.prototype.convertFromSkinnyTiddler = function(row) {
	return {title: row.key, revision: row.value};
}

/* for this version just copy all fields across, no special handling */
CouchAdaptor.prototype.convertToCouch = function(tiddler) {
	var result = { fields: {} };
	if (tiddler) {
		$tw.utils.each(tiddler.fields,function(element,title,object) {
			if (title === "revision") {
				/* do not store revision as a field */
			}
			else {
				result.fields[title] = tiddler.fields[title]
			}
		});
	}
	// Default the content type
	result.fields.type = result.fields.type || "text/vnd.tiddlywiki";
	return result;
}

/* for this version just copy all fields across except _rev and _id */
CouchAdaptor.prototype.convertFromCouch = function(tiddlerFields) {
	var self = this, result = {};
	// Transfer the fields, pulling down the `fields` hashmap
	$tw.utils.each(tiddlerFields, function(element, title, object) {
		if(title === "fields") {
			$tw.utils.each(element,function(element, subTitle, object) {
				result[subTitle] = element;
			});
		} else if (title === "_id" || title === "_rev") {
			/* skip these */
		} else {
			result[title] = tiddlerFields[title];
		}
	});
	return result;
}



if($tw.browser && document.location.protocol.substr(0,4) === "http" ) {
	exports.adaptorClass = CouchAdaptor;
}

})();
