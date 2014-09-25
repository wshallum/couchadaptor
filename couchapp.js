var couchapp = require('couchapp');

ddoc = {
	_id: '_design/tw',
	views: {},
	lists: {},
	shows: {}
}

// _id is title
ddoc.views['skinny-tiddlers'] = {
	map: function(doc) {
		emit(doc._id, doc._rev);
	}
}

// no anonymous write
ddoc.validate_doc_update = function(newDoc, oldDoc, userCtx) {
	if (userCtx.name === null) {
		throw({unauthorized: "Please log in"});
	}
}

couchapp.loadAttachments(ddoc, "../../../tmp");

module.exports = ddoc;
