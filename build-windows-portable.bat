@echo off
cd /d "%~dp0"
echo Building Factory Takt Simulator portable Windows app...
npm run dist:win
echo.
echo Done. Check the release folder.
pause
