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

The run *is* saved now, so an update no longer costs one: it is written down
every few seconds and read back on launch (`src/save.js`). It lives in the
app's own storage, on the machine it was played on - nothing is uploaded, so
a run still does not follow him between his clones.

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
  - `src/panels.js` - the Tab/Q/W/E panels: overview, inventory, quest book,
    stages.
  - `src/crafting.js` - the crafting screen, opened from the workbench.
  - `src/icons.js` - the line-art glyphs the panels and crafting both draw,
    materials included.
  - `src/starfield.js` - the drifting motes behind every UI surface.
  - `src/fullscreen.js` - full screen on launch, in a browser.
  - `src/inventory.js` - what has been gathered, and the item list (an item
    with `plants` gets a PLANT button on its tile).
  - `src/progression.js` - quest progress and stage, both placeholders.
  - `src/save.js` - the run, written down and read back on launch.
  - `src/person.js` - the agent: walking, tasks, stats, selection.
  - `src/path.js` - A* across the surface cells.
  - `src/placement.js` - picking a station up and putting it down again, and
    planting one out of the inventory.
- **Desktop shell:** `electron/main.cjs`, with `electron/preload.cjs`
  exposing just `window.ester.quit()` for the menu's LEAVE GAME. The window
  opens full screen (`fullscreen: true`).
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
- **Nothing in the game is deterministic-critical about the UI.** The motes
  are placed with `Math.random()` on purpose; the no-bare-`Math.random()`
  rule under Conventions is about world generation, not dressing.
- **The agent never acts on its own.** It only walks and works when clicked;
  there is no idle "find something to do" behaviour, and reintroducing one was
  explicitly refused.
- **Every order needs the agent selected first**, walking included. A click
  on a tree, a rock, the broken bench *or* bare ground does nothing at all
  unless an agent is selected - `ordersAllowed()` in `main.js` is the gate.
  The one exemption is opening the *repaired* bench, because that opens a
  screen rather than giving an order.
- **There are no toasts.** The line that used to appear at the top of the
  screen was removed on request, along with everything it said. A refused
  click, an empty agent slot and a bench with too little wood are all silent
  now - so anything that needs to be *told* to the player belongs on a panel
  or on a label in the world (`#bench-label` is the pattern), never in a
  passing notice. Do not reintroduce one.
- **Selection is single, and `selectOnly()` is the only thing that sets it.**
  Clicking an agent, clicking their card in the overview, the number keys,
  right-clicking and clicking the void all go through it, so exactly one
  agent or none is ever selected. Anything new that selects should call it
  rather than `setSelected` directly, or two agents end up lit at once.
- **The number keys are slots into `agents`, not names.** `selectAgent1`
  through `selectAgent5` in `settings.js` are ordinary rebindable actions,
  and the slot indexes the same `agents` list the overview lists in order.
  An empty slot says so rather than clearing the selection, so a mis-hit
  never leaves the player with nothing selected.
- **`person.action` is user-facing text**, rendered above their head while
  they work, so it must be a readable sentence ("Cutting down a tree"), never
  an internal state name. It is `null` whenever no work is under way - walking
  and standing idle say nothing at all, and `person.activity` is null then too.
- **A felled tree drops saplings, 0 to 2.** `PROP_KINDS.tree.drops` is the
  roll, beside the wood `yield`, and `finishProp` in `main.js` walks it - so
  anything else that should drop more than one thing needs no new code. The
  roll is a bare `Math.random()`, which is fine: it is what happens during a
  run, not world generation.
- **A sapling is planted through the move screen, not a screen of its own.**
  The PLANT button on an inventory tile (any item with `plants` in `ITEMS`)
  calls `beginPlanting` in `main.js`, which stands a sapling on the nearest
  legal cell and hands it to `placement.plant()` - from there it is arrows,
  or dragged on the isle, exactly like moving the bench. Nothing is spent
  until PLACE; CANCEL takes it away again unspent (`onDiscard`). After a
  PLACE, if another sapling is held the next one starts immediately, so a
  handful goes down in one go without reopening the inventory - that is
  `onPlant` calling `beginPlanting` again, and it is the whole reason
  `commit()` fires its callback *after* `finish()`.
