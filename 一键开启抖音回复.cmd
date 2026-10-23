@echo off
cd /d "%~dp0"
"%~dp0snowluma\node.exe" "%~dp0scripts\start-douyin-bot.mjs"
set "douyin_result=%errorlevel%"
echo.
pause
exit /b %douyin_result%
