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
  - `src/orbitCamera.js` - quaternion orbit camera, and the free camera on F.
  - `src/noise.js` - deterministic value noise.
  - `src/props.js` - the few trees and rocks, the broken workbench in the
    middle, and the yellow target tint.
  - `src/markers.js` - the ground-click wave, pooled expanding rings.
  - `src/selectbox.js` - the left-drag box, measured in screen pixels.
  - `src/settings.js` - camera speed and keybinds, held in memory only.
  - `src/menu.js` - the Esc pause menu and its keybind page.
  - `src/panels.js` - the Tab/Q/W/E panels: overview, inventory, quest book,
    stages.
  - `src/crafting.js` - the crafting screen, opened from the workbench:
    the grid, the recipes and what the grid adds up to.
  - `src/lookat.js` - the bar at the top naming whatever is under the cursor.
  - `src/highlight.js` - the corner brackets around whatever it is naming.
  - `src/cutaway.js` - the X-ray cut that shows the selected agent through
    whatever is between them and the camera.
  - `src/wield.js` - handing a tool to an agent, from either end.
  - `src/icons.js` - the line-art glyphs the panels and crafting both draw,
    materials included.
  - `src/starfield.js` - the drifting motes behind every UI surface.
  - `src/fullscreen.js` - full screen on launch, in a browser.
  - `src/music.js` - the soundtrack, synthesised live with Web Audio.
  - `src/inventory.js` - what has been gathered, and the item list (an item
    with `plants` gets a PLANT button on its tile and opens the mover; one
    with `sows` or `fills` gets one that arms the cursor instead).
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
  shadow pass - the surface already occludes the light. They do still
  *receive*: once a shovel takes the block above one out, that buried block
  is the floor of a pit and has to be shaded by the walls around it, or a dug
  hole comes out as a bright square. Receiving is the cheap half and only
  costs where a fragment is actually drawn, which for a buried block is
  nowhere until it is dug out; casting, the expensive half, is unchanged.
  4108 blocks total,
  1370 of them on the surface. 600 rays fired at the isle from all around
  never hit a core block first, so the fill stays invisible; it costs under
  1% of frame time.
- **Layer the island by depth from the surface, not from each column's
  bottom.** The keel's visible faces *are* the bottom blocks of its columns,
  so keying bedrock off `bottom` painted the whole island body bedrock and
  produced zero stone. Bedrock is now limited to the deepest few blocks of
  the whole isle; everything under the soil is stone.
- **F is the free camera, and NOTHING is locked in the middle of it.** That
  is the whole point of it: a right-drag turns the eye about ITSELF, the way
  it does in Minecraft or CS, rather than swinging it around a point. It is
  still the same rig - the eye is target + offset - so `rotate` notes where
  the eye is, turns, and puts it back, which leaves the TARGET to swing out
  from under the eye instead. The same maths read the other way up, and every
  other part of the camera carries on as it was. An orbit was the first
  version of this and it was wrong: being pinned to the middle of the isle is
  exactly what a free camera is not. It took the `f` key off the auto-spin,
  which was already passed `autoSpin: false` and could only ever have put back
  the idle drift the rule below forbids.
- **Forward is the middle of the SCREEN, not a compass heading.** Up is
  forward and down is back, along the full view direction - so looking up and
  holding forward climbs, and looking down dives. That is the whole of the
  vertical movement and it needs no keys of its own. Flattening forward onto
  the ground was the first version and it fights the free look: you aim at the
  sky and then skim along the floor. Left and right strafe and stay level
  whatever the pitch, because the camera's own right axis is horizontal by
  construction - yaw is applied about the world's up and pitch about that same
  right axis, so pitching never tilts it, which is why `_fly` reads the axis
  straight off the orientation rather than crossing anything.
- **Free, the eye is the player's and nothing else may move it.**
  `_clearOfBlocks` is skipped in free mode: it exists to shove an ORBIT camera
  out of terrain it was swung into, and a shove fights the hand on the keys.
  The eye is kept out of the isle by refusing the step instead
  (`_stepEye`), which is also what keeps the wheel honest - free, it dollies
  the eye along its own view line through that same step rather than changing
  `distance` behind everyone's back, since with nothing in the middle there is
  no subject left to zoom towards.
- **A step is taken one axis at a time, and it stops SHORT of the block.**
  Axis at a time is what makes it slide: a step that would end inside the isle
  gives up only the axis that did it, so flying into a wall runs along it
  rather than sticking dead. And the test probes `EYE_MARGIN` past where the
  step lands, because the near plane is only 0.1 - an eye allowed to come to
  rest flush against a face sees straight past it into the unlit inside of the
  isle, and the screen fills with black. Checking only the cell the eye is in
  lets it get exactly that close.
- **Both step tests ask whether a step makes things WORSE**, never whether it
  ends somewhere bad. An eye already inside a block - free camera toggled on
  while zoomed into the terrain - or somehow already past the leash would
  otherwise have every step out of it refused as well, and be stuck for good.
- **The movement keys are HELD, not tapped, or there are no diagonals.**
  `_held` in `orbitCamera.js` is a Set of the movement actions that are down
  and the step is taken in the frame loop, which is the whole of "press two
  and go diagonally" - a keydown that moves the camera once can only ever go
  one way at a time. The combined direction is normalised, so a diagonal is
  the same speed as a straight line rather than 1.41 times faster.
- **The arrows are one pair of actions, and the mode decides what they do.**
  `orbitLeft`/`orbitRight`/`orbitUp`/`orbitDown` orbit until F is pressed and
  fly the eye after it, so rebinding them in the pause menu rebinds both -
  two sets of bindings for one pair of keys would be worse than one that
  reads a little oddly in the list.
