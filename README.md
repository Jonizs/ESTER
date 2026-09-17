# ESTER

A space survival game. Right now: a voxel island adrift in the void, and a
camera you can throw around it in any direction.

![stage](https://img.shields.io/badge/stage-prototype-blue)

## Running it

```bash
npm install
npm run dev      # browser, hot reload, http://localhost:5173
npm start        # desktop window (Electron)
```

## Desktop shortcut / .exe

`ESTER.bat` in the project root launches the game and handles the first-run
install and build itself. To put it on your Desktop:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1
```

That creates `ESTER.lnk` on your Desktop with its working directory set to
this project folder, so the shortcut always runs the current code.

For a standalone executable that does not need Node on PATH, run this once on
Windows:

```bash
npm run build:exe
```

It writes `dist-exe/ESTER.exe`. Re-run the shortcut script afterwards and it
will repoint at the executable.

On Linux/macOS use `./ester.sh` instead of the `.bat`.

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
