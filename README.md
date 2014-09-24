couchadaptor
============

CouchDB sync adaptor for TiddlyWiki 5. Requires TiddlyWiki >= 5.1.2.

Works in limited testing. Not sure how well it handles conflicts.

Database name & design document name still hard-coded.

couchapp.js is a file for use with the npm "couchapp" package. It contains just the one view definition for now and includes code to load the generated TiddlyWiki file as an attachment.

push.sh rebuilds the TiddlyWiki and pushes it to CouchDB. It uses a push\_settings file that sets variables (where the TiddlyWiki source dir is, where the "couchapp" script is, and what DB url (possibly including username/password) to use.

