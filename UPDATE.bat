@echo off
REM ---------------------------------------------------------------
REM  Pull the latest ESTER from GitHub into this folder and rebuild.
REM  Double-click this after changes are pushed to main.
REM ---------------------------------------------------------------
setlocal
cd /d "%~dp0"

echo.
echo   ESTER update
echo   ------------
echo   Folder: %CD%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ESTER] Git was not found on PATH. Install it from https://git-scm.com
  pause
  exit /b 1
)

echo [ESTER] Pulling latest from origin/main...
call git pull origin main || goto :failed

echo [ESTER] Installing any new dependencies...
call npm install || goto :failed

echo [ESTER] Rebuilding...
call npm run build || goto :failed

echo.
echo [ESTER] Up to date. Launch from the Desktop shortcut.
echo.
pause
exit /b 0

:failed
echo.
echo [ESTER] Update failed - see the messages above.
echo.
pause
exit /b 1
