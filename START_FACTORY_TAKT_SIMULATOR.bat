@echo off
cd /d "%~dp0"
set EXE=release\Factory_Takt_Simulator_Portable_0.0.0_x64.exe
if exist "%EXE%" (
  start "" "%EXE%"
  exit /b 0
)
echo Portable package not found. Starting through local desktop runtime...
npm run desktop
