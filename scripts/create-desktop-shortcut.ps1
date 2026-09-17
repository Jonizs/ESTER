<#
  Creates an "ESTER" shortcut on your Desktop that launches the game from
  this project folder.

  Run it once, from the project folder, in PowerShell:
      powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1

  It points at dist-exe\ESTER.exe when that has been built
  (npm run build:exe), and otherwise at ESTER.bat, which works right away.
#>

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$desktop     = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'ESTER.lnk'

$exe = Join-Path $projectRoot 'dist-exe\ESTER.exe'
$bat = Join-Path $projectRoot 'ESTER.bat'

if (Test-Path $exe) {
  $target    = $exe
  $arguments = ''
  Write-Host "[ESTER] Pointing the shortcut at the packaged executable."
} elseif (Test-Path $bat) {
  $target    = Join-Path $env:SystemRoot 'System32\cmd.exe'
  $arguments = "/c `"$bat`""
  Write-Host "[ESTER] No ESTER.exe yet - pointing the shortcut at ESTER.bat."
  Write-Host "        Run 'npm run build:exe' later for a standalone .exe, then re-run this script."
} else {
  throw "Neither dist-exe\ESTER.exe nor ESTER.bat was found in $projectRoot."
}

$shell    = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath       = $target
$shortcut.Arguments        = $arguments
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description      = 'ESTER - space survival'
$shortcut.WindowStyle      = 7   # start minimized; the game opens its own window

$icon = Join-Path $projectRoot 'build\icon.ico'
if (Test-Path $icon) { $shortcut.IconLocation = $icon }

$shortcut.Save()

Write-Host "[ESTER] Shortcut created: $shortcutPath"
Write-Host "[ESTER] Working directory: $projectRoot"
