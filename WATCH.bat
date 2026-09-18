@echo off
REM ---------------------------------------------------------------
REM  Watch GitHub and auto-pull ESTER changes into this folder, then
REM  restart the game on the new build if it is open.
REM  Double-click, then leave the window open. Ctrl+C or close it
REM  to stop watching.
REM
REM  Pass -NoRestart to pull and rebuild without touching the game
REM  window, or -NoBuild to only pull.
REM ---------------------------------------------------------------
cd /d "%~dp0"

REM Prefer PowerShell 7 when it is installed, fall back to the built-in one.
where pwsh >nul 2>nul
if errorlevel 1 (
  powershell -NoProfile -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\watch-pull.ps1" -IntervalSeconds 10 %*
) else (
  pwsh -NoProfile -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\watch-pull.ps1" -IntervalSeconds 10 %*
)
