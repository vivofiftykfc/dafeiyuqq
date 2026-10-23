@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo ==========================================
echo   Enable QQ Zone (let her post by herself)
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found
  echo     Install LTS from https://nodejs.org/
  echo     Then close this window and run again.
  echo.
  pause
  exit /b 1
)

node "%~dp0open-zone.mjs" %*

echo.
pause
