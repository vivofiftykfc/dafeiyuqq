@echo off
title Dafeiyu - Start all services and Douyin replies
cd /d "%~dp0"
echo Starting all services, including Douyin replies for saved allowed friends...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
echo.
pause
