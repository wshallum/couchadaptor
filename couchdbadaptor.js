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

var CONFIG_PREFIX = "$:/plugins/wshallum/couchadaptor/config/";

function CouchAdaptor(options) {
	this.wiki = options.wiki;
	this.logger = new $tw.utils.Logger("CouchAdaptor");
	this.readConfig();
}

/*
Reads config and sets up URLs.
*/
CouchAdaptor.prototype.readConfig = function() {
	var url = this.wiki.getTiddlerText(CONFIG_PREFIX + "Url", "AUTO").trim(),
	    designDocName = this.wiki.getTiddlerText(CONFIG_PREFIX + "DesignDocumentName", "AUTO").trim(),
	    requiresWithCreds = this.wiki.getTiddlerText(CONFIG_PREFIX + "RequiresWithCredentials", "no").trim(),
	    docUrl = document.location.href,
	    pathParts = document.location.pathname.split("/");
	if (url === "AUTO") {
		// assume loaded as PREFIX/_design/DESIGNDOCNAME/HTMLFILENAME
		this.urlPrefix = pathParts.slice(0, -3).join("/");
		if (designDocName === "AUTO") {
			this.designDocName = pathParts[pathParts.length - 2];
		}
		else {
			this.designDocName = designDocName;
		}
		this.sessionUrl = '/_session';
	}
	else {
		this.urlPrefix = url;
		if (this.urlPrefix.substring(this.urlPrefix.length - 1) === "/") {
			this.urlPrefix = this.urlPrefix.substring(0, this.urlPrefix.length - 1);
		}
		if (designDocName === "AUTO") {
			// there is no sensible way to "AUTO" a design document name from a custom URL
			// so just use the default
			this.designDocName = "tw";
		}
		else {
			this.designDocName = designDocName;
		}
		// urlPrefix is ...../dbname so _session is obtained by replacing the dbname with _session
		this.sessionUrl = this.urlPrefix.substring(0, this.urlPrefix.lastIndexOf("/")) + "/_session";
	}
	this.xhrNeedsWithCredentials = (requiresWithCreds === "yes");
};

CouchAdaptor.prototype.getUrlForTitle = function(title) {
	return this.urlPrefix +  "/" + encodeURIComponent(this.mangleTitle(title));
};

CouchAdaptor.prototype.getUrlForView = function(viewName) {
	return this.urlPrefix +  "/_design/" + this.designDocName + "/_view/" + viewName;
};