- **A planted sapling can be picked back up.** `PROP_KINDS[kind].portable`
  is what puts PICK UP on the mover, and it only shows while something
  already standing is being moved - never while one is being planted, where
  CANCEL is the way out. It goes back into the inventory whatever it had
  grown so far.
- **Saplings grow on a timer, and need two clear cells.** 3 to 4 minutes
  (`GROW_SECONDS`), counted in `updateGrowth` in `main.js` and only while the
  sapling is in the ground - one still being positioned is not growing. When
  its time is up it comes up *if* no tree is within `GROW_CLEARANCE` (2)
  cells; if one is, it stays a sapling and tries again every few seconds, so
  two planted side by side give one tree and one sapling, and felling that
  tree lets the other through. The clearance is measured to trees only, never
  to other saplings, or a close pair would deadlock each other. **None of
  this is told to the player** - no label, no tooltip, no line anywhere about
  how long it takes or how far apart they go. Do not add one.
- **Growing is the prop changing kind, not a new prop.** `growProp` rebuilds
  the meshes under the same prop object and flips `kind` to `tree`, so the
  agent's task, the hover and anything else holding it keep working. Props
  the run put on the isle carry `spawned`, which is how DEV RESET knows to
  take them away rather than stand them back up.
- **Anything built after boot needs `castFromFront`.** The scene-wide
  front-face shadow pass runs once at startup, so a repaired bench, a planted
  sapling and a sapling that has just become a tree each have to be given it
  again - `castFromFront` in `main.js` is the one helper for it.
- **Clearing the hover means `setHovered(null)`, never `hovered = null`.**
  Writing the variable by hand leaves the outline burning on whatever was
  lit, because `setHovered` then sees nothing to change. That is what left a
  planted sapling outlined for the rest of the run.
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
- **Saplings are not work.** They have no `action` in `PROP_KINDS`, and
  `handleClick` in `main.js` checks for one before ordering anyone about - so
  clicking a sapling does nothing at all rather than sending the agent to
  stand over it. Anything else that is scenery to look at rather than a job
  goes the same way.
- **Props must not block pathing, with one exception.** `path.js` refuses
  steps of more than one block of height, and refuses the cells in its
  `blocked` set; everything else is walkable, which is what keeps the isle
  free of pockets the agent can never leave. Only props whose kind is marked
  `solid` in `PROP_KINDS` go into `blocked` - today that is the workbench
  alone. Before marking anything else solid, sweep the isle and check every
  cell is still reachable; trees and rocks standing in a line would wall a
  corner off.
- **Props have footprints, and the anchor is the low corner, not the
  middle.** `PROP_KINDS[kind].footprint` is how many cells a kind stands on -
  the workbench is `{ w: 2, d: 1 }`, everything else defaults to one cell.
  `prop.x/prop.z` is the *corner* of that rectangle, so anything asking "is
  this cell taken" has to walk `footprintCells()` rather than compare against
  `prop.x`; the mesh stands at `footprintCentre()`, half a cell off the
  anchor for an even width. `canPlace()` is the one rule for where a kind may
  stand - every cell solid, all at one height, nothing else on them - and
  `syncBlocked()` rebuilds the pathing set from wherever the props are now.
  Anything that moves a prop goes through `placeProp()` and then
  `syncBlocked()`, or the agent walks through thin air.
- **A* takes several goal cells, not one.** `findPath` accepts an array, and
  `workOn` hands it every cell of the prop's footprint, so the agent walks up
  to whichever side of a two-cell station is nearest instead of round to one
  corner. The heuristic measures to the *nearest* goal - anything else stops
  being optimistic and A* stops returning the shortest route.
- **The workbench is walked around, corners included.** Its cell is in
  `blocked`, so `walkTo` on it returns false and a route never crosses it -
  and the diagonal check refuses a step whose shoulders are blocked too, so
  the agent does not shave the corner of a bench that overhangs its cell.
  `workOn` still works: it asks for an *adjacent* goal, which the search
  reaches without entering the cell. The cell the agent is standing on is
  always treated as open, so a cell turning solid underneath it is never a
  trap.
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
- **The panels are one panel with four tabs**, not four overlays - Tab, Q, W
  and E each open their own tab, and pressing the key of the tab already
  showing closes the whole thing. All four are ordinary rebindable actions in
  `settings.js`, so the panel reads its keys from `settings.bindings` rather
  than hard-coding them. Adding a tab is a `TABS` entry in `panels.js`, an
  `ACTIONS` entry in `settings.js`, a glyph in `icons.js` and a
  `<section data-tab>` in `index.html` - nothing else.
