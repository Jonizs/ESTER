@echo off
REM ---------------------------------------------------------------
REM  Watch GitHub and auto-pull ESTER changes into this folder.
REM  Double-click, then leave the window open. Ctrl+C or close it
REM  to stop watching.
REM ---------------------------------------------------------------
cd /d "%~dp0"
powershell -NoProfile -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\watch-pull.ps1" -IntervalSeconds 10
