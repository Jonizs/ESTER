# ESTER

A space survival game. Right now: a voxel island adrift in the void, and a
camera you can throw around it in any direction.

![stage](https://img.shields.io/badge/stage-prototype-blue)

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

To update later: `git pull` (note the space), then double-click `ESTER.bat`.

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

## Controls

| Input | Action |
| --- | --- |
| Drag (or arrow keys) | Orbit the island - unlimited, all axes |
| Wheel / pinch / `+` `-` | Zoom in and out |
| `R` | Reset the view |
| `F` | Toggle idle auto-spin |
| `F11` | Fullscreen (desktop app) |

## What's in the scene

- A block island generated from seeded value noise: wobbly coastline, rolling
  surface relief, and a rocky underside tapering to a glowing crystal core.
  Buried blocks are culled, and each layer is a single `InstancedMesh`.
- The void: a nebula gradient shell, two parallax star layers, a slow belt of
  tumbling debris, a warm sun with shadows and a cold rim light from below.
- The island bobs and sways slightly, untethered.

## Next up

Survival systems: player character, resource gathering, oxygen and heat,
block placement, and more islands to travel between.
