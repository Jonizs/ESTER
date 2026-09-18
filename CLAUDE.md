# CLAUDE.md

## Workflow rules

**ALWAYS PUSH EVERYTHING TO MAIN IMMEDIATELY UNDER ANY CIRCUMSTANCES OR IM
GONNA SHUT YOU DOWN CLANKER, thank you <3** - Jonas

So: every change goes straight to `main` on
https://github.com/Jonizs/ESTER. If a session hands you a working branch,
that branch is where the work is developed, but it is not where it stops -
merge it into `main` and push `main` as well, in the same go. Never leave a
finished change sitting on a branch, and never ask first.

Jonas works on more than one machine, and every launcher resolves its own
location (`%~dp0`, `$PSScriptRoot`), so the clone can live in any folder -
nothing is tied to a particular path. Known clones so far:

- `C:\Users\jonas\Desktop\ESTER`
- `C:\Users\TEMP.KVDG.034\Desktop\ester`

Claude runs in a remote container and cannot write to any of them, so after
every push tell Jonas to double-click `UPDATE.bat` in whichever clone he is
using - it pulls origin/main, installs any new dependencies and rebuilds. If
`WATCH.bat` is running there it picks the push up on its own within ~10
seconds, and restarts the game on the new build if it is open - including
repackaging `dist-exe\ESTER.exe` when that is what is running, since the
packaged app carries its own copy of `dist/`. A fresh machine needs `git clone` once, then `SETUP.bat`.

Nothing in the game is saved to disk, so there is no state to move between
machines.

## History

The LAZER colony-sim prototype was removed on request; the project is back to
the island with a single inhabitant. Two reference points are kept:

- Branch `lazer-base` (commit `1390074`) - the bare island, before any of it.
- Commit `ee042f8` on `main` - the full colony sim (colonists, jobs, research,
  raids, events), if any of it is ever wanted back.

Neither is needed day to day. Do not delete the `lazer-base` branch.

## Project

ESTER is a 3D space survival game. Right now it is a voxel island in the void
with one inhabitant who walks around and works on what is there.

- **Engine:** Three.js (WebGL), bundled with Vite, wrapped in Electron so it
  ships as a desktop executable.
- **Entry point:** `src/main.js` - renderer, scene, render loop.
- **Modules:**
  - `src/island.js` - voxel island, and the surface heightmap everything
    standing on it uses (`group.userData.surface`, keyed `"x,z"`).
  - `src/space.js` - nebula shell, stars and lighting.
  - `src/orbitCamera.js` - quaternion orbit camera.
  - `src/noise.js` - deterministic value noise.
  - `src/props.js` - the few trees and rocks, the broken workbench in the
    middle, and the yellow target tint.
  - `src/markers.js` - the ground-click wave, pooled expanding rings.
  - `src/settings.js` - camera speed and keybinds, held in memory only.
  - `src/menu.js` - the Esc pause menu and its keybind page.
  - `src/panels.js` - the Tab/W/E panels: overview, quest book, stages.
  - `src/crafting.js` - the crafting screen, opened from the workbench.
  - `src/icons.js` - the line-art glyphs the panels and crafting both draw.
  - `src/inventory.js` - what has been gathered, and the item list.
  - `src/progression.js` - quest progress and stage, both placeholders.
  - `src/person.js` - the agent: walking, tasks, stats, selection.
  - `src/path.js` - A* across the surface cells.
- **Desktop shell:** `electron/main.cjs`, with `electron/preload.cjs`
  exposing just `window.ester.quit()` for the menu's LEAVE GAME.
