@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
cd /d "%~dp0..\vendor\helper-source\native\.build"
cl /nologo /std:c++17 /EHsc /W4 /utf-8 /MD /O2 ..\test_receive_v3.cpp /Fe:test_receive_v3.exe /Fo:test_receive_v3.obj /link /MACHINE:X64 bcrypt.lib minhook.lib
if errorlevel 1 exit /b 1
test_receive_v3.exe
exit /b %errorlevel%
