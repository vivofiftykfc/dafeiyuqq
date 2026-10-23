@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul
cd /d "%~dp0..\vendor\helper-source\native\.build"
cl /nologo /std:c++17 /EHsc /W4 /utf-8 /LD /MD /O2 /DNDEBUG ..\media_bridge.cpp /Fe:..\build_media_receive\text_bridge.dll /Fo:media_bridge.obj /link /MACHINE:X64 bcrypt.lib minhook.lib
