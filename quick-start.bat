@echo off
cd /d "%~dp0"
echo Starting Factory_Takt_Simulator at http://127.0.0.1:5173
start "Factory_Takt_Simulator" cmd /k "npm run start:local"
timeout /t 2 >nul
start http://127.0.0.1:5173
