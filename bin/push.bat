@echo off
setlocal
if not exist "push_settings.bat" (
  echo ERROR: push_settings.bat file must exist >&2
  exit /b 1
)
call push_settings.bat
bin\couchbld.bat && node_modules\.bin\couchapp push couchapp.js %DB_URL%

