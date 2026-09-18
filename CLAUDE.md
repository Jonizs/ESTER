# CLAUDE.md

## Workflow rules

Always immediately push all changes to main on github https://github.com/Jonizs/ESTER

Jonas works on more than one machine, and every launcher resolves its own
location (`%~dp0`, `$PSScriptRoot`), so the clone can live in any folder -
nothing is tied to a particular path. Known clones so far:

- `C:\Users\jonas\Desktop\ESTER`
- `C:\Users\TEMP.KVDG.034\Desktop\ester`

Claude runs in a remote container and cannot write to any of them, so after
every push tell Jonas to double-click `UPDATE.bat` in whichever clone he is
using - it pulls origin/main, installs any new dependencies and rebuilds. If
`WATCH.bat` is running there it picks the push up on its own within ~10
seconds. A fresh machine needs `git clone` once, then `SETUP.bat`.

Saved colonies live in the browser/Electron profile of the machine they were
played on, so they do not travel between clones.

## LAZER prototype

The colony sim is a LAZER prototype. If Jonas says **"clean lazer"**, revert
every game-layer change and restore the repo exactly to the pre-prototype
state, which is preserved on the branch `lazer-base` (commit `1390074`, the
floating island with orbit camera and nothing else):

```bash
git fetch origin lazer-base
git checkout main
git restore --source=origin/lazer-base -- .    # or: git reset --hard origin/lazer-base
git commit -m "Clean lazer: revert prototype"
git push origin main
```

Never delete or move the `lazer-base` branch - it is the only revert point.

## Project

ESTER is a 3D space survival game: a RimWorld-style colony sim on a voxel
island adrift in the void.

- **Engine:** Three.js (WebGL), bundled with Vite, wrapped in Electron so it
  ships as a desktop executable.
- **Entry point:** `src/main.js` - renderer, scene, render loop.
- **World modules:** `src/island.js` (voxel island + the surface heightmap the
  colony walks on), `src/space.js` (void backdrop, stars, debris, lighting,
  day/night), `src/orbitCamera.js` (quaternion orbit camera), `src/noise.js`
  (deterministic value noise).
- **Colony modules** in `src/game/`:
  - `game.js` - the simulation: clock, jobs, needs, research, events, combat,
    save/load. Everything else hangs off this.
  - `defs.js` - static content (buildings, research tree, events, names).
  - `world.js` - walkable grid and harvestable resource nodes.
  - `pawns.js` - colonists and raiders: movement, needs, skills, meshes.
  - `buildings.js` - structures and their meshes.
  - `pathfinding.js` - A* over the island grid.
  - `input.js` - selection, right-click designation, build placement.
  - `ui.js` - the HUD (plain DOM over the canvas).
- **Desktop shell:** `electron/main.cjs`.

## Simulation rules that are easy to break

- **One in-game day is one real hour** (`DAY = 3600` game-seconds in
  `pawns.js`). Events fire every 7 days, mid-morning - never at midnight,
  because colonists are asleep then and a raid becomes an execution.
- **Long jobs must yield to needs.** A research job runs until the whole
  project completes; without the interrupt in `_runColonist`, the researcher
  starves at the desk with a full larder. Same for the combat interrupt.
- **Resource nodes must not block movement.** Dense forest blocking cells
  fences pawns into pockets they can never path out of. Only solid buildings
  block, and raiders path *through* walls and attack them.
- **Rates are per in-game day, not per second.** Healing, farm growth and
  hunger are all written as `perDay / DAY * dt`.
- **The tech tree must stay affordable.** The island holds a finite amount of
  wood, stone and ore; the quarry and smelter are what make late-game stone
  and metal renewable. Check the beacon is still buildable after any change
  to yields or costs.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server with hot reload at http://localhost:5173 |
| `npm run electron:dev` | Dev server + Electron window together |
| `npm start` | Build then launch the desktop app |
| `npm run build` | Production bundle into `dist/` |
| `npm run build:exe` | Package `dist-exe/ESTER.exe` (run on Windows) |

## Testing the game

There is no test runner. Drive the built game in headless Chromium with
Playwright against `npx vite preview`, using the `window.ESTER.debug` handle
(`give`, `giveAll`, `skipDays`, `raid`, `finishBuilds`, `completeResearch`,
`run(seconds)`). `debug.run` steps the simulation without waiting on real
time, which is how a 40-day playthrough can be checked in seconds.

Note that headless rendering uses SwiftShader, so frame times there are
software-rendered and meaningless; measure `game.update()` separately.

## Conventions

- ES modules, no TypeScript, no framework - plain Three.js.
- Keep world generation deterministic: seeded noise in `src/noise.js`, no
  bare `Math.random()` in generation code, so the island is identical on
  every launch.
- Use `InstancedMesh` for anything blocky and repeated; the island is one
  instanced mesh per material layer.
- Rotation in the camera is quaternion-based on purpose - do not reintroduce
  Euler pitch clamping, the camera must be able to orbit fully in every
  direction.