- **Crafting is not one of them and has no key.** It is its own overlay
  (`src/crafting.js`, `#crafting`), and the only way in is to click the
  workbench standing in the middle of the isle. Opening it closes the panels,
  so the two are never up together.
- **The crafting grid floats; the recipes flow around it.** The 4x4 grid sits
  in the top right and is `float: right`, which is the whole reason
  `.craft-body` is block flow rather than a grid - only normal flow lets the
  craftable items run down the grid's left and then carry on *underneath* it
  once there are more than fit beside. That is also why the recipe cards are
  `display: inline-block`: a grid or flex container would be held in a narrow
  column beside the float and never reach under it. `RECIPES` in
  `crafting.js` is the list, empty for now - pushing an entry onto it is all
  that is needed to see it on screen. What is held is listed along the bottom
  under the heading INVENTORY, on `clear: both`, and it *scrolls* rather than
  growing - `max-height` on `#crafting .tiles` - so a full inventory never
  pushes the grid off the top. The empty-recipes box is `display: flow-root`
  on purpose: a plain block box's border runs along behind the floated grid
  even though its text wraps clear of it, which reads as the two overlapping.
- **Wreckage cannot be moved; repair it first.** `canMove()` in `props.js`
  is the one test - a `placed` kind that also has a `cost` is not movable
  until `prop.repaired`, so the fallen bench stays where it fell. It still
  outlines on hover, because it is still something to interact with; it just
  refuses the move key. `placement.begin` turns down anything `canMove` says
  no to, so callers do not have to check first.
- **The workbench starts broken and costs 10 wood.** It is an ordinary prop as
  far as clicking, highlighting and pathing go - `props` carries it - but
  finishing the work repairs it instead of removing it, so it is never
  `gone`, and its mesh is rebuilt in place by `setWorkbenchState`. The wood is
  only spent when the work finishes, not when it is ordered, and a click with
  too little wood puts a line in `#toast` rather than sending the agent. Props
  keep a wider berth from the bench (3.6 cells rather than 2.2) so it is not
  hidden behind a tree, and the agent's starting cell is chosen off the same
  `props` list, so it never starts standing on it.
- **The broken bench is the whole bench, tipped over.** `buildWorkbench`
  builds the top and legs into one `frame` group either way, and the broken
  state turns that group half over so the tabletop is down on the grass and
  the legs are in the air - a quarter turn was tried first and reads as a
  board standing on its end, not as a collapsed bench. The frame is then
  dropped by its measured `Box3`, not by a hand-picked offset, so the shape
  can be retuned without it ending up buried or hovering. The half turn is
  exact and the only other rotation is yaw: any lean off square rests the
  bench on one corner of the top and holds the rest of it clear of the
  ground, which is the opposite of lying flat. Yaw turns it on the spot
  without lifting any of it. The snapped leg and
  the plank are added outside the frame, so tipping it does not take them
  with it.
- **The bench's legs are measured off its top, never given their own
  height.** `UNDERSIDE + LEG_INSET` in `props.js` is what a standing leg
  reaches, so it runs a hair *into* the tabletop rather than stopping under
  it. A shorter leg for the broken bench left an 0.08 gap at the joint, which
  is invisible on an upright bench and obvious once it is lying on its side
  with the legs in the air; a leg stopping exactly at the underside leaves a
  hairline seam, the same one the island's oversized cubes exist to avoid.
- **The bench's cost is on screen from boot, not on click.** `#bench-label`
  (`updateBenchLabel` in `main.js`) floats "0 / 10 wood" over the bench every
  frame it is broken and off-screen checks aside, and lights up once there is
  enough wood. It needs nothing clicked, and it goes for good when the bench
  is repaired. It is anchored 2.3 above the bench: lower and the badge covers
  the bench itself at a wide zoom.
- **Only `placed` props outline on hover.** `PROP_KINDS[kind].placed` marks
  a station the player put down, as opposed to scenery the isle grew: it
  outlines under the cursor and it can be moved. Trees and rocks do neither.
  The outline is an `EdgesGeometry` child on every mesh, built by
  `buildOutline()` and toggled by `setPropOutline()`, with `depthTest` off so
  the whole shape reads at once - `setWorkbenchState` rebuilds the meshes, so
  it rebuilds the outlines too.
