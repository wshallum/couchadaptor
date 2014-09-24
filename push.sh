#!/bin/sh

if [ ! -f ./push_settings ] ; then
	echo "ERROR: push_settings file must exist" >&2
	exit 1
fi
. ./push_settings

# TWDIR: tiddlywiki source root
# COUCHAPP_SCRIPT: couchapp script from "npm install couchapp"
# DB_URL: http://user:pass@couchdbhost:port/dbname

(cd "$TWDIR" && bin/couchbld.sh) && "$COUCHAPP_SCRIPT" push couchapp.js "$DB_URL"
