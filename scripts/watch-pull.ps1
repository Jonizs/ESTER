<#
.SYNOPSIS
  Watches GitHub for new commits on main, pulls them into the local clone and
  restarts the running game on the new build.

.DESCRIPTION
  Polls origin every few seconds. When the remote is ahead, fast-forwards the
  working copy, runs `npm install` if the lockfile moved, and rebuilds the
  game bundle. If the game is open at that moment it is closed and relaunched
  on the fresh build, so a push reaches the screen without touching anything.
  Leave it running in its own window while you play.

  It never discards local work: if the clone has uncommitted changes or has
  diverged from origin/main, it says so and waits instead of pulling.

.PARAMETER Path
  The clone to keep up to date. Defaults to the folder this script lives in.

.PARAMETER IntervalSeconds
  Seconds between checks. Default 10.

.PARAMETER NoBuild
  Pull only - skip `npm install` and `npm run build`.

.PARAMETER NoRestart
  Leave the running game alone; just pull and rebuild.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1 -Path C:\path\to\ESTER -IntervalSeconds 30
#>

[CmdletBinding()]
param(
  [string]$Path = '',
  [ValidateRange(2, 3600)]
  [int]$IntervalSeconds = 10,
  [string]$Branch = 'main',
  [switch]$NoBuild,
  [switch]$NoRestart
)

# Native commands (git, npm) write progress to stderr. Under 'Stop' that turns
# ordinary output into a terminating NativeCommandError in Windows PowerShell,
# so errors here are handled via $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'

# Default -Path to the clone this script lives in. This is resolved here and
# not as a param() default, because Windows PowerShell 5.1 has not populated
# $PSScriptRoot yet while it is binding parameters (PowerShell 7 has).
if (-not $Path) {
  $scriptDir = $PSScriptRoot
  if (-not $scriptDir) {
    # Definition is the script's path when run from a file, but the script's
    # own text in some hosts - only treat it as a path if it is one.
    $definition = $MyInvocation.MyCommand.Definition
    if ($definition -and (Test-Path -LiteralPath $definition -ErrorAction SilentlyContinue)) {
      $scriptDir = Split-Path -Parent $definition
    }
  }

  if ($scriptDir) {
    $Path = Split-Path -Parent $scriptDir
  } else {
    # Launched in a way that hides the script's location; WATCH.bat cd's to the
    # project folder first, so the current directory is the right guess.
    $Path = (Get-Location).Path
  }
}

function Get-LockHash {
  if (Test-Path package-lock.json) { (Get-FileHash package-lock.json).Hash } else { '' }
}

function Write-Stamp {
  param([string]$Message, [string]$Color = 'Gray')
  Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor $Color
}

# --- Finding, closing and relaunching the game -----------------------------

