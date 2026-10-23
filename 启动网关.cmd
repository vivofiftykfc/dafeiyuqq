@echo off
cd /d "%~dp0snowluma"
set "SNOWLUMA_WEBUI_HOST=127.0.0.1"
"%~dp0snowluma\node.exe" index.mjs
pause