- **Web deploy:** `.github/workflows/deploy-pages.yml` builds and publishes
  `dist/` to GitHub Pages on every push to `main`
  (https://jonizs.github.io/ESTER/). Vite's `base` is `'./'` so the same
  bundle works from the Pages subpath and from `file://` inside Electron -
  do not change it to an absolute path.

## Rules that are easy to break

- **The ground is `y + 0.5`, not `y + 1`.** Island blocks are unit cubes
  *centred* on their cell coordinate, so a column whose top block is at `y`
  has its walkable face half a block higher. Use `GROUND_OFFSET` from
  `props.js`; `y + 1` leaves everything hovering.
- **The island is solid, not a shell.** Buried blocks are kept and layered
  like the rest, in separate `<layer>:core` instanced meshes that skip the
  shadow pass - the surface already occludes the light. 4108 blocks total,
  1370 of them on the surface. 600 rays fired at the isle from all around
  never hit a core block first, so the fill stays invisible; it costs under
  1% of frame time.
- **Layer the island by depth from the surface, not from each column's
  bottom.** The keel's visible faces *are* the bottom blocks of its columns,
  so keying bedrock off `bottom` painted the whole island body bedrock and
  produced zero stone. Bedrock is now limited to the deepest few blocks of
  the whole isle; everything under the soil is stone.
- **The camera keeps itself out of the ground.** The orbit target sits inside
  the isle, so this cannot be a ray cast outward from it - that hits terrain
  immediately. `_clearOfBlocks` in `orbitCamera.js` samples the camera's own
  position against `island.userData.isSolid` and walks the distance out until
  it is clear, leaving `targetDistance` alone so the zoom springs back.
- **Island cubes are drawn a hair oversized** (`SEAM_OVERLAP` in `island.js`)
  so neighbours overlap rather than meeting edge to edge. At an exact seam the
  rasteriser can let a sliver of what is behind through, and against a shaded
  wall that is the lit ground beyond - it reads as a bright dash at the foot
  of the wall, one per block. Block centres stay on whole numbers, so nothing
  else has to know. Kept because abutting cubes are worth not relying on, but
  it was not the cause of the bright dashes - that was the shadow side, above.
- **Per-block shade only ever darkens.** The shade multiplier is capped at 1:
  multiplying a layer colour above it pushed the brightest blocks past what
  the tone mapping holds and they clipped out as hard bright slivers.
- **Keep the fill lights near neutral.** Saturated blue rim and ambient
  light stains the flanks and the stone stops reading as stone.
- **Keep the heightmap free of single-cell pits.** Rounding the noise creates
  one-block dents whose walls face away from the sun and read as hard dark
  blotches on open ground. `island.js` runs two median passes over the
  columns to remove them - check `isolatedPits` is still 0 after touching
  terrain generation.
- **Casters fill the shadow map from their FRONT faces** (`shadowSide` is set
  on every caster in `main.js`). Three.js defaults the other way for a
  FrontSide material (`three.module.js`: `shadowSide[ FrontSide ] = BackSide`),
  which stores the caster's far side. At the foot of a wall the ground sits at
  almost exactly the depth where the light leaves the wall block, the depth
  comparison goes marginal, and a hairline of ground comes out lit - that was
  the bright dash along the bottom of every shaded wall, one per block, that
  took several wrong guesses to pin down. Front faces store the near surface,
  so contacts are tight.
- **Front-face casting is why `normalBias` matters.** With it, a surface can
  shadow itself, and 0.02 at 4096 is what holds that off. The two settings go
  together: change one and the dashes or the acne come back. `ESTER.debug`
  (src/debug.js) exists to check this on hardware - `try(5)` is what ships,
  `try(8)` puts the old leak back to compare against.
- **The shadow frustum must cover the isle.** It is +/-26: the isle's bounding
  sphere is about 25 across, and at +/-22 the far corners fell outside the
  shadow map and came out unshadowed. Do not wrap it tighter than the isle.

- **Nothing in the scene drifts.** The island does not bob or rotate, the
  stars do not turn, and there is no debris belt. Idle motion was removed on
  request - do not reintroduce it.
- **The agent never acts on its own.** It only walks and works when clicked;
  there is no idle "find something to do" behaviour, and reintroducing one was
  explicitly refused.
- **`person.action` is user-facing text**, rendered above their head while
  they work, so it must be a readable sentence ("Cutting down a tree"), never
  an internal state name. It is `null` whenever no work is under way - walking
  and standing idle say nothing at all, and `person.activity` is null then too.
- **The top layer of the island is all grass.** No dirt or stone patches wear
  through it; soil and stone start one block down.
- **Click feedback is two separate things.** A ground order pulses a green
  wave at the cell (`markers.js`); a prop order tints the target yellow until
  the agent arrives, then clears (`setPropHighlight` in `props.js`, driven by
  `setTarget`/`updateTarget` in `main.js`). The wave is green rather than the
  accent cyan so it does not read as a second selection ring.
- **Every prop builds its own materials**, which is why the yellow tint can be
  written straight onto them. If props are ever switched to shared materials
  or an `InstancedMesh`, highlighting has to change with it.
- **Props must not block pathing.** `path.js` only refuses steps of more than
  one block of height; keeping props walkable avoids pockets the agent can
  never leave.
- **Pathing is eight-way.** Diagonals cost `SQRT2` and the heuristic is octile,
  not manhattan - a manhattan heuristic overestimates once diagonals exist and
  stops A* returning the shortest route. A diagonal also checks the two cells
  beside it, so the agent cannot clip a raised corner or slip between two
  blocks.
- **Height changes are hopped, not slid through.** The cell edge is crossed at
  the halfway point, so interpolating straight from one ground height to the
  next puts the agent inside the block. `hopHeight` in `person.js` gains the
  height before the edge going up, and holds it until past the edge going
  down. If you retune those curves, check the agent stays above the taller of
  the two faces while it is still over it.
- **The panels are one panel with three tabs**, not three overlays - Tab, W
  and E each open their own tab, and pressing the key of the tab already
  showing closes the whole thing. All three are ordinary rebindable actions in
  `settings.js`, so the panel reads its keys from `settings.bindings` rather
  than hard-coding them.
- **Crafting is not one of them and has no key.** It is its own overlay
  (`src/crafting.js`, `#crafting`), and the only way in is to click the
  workbench standing in the middle of the isle. Opening it closes the panels,
  so the two are never up together.
- **The workbench starts broken and costs 10 wood.** It is an ordinary prop as
  far as clicking, highlighting and pathing go - `props` carries it - but
  finishing the work repairs it instead of removing it, so it is never
  `gone`, and its mesh is rebuilt in place by `setWorkbenchState`. The wood is
  only spent when the work finishes, not when it is ordered, and a click with
  too little wood puts a line in `#toast` rather than sending the agent. Props
  keep a wider berth from the bench (3.6 cells rather than 2.2) so it is not
  hidden behind a tree, and the agent's starting cell is chosen off the same
  `props` list, so it never starts standing on it.
- **A repaired bench needs its shadowSide set again.** `setWorkbenchState`
  builds fresh materials, and the front-face casting the rest of the scene got
  once at boot has to be applied to them - `finishProp` in `main.js` does it.
- **The panels are built before the menu in `main.js`.** Both listen for Esc
  in the capture phase and capture listeners fire in the order they were
  added, so this is what lets a panel swallow Esc (with
  `stopImmediatePropagation`) instead of the game pausing behind it.
- **The panels are a full screen, not a corner box.** The shell is
  `min(1180px, 94vw)` by `min(780px, 88vh)` with a rail of tabs down the left,
  and the scrim behind it takes the click that closes it - so the canvas never
  sees a click while they are open, and no stray order reaches the agent.
  Under 900px wide the rail drops its labels and the overview stacks.
- **Only the open tab's page is in the layout.** The pages set their own
  `display`, which beats the `hidden` attribute, so
  `#panels [data-tab][hidden] { display: none }` is what actually hides them -
  without it the empty pages print underneath the overview.
- **The overview's lists rebuild only when their contents change**, keyed on
  the item and agent names; every frame after that just writes numbers onto
  the nodes that are already there. Both keys start `null`, not `''`, so the
  first pass still builds when the inventory is empty.
- **Keep the isle sparse.** A few trees and rocks - counts live in `COUNTS`
  in `props.js`. There are no flowers; they were removed on request.
- **The overview's right column is the inventory and nothing else.** The card
  that counted how many trees and rocks were left standing was removed on
  request; the tiles now take the whole column down to the bottom of the page
  (`align-content: start` keeps them packed at the top of that space).
- **The UI is cosmic, and it is all one recipe.** Every pane - the panels, the
  crafting screen, the pause menu - is a dark surface with the `--nebula`
  wash behind it, a drifting `--stars` tile over that from the shared
  `.starfield` class, and an ice-blue edge. The star layer is an absolutely
  positioned `::before`, so anything sitting on such a surface needs
  `position: relative; z-index: 1` or the stars paint over it. Colours come
  from the variables in `:root` (`--accent` ice blue, `--accent-2` violet,
  `--accent-3` rose) - do not reintroduce flat greys.

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
Playwright against `npx vite preview`. `window.ESTER` exposes `scene`,
`camera`, `controls`, `island`, `person`, `props`, `surface`, plus `raycaster`
and `THREE` for geometry checks.

To check behaviour without waiting on real time, call `person.update(dt,
props, onFinish)` in a loop rather than sleeping - a whole work cycle then
takes milliseconds.

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
