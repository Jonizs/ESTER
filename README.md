# ESTER

A voxel island in the void with one agent. It does nothing unless told: click
where it should go, or click a tree or rock and it walks over and works on it.
Click the agent itself to select it and see its stats. While it is working, the
job and a progress bar float above its head.

![stage](https://img.shields.io/badge/stage-prototype-blue)

## Play in the browser

The game is deployed to GitHub Pages on every push to `main`:

**https://jonizs.github.io/ESTER/**

It is the same build as the desktop app - colonies save to that browser's
local storage, so a browser colony and a desktop colony are separate saves.

## Getting started on Windows

Open PowerShell and clone the repo somewhere you keep projects (not
`C:\WINDOWS\system32`):

```powershell
cd $HOME\Documents
git clone https://github.com/Jonizs/ESTER.git
cd ESTER
```

Then just **double-click `SETUP.bat`** in that folder. It installs
dependencies, builds the game, and puts an `ESTER` shortcut on your Desktop
wired to this project folder. After that, launch the game from the Desktop
shortcut.

Equivalent from a shell, if you prefer:

```powershell
.\SETUP.bat
```

To update later, either:

- **double-click `UPDATE.bat`** for a one-off pull + rebuild, or
- **double-click `WATCH.bat`** and leave the window open - it checks GitHub
  every 10 seconds and pulls, installs and rebuilds automatically whenever
  something new lands on `main`. Ctrl+C or close the window to stop.

If the game is open when something lands, `WATCH.bat` closes it and reopens it
on the new build, so a push reaches the screen on its own. It spots both ways
of running it: the packaged `dist-exe\ESTER.exe` and Electron started from this
folder (`ESTER.bat`, `npm start`). The packaged executable keeps its own copy of
the bundle inside it, so when that one is running the watcher repackages it with
`npm run build:exe` rather than just rebuilding `dist\` - that takes about a
minute, and the window is shut for it.

`WATCH.bat` only ever fast-forwards. If the folder has uncommitted edits or
local commits that differ from `origin/main`, it says so and waits rather than
touching your work.

Options, if you want to run the watcher by hand:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1 -IntervalSeconds 30
powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1 -NoBuild
powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1 -NoRestart
```

## Running it from source

```bash
npm install
npm run dev      # browser, hot reload, http://localhost:5173
npm start        # desktop window (Electron)
```

## Standalone .exe

`SETUP.bat` points the Desktop shortcut at `ESTER.bat`, which needs Node.js
installed. For an executable that does not, run this once on Windows:

```bash
npm run build:exe
```

It writes `dist-exe/ESTER.exe`. Re-run `SETUP.bat` (or
`scripts\create-desktop-shortcut.ps1`) afterwards and the shortcut repoints at
the executable.

On Linux/macOS use `./ester.sh` instead of the `.bat` files.

## How to play

| Input | Action |
| --- | --- |
| **Click** the agent | Select it - a ring marks it and its stats open top left |
| **Click** a tree or rock | It walks over and works on it |
| **Click** the ground | It walks there |
| Drag / arrow keys | Orbit the island - unlimited, all axes |
| Wheel / `+` `-` | Zoom |
| `R` | Reset the view |
| `F` | Toggle idle auto-spin |
| `F11` | Fullscreen (desktop app) |

The agent never starts work on its own - left alone it simply waits. Only work
in progress is announced: a label with the job ("Cutting down a tree", "Picking
up a rock") and a bar showing how far through it is follows it while it works,
and nothing is shown while it walks or stands idle.

Selecting the agent opens a panel top left with its current activity and time
left, its Health, Food, Water and Happiness meters, and its Education, Tool and
Mastery - all three of which start as None.

## What's in the scene

- A block island generated from seeded value noise: wobbly coastline, rolling
  surface relief, and a rocky keel underneath. The top face is grass all over;
  each layer is a single `InstancedMesh`.
- A handful of trees and rocks, placed from the same seed, so the isle looks
  the same every launch.
- One agent, who walks the island on an A* path across its surface.
- The void: a nebula gradient shell and two star layers. Nothing drifts or
  bobs - the scene is deliberately still.

## Status

Early. The colony-sim prototype that briefly lived here was removed; this is
the quieter starting point it was built on top of.