function Get-RunningGame {
  # The game runs one of two ways: the packaged dist-exe\ESTER.exe, or
  # Electron straight out of node_modules (ESTER.bat / npm start).
  $procs = @()
  try {
    $procs = @(Get-CimInstance Win32_Process -Filter "Name = 'ESTER.exe' OR Name = 'electron.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }

  $found = @()
  foreach ($p in $procs) {
    # Electron forks helper processes (GPU, renderer, utility) from the same
    # binary. They all carry --type=; only the main process does not, and
    # killing that one takes its children with it.
    if ($p.CommandLine -and $p.CommandLine -match '--type=') { continue }

    if ($p.Name -eq 'ESTER.exe') {
      # The portable build unpacks itself into %TEMP% and runs the real app
      # from there, so its path is not under the clone - the name is the only
      # thing to go on.
      $found += [pscustomobject]@{ Kind = 'packaged'; ProcessId = $p.ProcessId }
    } elseif ($p.ExecutablePath -and $p.ExecutablePath.StartsWith($Path, [StringComparison]::OrdinalIgnoreCase)) {
      # Only this clone's Electron - never some other project's window.
      $found += [pscustomobject]@{ Kind = 'electron'; ProcessId = $p.ProcessId }
    }
  }
  return $found
}

function Stop-Game {
  param([object[]]$Instances)

  foreach ($i in $Instances) {
    $p = Get-Process -Id $i.ProcessId -ErrorAction SilentlyContinue
    if ($p) { try { $null = $p.CloseMainWindow() } catch { } }
  }

  # Ask first, insist after three seconds.
  for ($waited = 0; $waited -lt 10; $waited++) {
    Start-Sleep -Milliseconds 300
    $alive = @($Instances | Where-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue })
    if ($alive.Count -eq 0) { return }
  }
  foreach ($i in $Instances) {
    Stop-Process -Id $i.ProcessId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 500
}

function Start-Game {
  param([string]$Kind)

  if ($Kind -eq 'packaged') {
    $exe = Join-Path $Path 'dist-exe\ESTER.exe'
    if (-not (Test-Path -LiteralPath $exe)) {
      Write-Stamp "dist-exe\ESTER.exe is not there - cannot relaunch the game." 'Red'
      return $false
    }
    Start-Process -FilePath $exe -WorkingDirectory $Path | Out-Null
  } else {
    # Same thing ESTER.bat does, without a second console window.
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npx electron .' `
      -WorkingDirectory $Path -WindowStyle Hidden | Out-Null
  }
  return $true
}

# --- Checks before we start looping ---------------------------------------

if (-not (Test-Path -LiteralPath $Path)) {
  Write-Host "Folder not found: $Path" -ForegroundColor Red
  exit 1
}
Set-Location -LiteralPath $Path
$Path = (Get-Location).Path

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
if ($NoRestart) {
  Write-Host "  Restart:  off - the game is left alone"
} else {
  Write-Host "  Restart:  on  - a running game is relaunched on the new build"
}
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

    $lockBefore = Get-LockHash

    git merge --ff-only $remote
    if ($LASTEXITCODE -ne 0) {
      Write-Stamp "Fast-forward failed - leaving the working copy alone." 'Red'
      $lastState = 'merge-failed'
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }
    Write-Stamp "Pulled." 'Green'

    # Is the game open right now, and if so which way was it started?
    $running = @()
    if (-not $NoRestart) { $running = @(Get-RunningGame) }

    $restartKind = ''
    if (@($running | Where-Object { $_.Kind -eq 'packaged' }).Count -gt 0) {
      $restartKind = 'packaged'
    } elseif ($running.Count -gt 0) {
      $restartKind = 'electron'
    }

    # The packaged game carries its own copy of dist\ inside the executable, so
    # `npm run build` alone would never reach it - it has to be repackaged. And
    # electron-builder cannot overwrite dist-exe\ESTER.exe while it is running,
    # so the window has to close before the build, not after it.
    if ($restartKind -eq 'packaged') {
      Write-Stamp "ESTER.exe is running - closing it so the new build can be packaged." 'Cyan'
      Stop-Game $running
    }

    $buildOk = $true
    if (-not $NoBuild) {
      $lockAfter = Get-LockHash
      if ($lockBefore -ne $lockAfter) {
        Write-Stamp "Dependencies changed - running npm install..." 'Cyan'
        npm install
        if ($LASTEXITCODE -ne 0) { Write-Stamp "npm install failed." 'Red' }
      }

      if ($restartKind -eq 'packaged') {
        Write-Stamp "Repackaging ESTER.exe - this takes a minute..." 'Cyan'
        npm run build:exe
      } else {
        Write-Stamp "Rebuilding..." 'Cyan'
        npm run build
      }

      if ($LASTEXITCODE -ne 0) {
        $buildOk = $false
        Write-Stamp "Build failed - the previous bundle is still in dist\." 'Red'
      }
    }

    if ($restartKind -eq '') {
      if ($buildOk -and -not $NoBuild) {
        Write-Stamp "Ready. Start the game to see the changes." 'Green'
      }
    } elseif ($restartKind -eq 'packaged') {
      # It is already closed either way; put it back up.
      if (-not $buildOk) { Write-Stamp "Reopening the game on the previous build." 'Yellow' }
      if (Start-Game $restartKind) {
        if ($buildOk) { Write-Stamp "Game restarted on the new build." 'Green' }
      }
    } elseif (-not $buildOk) {
      Write-Stamp "Not restarting the game - the build failed, so the window still has the working version." 'Red'
    } else {
      Write-Stamp "Restarting the game..." 'Cyan'
      Stop-Game $running
      if (Start-Game $restartKind) {
        Write-Stamp "Game restarted on the new build." 'Green'
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