- **Let the held keys go whenever the camera is stood down.** A key still
  down when a panel opens sends its keyup to whatever took the keyboard, so
  the eye would fly on behind it forever; `update` clears `_held` while
  `keyboardBlocked` is true, and `blur` clears it when the window goes. That
  is also why `keyboardBlocked` is the whole list of screens rather than the
  menu alone: the mover steps a station with the same four arrows, and flying
  the camera out from under it at the same time is one gesture doing two
  things.
- **Locking back on resets the view; turning free ON does not.** Free, the
  target is left wherever the eye happened to be looking - out in the void, or
  under the isle - so an orbit picked straight back up would swing the isle
  around a point off in the dark. `setFreeCamera(false)` calls `reset()` for
  exactly that, which lets the held keys go as well. The other way needs
  nothing: the eye simply carries on from where the orbit had it.
- **Free is on a leash, and reset view is the way home.** `panRadius` holds
  the EYE within 3 island radii of the middle of the isle, in any direction,
  and `reset()` puts the target back as well as the orientation. It is
  measured to the eye rather than to what the eye is looking at, because with
  nothing locked in the middle the eye is the only thing really moving - and
  it has to clear the 31.5 the view starts at and leave room past it. Both
  halves are needed: look up, hold forward, and the isle is out of frame in
  seconds with nothing on screen to steer back by, so there has to be a key
  that brings it home.
- **Which mode the camera is in is the one thing the arrows cannot say for
  themselves**, so `body.free-camera` lights the `#help` line that names the
  key while it is on (`onFreeCamera` in `main.js` is the hook). That is not a
  toast: it is a line already on screen for as long as the mode lasts, not a
  notice that appears and goes.
- **The selected agent is never lost behind the scenery.** `src/cutaway.js`
  takes away whatever is between the camera and them once they are FULLY out
  of sight, and nothing beyond them is touched. G toggles it (`toggleCutaway`
  in `settings.js`); off, nothing is ever cut or hidden, and the help line
  says which it is.
  - It waits for FULLY hidden: head, chest, feet and both shoulders all
    blocked. Opening the moment a ridge covered their feet took the scenery
    away while they were still plainly in view.
  - The ISLE loses WHOLE BLOCKS. Only the isle's instanced meshes are
    patched, and the shader tests each block's CENTRE against a tube from
    the eye to the agent's chest, throwing the entire block away if it is in
    it. Testing each fragment instead cut a round lens through the terrain
    with block edges sliced along it - a hole in the picture rather than
    blocks taken out of the way. Being a shader it follows the camera round
    as it orbits, and the instance matrices are never touched.
  - The tube is wide - `RADIUS` 3.3 blocks - so the gap is a real view onto
    the agent rather than a slot through the hill - and it runs right up to
    them (`SHORT_OF` 0). It used to stop almost a block short to spare their
    ground, which left the blocks right in front of them standing and
    covering them; the one block they stand on is spared on its own now.
  - Only the ONE block the agent stands on is kept (`uCutKeep`, read off the
    heightmap, not their height, which bobs mid-hop). An earlier rule kept
    everything at or below their feet and was taken out on request: it left
    whole slopes standing in the way when the camera looked down at them.
  - PROPS are hidden WHOLE, on a layer nothing renders, picks or casts
    shadows from - so a click goes through a hidden tree and it leaves no
    shadow over the agent.
  The occlusion check steps through `isSolid` for the isle (a cast at it is
  0.6ms) and casts at the props on EVERY layer - a prop hidden because it is
  in the way is still in the way, or hiding it would put it straight back.
  It lingers a moment once they are back in view so a grazing line does not
  flicker. Anything the pointer asks about goes through `seen()` in
  `main.js`, which uses `cutaway.hidesHit` - the same block-centre test as
  the shader, or clicking the agent through the hole walks them into the
  hill.
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
  unless an agent is selected - `selectedAgent()` in `main.js` is the gate,
  and it is who the order is *for* as much as whether there is one. The one
  exemption is opening the *repaired* bench, because that opens a screen
  rather than giving an order.
- **The left button never turns the camera.** The orbit is the RIGHT button
  (`orbitCamera.js` turns down any mouse pointerdown that is not button 2);
  left-drag draws the selection box instead. A touch or a pen has no buttons
  to choose between, so it still orbits, and two of them still pinch. A mouse
  is one pointer for both buttons, so each gesture stands the other down
  while it is running - `controls.pointerBlocked` and the box's `blocked`
  check each other, or one drag would do both things at once.
- **A box with work in it is work; a box with only people in it is a
  selection.** `applyBox` in `main.js` reads both, and an agent already
  selected plus something to do in the box is an order - even if the box
  clipped that agent on its way past. Taking agents first was the obvious
  rule and it was wrong: swiping a rock while grazing the agent reselected
  them and threw the order away, which is nothing happening as far as the
  player can see. A box with nobody selected, or one that caught only
  agents, still selects the one nearest the middle of the box, and exactly
  one - selection is single.
- **An agent is never given more than three jobs at once.** `JOB_LIMIT` in
  `main.js` is the cap and it covers both ways of giving work: a box keeps
  the three caught nearest the middle of it and leaves the rest standing, so
  a box thrown across half the isle is not a whole afternoon's work on one
  order, and a queue click is refused once there are three. The middle of the
  box is what picks the agent out of a crowd too, so the same rule decides
  both. The three go to the selected agent as a queue
  (`workOnAll` in `person.js`), and they take the nearest job each time one
  is finished -
  measured from wherever they are then, not from where they started.
  Anything unreachable or already felled is skipped rather than stalling the
  batch, and `walkTo` calls the whole thing off. The bench is left out of a
  box on purpose: it is a station with a cost, repaired by clicking it.
