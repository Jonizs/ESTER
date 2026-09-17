<#
.SYNOPSIS
  Watches GitHub for new commits on main and pulls them into the local clone.

.DESCRIPTION
  Polls origin every few seconds. When the remote is ahead, fast-forwards the
  working copy, runs `npm install` if the lockfile moved, and rebuilds the
  game bundle. Leave it running in its own window while you play.

  It never discards local work: if the clone has uncommitted changes or has
  diverged from origin/main, it says so and waits instead of pulling.

.PARAMETER Path
  The clone to keep up to date. Defaults to the folder this script lives in.

.PARAMETER IntervalSeconds
  Seconds between checks. Default 10.

.PARAMETER NoBuild
  Pull only - skip `npm install` and `npm run build`.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1 -Path C:\Users\jonas\Desktop\ESTER -IntervalSeconds 30
#>

[CmdletBinding()]
param(
  [string]$Path = (Split-Path -Parent $PSScriptRoot),
  [ValidateRange(2, 3600)]
  [int]$IntervalSeconds = 10,
  [string]$Branch = 'main',
  [switch]$NoBuild
)

# Native commands (git, npm) write progress to stderr. Under 'Stop' that turns
# ordinary output into a terminating NativeCommandError in Windows PowerShell,
# so errors here are handled via $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'

function Write-Stamp {
  param([string]$Message, [string]$Color = 'Gray')
  Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor $Color
}

# --- Checks before we start looping ---------------------------------------

if (-not (Test-Path -LiteralPath $Path)) {
  Write-Host "Folder not found: $Path" -ForegroundColor Red
  exit 1
}
Set-Location -LiteralPath $Path

foreach ($tool in @('git', 'npm')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    if ($tool -eq 'npm' -and $NoBuild) { continue }
    Write-Host "$tool was not found on PATH." -ForegroundColor Red
    exit 1
  }
}

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "$Path is not a git clone. Clone the repo there first." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  ESTER auto-pull" -ForegroundColor Cyan
Write-Host "  ---------------"
Write-Host "  Folder:   $Path"
Write-Host "  Branch:   origin/$Branch"
Write-Host "  Interval: every $IntervalSeconds seconds"
Write-Host "  Stop with Ctrl+C."
Write-Host ""

$lastState = ''

# --- Poll loop -------------------------------------------------------------

while ($true) {
  try {
    # Ask the remote what it has. Quiet unless something is wrong.
    $fetchOutput = git fetch origin $Branch 2>&1
    if ($LASTEXITCODE -ne 0) {
      $state = 'fetch-failed'
      if ($state -ne $lastState) {
        Write-Stamp "Cannot reach GitHub - will keep trying. ($fetchOutput)" 'Yellow'
        $lastState = $state
      }
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }

    $local  = (git rev-parse HEAD).Trim()
    $remote = (git rev-parse FETCH_HEAD).Trim()

    if ($local -eq $remote) {
      if ($lastState -ne 'current') {
        Write-Stamp "Up to date." 'DarkGray'
        $lastState = 'current'
      }
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }

    # Remote moved. Only fast-forward - never clobber local work.
    git merge-base --is-ancestor HEAD $remote
    if ($LASTEXITCODE -ne 0) {
      if ($lastState -ne 'diverged') {
        Write-Stamp "Local commits differ from origin/$Branch - not pulling. Sort it out by hand." 'Yellow'
        $lastState = 'diverged'
      }
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }

    $dirty = git status --porcelain
    if ($dirty) {
      if ($lastState -ne 'dirty') {
        Write-Stamp "Uncommitted changes here - not pulling until they are committed or discarded." 'Yellow'
        $dirty -split "`n" | ForEach-Object { Write-Host "         $_" -ForegroundColor DarkYellow }
        $lastState = 'dirty'
      }
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }

    $incoming = git log --oneline "$local..$remote"
    $count = ($incoming | Measure-Object).Count
    Write-Stamp "$count new commit(s) on origin/${Branch}:" 'Green'
    $incoming | ForEach-Object { Write-Host "         $_" -ForegroundColor Green }

    $lockBefore = if (Test-Path package-lock.json) { (Get-FileHash package-lock.json).Hash } else { '' }

    git merge --ff-only $remote
    if ($LASTEXITCODE -ne 0) {
      Write-Stamp "Fast-forward failed - leaving the working copy alone." 'Red'
      $lastState = 'merge-failed'
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }
    Write-Stamp "Pulled." 'Green'

    if (-not $NoBuild) {
      $lockAfter = if (Test-Path package-lock.json) { (Get-FileHash package-lock.json).Hash } else { '' }
      if ($lockBefore -ne $lockAfter) {
        Write-Stamp "Dependencies changed - running npm install..." 'Cyan'
        npm install
        if ($LASTEXITCODE -ne 0) { Write-Stamp "npm install failed." 'Red' }
      }

      Write-Stamp "Rebuilding..." 'Cyan'
      npm run build
      if ($LASTEXITCODE -ne 0) {
        Write-Stamp "Build failed - the previous bundle is still in dist\." 'Red'
      } else {
        Write-Stamp "Ready. Restart the game window to see the changes." 'Green'
      }
    }

    $lastState = 'pulled'
  }
  catch {
    Write-Stamp "Unexpected error: $($_.Exception.Message)" 'Red'
    $lastState = 'error'
  }

  Start-Sleep -Seconds $IntervalSeconds
}
