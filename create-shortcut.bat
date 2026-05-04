@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1" "%~dp0"
if %errorlevel% neq 0 pause
