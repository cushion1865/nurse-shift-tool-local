@echo off
set "PROJ=%~dp0"
set "PROJ=%PROJ:~0,-1%"
powershell -ExecutionPolicy Bypass -File "%PROJ%\create-shortcut.ps1" "%PROJ%"
if %errorlevel% neq 0 pause
