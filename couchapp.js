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
		/* check if the unnamed user has _admin role (admin party mode) */
		if (userCtx.roles.length > 0 && userCtx.roles[0] === "_admin") {
			return;
		}
		throw({unauthorized: "Please log in"});
	}
}

couchapp.loadAttachments(ddoc, "out");

module.exports = ddoc;
