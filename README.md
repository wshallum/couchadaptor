couchadaptor
============

CouchDB sync adaptor for TiddlyWiki 5. Requires TiddlyWiki >= 5.1.2.

Works in limited testing. Not sure how well it handles conflicts.

# Installation

We assume you are going to host this on your own local CouchDB installation.
Several providers provide CouchDB servers accessible over the Internet e.g.
[Cloudant](https://cloudant.com/) or [IrisCouch](http://www.iriscouch.com/).

Installing currently requires some command line knowledge to build and upload the wiki to CouchDB. 

## CouchDB setup

At the end of these steps, you should have a working CouchDB installation with an empty database called `tw`:

1. Install CouchDB: see the [CouchDB installation docs](http://docs.couchdb.org/en/latest/install/index.html)  for details
2. Start CouchDB
3. Open the CouchDB UI ["Futon"](http://docs.couchdb.org/en/latest/intro/futon.html) in your web browser, 
usually accessible at [http://127.0.0.1:5984/_utils/](http://127.0.0.1:5984/_utils/)
4. Since CouchDB starts in an "admin party" mode where everyone is an admin, 
we really suggest you create an admin user, especially if you plan on accessing the database over the network.
Click the "Fix this" link in the bottom right corner of the page and follow the instructions.
5. Create a database to hold the TiddlyWiki data. Let's call it `tw` for now. See [the Futon docs here](http://docs.couchdb.org/en/latest/intro/futon.html#managing-databases-and-documents) for instructions.

## Building and uploading the wiki (OS X / Linux)

This plugin currently requires you to build your own empty wiki template that you will then upload to CouchDB. In the future maybe an empty 
template will be provided.

1. To build the wiki, a TiddlyWiki5 Node.js installation is required. Install it following 
[the instructions from the TiddlyWiki site](http://tiddlywiki.com/static/GettingStarted%2520-%2520Node.js.html)
2. Download the contents of this repository from GitHub (clone it or click the 
[Download link](https://github.com/wshallum/couchadaptor/archive/master.zip))
3. If you downloaded the repository as a zip file, extract it and rename the directory from `couchadaptor-master` to `couchadaptor`.
4. Open a terminal / command prompt and change directory to the `couchadaptor` directory.
5. Run `npm install couchapp` to install the `couchapp` package for Node.js, which is used to upload the wiki to CouchDB.
6. Create a `push_settings` in the `couchadaptor` directory containing `DB_URL="http://youradminuser:yourpassword@127.0.0.1:5984/tw"`. 
This is a shell script fragment that will be loaded by the `bin/push.sh` script.
7. Run `bin/push.sh`. This will build the empty wiki template and upload it to the database specified in the URL.
8. If everything works, try accessing your wiki at [http://127.0.0.1:5984/tw/_design/tw/index.html](http://127.0.0.1:5984/tw/_design/tw/index.html)

## Building and uploading the wiki (Windows)

1. To build the wiki, a TiddlyWiki5 Node.js installation is required. Install it following 
[the instructions from the TiddlyWiki site](http://tiddlywiki.com/static/GettingStarted%2520-%2520Node.js.html)
2. Download the contents of this repository from GitHub (clone it or click the 
[Download link](https://github.com/wshallum/couchadaptor/archive/master.zip))
3. If you downloaded the repository as a zip file, extract it and rename the directory from `couchadaptor-master` to `couchadaptor`.
4. Open a terminal / command prompt and change directory to the `couchadaptor` directory.
5. Run `npm install couchapp` to install the `couchapp` package for Node.js, which is used to upload the wiki to CouchDB.
6. Create a `push_settings.bat` in the `couchadaptor` directory containing `set DB_URL="http://youradminuser:yourpassword@127.0.0.1:5984/tw"`. 
7. Run `bin\push.bat`. This will build the empty wiki template and upload it to the database specified in the URL.
8. If everything works, try accessing your wiki at [http://127.0.0.1:5984/tw/_design/tw/index.html](http://127.0.0.1:5984/tw/_design/tw/index.html)

## Putting the wiki HTML outside CouchDB / using a custom database URL

This is possible. If the wiki HTML is outside CouchDB, the database URL and design document name needs to be specified manually. See the config.multids file for more details.

Also, if the HTML is served from a different domain from the CouchDB domain, you may need to [set up CORS on the CouchDB server](http://docs.couchdb.org/en/1.6.1/config/http.html#config-cors).

_NOTE_: currently the adaptor only starts if the wiki is accessed using HTTP or HTTPS. It will not start if accessed
using a `file://` url. Please put the wiki HTML on a web server or run a local web server to use the adaptor.

## Adding Plugins
Plugins are one of the things that makes TiddlyWiki5 so usable, and it comes with a number of them. In order to have plugins available in that generated CouchDB Design document, we have to construct the base html wiki to include the plugins we desire. This procedure only deals with plugins available in TiddlyWiki5, but it should be straitforward to get other ones going as well.

We have to do three things to get this working with couchadaptor:
 
 1. Checkout the TiddlyWiki5 source code in folder next to couchadaptor. Starting from the couchadaptor checkout:
  ```bash
   cd ..
   git clone https://github.com/Jermolene/TiddlyWiki5.git 
 ```
 
 2. Modify the `bin/couchbld.sh` to point to the location of the additional plugins as follows:
  ```bash
  #!/bin/bash

  TIDDLYWIKI_PLUGIN_PATH=../:../TiddlyWiki5/plugins/tiddlywiki tiddlywiki edition/ --verbose --output out \
	--rendertiddler $:/core/save/all index.html text/plain \
  || exit 1
  ```
  
 3. Modify the `edition\tiddlywiki.info` file to add any plugins you want. `couchadaptor` is already in the file, so I added `markdown` to the end of the list in the **plugins** section:
  ```json
  {
	"plugins": [
		"couchadaptor",
		"markdown"
	],
	"themes": [
		"tiddlywiki/vanilla",
		"tiddlywiki/snowwhite"
	],
	"build": {
		"index": [
			"--rendertiddler","$:/core/save/all","index.html","text/plain"]
	}
}
  ```
 4. Now follow the regular directions above!

I'm sure this could be extended to third party plugins provided they play well with the sync adaptor. Obviously, some plugins don't make a lot of sense to try, such as TahoeLAFS :)