- **The hover ray skips the island until it has to.** It runs on every
  pointer move and the island is thousands of instanced blocks, so
  `refreshHover` casts at the props group alone; only once a station is
  actually hit does it cast at the island as well, to check nothing is in
  front of it. Do not "simplify" that into one cast against the whole scene.
- **Moving a station can never leave it somewhere illegal.** `placement.js`
  refuses a move rather than allowing an invalid position even momentarily -
  every cell solid and level, clear of other props, and clear of the agent -
  and flashes the footprint red instead. `blocked` is resynced on every
  accepted move, not just when the move is committed, and a walking agent
  whose route now crosses the station is sent to the same destination again
  so it goes round. CANCEL puts the station back where the move started.
- **The mover's arrows are read off the camera, not the world.** "Forward" is
  away from whatever the camera is looking at, snapped to the nearest axis,
  so the arrows keep meaning the same thing once the isle has been orbited.
  The D-pad's CSS grid is keyed off each button's `data-step`, not
  `nth-of-type` - the middle of the cross is a mark rather than a button, and
  keying off position put two of the four arrows in the wrong cells.
- **A station is dragged on the isle, not by a handle.** With a move on,
  left-press on the canvas and move: the station follows the cell under the
  cursor. That is the same gesture that orbits the camera, so
  `controls.pointerBlocked` hands it to `placement.js` for as long as the
  move lasts - which is also why the orbit camera grew that hook beside
  `keyboardBlocked`. The station only moves once the cursor actually travels,
  so a plain click never teleports it, and `setPointerCapture` is wrapped in
  a try/catch because a refused capture must not swallow the drag.
- **DEV RESET puts stations back.** A placed prop carries `prop.home`, the
  anchor it started the run at, and `devReset` walks them back to it - a
  bench left at the far end of the isle otherwise survives the reset.
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
- **The inventory is its own page, opened with Q, and is not on the
  overview.** It was the overview's right column once; it is a tab of its own
  now, and the overview keeps only the GATHERED count on its summary tile -
  do not put the tiles back beside the agents. The framed field of tiles runs
  the height of the page, with `align-content: start` keeping them packed at
  the top of that space rather than stretched tall.
- **Every material has an icon, and it is `itemIcon` that guarantees it.**
  The glyphs are in `src/icons.js`, drawn as little emblems of the thing -
  a cut log with its growth rings, a broken boulder, a shoot - the way a
  board game marks its resources, all on the same 24x24 grid at one weight
  of line. Two of them took several goes and the rejected shapes are worth
  not repeating: logs drawn *lying down* all read as something else at tile
  size (end-on circles as a row of buttons, a side view as a battery, a
  crossed pair as a bowtie), and a rock drawn as an outline with one crease
  reads as an empty bag. What fixed them was nested ellipses for the wood -
  nothing else in the set is that shape - and, for the stone, a crease
  running the width of the face with spurs down from it plus a chip in
  front. Judge a new one at 24px, not at 64: that is the size it ships at. `icon()`
  is strict and comes back empty for a name it does not know, which is what
  a mistyped *tab* should do; `itemIcon()` falls back to the crate, because a
  tile with nothing drawn on it reads as a bug and an item is the one thing
  that can arrive without the icon set being touched. There are glyphs in
  there for materials nothing drops yet (plank, grain, fibre, clay, ore,
  metal, coal, crystal) - `ITEMS` in `inventory.js` is what decides what
  actually exists, so they cost nothing until something does.
- **A material's icon is drawn in its own colour.** `ITEMS[item].tint` is set
  on the tile as `--tint` and the icon reads it, so a row of them is told
  apart by colour as much as by shape. They are all luminous - the
  no-flat-greys rule holds.
- **Item buttons belong to the inventory page, not the crafting screen.** The
  crafting screen's list is stock on the bench to build from; PLANT and
  anything like it live on the Q page, where the item is a thing to go and
  do something with. Only `#panels .tile-action` is styled, deliberately.
