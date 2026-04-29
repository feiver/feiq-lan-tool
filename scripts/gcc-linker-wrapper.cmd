@echo off
node "%~dp0gcc-linker-wrapper.mjs" %*
exit /b %ERRORLEVEL%