- **Ctrl adds, and never takes anything away - on EVERY order.** Holding it
  turns a click into a job queued behind whatever the agent is already doing
  rather than instead of it, up to `JOB_LIMIT` in all, and asking twice for
  the same thing does nothing rather than queueing it twice. That is
  `queueUp` for a prop to harvest and `queueAt` for everything else -
  tilling, digging, reaping, putting ground back, filling a bucket,
  watering. It was only ever the first of those for a long time, because the
  queue was a list of *props*: `doAt` cleared it, so ctrl-clicking a patch
  of grass threw away the batch that was already running. The queue holds
  jobs now (`propJob`/`cellJob` in `person.js`), `_startNextJob` runs
  whichever kind it finds, and `order()` in `main.js` is the one door every
  ground job goes through. Walking is the exception and always will be: it
  is what CALLS a queue off. A box drawn with it held adds as well, taking however many of the
  three are still going spare. Because it only ever adds, a queue click that
  misses is silent: on bare ground it does not send them walking, and on the
  void it does not drop the selection. `queueing(event)` in `main.js` is the
  one test, and it takes Cmd as well for a Mac in a browser.
- **A queue is worked nearest-first, however it was given.** `_startNextJob`
  picks the nearest job to wherever the agent is standing *then*, so neither
  the order things were ctrl-clicked in nor the order they came out of a box
  is kept. That is the same rule for both, which is the point - two
  orderings would be worse than one that is occasionally not what was meant.
- **The box checks what the isle hides.** `hiddenByIsland` casts one ray per
  candidate when the button comes up, so a box dragged over the near slope
  does not quietly take in the trees on the far side. It is a handful of
  casts, once - the same reasoning as the hover ray, which is why neither
  runs against the whole scene every frame.
- **The yellow target tint is read off the agents, not written at the
  click.** `syncTargets()` in `main.js` rebuilds the lit set every frame from
  each agent's job and queue, so a finished job, a cancelled walk, a felled
  tree and a whole batch all clear themselves. There is no `setTarget` any
  more; `ESTER.targets` is the list and `ESTER.targeted` is the first of it.
- **AGENT SWARM is a dev button, and nothing of it is saved.** It stands two
  more agents on the isle for 30 seconds (`callSwarm` in `main.js`), counted
  down in the frame loop and then sent home again. They are ordinary agents
  while they are here - selectable, orderable, in the overview and in the
  number-key slots - but `save.js` writes the one inhabitant only, and DEV
  RESET sends them home before it puts the run back. They arrive at least two
  cells apart, or three agents end up in a heap where a click can only reach
  the nearest.
- **Anything that reads `person` directly is a bug waiting for the swarm.**
  The loop updates every agent, the label follows whoever is being watched,
  and the stats panel shows `selectedAgent()`. `person` is still the isle's
  own inhabitant - the one the save keeps and the one a reset puts home.
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
- **Weeds are the only fibre on the isle.** A clump is five short blades in
  one cell (`buildProp` in `props.js`), pulled up in 3 seconds for 1 to 2
  fibre. They have no `yield`, only `drops`, so a clump is never nothing.
  They also carry their own `gap`: 1.1 cells rather than the 2.2 the trees
  and rocks keep, because weeds come up in patches and holding them to the
  wider gap spread a dozen of them evenly over the isle like planted crops.
  The scatter takes the *wider* of the two kinds' gaps, so a weed may crowd
  another weed without being allowed to crowd a tree.
- **A leaning mesh turns about its FOOT, not its middle.** A box rotated
  about its centre swings its base off the ground, which is what left every
  weed blade hovering at one corner. Push the geometry up by half its height
  first (`geo.translate(0, h / 2, 0)`) so the pivot is the foot, and then
  sink it by `(w / 2) * |sin(lean)|` - a lean still tips the base square up
  on one side by exactly that, so sinking it puts the raised corner back on
  the grass and buries the opposite one. Check it by measuring: no blade's
  `Box3.min.y` may be above the cell's ground.
- **Judge a prop by the pixels it is worth clicking on, not by how it looks
  from three cells away.** The first weeds were thin enough to be 9px across
  at the default zoom and a click on the middle of one missed it. Measure it:
  project the prop's `Box3` to the screen at the default camera distance and
  fire a ray at the middle. Weeds are 21px across and 11 of 14 hit, which is
  the bar - rocks manage 3 of 6.
- **The readout at the top of the screen is the one thing that tells the
  player something, and that is allowed.** `src/lookat.js` names whatever is
  under the cursor - agent, prop or ground - the way the WTHIT mod does. It
  is not a toast: it says what is under the pointer *now* and goes when the
  pointer does, rather than appearing to announce something. `describeProp`,
  `describeAgent` and `describeGround` in `main.js` are what it says; the
  module only draws.
- **The corner brackets are the cursor, and the colour is the gesture.**
  `src/highlight.js` draws twelve corners with three short arms each around
  whatever is under the pointer - a block of the isle as much as a prop.
  Corners rather than a full wire box, because a complete cage over a block
  of grass reads as a selection and this is only a cursor. White at 0.55 is
  "this is what you are pointing at"; green at 0.9 is a gesture that is
  armed and would work *here* - shift with a tool that can till or dig this
  cell, or seeds on the cursor over a plot that can take them. It never
  lights ground the click would refuse: a mark that sometimes lies is worse
  than no mark. It rides the same pass as the readout, and pressing or releasing shift
  forces that pass so the mark appears with the key rather than waiting for
  the mouse to move.
- **A click only walks to a block of the ISLE.** `handleClick` casts at the
  whole scene, and anything there that is neither an agent, a prop nor one
  of the isle's own meshes is passed over. The click-wave rings are pooled
  and only HIDDEN when spent, and three.js still raycasts hidden meshes - so
  a ring left lying where an earlier click landed caught the next click that
  passed through it, and the agent walked to the cell under the old ring
  while the brackets (cast at the isle alone) sat on the block under the
  cursor. The rings now refuse rays outright as well. Anything else added to
  the scene that is only dressing wants `raycast = () => {}` the same way.