/*
Copied from TiddlyWiki5 core/modules/utils/dom/http.js to add support for xhr.withCredentials
*/
function httpRequest(options) {
	var type = options.type || "GET",
		headers = options.headers || {accept: "application/json"},
		request = new XMLHttpRequest(),
		data = "",
		f,results;
	// Massage the data hashmap into a string
	if(options.data) {
		if(typeof options.data === "string") { // Already a string
			data = options.data;
		} else { // A hashmap of strings
			results = [];
			$tw.utils.each(options.data,function(dataItem,dataItemTitle) {
				results.push(dataItemTitle + "=" + encodeURIComponent(dataItem));
			});
			data = results.join("&");
		}
	}
	// for CORS if required
	if (options.withCredentials) {
		request.withCredentials = true;
	}
	// Set up the state change handler
	request.onreadystatechange = function() {
		if(this.readyState === 4) {
			if(this.status === 200 || this.status === 201 || this.status === 204) {
				// Success!
				options.callback(null,this.responseText,this);
				return;
			}
		// Something went wrong
		options.callback("XMLHttpRequest error code: " + this.status);
		}
	};
	// Make the request
	request.open(type,options.url,true);
	if(headers) {
		$tw.utils.each(headers,function(header,headerTitle,object) {
			request.setRequestHeader(headerTitle,header);
		});
	}
	if(data && !$tw.utils.hop(headers,"Content-type")) {
		request.setRequestHeader("Content-type","application/x-www-form-urlencoded; charset=UTF-8");
	}
	request.send(data);
	return request;
};

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
	httpRequest({
		url: this.getUrlForView("skinny-tiddlers"),
		withCredentials: this.xhrNeedsWithCredentials,
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
	delete convertedTiddler._rev;
	if (tiddlerInfo.adaptorInfo && tiddlerInfo.adaptorInfo._rev) {
		convertedTiddler._rev = tiddlerInfo.adaptorInfo._rev;
	}
	convertedTiddler = JSON.stringify(convertedTiddler, null, false);
	httpRequest({
		url: this.getUrlForTitle(tiddler.fields.title),
		type: "PUT",
		headers: {
			"Content-type": "application/json"
		},
		data: convertedTiddler,
		withCredentials: this.xhrNeedsWithCredentials,
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
	httpRequest({
		url: this.getUrlForTitle(title),
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err, data, request) {
			if(err) {
				return callback(err);
			}
			// Invoke the callback
			callback(null, self.convertFromCouch(JSON.parse(data)));
		}
	});
};

/*
CouchDB does not like document IDs starting with '_'.
Convert leading '_' to '%5f' and leading '%' to '%25'
Only used to compute _id / URL for a tiddler. Does not affect 'title' field.
*/
CouchAdaptor.prototype.mangleTitle = function(title) {
	if (title.length == 0) {
		return title;
	}
	var firstChar = title.charAt(0);
	var restOfIt = title.substring(1);
	if (firstChar === '_') {
		return '%5f' + restOfIt;
	}
	else if (firstChar === '%') {
		return '%25' + restOfIt;
	}
	else {
		return title;
	}
}

/*
Reverse what mangleTitle does. Used to obtain title from _id (in convertFromSkinnyTiddler).
*/
CouchAdaptor.prototype.demangleTitle = function(title) {
	if (title.length < 3) {
		return title;
	}
	var firstThree = title.substring(0, 3);
	var restOfIt = title.substring(3);
	if (firstThree === '%5f') {
		return '_' + restOfIt;
	}
	else if (firstThree === '%25') {
		return '%' + restOfIt;
	}
	else {
		return title;
	}
}

CouchAdaptor.prototype.deleteTiddler = function(title, callback, options) {
	var self = this;
	if (!options.tiddlerInfo || !options.tiddlerInfo.adaptorInfo || typeof options.tiddlerInfo.adaptorInfo._rev == "undefined") {
		/* not on server, just return OK */
		callback(null);
	}
	// Issue HTTP request to delete the tiddler
	httpRequest({
		url: this.getUrlForTitle(title),
		type: "DELETE",
		withCredentials: this.xhrNeedsWithCredentials,
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
	return {title: this.demangleTitle(row.key), revision: row.value};
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
	result["revision"] = tiddlerFields["_rev"];
	return result;
}

CouchAdaptor.prototype.getStatus = function(callback) {
	httpRequest({
		url: this.sessionUrl,
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err, data) {
			if (err) {
				return callback(err);
			}
			var json = null;
			var isLoggedIn = false;
			var username = null;
			try {
				json = JSON.parse(data);
			} catch (e) {
			}
			if (json && json.userCtx) {
				username = json.userCtx.name;
				isLoggedIn = (username !== null);
				if (!isLoggedIn && json.userCtx.roles.length == 1 && json.userCtx.roles[0] === '_admin') {
					/* admin party mode */
					isLoggedIn = true;
				}
			}
			callback(null, isLoggedIn, username);
		}
	});
}

CouchAdaptor.prototype.login = function(username, password, callback) {
	var options = {
		url: this.sessionUrl,
		type: "POST",
		data: {
			name: username,
			password: password
		},
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err, data) {
			callback(err);
		}
	};
	httpRequest(options);
}

CouchAdaptor.prototype.logout = function(callback) {
	var options = {
		url: this.sessionUrl,
		type: "DELETE",
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err) {
			callback(err);
		}
	};
	httpRequest(options);
}

CouchAdaptor.prototype.loadSystemTiddlers = function(callback) {
	var self = this;
	httpRequest({
		// according to the Unicode Collation CouchDB uses, after "/" is "\"
		url: this.getUrlForView("skinny-tiddlers") + "?include_docs=true&startkey=\"$:/\"&endkey=\"$:\\\\\"&inclusive_end=false",
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err, data) {
			// Check for errors
			if(err) {
				self.logger.alert("Error in loadSystemTiddlers:", err);
				return callback(err);
			}
			// Process the tiddlers
			var tiddlers = JSON.parse(data).rows;
			var convertedTiddlers = [];
			for(var i=0; i < tiddlers.length; i++) {
				// just in case the filter on the view isn't good enough
				if (tiddlers[i]._id.indexOf("$:/") === 0) {
					convertedTiddlers.push(self.convertFromCouch(tiddlers[i].doc);
				}
			}
			// Invoke the callback
			callback(null, convertedTiddlers);
		}
	});
}


if($tw.browser && document.location.protocol.substr(0,4) === "http" ) {
	exports.adaptorClass = CouchAdaptor;
}

})();
