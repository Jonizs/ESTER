# ESTER

A space survival colony sim. Three survivors land on a voxel island adrift in
the void with almost nothing. You point them at work; they gather, build,
study and fight. Every seventh day something comes for them.

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

To update later, either:

- **double-click `UPDATE.bat`** for a one-off pull + rebuild, or
- **double-click `WATCH.bat`** and leave the window open - it checks GitHub
  every 10 seconds and pulls, installs and rebuilds automatically whenever
  something new lands on `main`. Ctrl+C or close the window to stop.

`WATCH.bat` only ever fast-forwards. If the folder has uncommitted edits or
local commits that differ from `origin/main`, it says so and waits rather than
touching your work. After it rebuilds, restart the game window to see the
changes.

Options, if you want to run the watcher by hand:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1 -IntervalSeconds 30
powershell -ExecutionPolicy Bypass -File scripts\watch-pull.ps1 -NoBuild
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

You do not control colonists directly - you tell them what needs doing, and
they pick jobs up themselves, eating and sleeping when they have to.

| Input | Action |
| --- | --- |
| **Right-click** a tree, rock, bush or ore | Queue it for gathering |
| **Left-click** | Select a colonist, building or node |
| Build panel, then **left-click** a clear cell | Place a blueprint (Shift keeps the tool for walls) |
| **Right-click** an unfinished blueprint | Cancel it, recovering most materials |
| Click a colonist card | Select and focus the camera on them |
| Drag / arrow keys | Orbit &middot; wheel / `+` `-` to zoom &middot; `R` reset |
| `Space` | Pause &middot; `1` `2` `3` `4` for 1x / 3x / 10x / 60x |
| `Esc` | Cancel build mode or clear the selection |
| `F11` | Fullscreen (desktop app) |

### The first ten minutes

1. Right-click a dozen trees and a few rocks. Colonists start hauling.
2. Build a **Campfire** (mood) and a **Bedroll** each (rest recovers far
   faster in bed).
3. Build a **Study**, then open the Research tab and pick something. One
   colonist is always assigned to the desk while a project is running.
4. **Toolmaking** and **Agriculture** first: faster gathering, then farms so
   you are not living off berries.
5. Day 7 brings the first event. Raiders come for the colony - **Masonry**
   gives you walls, and **Defence Grid** gives turrets that fight without a
   colonist.

### Time

One in-game day is **one real hour**, and an event lands every **seven days**.
Use the speed controls to skip ahead - 60x turns a day into a minute. The
colony autosaves every 20 seconds and restores when you reopen the game.

### Winning and losing

Research and build the **Void Beacon** to be rescued. Lose every colonist and
the isle goes quiet.

## Progression

Three tracks show in the top left:

- **Tech** - research completed and the variety of what you have built.
- **Academic** - colonist skill levels, plus academic research.
- **Social** - colony mood and headcount. Keep it high and survivors turn up
  asking to join.

## What's in the scene

- A block island generated from seeded value noise: wobbly coastline, rolling
  surface relief, and a rocky keel underneath. Buried blocks are culled, and
  each layer is a single `InstancedMesh`.
- Colonists, raiders, resource nodes and structures, all built from the same
  blocky vocabulary. A marker floats over every pawn so you can find them.
- The void: a nebula gradient shell, two parallax star layers, a slow belt of
  tumbling debris, a warm sun with shadows and a cold rim light from below.
- The island bobs and sways slightly, untethered.

## Prototype status

The colony layer is a **LAZER prototype**: everything before it is preserved
on the `lazer-base` branch, so it can all be reverted in one step if it is not
the game you wanted.

Not in yet: hauling and stockpiles, colonist injuries and body parts, weapons
and armour, temperature, more islands to travel between.
