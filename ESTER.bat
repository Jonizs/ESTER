@echo off
REM ---------------------------------------------------------------
REM  ESTER launcher. Double-click this (or the desktop shortcut made
REM  by scripts\create-desktop-shortcut.ps1) to play.
REM  Installs dependencies and builds the bundle on first run only.
REM ---------------------------------------------------------------
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ESTER] Node.js was not found on PATH.
  echo         Install the LTS build from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [ESTER] First run - installing dependencies. This takes a minute...
  call npm install || goto :failed
)

if not exist "dist\index.html" (
  echo [ESTER] Building game bundle...
  call npm run build || goto :failed
)

echo [ESTER] Launching...
call npx electron . || goto :failed
exit /b 0

:failed
echo.
echo [ESTER] Startup failed - see the messages above.
pause
exit /b 1