- **Which block a ray hit is read off the FACE, not the point.** The hit
  point is on the surface, so rounding it is a coin toss at every face.
  `blockAt` in `main.js` steps a hair back along the face's own normal
  first, which is what makes a click on the side of a ledge mean that block
  rather than the column standing in front of it. The isle's meshes are axis
  aligned and untransformed, so the geometry normal is already the world
  one. The cursor's brackets and the click read the same answer, which is
  the point: an armed shift must light the cell it would actually work.
- **The readout runs off the frame loop, never off the pointer - and at the
  full frame rate while anything is moving.** Naming the ground needs a cast
  at the isle (0.6ms, against 0.01ms for the props). It was throttled to
  every 80ms and the brackets visibly trailed the cursor at 12 updates a
  second, so now `updateLookAt` looks again on every frame the pointer or
  the camera has moved (`viewKey`), and only every `IDLE_MS` (200) when
  nothing has - which still catches what changes under a still cursor, an
  agent walking into it or a crop coming on. Driving it from the pointer
  move instead is still wrong: a move is not the only thing that changes
  what is under the cursor, and the frame loop always comes round again.
  `lookedAt = 0` forces the next frame to look, which is how shift and a
  sow make it answer at once. The prop *hover* keeps its own cheap path, and
  its rule stands: the isle is only cast at once a prop has actually been
  hit.
- **A tool is an instance in a hand, not a name.** `agent.tool` is
  `{ item, left }` and it is *out* of the inventory while it is held - a tool
  in someone's hand is not stock on the bench, and the crafting screen must
  not be able to build with a knife that is out in the field.
  `inventory.detach`/`attach` move it either way, so swapping a part-worn
  knife for an axe puts that knife back at the wear it had rather than
  averaging it into the pile. It is in `person.saveState`, and DEV RESET lets
  every held tool go *before* the inventory is cleared, or it is the one
  thing a reset misses. Two ways in, one picker: the EQUIP button on an
  inventory tile asks who should carry it, the wield key asks what an agent
  should wield, and `src/wield.js` answers both.
- **What is in an agent's hand is on both panels, and it is the instance.**
  `describeHand` in `main.js` writes the same row into the stats panel on
  the isle and into every overview card: the picture, the label, and a bar
  of the wear on *that* tool rather than on the pile it came from. EQUIP
  opens the wield picker (it reads SWAP when something is already held, and
  is disabled when there is nothing to hand over) and UNEQUIP is
  `equipTool(agent, null)` - until it existed a tool could only be swapped
  for another and never simply handed back. The panels know nothing about
  wear or capacities; they hand `main.js` the row and it fills it. What this
  replaced was a "Tool" *trait* sitting beside Education and Mastery that
  was never written to - it read None whatever the agent was carrying, which
  is exactly the kind of placeholder to delete rather than to keep feeding.
  `#agent-panel` is `pointer-events: none` so a click on the isle behind it
  is never swallowed; only those two buttons take the pointer back.
- **The inventory keeps a tool and a bucket the same way.** Wear on a tool
  and what is in a vessel are both per-instance numbers you cannot average
  over a stack, so both live in the one-by-one list that `isSingular` covers.
  A tool starts full and a vessel starts empty, which is the only difference
  the ledger sees. The *most worn* is always used next, so a pile of knives
  goes one at a time and the wear bar on the slot is telling the truth about
  what the next craft costs.
- **`ITEMS[tool].work[kind]` is what a tool does to a job**, and `main.js`
  and `person.js` both read it rather than each knowing about knives. `speed`
  is applied when the work is taken on rather than every frame, so swapping
  tools halfway does not stretch what is already under way; `drops` are
  appended to the prop's own list so one roll serves both; `wear` is what one
  job costs. Anything new a tool should do goes here, not in a branch.
- **A job is not always a prop.** `doAt` in `person.js` is go-somewhere,
  spend-a-moment, then-do-this: tilling grass, filling a bucket and watering
  a plot are all it, and `task.prop` is *null* for a job on a bare cell.
  Anything walking the agents' tasks has to allow for that - `syncTargets`
  crashed on it, because a cell has nothing to light yellow.
- **Farmland is a prop, not a change to the isle.** Everything about it is
  run state - what is sown, how far along, how much water is left - and props
  are what the save already carries. A hoe turns grass over, puts a bare plot
  back to grass, and reaps a ripe one; a crop still growing is left alone,
  because turning a field over by accident three minutes in is not something
  to make easy. It does **not** sow: a plot comes up bare and dry, and the
  seed is a gesture of its own.
- **A plot is a DENT, and the isle's own block is the floor of it.** Soil
  drawn on top of the grass reads as a tray standing on it, and soil drawn
  below the grass is simply invisible - the block's own top face is opaque
  and in front of it. So `island.sinkBlock` presses the top block down (the
  instance matrix is scaled and shifted; its bottom stays put) *and repaints
  it* `FARMLAND_SOIL`, and the neighbours' side faces, coincident until
  then, become the turf rim of the dent. The repaint is what matters:
  drawing a slab of soil instead needs it as wide as the cell to leave no
  gap at the rim, which puts it and the neighbouring cubes in the same
  space, and the two flicker against each other the moment the camera moves.
  Nothing can z-fight with a block that is simply painted another colour.
  The only thing the prop draws is its furrows, well inside the cell and
  sunk into that floor, touching nothing. `raiseBlock` puts it back, and everything that takes a plot away has
  to call it - reaping does not, since the plot stays and is only bare;
  putting the ground back does, and so does DEV RESET. Digging the column
  out drops the record of it, so there is nothing left to put back. The
  heightmap is deliberately NOT
  moved: it is 0.16 of a block, not a dug one, so pathing, prop placement
  and where an agent's feet go all stay exactly as they were. The soil is
  drawn the full cell across, the same hair oversized the isle's own cubes
  are, so there is no seam at the edge for the grass to show through.
