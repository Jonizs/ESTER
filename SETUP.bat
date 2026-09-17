@echo off
REM ---------------------------------------------------------------
REM  One-time ESTER setup. Double-click this file.
REM  Installs dependencies, builds the game, and puts an ESTER
REM  shortcut on your Desktop pointing at this folder.
REM ---------------------------------------------------------------
setlocal
cd /d "%~dp0"

echo.
echo   ESTER setup
echo   -----------
echo   Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ESTER] Node.js was not found on PATH.
  echo         Install the LTS build from https://nodejs.org then run this again.
  echo.
  pause
  exit /b 1
)

echo [ESTER] Installing dependencies...
call npm install || goto :failed

echo [ESTER] Building game bundle...
call npm run build || goto :failed

echo [ESTER] Creating Desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1" || goto :failed

echo.
echo [ESTER] Done. Launch the game from the ESTER shortcut on your Desktop.
echo.
pause
exit /b 0

:failed
echo.
echo [ESTER] Setup failed - see the messages above.
echo.
pause
exit /b 1
