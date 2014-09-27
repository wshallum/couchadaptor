#!/bin/sh

if [ ! -f ./push_settings ] ; then
	echo "ERROR: push_settings file must exist" >&2
	exit 1
fi
. ./push_settings

# DB_URL: http://user:pass@couchdbhost:port/dbname

bin/couchbld.sh && node_modules/.bin/couchapp push couchapp.js "$DB_URL"
