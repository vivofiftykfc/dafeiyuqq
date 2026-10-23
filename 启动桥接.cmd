@echo off
cd /d "%~dp0qq-bridge"
"%~dp0snowluma\node.exe" src\bridge.js
pause
