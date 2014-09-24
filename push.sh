#!/bin/sh

. ./push_settings

# TWDIR: tiddlywiki source root
# COUCHAPP_SCRIPT: couchapp script from "npm install couchapp"
# DB_URL: http://user:pass@couchdbhost:port/dbname

(cd "$TWDIR" && bin/couchbld.sh) && "$COUCHAPP_SCRIPT" push couchapp.js "$DB_URL"