- **A prop may carry a hitbox that has nothing to do with its shape.**
  `hitPad` in `props.js` is an invisible mesh, and an invisible mesh is
  still raycast - three.js stopped skipping them. A plot needs one because a
  dent is *below* the grass: at anything but a steep angle the rim is in the
  way and the plot could not be hovered at all. It also has to *grow with
  the crop* (`padUpTo`, called from `setCropStage`): wheat is a handful of
  thin blades with air between them, and without the pad reaching over them
  the cursor falls straight through the gaps and the plot cannot be picked
  up once anything is on it. It is marked `isHitPad`, and `buildOutline` and
  `propBox` both skip it - tracing the edges of a box nobody can see draws a
  cage around thin air.
- **Some things are carried on the CURSOR, and that is not the mover.** A
  sapling has to be *positioned* - it needs room, and where exactly it goes
  matters - so it earns arrows and a PLACE button. A seed only ever goes
  into ground already turned over and a spadeful of earth only ever goes
  back into a hole, so in both cases the target *is* the position and all
  that is left is which one. `sows` in `ITEMS` says it goes into a plot and
  `fills` says it goes into a hole (naming the layer it comes back as);
  either puts a button on the tile that closes the screen and arms the
  cursor, and the next click puts one down. No agent and no walk - the
  ground is already open and the hole is already dug. The cursor keeps the
  rest so a row goes in one after another, and puts itself away when they
  run out, on a click that is not a target, or on a right click. Anything
  else that should be put down this way is one of those two flags rather
  than a branch in `handleClick`.
- **A plot with a crop coming up is scenery, not a station.** `busyPlot` in
  `main.js` is the test - sown and not yet ripe - and such a plot takes no
  hover outline and does not swallow a click: the click falls through to the
  isle below it, so a field can still be walked across and dug beside. There
  is nothing to do to one anyway: it cannot be sown again, and a hoe will
  not turn a field over three minutes in. Watering it still works, because
  that is a click that actually does something, and it is tried first.
- **A crop is a stage, not a stretched mesh.** `setCropStage` in `props.js`
  rebuilds the blades every 20% of the way to ripe - five times over five
  minutes, so it costs nothing per frame - and the sixth stage, gold with
  heads on, arrives only at 100% rather than at 99%. Rebuilding a prop's
  meshes means handing the new ones everything the built ones got:
  `castFromFront`, `tagProp` so a click on a blade still finds the plot, and
  `buildOutline`. `showCrop` in `main.js` is the one place that does all
  four.
- **The isle can be dug into, but never dug away.** `digBlock` in
  `island.js` takes the top block off a column: the instance is scaled to
  nothing rather than the mesh rebuilt (an `InstancedMesh` cannot lose a
  member, and rebuilding one to drop a cube would be absurd), and `surface`
  and `columns` both move down with it, which is what pathing, prop placement
  and where an agent's feet go all read. A column keeps its last block
  whatever is done to it. `blocks` is the map from a coordinate to the mesh
  and instance holding it, built as the meshes are, and `layerAt` is what
  says what a block is made of.
- **A hole can be filled in, and the isle still cannot be built up.**
  `fillBlock` in `island.js` is `digBlock` in reverse: the instance that was
  scaled to nothing is scaled back, repainted as the layer going in, and its
  record updated so a shovel reads it as the earth it is now rather than the
  turf it was. `canFill` is what says whether there is anything to put back,
  and there is one only where something came out - no instance was ever made
  above the isle's original surface, so a column can be restored and never
  raised. Nothing may be standing on the cell: a block appearing under a
  prop leaves it buried and under an agent leaves them in the floor.
- **A rock gives four stone and one lump too broken to be worth any.**
  `brokenStone` is in no recipe and gives nothing back but itself when it is
  dug up again - it is a block to stand somewhere and that is all it is for,
  so a wall of it is something to build and never somewhere to store rock.
  Its layer is in `LAYERS` but nothing generates it; the only way one gets
  into the isle is `fillBlock` putting one there.
- **`ITEMS[tool].digs` is which layers a tool takes out and what each
  leaves.** A shovel has the soft ground (`grass`, `moss`, `dirt` -> dirt), a
  pickaxe has the rock (`stone` -> stone) and the broken stone somebody put
  back (`brokenStone` -> brokenStone), and neither touches bedrock, which
  is what the isle is standing on. Adding a tool that digs is an entry here,
  not a branch in `digGround`.
- **Ask again when the agent gets there, not only when the order is given.**
  A walk takes time and everything a job depends on can move in it: the tool
  can be swapped out of their hand, a station can be put on the cell, another
  agent can walk onto it. `canDig` is asked twice for exactly that, and
  tilling and reaping re-check the hoe the same way. Getting this wrong is
  quiet: swapping a shovel for a hoe mid-walk wore the *hoe* down for the
  shovel's dig, because the job's `then` read whatever was in hand at the
  end.
- **Ground work is done from BESIDE the cell, never on top of it.**
  `doAt` takes `adjacent`, and tilling, reaping, putting a plot back and
  watering all pass it. An agent standing on the plot they have just made is
  between the cursor and it: the readout names them instead of the plot and
  a click selects them instead of sowing it, which is what "farmland cannot
  be hovered" turned out to be. Digging already stood aside for its own
  reason - they are taking away the ground they would be standing on.
