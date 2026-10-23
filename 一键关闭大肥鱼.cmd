@echo off
title Dafeiyu - Stop all services and Douyin replies
cd /d "%~dp0"
echo Stopping all project services and Douyin replies...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-all.ps1"
pause
