@echo off
setlocal
set TIDDLYWIKI_PLUGIN_PATH=..
tiddlywiki edition --verbose --output out --rendertiddler "$:/core/save/all" index.html text/plain || exit /b 1