- **Tilling is a SHIFT click on the ground; a plain click is still a walk.**
  `tilling(event)` in `main.js` is the one test, beside `queueing` - shift
  and shift alone, because ctrl is already the queue and means something
  else. Shift means "work this ground with what is in hand": a hoe turns it
  over, a shovel or a pickaxe takes a block out of it, and the tool is what
  says which. A shift click that cannot till, for want of a hoe or because
  something is standing there, is *spent* rather than falling through to the
  walk: a modifier that sometimes does the very thing it was held to avoid is
  worse than one that occasionally does nothing. Clicks on a plot itself -
  reaping it, watering it, putting it back to grass - are plain clicks, since
  a prop under the cursor is not ambiguous the way bare ground is.
- **A crop only grows while it has water, and that is the whole rule.** Five
  minutes of *watered* growing at 20ml a minute - and a fresh plot is dry,
  so a sown one sits at 0% until somebody brings a bucket. Turned ground
  holds no water of its own and nothing drinks until something is sown in
  it, so a bare plot never loses a drop.
  `updateGround` in `main.js` ticks that and the catchers filling, off the
  frame delta, the same as a sapling coming up.
- **A water catcher's level is a scaled mesh, not a rebuilt one.**
  `setWaterLevel` in `props.js` moves the surface by scaling the block it is
  drawn as - this runs every frame a catcher is filling, and rebuilding
  geometry sixty times a second to raise a surface by a millimetre would be
  absurd.
- **What a freshly planted prop starts with belongs to its kind.** A sapling
  starts a clock, a tub starts empty - `beginPlanting` reads `grows` and
  `water` off `PROP_KINDS` rather than handing a sapling's `growSeconds` to
  everything, which is what would sweep a water catcher into `updateGrowth`.
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
  felling the tree beside it lets it through. **None of this is told to the
  player** - no label, no tooltip, no line anywhere about how long it takes
  or how far apart they go. Do not add one.
- **A sapling cannot be planted where it would not grow.** `canPlace` runs
  `hasPlantingRoom` for any kind with `grows`, so a spot within
  `GROW_CLEARANCE` of a tree *or* another sapling is refused outright - the
  mover flashes the footprint red, exactly as it does for a ledge or an
  occupied cell, and `beginPlanting` stands the next one on the nearest cell
  that is far enough, so planting a handful in a row spaces them two apart on
  its own. That is why the placement check measures to saplings while
  `hasRoomToGrow` does not: a deadlocked pair can no longer be made, and the
  growth check stays forgiving for the pairs an older save already has.
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
- **Slots are numbered the way they are counted on screen.** 1 is the top
  left, the first row runs 1 2 3 4, and the next row starts back on the left,
  so 5 is directly under 1, down to 16. That is how a recipe is described and
  how `RECIPES` is written; `cellOfSlot` in `crafting.js` is the only place
  it converts to the zero-indexed `cells[]`.
- **A recipe is a shape, not a set of slots.** Both the recipe and what is on
  the grid are trimmed to their own bounding box before they are compared
  (`shapeFrom`), which is the whole of "it can be placed anywhere": two stone
  in slots 15 and 16 trim to exactly what two stone in slots 1 and 2 trim to.
  What it will not do is wrap - slots 4 and 5 are the end of one row and the
  start of the next, so they are not two side by side and do not match. Check
  that case after touching the matcher; it is the one an "is the next slot
  along filled" shortcut gets wrong.
- **A tool is worn, not spent, and a recipe wants it anywhere.** `tool` on a
  recipe names one that has to be *somewhere* on the grid; its cell is lifted
  out before the shape is trimmed, so it can sit in any free slot. It is not
  in `used`, so nothing is taken from it - `takeOutput` calls `useTool`
  instead, which takes one use off it. When it breaks, the ledger is one
  short of what the grid shows and `reconcile` empties the cell on its own;
  nothing has to notice.
- **`serves` is a list, not a rank.** `ITEMS[tool].serves` is what a tool can
  stand in for, so the flint axe serves both `flintAxe` and `flintKnife`
  while the knife serves only itself - an axe does a knife's work and the
  knife does not do the axe's. A rank would have made every later tool
  answer for every earlier one, which is not what was asked for.
- **Tools are kept one by one, because they are not interchangeable.**
  `inventory.js` holds plain materials as a count and tools as a list of how
  much is left on each, and `count()` answers for both. The *most worn* is
  always the one used next (`useTool`, `take`), so a pile of knives is worked
  through one at a time rather than all of them ending up part used - and the
  wear bar on the slot, which shows that same one, is telling the truth about
  what the next craft costs. Anything that gains a tool needs `uses` in
  `ITEMS`, and that is all.
- **A slot has to hold the right item, not exactly one of it.** One of each
  laid-out slot is spent per craft, so a grid loaded with stacks is worked
  through a craft at a time rather than refusing to match.
- **The craft is locked in by taking it, not by laying it out.** The output
  slot only *shows* what the grid adds up to; `takeOutput` is where the
  ingredients are spent and the yield arrives. Up to that click the grid can
  be cleared for nothing, which is the whole reason the output is a slot
  rather than a button. A plain click makes one and puts it on the cursor;
  shift makes *everything* and sends it all to the inventory, running crafts
  until the grid stops adding up to anything.
- **Square the grid with the ledger before reading it, every craft.**
  `craftOne` calls `reconcile()` first, and crafting everything is why.
  Materials are taken from the cell and the ledger in the same breath, but a
  tool is *worn*: when it breaks, its cell still claims to hold it until
  `reconcile` takes it away, and that only ran when something was drawn. A
  run of crafts happens entirely between two frames, so a knife with ten uses
  left went on making sticks until the wood ran out. Anything that reads the
  grid in a loop has the same trap.
