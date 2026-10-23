@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
cd /d "%~dp0..\vendor\helper-source\native\.build"
if not exist "..\build_media_receive_v4" mkdir "..\build_media_receive_v4"
cl /nologo /std:c++17 /EHsc /W4 /utf-8 /LD /MD /O2 /DNDEBUG ..\media_bridge.cpp /Fe:..\build_media_receive_v4\text_bridge.dll /Fo:media_bridge_v4.obj /link /MACHINE:X64 bcrypt.lib minhook.lib
exit /b %errorlevel%