- **The UI is cosmic, and it is all one recipe.** Every pane - the panels, the
  crafting screen, the pause menu - is a dark surface with the `--nebula`
  wash behind it, a faint `--stars` tile over that from the shared
  `.starfield` class, drifting motes over *that*, and an ice-blue edge. Both
  star layers sit underneath, so anything on such a surface needs
  `position: relative; z-index: 1` or they paint over it. Colours come from
  the variables in `:root` (`--accent` ice blue, `--accent-2` violet,
  `--accent-3` rose) - do not reintroduce flat greys.
- **The motes are elements, not a moving tile.** The star layer used to be one
  repeating background creeping diagonally, so every star moved as one and
  none of them ever changed. `src/starfield.js` now fills each `.starfield`
  surface with individual `.star` spans, each given its own rise time, fade
  time and *negative* delays, so the field is already scattered and mid-fade
  the moment a panel opens. Both are plain CSS animations once placed -
  nothing runs per frame, so an open panel costs the render loop nothing. The
  `.stars` layer is the one child of a pane that must stay at `z-index: 0`,
  which is why `#menu .panel > :not(.stars)` is written the way it is.
- **Full screen is the default, and Esc is not the way out of it.** The
  desktop window opens `fullscreen: true` and F11 toggles it; Esc belongs to
  the pause menu and is deliberately no longer wired to leave full screen.
  A browser cannot be put into full screen without a gesture, so
  `src/fullscreen.js` waits for the first click or key press, asks once, and
  never asks again - someone who leaves with F11 or Esc stays out.

- **The run survives a restart, and that is the whole point of the save.**
  `WATCH.bat` closes the game and relaunches it on the new build whenever
  something lands on `main`, and that used to throw the run away.
  `src/save.js` writes it to `localStorage` every five seconds and reads it
  back before the first frame - `saves.restore()` runs at boot, not a moment
  later, so a restored run is simply how the isle looks on launch rather than
  something visibly rearranging itself.
- **The autosave is on a timer, never on the frame delta.** The render loop's
  delta is capped and stops resembling real time the moment frames stall or
  the window goes to the back - which is exactly when the run most needs to
  be written down already. A `setInterval` keeps its own clock, and the
  desktop window's `backgroundThrottling: false` keeps it ticking behind
  other windows.
- **Three events save on the way out, because no one of them covers
  everything.** `pagehide` is the browser's reload and tab close, but it does
  *not* fire when the desktop shell's window is closed - that one is
  `beforeunload`, and without it a plain close cost the last few seconds of
  play (confirmed by driving the real Electron window). `visibilitychange`
  catches the window merely being put to the back. `WATCH.bat` asks the
  window to close before it insists, so the graceful path is the normal one
  and the five-second autosave is the backstop.
- **The Electron app is named, so both ways of launching share one save.**
  `app.setName('ESTER')` in `electron/main.cjs`, before anything asks for a
  path: unpinned, an unpackaged `npm start` resolves its profile to
  `.../Electron` while the packaged `ESTER.exe` resolves it to `.../ESTER`,
  and the two would each keep a separate run.
- **What the save does not keep is what the agent was in the middle of.** A
  walk and a job are both dropped, and a restored run has the agent standing
  idle where they were. Restoring half a swing of an axe is not worth the
  machinery.
- **Every piece owns its `saveState`/`loadState` beside its `reset`.**
  `inventory.js`, `person.js` and `progression.js` each have all three;
  `save.js` only serialises what they hand it and does the prop surgery
  itself. Anything that gains run state needs all three, or it quietly fails
  to survive a restart - the same trap as forgetting a `reset`.
- **`SAVE_VERSION` is a fence, not a migration.** Change the shape of what is
  written and bump it; an older save is dropped rather than half-read. There
  is nothing in a run yet worth migrating.
- **DEV RESET clears the save too.** It puts the run back to how it booted,
  so leaving the old one on disk would have the next launch quietly undo it.
- **DEV RESET is game state only.** The pause menu's DEV RESET (`devReset` in
  `main.js`) puts the run back to how it booted - props standing, the
  workbench broken, the agent home with full needs, nothing held, nothing
  selected - without reloading the page. It deliberately leaves the keybinds
  and camera speed alone; RESET TO DEFAULTS beside it is what those have. Each
  piece owns its own `reset()` (`person.js`, `inventory.js`,
  `progression.js`), so anything that gains run state should gain one too and
  be called from `devReset` - otherwise it quietly survives the reset.

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