- **Crafting is the one place on that screen where the ledger moves.**
  Everything else - the grid, the cursor, the drags - is a *view* over
  `inventory.js`: `reserved()` counts what the bench is showing and the stock
  slots show the rest, so nothing is ever taken out and there is nothing to
  give back when the screen closes or the game quits with it open. Only
  `takeOutput` calls `take`/`add`. Anything new that moves items on that
  screen has to decide which of the two it is, or a run quietly gains or
  loses things.
- **Clicking a recipe lays it out from stock, and red is what is MISSING.**
  `fillFrom` in `crafting.js` clears the bench (a view, so that costs
  nothing) and puts one of each item into every cell of the shape, in the
  same corner the drawing is in, plus the tool - the one the recipe names,
  or anything that `serves` for it. Whatever could not be found is left
  empty, and only an EMPTY cell of a shown recipe is drawn red: now that the
  drawing is filled in, red has to mean "this one is missing", and tinting
  the filled cells the same made the missing ones impossible to pick out.
  `#craft-missing` under the bench says how many of each, counted against
  the whole ledger rather than cell by cell - a shape can sit anywhere on the
  grid, so comparing against the drawing's corner would call a recipe short
  the moment it was moved along one. Shift lays out as many sets as there is
  stock for, the way shift takes everything out of the output. Nothing is
  spent by any of it; the output slot is still where a craft is locked in.
  Clicking the card again puts the drawing away and leaves the grid alone -
  by then it is the player's.
- **Crafting is not one of them and has no key.** It is its own overlay
  (`src/crafting.js`, `#crafting`), and the only way in is to click the
  workbench standing in the middle of the isle. Opening it closes the panels,
  so the two are never up together.
- **The crafting screen is three regions that each hold their own ground**:
  the recipe list down the left, the bench (grid, arrow, output) up the
  right, and what is held along the bottom. `.craft-body` is a CSS grid with
  `overflow: hidden`, which is what makes the *list* scroll rather than the
  page - the bench and the inventory stay put however many recipes there are.
  Both lists scroll inside themselves (`#craft-recipes` and
  `#crafting .tiles`), so neither can push the other off the screen.

  This replaced a floated bench with the recipes flowing around and under it.
  The float kept a long list out of a narrow strip, but the price was having
  to scroll the whole screen to reach the inventory, which is what a scroll
  box fixes without moving anything else. The cards are still
  `display: inline-block` - they wrap in the scroll box the same way, and
  there is no longer anything to reach under.

  `RECIPES` in `crafting.js` is the list - pushing an entry onto it is all
  that is needed to see it on screen, and a card is a picture and a name,
  because how it is laid out is shown on the grid itself when clicked.
- **A plot does not move, and `fixed` is what says so.** `PROP_KINDS[kind]
  .fixed` is refused by `canMove`, which is how a kind can be `placed` -
  outlined under the cursor, something to interact with - without being
  something to carry off. Farmland is the one: it is a hole in the isle as
  much as a prop, so moving it would leave the dent behind and take the soil
  somewhere there is none. A hoe puts it back to grass instead.
- **Only `dropPlot` takes a plot away.** A plot is two things - a prop and a
  block of the isle pressed down and repainted - so `removeProp` on its own
  leaves the dent behind for good: a brown hollow that is not farmland and
  that tilling only sinks further. That is what `saves.restore()` used to
  do to every live plot before it put the saved ones back, which is why
  `createSaves` takes an `onDrop` rather than calling `removeProp` itself.
  `sinkBlock` guards the other half of it: sinking a block that is already
  sunk keeps the colour recorded the FIRST time, or the soil brown gets
  written down as the grass to put back and the cell never goes green again.
- **Wreckage cannot be moved; repair it first.** `canMove()` in `props.js`
  is the one test - a `placed` kind that also has a `cost` is not movable
  until `prop.repaired`, so the fallen bench stays where it fell. It still
  outlines on hover, because it is still something to interact with; it just
  refuses the move key. `placement.begin` turns down anything `canMove` says
  no to, so callers do not have to check first.
- **The repaired bench opens from anywhere, and nobody has to walk to it.**
  It was gated on an agent standing at it for a while and that was removed on
  request: a click opens crafting wherever the camera is and whoever is
  selected, the same as pressing Tab. Do not put the walk back.
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
  cursor. `controls.pointerBlocked` is what hands that press to
  `placement.js` - which is also why the orbit camera grew that hook beside
  `keyboardBlocked`. The station only moves once the cursor actually travels,
  so a plain click never teleports it, and `setPointerCapture` is wrapped in
  a try/catch because a refused capture must not swallow the drag.
- **`pointerBlocked` is asked about a press, not about a state.** It takes
  the event, because a move owns the LEFT button only - the RIGHT button
  stays the camera's the whole time it is running, since lining something up
  is exactly when the isle most needs turning. It used to answer for the
  whole move and the camera was frozen until the station was placed. A box
  being dragged still owns the whole mouse. `placement.js` ignores anything
  that is not button 0 on its own account, so the two never fight over one
  press. Testing this needs a *dead still* camera first: the orbit coasts on
  `velocity` after a drag, so a left-drag that follows a right-drag looks
  like it turned the camera when it is only the spin running down.
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
- **The materials are painted; everything else is line art.** `ICONS` in
  `src/icons.js` is the line-art set - tabs, empty-page marks, the agent -
  stroked in `currentColor`, which is right for a *mark*. `MATERIAL_ART` is
  the other set: a material is a thing, and a hollow outline of one reads as
  a sticker with the middle missing, so those carry their own colours and
  their own shading - a lit face, a shaded face, a dark edge. Warm browns for
  the wood, cool greys for the stone, so they still belong to the same sky as
  the UI. Same 24x24 grid as the rest.
