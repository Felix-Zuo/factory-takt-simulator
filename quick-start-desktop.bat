@echo off
cd /d "%~dp0"
set EXE=release\Factory_Takt_Simulator_Portable_0.0.0_x64.exe
if exist "%EXE%" (
  echo Starting Factory Takt Simulator portable app...
  start "" "%EXE%"
  exit /b 0
)
echo Starting Factory Takt Simulator desktop app through local runtime...
npm run desktop