- **`itemIcon` is what picks between them, and it never comes back empty.**
  Painted art if the material has any, the line glyph if not, and the crate
  if it has neither - a tile with nothing drawn on it reads as a bug, and an
  item is the one thing that can arrive without the icon set being touched.
  The wrapper it builds for painted art deliberately sets *no* `fill` or
  `stroke`: forcing `currentColor` over the top is exactly what would make it
  hollow again. The materials nothing drops yet are still line art; they get
  painted when something actually hands them out.
- **Judge an icon at the size it ships at.** The tiles draw them big now, but
  they are still read at a glance, and shapes that look fine at 64px turn to
  mush. Earlier line-art attempts are worth not repeating: logs drawn lying
  down read as a row of buttons, a battery, or a bowtie, and a rock drawn as
  an outline with one crease reads as an empty bag. Two more of the same:
  fibre drawn as parallel stalks under a band is a *paintbrush*, because
  that is what parallel lines under a band are - what makes it plant matter
  is fanning the blades out of one tie. And a coil of rope ruled with lines
  over one flat shape closes up into a striped barrel at tile size; drawing
  the turns as alternating bands of two tones keeps them reading as separate
  lengths lying against each other.
  Rope has been redrawn three times, which is its own lesson. The ruled
  coil became a barrel; the figure-of-eight hank drawn after it read as a
  pretzel - two stiff rings with dark eyes, and ticks across them that looked
  like scratches. What finally made it rope is the TWIST: a light dash laid
  along every strand, offset ring to ring so the bands do not line up into
  stripes, and the loose end hanging down the front with its whipping.
  `ropeCoil` in `icons.js` computes it from a few numbers, because each ring
  is dozens of points.
- **Draw a thin part in its light tones, or it is all outline.** The flint
  knife's blade was a sliver of the flint's own dark grey inside a 1.35
  outline, and at tile size the middle of the knife came out as a black
  slot - it read as a hole. Two facets either side of a spine, in the pale
  greys of a fresh-struck face, fixed it. The same goes for anything narrow.
- **A thing hanging off a thing must reach it.** The bucket's rope handle
  stopped short of the far rim in mid-air, and the wheat's leaves and awns
  began a few pixels out from the stalk - both read as parts floating beside
  the object rather than of it. Root every leaf on its stem, start every awn
  at the tip of its grain, and tie a handle on at BOTH ends.
- **A material is drawn the size it is, relative to the others.** Flint is
  at four fifths of the tile, inside a scaled group, because at full size a
  knapped flake stood as big as the whole rock it came out of. Scaling
  thins the lines, so the outline widths inside the group are raised to
  match the rest of the set.
- **An inventory slot is a picture, a count and nothing else.** The tile is
  square, the art is drawn to 62% of it, the count sits in a badge in the top
  right corner, and what the material is *called* is on the tile as
  `data-label` - CSS puts it up only while the cursor is on it. There is no
  label text under the picture any more; do not put one back.
- **The hover name goes inside the slot, not above it.** The crafting
  screen's list scrolls, so anything floating outside the tile is clipped by
  it. On a slot that also carries a button the name sits above the button
  (`:has(.tile-action)`), and the art is given that much room back or the
  button crops the bottom off it. `icon()`
  is strict and comes back empty for a name it does not know, which is what
  a mistyped *tab* should do; `itemIcon()` falls back to the crate, because a
  tile with nothing drawn on it reads as a bug and an item is the one thing
  that can arrive without the icon set being touched. There are glyphs in
  there for materials nothing drops yet (plank, grain, fibre, clay, ore,
  metal, coal, crystal) - `ITEMS` in `inventory.js` is what decides what
  actually exists, so they cost nothing until something does.
- **`--tint` is the slot's glow, not the picture.** `ITEMS[item].tint` is the
  material's own colour, set on the tile; the painted art carries its own
  colours, so the tint lights the slot's edge and the wash behind it instead.
  A material still drawn as a line glyph picks it up as its ink. They are all
  luminous - the no-flat-greys rule holds.
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

- **The soundtrack is synthesised, not a file.** `src/music.js` builds an
  80 second ambient loop out of Web Audio oscillators - a pad through eight
  chords in D, a sub drone, and pentatonic bells off a fixed seed, so every
  pass is the same piece. Notes are scheduled ahead of the audio clock off a
  `setInterval`, never the frame loop. A browser only lets it start on the
  first click or key; Electron's `autoplayPolicy` lets it start on launch.
  M mutes it (`toggleMusic`) and the pause menu has the volume, which, like
  the camera speed, is held in memory only.

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
- **Write a prop's state back only to a kind that has that state.** The
  restore wrote `repaired` onto every generated prop it found, and a tree's
  `repaired` is `undefined` while `!!entry.repaired` is `false` - so
  `undefined !== false` fired on all of them and rebuilt every tree and rock
  as a broken workbench the moment a save was loaded. The guard is the kind
  (`PROP_KINDS[kind].cost`), not the value. The data was never wrong, only
  the meshes, which is why every test passed: a check on `kind` and `gone`
  cannot see this. **Test a restore by what the props are built of** - how
  many meshes hang off each one and how big it stands - not only by what the
  save says they are.
- **A spawned prop keeps its `salt`.** `buildProp` rolls a tree's height and
  a sapling's yaw off it, so without saving it a restored tree came back a
  different size in the same spot. `spawnProp` and `growProp` both take one
  and store it, and `save.js` carries it - a restored isle is identical, not
  merely correct.
- **`SAVE_VERSION` is a fence, not a migration.** Change the shape of what is
  written and bump it; an older save is dropped rather than half-read. There
  is nothing in a run yet worth migrating. It is at 3: the inventory grew
  tools (`{ wood: 3 }` became `{ held, tools }`), then agents gained a
  carried tool and props gained water and what is sown in them.
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
