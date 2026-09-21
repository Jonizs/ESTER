import * as THREE from 'three';
import { createIsland, ISLAND_RADIUS } from './island.js';
import { createSpace } from './space.js';
import { OrbitCamera } from './orbitCamera.js';
import {
  createProps, setPropHighlight, setPropOutline, setWorkbenchState,
  canMove, canPlace, placeProp, footprintCells, syncBlocked,
  spawnProp, removeProp, growProp, hasRoomToGrow, rollGrowSeconds, setWaterLevel,
  setCropStage, cropStageOf, buildOutline, tagProp,
  GROUND_OFFSET, FARMLAND_SINK, PROP_KINDS
} from './props.js';
import { Person } from './person.js';
import { findPath } from './path.js';
import { createMarkers } from './markers.js';
import { createSettings, keyLabel } from './settings.js';
import { createMenu } from './menu.js';
import { createPanels } from './panels.js';
import { createCrafting } from './crafting.js';
import { createLookAt, propName } from './lookat.js';
import { createHighlight, HIGHLIGHT_PLAIN, HIGHLIGHT_WORK } from './highlight.js';
import { createWield } from './wield.js';
import { createPlacement } from './placement.js';
import { createSelectBox } from './selectbox.js';
import { createInventory, ITEMS } from './inventory.js';
import { createProgression } from './progression.js';
import { createDebug } from './debug.js';
import { createSaves } from './save.js';
import { createStarfields } from './starfield.js';
import { autoFullscreen } from './fullscreen.js';

const canvas = document.getElementById('viewport');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060f, 0.0032);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);

createSpace(scene);

const island = createIsland();
scene.add(island);

const surface = island.userData.surface;
const { group: propsGroup, props, workbench, blocked } = createProps(surface, scene);

// --- the person ------------------------------------------------------------

const person = new Person(surface, startingCell(), { blocked });
scene.add(person.mesh);

// Everything the panels read: what has been gathered, and how far along the
// run is. Both are lists so more agents can simply be pushed on later.
const agents = [person];
const inventory = createInventory();
const progression = createProgression();

function startingCell() {
  // The flattest cell nearest the middle, so they start on open ground.
  let best = null;
  for (const key of surface.keys()) {
    const [x, z] = key.split(',').map(Number);
    if (props?.some((p) => footprintCells(p.kind, p).some((c) => c.x === x && c.z === z))) continue;
    const score = -Math.hypot(x, z);
    if (!best || score > best.score) best = { x, z, score };
  }
  return best ?? { x: 0, z: 0 };
}

const markers = createMarkers(scene);

// Everything the agents are on their way to, lit up until they get there -
// the job in hand and the whole of a batch dragged out with the selection
// box, so a stand of trees shows as one order rather than one tree at a time.
const targets = new Set();

/**
 * Light the targets and clear whatever is no longer one.
 *
 * Read off the agents every frame rather than set by hand at the click: a
 * finished job, a cancelled walk, a felled tree and a whole queue then all
 * look after themselves, and nothing is left burning yellow.
 */
function syncTargets() {
  const wanted = new Set();
  for (const agent of agents) {
    // The job in hand counts only while they are still walking to it; once
    // they are standing over it the tint has said what it had to say.
    // A job on a bare cell - tilling a patch of grass - has no prop to
    // light up, so `task.prop` is null and there is nothing to add.
    if (agent.task?.prop && agent.path.length > 0 && !agent.task.prop.gone) {
      wanted.add(agent.task.prop);
    }
    for (const prop of agent.queue) if (!prop.gone) wanted.add(prop);
  }

  for (const prop of targets) {
    if (wanted.has(prop)) continue;
    setPropHighlight(prop, false);
    targets.delete(prop);
  }
  for (const prop of wanted) {
    if (targets.has(prop)) continue;
    setPropHighlight(prop, true);
    targets.add(prop);
  }
}

function clearTargets() {
  for (const prop of targets) setPropHighlight(prop, false);
  targets.clear();
}

/**
 * Fill the shadow map from this object's FRONT faces - see the note at the
 * scene-wide pass below for why. Anything built after boot (a repaired
 * bench, a planted sapling, a sapling that has come up as a tree) has to be
 * given it too, or it casts the wrong way and the old bright dash at the
 * foot of its walls comes back.
 */
function castFromFront(object) {
  object.traverse((o) => {
    if (o.material && o.castShadow) o.material.shadowSide = THREE.FrontSide;
  });
}

function finishProp(prop, agent = null) {
  if (targets.delete(prop)) setPropHighlight(prop, false);

  // The bench is repaired rather than carried off: it stays standing, gets
  // its missing leg back, and from then on it is the way into crafting.
  if (prop.kind === 'workbench') {
    const cost = PROP_KINDS.workbench.cost;
    inventory.take(cost.item, cost.amount);
    setWorkbenchState(prop, true);
    castFromFront(prop.mesh);
    return;
  }

  const kind = PROP_KINDS[prop.kind];
  const gathered = kind.yield;
  if (gathered) inventory.add(gathered.item, gathered.amount);

  // Whatever else comes off it - a felled tree drops 0 to 2 saplings. The
  // roll is a plain `Math.random()`: this is what happens during a run, not
  // world generation, so it is not held to the seeded-noise rule.
  //
  // The tool in hand adds its own drops to the same list rather than being a
  // special case after it, so an axe's extra log and a tree's saplings are
  // rolled by one piece of code.
  const work = agent?.toolWork(prop.kind) ?? null;
  for (const drop of [...(kind.drops ?? []), ...(work?.drops ?? [])]) {
    const n = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
    if (n > 0) inventory.add(drop.item, n);
  }

  // And the tool wears down by whatever that job costs it. It is held rather
  // than in the ledger, so this is the one place its wear is counted.
  if (work?.wear) wearTool(agent, work.wear);

  prop.gone = true;
  prop.mesh.visible = false;
}

/**
 * A click on the workbench. Repaired, it opens crafting; broken, it is a job
 * like any other - but only once there is the wood to pay for it, and the
 * wood is only spent when the work is finished.
 */
function useWorkbench(prop) {
  // Opening the repaired bench is not an order, so it needs no selection and
  // nobody has to be standing at it - it is the same as pressing Tab.
  // Repairing it is an order, and does.
  if (prop.repaired) { crafting.open(); return; }

  const agent = selectedAgent();
  if (!agent) return;
  if (agent.task?.prop === prop) return;   // already on its way

  const cost = PROP_KINDS.workbench.cost;
  // The badge over the bench already says how much wood it wants and how
  // much there is, so a click without enough simply does nothing.
  if (inventory.count(cost.item) < cost.amount) return;
  agent.workOn(prop);
}

// Fill the shadow map from FRONT faces.
//
// Three.js defaults the other way for a FrontSide material: it renders back
// faces, so the depth stored for a caster is its far side. At the foot of a
// wall the ground sits at almost exactly the depth where the light leaves the
// wall block, the comparison goes marginal, and a hairline of ground comes out
// lit - the bright dash along the bottom of every shaded wall. Front faces
// store the near surface instead, so a contact is tight.
//
// The cost is that a surface can now shadow itself, which is what the sun's
// normalBias in space.js is for. This does not reproduce in headless
// Chromium; it was confirmed on hardware with ESTER.debug.try(5).
castFromFront(scene);

// What the cursor is over, named at the top of the screen. It only draws;
// what it says about each thing is decided in `describeProp` below.
const lookAt = createLookAt();

/**
 * Putting a tool in an agent's hand, and taking it out again.
 *
 * The tool leaves the inventory while it is held - a tool in someone's hand
 * is not stock on the bench, and the crafting screen should not be able to
 * build with a knife that is out in the field. What the agent carries is the
 * *instance*, wear and all, so the same one comes home rather than the pile
 * being averaged out.
 */
function equipTool(agent, item) {
  if (!agent) return false;
  // Already holding that kind: asking again is a no-op rather than a swap
  // for an identical one, which would only shuffle the wear about.
  if (item && agent.tool?.item === item) return true;

  const taken = item ? inventory.detach(item) : null;
  if (item && !taken) return false;          // none left to pick up

  if (agent.tool) inventory.attach(agent.tool);
  agent.tool = taken;
  return true;
}

/** Wear a held tool down, retiring it when it runs out. */
function wearTool(agent, by = 1) {
  if (!agent?.tool) return;
  agent.tool.left -= by;
  if (agent.tool.left <= 0) agent.tool = null;   // it broke in their hands
}

/** Every tool an agent could be handed right now, wielded ones included. */
function wieldable() {
  return Object.keys(ITEMS).filter((item) => ITEMS[item].wields && inventory.count(item) > 0);
}

/**
 * Working the ground: tilling it, sowing it, watering it, reaping it.
 *
 * All of it is a click with the right tool in hand and an agent selected,
 * which is the same rule as every other order - the agent walks over, spends
 * a moment and then the thing happens. `doAt` in `person.js` is the job;
 * everything below only says what to do when they get there.
 */
// What the cursor is over, declared up here rather than beside the hover
// code that owns it: a restored run rebuilds its crops before the first
// frame, and anything that rebuilds a prop's meshes has to ask whether it is
// the one currently outlined. `setHovered` is still the only thing that
// writes it.
let hovered = null;

const TILL_SECONDS = 4;
const REAP_SECONDS = 5;
const FILL_SECONDS = 2;

/** The tool an agent is holding, if it is one that does this job. */
function holding(agent, test) {
  const item = agent?.tool && ITEMS[agent.tool.item];
  return item && test(item) ? item : null;
}

/**
 * Whether this patch of ground could be turned over right now.
 *
 * Asked without starting anything, because the cursor asks it too: a shift
 * held over the grass lights the cell up green, and it may only do that
 * where the click would actually work.
 */
function canTill(agent, cell) {
  if (!holding(agent, (t) => t.tills)) return false;
  // Only the grass, and only where nothing already stands.
  return !!canPlace(surface, 'farmland', cell, { props });
}

/** A click on bare ground with a hoe in hand: turn it over. */
function tillGround(agent, cell) {
  if (!canTill(agent, cell)) return false;

  return agent.doAt(cell, {
    seconds: TILL_SECONDS,
    // Beside the cell, not on it. Standing on the plot they have just made
    // puts an agent between the cursor and it, and a plot that cannot be
    // hovered cannot be sown or watered either.
    adjacent: true,
    action: 'Turning the ground over',
    then: () => {
      // Still a hoe in hand, and still bare ground - a walk takes time, and
      // both can have changed by the time they get there.
      if (!canTill(agent, cell)) return;
      const plot = spawnProp('farmland', cell, { surface, group: propsGroup, props });
      plot.water = PROP_KINDS.farmland.water.start;
      plot.growth = 0;
      // Turned over and left bare: seeds are sown from the inventory, which
      // is a gesture of its own rather than something that happens by
      // accident because there was one in the pack.
      plot.sown = false;
      openPlot(plot);
      castFromFront(plot.mesh);
      syncBlocked(props, blocked);
      wearTool(agent, 1);
    }
  });
}

/**
 * The dent under a plot: the block it stands on is pressed down so the soil
 * reads as ground that has been opened rather than a tray sitting on the
 * grass. The heightmap is left alone - it is a few centimetres, not a dug
 * block - so nothing about pathing or placement changes.
 */
function openPlot(plot) {
  island.userData.sinkBlock(plot.x, plot.z, FARMLAND_SINK);
}

/** And closing it again: the block comes back up when the plot goes. */
function closePlot(plot) {
  island.userData.raiseBlock(plot.x, plot.z);
}

const DIG_SECONDS = 5;

/**
 * A shift click on the ground with a digging tool: take the top block out.
 *
 * What a tool will dig, and what each layer leaves behind, is `ITEMS[t].digs`
 * - a shovel takes the soft ground and a pickaxe takes the rock, and neither
 * touches bedrock, which is what the isle is standing on.
 */
/**
 * Whether this block can come out right now, and what it would leave.
 *
 * Asked twice - once when the order is given and again when the agent gets
 * there - because a walk takes time and everything it depends on can move in
 * the meantime: the tool can be swapped out of their hand, somebody can put
 * a station on the cell, another agent can walk onto it, or the block can
 * already be gone. Returns `{ tool, drop }` or null.
 */
function canDig(agent, cell) {
  const tool = holding(agent, (t) => t.digs);
  if (!tool) return null;

  const y = surface.get(`${cell.x},${cell.z}`);
  if (y === undefined) return null;

  const drop = tool.digs[island.userData.layerAt(cell.x, y, cell.z)];
  if (!drop) return null;

  // Not out from under anything: a prop standing on it would be left in the
  // air, and an agent standing on it would be too.
  if (props.some((p) => !p.gone && footprintCells(p.kind, p)
    .some((c) => c.x === cell.x && c.z === cell.z))) return null;
  if (agents.some((a) => Math.round(a.x) === cell.x && Math.round(a.z) === cell.z)) return null;

  return { tool, drop };
}

function digGround(agent, cell) {
  if (!canDig(agent, cell)) return false;

  return agent.doAt(cell, {
    seconds: DIG_SECONDS,
    action: 'Digging',
    // Stood beside it, not on it - they are taking away the ground they
    // would otherwise be standing on.
    adjacent: true,
    then: () => {
      // Re-asked rather than remembered: the block comes out for the tool
      // that is actually in hand when the work is done, so swapping a shovel
      // for a hoe on the way over calls the dig off instead of wearing the
      // wrong tool down for it.
      const now = canDig(agent, cell);
      if (!now) return;

      if (!island.userData.digBlock(cell.x, cell.z)) return;
      inventory.add(now.drop, 1);
      wearTool(agent, 1);
      // Everything that reads the heightmap has to be told it moved.
      syncBlocked(props, blocked);
    }
  });
}

/** Is this plot's crop ready to come up? */
const ripe = (plot) => plot.sown && plot.growth >= PROP_KINDS.farmland.growSeconds;

/**
 * A click on a plot with a hoe: reap it if it is ready, and otherwise put it
 * back to grass. A crop still growing is left alone - turning a field over
 * by accident three minutes in is not something to make easy.
 */
function workFarmland(agent, plot) {
  if (!holding(agent, (t) => t.tills)) return false;
  if (plot.sown && !ripe(plot)) return false;

  const reaping = ripe(plot);
  return agent.doAt(plot, {
    seconds: reaping ? REAP_SECONDS : TILL_SECONDS,
    adjacent: true,
    action: reaping ? 'Reaping the wheat' : 'Putting the ground back',
    then: () => {
      if (plot.gone || !holding(agent, (t) => t.tills)) return;
      wearTool(agent, 1);

      if (reaping) {
        for (const drop of [
          { item: 'wheat', min: 3, max: 4 },
          { item: 'seeds', min: 2, max: 3 },
          { item: 'fibre', min: 1, max: 2 }
        ]) {
          inventory.add(drop.item, drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1)));
        }
        // Reaped, not dug up: the plot stays, bare and ready to be sown.
        plot.sown = false;
        plot.growth = 0;
        setCropStage(plot, null);
        return;
      }

      closePlot(plot);
      removeProp(plot, propsGroup, props);
      syncBlocked(props, blocked);
    }
  });
}

/** A click on a water source with a bucket in hand: fill it up. */
function fillBucket(agent, source) {
  const bucket = holding(agent, (t) => t.holds === 'water');
  if (!bucket || agent.tool.left >= bucket.capacity) return false;
  if ((source.water ?? 0) <= 0) return false;

  return agent.doAt(source, {
    seconds: FILL_SECONDS,
    action: 'Filling the bucket',
    adjacent: true,
    then: () => {
      if (agent.tool?.item !== 'bucket') return;
      const room = bucket.capacity - agent.tool.left;
      const drawn = Math.min(room, source.water ?? 0);
      source.water -= drawn;
      agent.tool.left += drawn;
    }
  });
}

/** A click on a plot with water in the bucket: pour it in. */
function waterFarmland(agent, plot) {
  const bucket = holding(agent, (t) => t.holds === 'water');
  if (!bucket || agent.tool.left <= 0) return false;
  if (plot.water >= PROP_KINDS.farmland.water.max) return false;

  return agent.doAt(plot, {
    seconds: FILL_SECONDS,
    adjacent: true,
    action: 'Watering the ground',
    then: () => {
      if (plot.gone || agent.tool?.item !== 'bucket') return;
      const room = PROP_KINDS.farmland.water.max - plot.water;
      const poured = Math.min(room, agent.tool.left);
      plot.water += poured;
      agent.tool.left -= poured;
    }
  });
}

/**
 * The crops and the catchers, ticked once a frame.
 *
 * A plot only grows while it has water, and drinks as it does - run out and
 * everything simply stops until somebody brings more, which is the whole of
 * the rule. Both are counted off the frame delta because both are things
 * happening in the world, the same as a sapling coming up.
 */
function updateGround(dt) {
  const plot = PROP_KINDS.farmland;

  for (const prop of props) {
    if (prop.gone) continue;

    if (prop.kind === 'waterCatcher') {
      const max = PROP_KINDS.waterCatcher.water.max;
      prop.water = Math.min(max, (prop.water ?? 0) + PROP_KINDS.waterCatcher.catches * dt);
      setWaterLevel(prop, prop.water / max);
      continue;
    }

    if (prop.kind !== 'farmland') continue;
    if (!prop.sown) { showCrop(prop, null); continue; }

    if (prop.growth < plot.growSeconds) {
      const thirst = (plot.drinksPerMinute / 60) * dt;
      // Dry: it simply waits. Nothing is drunk and nothing grows, which is
      // the whole of the rule.
      if ((prop.water ?? 0) >= thirst) {
        prop.water -= thirst;
        prop.growth = Math.min(plot.growSeconds, prop.growth + dt);
      }
    }

    showCrop(prop, cropStageOf(prop.growth / plot.growSeconds));
  }
}

/**
 * Draw what is growing in a plot at the stage it has reached.
 *
 * The blades are only rebuilt when the stage actually changes - five times
 * over the whole five minutes - and the new meshes then have to be given
 * everything the prop's own meshes were given when it was built: the front
 * face shadow pass, the prop id so a click on a blade still finds the plot,
 * and an outline so hovering it lights the crop as well as the soil.
 */
function showCrop(plot, stage) {
  if (!setCropStage(plot, stage)) return;
  castFromFront(plot.mesh);
  tagProp(plot);
  buildOutline(plot);
  if (hovered === plot) setPropOutline(plot, true);
}

// --- controls --------------------------------------------------------------

const settings = createSettings();

const controls = new OrbitCamera(camera, canvas, {
  target: new THREE.Vector3(0, 1, 0),
  distance: ISLAND_RADIUS * 2.1,
  minDistance: ISLAND_RADIUS * 0.5,
  maxDistance: ISLAND_RADIUS * 14,
  pitch: 0.5,
  // How far the free camera may fly from where it started: past the far shore,
  // and no further. Measured rather than guessed - the isle is 15 across and
  // the camera looks down at it, so at 2.5 radii it has slid off the bottom of
  // the screen entirely and there is nothing left to steer back by. At 1.4 it
  // still fills the lower half. The reset-view key is the way home from
  // anywhere inside that.
  panRadius: ISLAND_RADIUS * 1.4,
  isSolid: island.userData.isSolid,
  onFreeCamera: (on) => document.body.classList.toggle('free-camera', on),
  settings
});

// --- panels and pause menu -------------------------------------------------

// The panels are built first so their Esc handler runs before the menu's -
// with one open, Esc closes it instead of pausing the game.
const panels = createPanels({
  settings,
  agents,
  inventory,
  progression,
  blocked: () => menu.isOpen() || crafting.isOpen() || wield.isOpen() || placement.isActive(),
  onSelect: (agent) => selectOnly(agent),
  onPlantItem: (item) => beginPlanting(item),
  onSowItem: (item) => beginSowing(item),
  onEquipItem: (item) => wield.chooseAgent(item)
});

// Handing a tool over. Built before the menu for the same reason the panels
// are: its Esc handler has to run first.
const wield = createWield({
  agents,
  inventory,
  blocked: () => menu.isOpen() || placement.isActive(),
  onOpen: () => { panels.close(); crafting.close(); },
  onEquip: (agent, item) => equipTool(agent, item)
});

// Crafting is a screen of its own, reached by clicking the repaired bench
// rather than by a key. Built before the menu for the same reason the panels
// are: its Esc handler has to run first.
const crafting = createCrafting({
  inventory,
  blocked: () => menu.isOpen() || placement.isActive(),
  onOpen: () => panels.close()
});

// Moving a station owns Esc while it is up, so like the panels it is built
// before the menu: capture listeners fire in the order they were added.
//
// It is also what puts a sapling in the ground: planting is the same screen
// and the same gesture as moving a bench, only the ends differ.
const placement = createPlacement({
  scene,
  camera,
  canvas,
  surface,
  props,
  blocked,
  person,
  island,
  blockedBy: () => menu.isOpen(),
  onBegin: (prop) => {
    panels.close();
    crafting.close();
    setHovered(prop);           // keep it outlined for the whole move
  },
  onEnd: () => {
    // `setHovered(null)`, not `hovered = null`: clearing the variable by hand
    // leaves the outline burning on whatever was lit, because setHovered then
    // sees nothing to change. A planted sapling stayed outlined for the rest
    // of the run that way.
    setHovered(null);
    refreshHover();
  },
  // A sapling is only spent once it is actually put down, and if there is
  // another one held the next goes straight onto the cursor - the inventory
  // does not have to be reopened between them.
  onPlant: (prop) => {
    const item = PROP_KINDS[prop.kind].item;
    inventory.take(item, 1);
    plantedAt = { x: prop.x, z: prop.z };
    prop.growth = 0;              // its time starts where it ends up, not where it appeared
    if (inventory.count(item) > 0) beginPlanting(item);
  },
  // Cancelled before it was ever planted: it goes away again, unspent.
  onDiscard: (prop) => {
    removeProp(prop, propsGroup, props);
    syncBlocked(props, blocked);
  },
  // Taken back out of the ground, whatever it had grown so far.
  onPickUp: (prop) => {
    inventory.add(PROP_KINDS[prop.kind].item, 1);
    removeProp(prop, propsGroup, props);
    syncBlocked(props, blocked);
  }
});

// Where the last sapling went in, so the next one starts beside it rather
// than back at the agent's feet.
let plantedAt = null;

/** The nearest cell to `from` something of this kind may stand on. */
function freeCellNear(kind, from) {
  let best = null;
  for (const key of surface.keys()) {
    const [x, z] = key.split(',').map(Number);
    const cell = { x, z };
    if (!canPlace(surface, kind, cell, { props, keepClear: [{ x: person.x, z: person.z }] })) continue;
    const d = Math.hypot(x - from.x, z - from.z);
    if (!best || d < best.d) best = { cell, d };
  }
  return best?.cell ?? null;
}

/**
 * Take something plantable out of the inventory and put it on the isle.
 *
 * It stands somewhere legal straight away and is then positioned exactly the
 * way a bench is moved - arrows, or dragged on the isle - so there is one
 * gesture to learn rather than two. Nothing is spent until PLACE.
 */
function beginPlanting(item) {
  const kind = ITEMS[item]?.plants;
  if (!kind || inventory.count(item) < 1 || placement.isActive()) return false;

  const cell = freeCellNear(kind, plantedAt ?? { x: person.x, z: person.z });
  if (!cell) return false;                    // nowhere left on the isle for it

  // What a fresh one starts with is the kind's business: a sapling starts a
  // clock, a tub starts empty. Handing a sapling's clock to everything is
  // what would put a water catcher into `updateGrowth`.
  const extra = {};
  if (PROP_KINDS[kind].grows) { extra.growth = 0; extra.growSeconds = rollGrowSeconds(); }
  if (PROP_KINDS[kind].water) extra.water = PROP_KINDS[kind].water.start;

  const prop = spawnProp(kind, cell, { surface, group: propsGroup, props, extra });
  castFromFront(prop.mesh);
  syncBlocked(props, blocked);

  if (!placement.plant(prop)) {
    removeProp(prop, propsGroup, props);
    return false;
  }
  return true;
}

/**
 * Saplings coming up.
 *
 * One only counts down while it is in the ground - a sapling still being
 * positioned is not growing yet. When its time is up it comes up as a tree
 * if it has the room; if a tree already took the space it simply stays a
 * sapling and tries again a few seconds later, so felling the tree beside it
 * is enough to let it through.
 */
const GROW_RETRY = 5;

function updateGrowth(dt) {
  for (const prop of props) {
    if (prop.kind !== 'sapling') continue;
    if (placement.prop === prop) continue;

    prop.growth = (prop.growth ?? 0) + dt;
    if (prop.growth < prop.growSeconds) continue;

    if (!hasRoomToGrow(prop, props)) {
      prop.growth = prop.growSeconds - GROW_RETRY;
      continue;
    }

    growProp(prop);
    castFromFront(prop.mesh);
    // It is scenery now, not a station: no outline, and nothing to move.
    if (hovered === prop) { setHovered(null); refreshHover(); }
  }
}

const menu = createMenu({
  settings,
  controls,
  onLeave: leaveGame,
  onDevReset: devReset,
  onSwarm: callSwarm,
  onChange: () => { showBindingsInHelp(); panels.showTabs(); }
});

/**
 * DEV RESET: the run from 0 again, without reloading the page.
 *
 * Everything the run accumulates goes back to how it booted - the isle's
 * trees and rocks stand again, the workbench is broken again, the agent is
 * home with full needs, and nothing is held. Settings are deliberately left
 * alone; RESET TO DEFAULTS beside it is what those have.
 */
function devReset() {
  placement.cancel();
  // Borrowed agents go first, or they would be left standing on an isle
  // that has just been put back to how it booted.
  for (const agent of [...agents]) if (agent.borrowed !== undefined) sendAgentHome(agent);
  clearTargets();

  for (const prop of [...props]) {
    setPropHighlight(prop, false);
    // Anything the run itself put on the isle - a planted sapling, or the
    // tree one grew into - goes away rather than being reset in place. A
    // plot takes its dent with it.
    if (prop.spawned) {
      if (prop.kind === 'farmland') closePlot(prop);
      removeProp(prop, propsGroup, props);
      continue;
    }
    if (prop.home) placeProp(prop, prop.home, surface);
    if (prop.kind === 'workbench') {
      setWorkbenchState(prop, false);
      castFromFront(prop.mesh);
      continue;
    }
    prop.gone = false;
    prop.mesh.visible = true;
  }

  syncBlocked(props, blocked);
  setHovered(null);
  cancelSowing();
  plantedAt = null;

  person.reset();
  inventory.reset();
  progression.reset();
  // The run is back at 0, so the saved one is too - otherwise the next
  // launch quietly undoes the reset.
  saves.clear();

  controls.reset();
  panels.close();
  crafting.close();
  menu.close();
}

// The corner hints name whatever the keys are bound to now, so rebinding
// something does not leave the help lying about it.
function showBindingsInHelp() {
  for (const slot of document.querySelectorAll('#help [data-help]')) {
    slot.textContent = keyLabel(settings.bindings[slot.dataset.help]);
  }
}

showBindingsInHelp();

// --- the saved run ---------------------------------------------------------

// Written down every few seconds and read back on launch, so closing the game
// - or `WATCH.bat` restarting it on a new build - does not cost the run.
const saves = createSaves({
  surface,
  propsGroup,
  props,
  blocked,
  person,
  inventory,
  progression,
  setWorkbenchRepaired: (prop, repaired) => {
    setWorkbenchState(prop, repaired);
    castFromFront(prop.mesh);
  },
  onSpawn: (prop) => {
    castFromFront(prop.mesh);
    // A plot is a dent in the isle and a crop at some stage of coming up,
    // and neither of those is in the prop itself - both are rebuilt from
    // what was saved.
    if (prop.kind !== 'farmland') return;
    openPlot(prop);
    if (prop.sown) {
      showCrop(prop, cropStageOf((prop.growth ?? 0) / PROP_KINDS.farmland.growSeconds));
    }
  }
});

// Before the first frame, so a restored run is simply how the isle looks on
// launch rather than something visibly rearranging itself a moment later.
saves.restore();

// The drifting motes behind every pane. Built once, from the markup, and then
// left to CSS - nothing here runs per frame.
createStarfields();

// Full screen on launch. The desktop window opens that way on its own; in a
// browser this waits for the first click or key press, which is the only
// moment the request is allowed.
autoFullscreen();

// The menu owns the keyboard while it is open, and a station being moved
// owns the drag on the canvas.
//
// The free camera is why this is the whole list rather than the menu alone: a
// screen that is up has the arrows - the mover steps the station with them -
// and flying the camera out from under it at the same time is one gesture
// doing two things. The camera lets go of whatever is held while it is stood
// down, so a key still down when a panel opened does not fly on behind it.
controls.keyboardBlocked = () => (
  menu.isOpen() || panels.isOpen() || crafting.isOpen() ||
  wield.isOpen() || placement.isActive()
);
// A box already being dragged out keeps the camera still even if the right
// button is pressed as well: a mouse is one pointer, so both gestures would
// otherwise run off the same drag.
/**
 * Who owns a press on the canvas: the camera, or something already running.
 *
 * A box being dragged owns the whole mouse until it is let go. A move owns
 * the LEFT button only - that is how a station is dragged - and the RIGHT
 * button stays the camera's the whole time, because lining something up is
 * exactly when the isle most needs turning. `placement.js` already ignores
 * anything that is not button 0, so the two never fight over one press.
 */
controls.pointerBlocked = (event) => {
  if (selectBox.isDragging()) return true;
  if (!placement.isActive()) return false;
  return !(event?.pointerType === 'mouse' && event.button === 2);
};

// Dragging the left button out on the isle draws a box rather than turning
// the camera - the orbit is on the right button now. A station being moved
// owns the same gesture, so the box stands down while one is up.
const selectBox = createSelectBox({
  canvas,
  blocked: () => (
    menu.isOpen() || crafting.isOpen() || panels.isOpen() ||
    placement.isActive() || controls.isDragging()
  ),
  onBox: (rect, how) => applyBox(rect, how)
});

function leaveGame() {
  // Whatever has happened since the last autosave, written down before the
  // window goes - `pagehide` covers the rest.
  saves.write();

  // The desktop build can actually quit; in a browser tab all that can be
  // done is close the window, which only works if the page opened it.
  if (window.ester?.quit) { window.ester.quit(); return; }
  window.close();
  // Still here, so the browser refused: say so rather than do nothing.
  document.getElementById('menu').querySelector('#menu-leave').textContent = 'CLOSE THIS TAB TO LEAVE';
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let press = null;

canvas.addEventListener('pointerdown', (e) => {
  if (menu.isOpen() || crafting.isOpen() || placement.isActive()) return;
  press = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button };
});

canvas.addEventListener('pointerup', (e) => {
  const started = press;
  press = null;
  if (!started || e.button !== started.button) return;
  // Anything more than a nudge was the camera being dragged, not a click.
  if (Math.hypot(e.clientX - started.x, e.clientY - started.y) > 6) return;
  if (performance.now() - started.t > 500) return;

  // Right click clears the selection, wherever it lands - and puts the
  // seeds away, since it is already the "never mind" button.
  if (started.button === 2) { cancelSowing(); selectOnly(null); return; }
  if (started.button === 0) handleClick(e);
});

/**
 * Select one agent and no other. Selection is single: the stats panel, the
 * order gate below and the number keys all assume exactly one or none.
 */
function selectOnly(agent) {
  for (const other of agents) other.setSelected(other === agent);
}

/** The agent in a number-key slot, or null if nobody is in it. */
function agentInSlot(slot) {
  return agents[slot - 1] ?? null;
}

/**
 * Whether this click is meant to go behind the work already ordered rather
 * than replace it. Cmd counts as well as Ctrl, for a Mac in a browser.
 */
function queueing(event) {
  return !!(event.ctrlKey || event.metaKey);
}

/**
 * Whether a click is meant to work the ground rather than walk onto it.
 *
 * Shift, and shift alone - it is the same key that sends things back to the
 * inventory on the crafting screen, which is the nearest thing this game has
 * to a "do the other thing with this" modifier. Ctrl is already the queue
 * and means something else entirely.
 */
function tilling(event) {
  return !!event.shiftKey;
}

/**
 * Who an order is for, or null if nobody is selected.
 *
 * *Every* order needs a selected agent - walking somewhere as much as working
 * on something - so a stray click on the isle never moves anyone. Selection
 * is single, so there is never a question of which one it means.
 */
function selectedAgent() {
  return agents.find((a) => a.selected) ?? null;
}

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  // Seeds on the cursor take the click before anything else does: on a plot
  // they go in, and anywhere else they go back in the pack. A click that
  // sometimes sowed and sometimes marched an agent across the isle would be
  // the worst of both.
  if (sowing) {
    const plot = propUnderPointer();
    if (!canSow(plot)) { cancelSowing(); return; }
    sowPlot(plot);
    lookedAt = 0;
    return;
  }

  for (const hit of raycaster.intersectObject(scene, true)) {
    let object = hit.object;
    while (object) {
      // An agent: select that one and show its stats. `userData.person` is
      // which of them was hit - there can be more than one on the isle.
      if (object.userData.person) { selectOnly(object.userData.person); return; }

      if (object.userData.propId) {
        const prop = props.find((p) => p.id === object.userData.propId);
        if (prop && prop.kind === 'workbench') { useWorkbench(prop); return; }

        // The ground and the water are worked with what is in hand rather
        // than by the prop's own `action`, so they are asked first: a plot
        // is a hoe's job or a bucket's depending on who is standing there.
        if (prop && !prop.gone && prop.kind === 'farmland') {
          const agent = selectedAgent();
          if (agent) { waterFarmland(agent, prop) || workFarmland(agent, prop); }
          return;
        }
        if (prop && !prop.gone && prop.kind === 'waterCatcher') {
          const agent = selectedAgent();
          if (agent) fillBucket(agent, prop);
          return;
        }

        if (prop && !prop.gone) {
          // Nothing to do to a sapling: there is no work on it, so the click
          // is simply spent rather than becoming an order to walk there.
          if (!PROP_KINDS[prop.kind].action) return;
          const agent = selectedAgent();
          if (!agent) return;
          // Ctrl held: behind whatever they are already doing rather than
          // instead of it, up to three jobs in all. A full queue simply
          // refuses the click - the lit props are what say how many there
          // are.
          if (queueing(event)) agent.queueUp(prop, JOB_LIMIT);
          else agent.workOn(prop);
          return;
        }
      }
      object = object.parent;
    }

    // Otherwise walk to whatever patch of island was clicked. The block is
    // read off the face rather than the point, so clicking the side of a
    // ledge means that block and not the column standing in front of it -
    // the same answer the cursor's own brackets are drawn around.
    const { x, z } = blockAt(hit);
    if (surface.has(`${x},${z}`)) {
      // Ctrl is the queue gesture, so a miss with it held leaves the queue
      // alone rather than calling the whole thing off and walking there.
      if (queueing(event)) return;
      const agent = selectedAgent();
      if (!agent) return;
      // Shift turns the ground over rather than walking onto it - a plain
      // click on the grass is a walk, as it always was, and holding shift
      // with a hoe in hand is what makes it a job. A shift click that cannot
      // till - no hoe, or a cell something already stands on - is spent
      // rather than falling through to a walk, or the modifier would
      // sometimes do the very thing it was held to avoid.
      // Shift is "work this ground with what is in hand": a hoe turns it
      // over, a shovel or a pickaxe takes a block out of it. One modifier,
      // and the tool says which of them it means.
      if (tilling(event)) {
        tillGround(agent, { x, z }) || digGround(agent, { x, z });
        return;
      }
      if (agent.walkTo({ x, z })) markers.ping(x, surface.get(`${x},${z}`) + GROUND_OFFSET, z);
      return;
    }
  }

  // Clicked the void: nothing is selected any more - unless this was a
  // queue click, which only ever adds and never takes the selection away.
  if (!queueing(event)) selectOnly(null);
}

// --- the selection box ---------------------------------------------------

// How much work one agent may be given at once - by a box, or by holding
// the queue key down and picking things out one at a time. Everything over
// the three is left standing.
const JOB_LIMIT = 3;

const boxPoint = new THREE.Vector3();
const boxDir = new THREE.Vector3();
const boxAt = new THREE.Vector3();

/** Where a world point lands on the screen, or null if it is behind us. */
function onScreen(point) {
  boxPoint.copy(point).project(camera);
  if (boxPoint.z > 1) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + (boxPoint.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-boxPoint.y * 0.5 + 0.5) * rect.height
  };
}

const inBox = (box, at) => !!at &&
  at.x >= box.left && at.x <= box.right && at.y >= box.top && at.y <= box.bottom;

/**
 * Whether the isle itself stands between the camera and a point, so a box
 * dragged over the near slope does not quietly take in the trees on the far
 * side as well.
 *
 * One cast per candidate, once, when the button comes up - there are a
 * couple of dozen props, so this never lands in a frame's way. It is the
 * same reasoning as the hover ray: expensive casts only where they are
 * actually needed.
 */
function hiddenByIsland(point) {
  boxDir.copy(point).sub(camera.position);
  const distance = boxDir.length();
  const far = raycaster.far;
  raycaster.set(camera.position, boxDir.normalize());
  raycaster.far = distance - 0.4;
  const behind = raycaster.intersectObject(island, true).length > 0;
  raycaster.far = far;
  return behind;
}

/**
 * What a dragged box takes in.
 *
 * Agents win over everything else: a box over the isle's inhabitants is a
 * selection, never an order, and exactly one comes out of it - the one
 * nearest the middle of the box - because selection is single.
 *
 * Otherwise it is a batch of work. Everything inside the box there is
 * something to do to goes to the selected agent as one order, and they work
 * their way through it nearest first. With nobody selected it does nothing
 * at all, the same as every other order.
 */
function applyBox(box, { queue = false } = {}) {
  const centre = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
  const toCentre = (at) => Math.hypot(at.x - centre.x, at.y - centre.y);

  // Who is standing in the box, nearest the middle of it first.
  let pick = null;
  for (const agent of agents) {
    const at = onScreen(boxAt.copy(agent.pos).setY(agent.pos.y + 0.8));
    if (!inBox(box, at)) continue;
    const d = toCentre(at);
    if (!pick || d < pick.d) pick = { agent, d };
  }

  // What there is to do in the box. The bench is left out: it is a station
  // with a cost, repaired by clicking it, not something to sweep up with the
  // trees. Saplings have no `action`, so they fall out on their own.
  const caught = [];
  for (const prop of props) {
    if (prop.gone || prop.kind === 'workbench' || !PROP_KINDS[prop.kind]?.action) continue;
    boxAt.copy(prop.mesh.position).setY(prop.mesh.position.y + 0.5);
    const at = onScreen(boxAt);
    if (!inBox(box, at) || hiddenByIsland(boxAt)) continue;
    caught.push({ prop, d: toCentre(at) });
  }

  // Three at a time and no more. A box thrown across half the isle would
  // otherwise be a whole afternoon's work on one order, and there would be
  // no seeing what was in it - the agent is picked out of a crowd on the
  // middle of the box the same way, so the three nearest it are the ones
  // kept and the rest are left standing.
  caught.sort((a, b) => a.d - b.d);
  const batch = caught.slice(0, JOB_LIMIT).map((entry) => entry.prop);

  // An agent already selected and something to do: that is an order, even
  // if the box clipped the agent on its way past. Catching whoever is
  // already selected used to throw the order away and reselect them, which
  // is nothing happening as far as the player can see.
  const agent = selectedAgent();
  if (agent && batch.length > 0) {
    // Held down, a box adds to the queue instead of replacing it - however
    // many of the three are still going spare.
    if (queue) for (const prop of batch) agent.queueUp(prop, JOB_LIMIT);
    else agent.workOnAll(batch);
    return;
  }

  // Otherwise a box with someone in it is a selection, and exactly one comes
  // out of it - selection is single.
  if (pick) selectOnly(pick.agent);
}

// --- AGENT SWARM (dev) ----------------------------------------------------

// Two more agents on the isle, and half a minute later they are gone again.
// They are ordinary agents while they are here - selectable, orderable, in
// the overview and in the number-key slots - but nothing of them is saved,
// so a restart or a DEV RESET simply does not have them.
const SWARM_SIZE = 2;
const SWARM_SECONDS = 30;
let borrowedCount = 0;

/**
 * Somewhere free to stand near `from`, with a way back from it.
 *
 * `apart` keeps them off each other's toes: arriving in the next cell along
 * puts three agents in a heap where a click can only reach the nearest of
 * them. If the isle is too crowded for that, the room is given up rather
 * than the agent.
 */
function standingCellNear(from, apart = 2) {
  let best = null;
  for (const key of surface.keys()) {
    const [x, z] = key.split(',').map(Number);
    if (blocked.has(key)) continue;
    if (agents.some((a) => Math.hypot(a.x - x, a.z - z) < apart)) continue;
    if (props.some((p) => !p.gone && footprintCells(p.kind, p).some((c) => c.x === x && c.z === z))) continue;
    const d = Math.hypot(x - from.x, z - from.z);
    if (best && d >= best.d) continue;
    // Somewhere they can actually walk out of - a ledge with no way down is
    // no good to anyone.
    if (!findPath(surface, from, { x, z }, { blocked })) continue;
    best = { cell: { x, z }, d };
  }
  if (best) return best.cell;
  return apart > 1 ? standingCellNear(from, 1) : null;
}

function callSwarm() {
  for (let i = 0; i < SWARM_SIZE; i++) {
    const cell = standingCellNear({ x: person.x, z: person.z });
    if (!cell) break;                      // nowhere left to put them

    const mate = new Person(surface, cell, { name: `Helper ${++borrowedCount}`, blocked });
    mate.borrowed = SWARM_SECONDS;         // counted down in the frame loop
    scene.add(mate.mesh);
    castFromFront(mate.mesh);              // built after boot, like any other
    agents.push(mate);
  }
  // Closed on the way out, so they are seen arriving rather than found later.
  menu.close();
}

/** A borrowed agent's time is up: off the isle, and out of the lists. */
function sendAgentHome(agent) {
  const at = agents.indexOf(agent);
  if (at >= 0) agents.splice(at, 1);

  // Whatever they were headed for stops being a target the moment they go.
  agent.queue = [];
  agent.task = null;
  agent.setSelected(false);

  scene.remove(agent.mesh);
  agent.mesh.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
}

function updateSwarm(dt) {
  for (const agent of [...agents]) {
    if (agent.borrowed === undefined) continue;
    agent.borrowed -= dt;
    if (agent.borrowed <= 0) sendAgentHome(agent);
  }
}

// --- the job label over the agent's head --------------------------------

const label = document.getElementById('action');
const labelText = label.querySelector('.text');
const labelFill = label.querySelector('.fill');
const labelPos = new THREE.Vector3();

/**
 * Whose job is announced over their head. The selected agent if they are
 * working, and otherwise whoever else is - there is one label, so with a
 * swarm on the isle it follows the one being watched.
 */
function labelAgent() {
  const chosen = selectedAgent();
  if (chosen?.activity) return chosen;
  return agents.find((a) => a.activity) ?? null;
}

function updateLabel() {
  const agent = labelAgent();
  const activity = agent?.activity;

  // Only actual work is announced - walking about and standing around are not.
  if (!activity) {
    label.classList.remove('visible');
    return;
  }

  labelText.textContent = activity.action;
  labelFill.style.width = `${activity.progress * 100}%`;

  labelPos.copy(agent.pos);
  labelPos.y += 2.1;
  labelPos.project(camera);

  // Hide it when the agent is behind the camera or off screen.
  const onScreen = labelPos.z < 1 && Math.abs(labelPos.x) < 1.2 && Math.abs(labelPos.y) < 1.2;
  label.classList.toggle('visible', onScreen);
  if (!onScreen) return;

  label.style.left = `${(labelPos.x * 0.5 + 0.5) * window.innerWidth}px`;
  label.style.top = `${(-labelPos.y * 0.5 + 0.5) * window.innerHeight}px`;
}

// --- hovering a placed station ------------------------------------------

// Only stations outline - `PROP_KINDS[kind].placed`. Trees and rocks are
// scenery the isle grew, not something the player put down and can move.
//
// The ray runs on every pointer move, so it is cast at the props alone -
// the island is thousands of instanced blocks and testing them every time
// the mouse twitches is not worth it. The island is only brought in once a
// station has actually been hit, to check nothing is standing in front of
// it: that is rare, so the expensive cast almost never happens.
let pointerAt = null;

// The corner brackets around whatever the cursor is over - a block of the
// isle as much as a prop. White is "this is what you are pointing at"; any
// other colour is a gesture that is armed and would work here.
const highlight = createHighlight(scene);

const measured = new THREE.Box3();

/** A world-space box around everything drawn in an object. */
function boxOf(object) {
  return measured.setFromObject(object);
}

/**
 * The same for a prop, minus the parts that are not shape.
 *
 * A plot carries an invisible pad so it can be hovered out of its dent, and
 * boxing that would draw the brackets around a hand's breadth of thin air
 * over the grass.
 */
function propBox(prop) {
  measured.makeEmpty();
  prop.mesh.updateWorldMatrix(true, true);
  prop.mesh.traverse((object) => {
    if (!object.isMesh || object.userData.isHitPad) return;
    measured.expandByObject(object);
  });
  return measured.isEmpty() ? boxOf(prop.mesh) : measured;
}

const blockPoint = new THREE.Vector3();

/**
 * Which block of the isle a ray hit.
 *
 * The hit point is ON the surface, so rounding it is a coin toss at every
 * face. Stepping a hair back along the face's own normal puts the point
 * inside the block it belongs to, which is what makes a click on the side
 * of a ledge name that block rather than the column in front of it. The
 * isle's meshes are axis aligned and untransformed, so the geometry normal
 * is already the world one.
 */
function blockAt(hit) {
  blockPoint.copy(hit.point);
  const normal = hit.normal ?? hit.face?.normal;
  if (normal) blockPoint.addScaledVector(normal, -0.05);
  return {
    x: Math.round(blockPoint.x),
    y: Math.round(blockPoint.y),
    z: Math.round(blockPoint.z)
  };
}

/**
 * Sowing: the seeds are on the cursor, and the next click on a plot puts
 * them in.
 *
 * It is deliberately not the mover. A sapling has to be *positioned* - it
 * needs room, and where exactly it goes matters - so it earns arrows. A
 * seed only ever goes into ground that has already been turned over, and
 * the plot is the position, so all that is left is which plot. Nobody has
 * to walk over: the ground is already open.
 */
let sowing = false;

function beginSowing(item) {
  if (!ITEMS[item]?.sows || inventory.count(item) < 1) return false;
  sowing = true;
  panels.close();
  lookedAt = 0;
  return true;
}

function cancelSowing() {
  sowing = false;
}

/** Whether the seeds on the cursor could go into this plot. */
function canSow(plot) {
  return sowing && !!plot && !plot.gone && plot.kind === 'farmland'
    && !plot.sown && inventory.count('seeds') > 0;
}

function sowPlot(plot) {
  if (!canSow(plot)) return false;
  if (!inventory.take('seeds', 1)) return false;
  plot.sown = true;
  plot.growth = 0;
  showCrop(plot, 0);
  // The cursor keeps its seeds so a row of plots goes in one after another,
  // and puts them away on its own once there are none left.
  if (inventory.count('seeds') < 1) cancelSowing();
  return true;
}

function setHovered(prop) {
  if (hovered === prop) return;
  if (hovered) setPropOutline(hovered, false);
  hovered = prop;
  if (hovered) setPropOutline(hovered, true);
  canvas.style.cursor = hovered ? 'pointer' : '';
}

/**
 * What the readout at the top of the screen should say about a prop.
 *
 * The name and its picture come from the kind; anything that changes while
 * the run goes on - how full a catcher is, how far along a crop has got - is
 * added by whatever owns that state, so this stays the one place a prop is
 * described and nothing has to reach into the readout itself.
 */
function describeProp(prop) {
  const kind = PROP_KINDS[prop.kind];
  const what = { name: propName(prop), item: kind?.icon ?? null };

  // A station still to be repaired says what it wants, the same as its badge.
  if (kind?.cost && !prop.repaired) {
    what.note = `${inventory.count(kind.cost.item)} / ${kind.cost.amount} ${ITEMS[kind.cost.item].label.toLowerCase()}`;
  }

  // Anything that holds liquid says how much and what of, which is what the
  // readout was built for in the first place.
  if (kind?.water) {
    const ml = Math.floor(prop.water ?? 0);
    what.note = `${ml} / ${kind.water.max} ml \u00b7 Water`;
    what.bar = { value: ml, max: kind.water.max, colour: '#3f9fd8' };
  }

  // And a sown plot says how far along it is, or that it has run dry. The
  // bar becomes the crop's rather than the water's: how full the ground is
  // is still in the line, and how far along the wheat is is the thing being
  // watched.
  if (prop.kind === 'farmland' && prop.sown) {
    const pct = Math.floor((prop.growth / kind.growSeconds) * 100);
    const dry = (prop.water ?? 0) < (kind.drinksPerMinute / 60);
    what.name = ripe(prop) ? 'Ripe Wheat' : 'Wheat';
    what.item = ripe(prop) ? 'wheat' : 'seeds';
    what.note = `${what.note} \u00b7 ${ripe(prop) ? 'ready' : `${pct}%${dry ? ' \u00b7 dry' : ''}`}`;
    what.bar = { value: prop.growth, max: kind.growSeconds, colour: ripe(prop) ? '#e8cc63' : '#6aa84f' };
  }

  // Bare turned ground that the seeds on the cursor could go into says so.
  if (canSow(prop)) what.note = `${what.note ?? ''} \u00b7 click to sow`.trim();
  return what;
}

/** An agent: who they are, and what is in their hand. */
function describeAgent(agent) {
  const tool = agent.tool ? ITEMS[agent.tool.item] : null;
  const what = { name: agent.name, item: agent.tool?.item ?? null };
  if (tool) {
    const max = tool.uses ?? tool.capacity;
    what.note = `${tool.label} \u2014 ${Math.round(agent.tool.left)} / ${max}`;
    what.bar = { value: agent.tool.left, max, colour: tool.tint };
  } else {
    what.note = 'empty handed';
  }
  return what;
}

/**
 * The ground itself: whichever layer of the isle the ray landed on.
 *
 * The instanced meshes are named `island-<layer>`, and a buried one carries
 * `:core` on the end - `grass` and `grass:core` are the same stuff to look
 * at, so both ends are trimmed off.
 */
function describeGround(hit) {
  const layer = (hit.object.name ?? '').replace(/^island-/, '').split(':')[0];
  if (!layer) return null;
  return { name: layer.replace(/\b[a-z]/g, (c) => c.toUpperCase()) };
}

/**
 * Point the pointer's ray at the scene. Returns false when there is nothing
 * to aim at, which is the same question both the outline and the readout
 * start from.
 */
function aimRay() {
  if (!pointerAt) return false;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((pointerAt.x - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((pointerAt.y - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return true;
}

/** Whatever the pointer is actually over: a prop, or null for the ground. */
function propUnderPointer() {
  const hit = raycaster.intersectObject(propsGroup, true)[0];
  const prop = hit && props.find((p) => p.id === hit.object.userData.propId);
  if (!prop || prop.gone) return null;

  // Something hit first is something in the way - a brow of the isle between
  // the cursor and the prop, most likely. This is the cast that was always
  // here, and it still only runs when a prop was actually hit.
  const ground = raycaster.intersectObject(island, true)[0];
  return ground && ground.distance < hit.distance ? null : prop;
}

function refreshHover() {
  // A move keeps its own station lit, whatever the cursor is over.
  if (placement.isActive()) { setHovered(placement.prop); return; }
  if (!pointerAt || menu.isOpen() || panels.isOpen() || crafting.isOpen()) {
    setHovered(null);
    return;
  }
  if (!aimRay()) { setHovered(null); return; }

  // Only a station the player put down takes the outline.
  const prop = propUnderPointer();
  setHovered(prop && PROP_KINDS[prop.kind]?.placed ? prop : null);
}

/**
 * The readout at the top of the screen, run from the frame loop rather than
 * from the pointer.
 *
 * Naming the ground needs a cast at the isle and the isle is thousands of
 * instanced blocks (0.6ms a cast against 0.01ms for the props), so it is
 * throttled. It cannot be throttled on the pointer move itself: a move that
 * lands inside the window is simply dropped, and with no further move to
 * retry the readout never catches up - which is exactly what it did. The
 * frame loop always comes round again.
 */
const LOOK_EVERY_MS = 80;
let lookedAt = 0;

function updateLookAt() {
  if (placement.isActive()) {
    lookAt.show(describeProp(placement.prop));
    highlight.showBox(propBox(placement.prop));
    return;
  }
  if (!pointerAt || menu.isOpen() || panels.isOpen() || crafting.isOpen() || wield.isOpen()) {
    lookAt.hide();
    highlight.hide();
    return;
  }

  const now = performance.now();
  if (now - lookedAt < LOOK_EVERY_MS) return;
  lookedAt = now;

  if (!aimRay()) { lookAt.hide(); highlight.hide(); return; }

  // The agents stand in the scene rather than in the props group, so they
  // are asked about on their own - and asked first, because someone standing
  // at the bench should name themselves rather than it.
  for (const agent of agents) {
    if (raycaster.intersectObject(agent.mesh, true)[0]) {
      lookAt.show(describeAgent(agent));
      highlight.showBox(boxOf(agent.mesh));
      return;
    }
  }

  const prop = propUnderPointer();
  if (prop) {
    lookAt.show(describeProp(prop));
    // A plot waiting for the seeds on the cursor lights up: that is the
    // whole of what says where they may go.
    highlight.showBox(propBox(prop), canSow(prop) ? HIGHLIGHT_WORK : HIGHLIGHT_PLAIN);
    return;
  }

  const ground = raycaster.intersectObject(island, true)[0];
  if (!ground) { lookAt.show(null); highlight.hide(); return; }

  lookAt.show(describeGround(ground));

  // Shift held over the grass: the cell that click would work is lit, and
  // only when the click would actually do something. An armed gesture that
  // lights ground it cannot work would be worse than no mark at all.
  const block = blockAt(ground);
  highlight.showCell(block.x, block.y, block.z, armedOn(block) ? HIGHLIGHT_WORK : HIGHLIGHT_PLAIN);
}

/** Would a shift click on this cell do anything, for whoever is selected? */
function armedOn(cell) {
  if (!shiftHeld) return false;
  const agent = selectedAgent();
  if (!agent) return false;
  return canTill(agent, cell) || !!canDig(agent, cell);
}

/**
 * Shift, tracked for the cursor rather than for a click.
 *
 * The mark has to appear when the key goes down and not wait for the mouse
 * to move, so pressing or releasing it clears the throttle and the next
 * frame works the answer out again.
 */
let shiftHeld = false;

function setShift(down) {
  if (shiftHeld === down) return;
  shiftHeld = down;
  lookedAt = 0;
}

window.addEventListener('keydown', (event) => { if (event.key === 'Shift') setShift(true); });
window.addEventListener('keyup', (event) => { if (event.key === 'Shift') setShift(false); });
// Coming back to the window with the key already up - or already down - is
// otherwise never noticed.
window.addEventListener('blur', () => setShift(false));

canvas.addEventListener('pointermove', (event) => {
  pointerAt = { x: event.clientX, y: event.clientY };
  setShift(event.shiftKey);
  refreshHover();
});

canvas.addEventListener('pointerleave', () => {
  pointerAt = null;
  refreshHover();
  highlight.hide();
});

// The wield key: with an agent selected it asks what they should carry.
// Like every other order it needs a selection first - it is a thing being
// done to an agent, not a screen being opened.
window.addEventListener('keydown', (event) => {
  if (menu.isOpen() || placement.isActive() || panels.isOpen() || crafting.isOpen()) return;
  if (settings.actionFor(event.key) !== 'wieldTool') return;
  event.preventDefault();
  const agent = selectedAgent();
  if (agent) wield.chooseTool(agent);
});

// The number keys pick an agent by its slot, the way the overview lists them.
window.addEventListener('keydown', (event) => {
  if (menu.isOpen() || placement.isActive()) return;

  const action = settings.actionFor(event.key);
  if (!action?.startsWith('selectAgent')) return;
  event.preventDefault();

  const slot = Number(action.slice('selectAgent'.length));
  // An empty slot leaves the selection alone rather than clearing it.
  const agent = agentInSlot(slot);
  if (agent) selectOnly(agent);
}, true);

// The move key picks up whatever the cursor is on.
window.addEventListener('keydown', (event) => {
  if (menu.isOpen() || placement.isActive()) return;
  if (settings.actionFor(event.key) !== 'moveStation') return;
  event.preventDefault();

  // Nothing under the cursor, or wreckage that has still to be repaired:
  // `begin` turns both down on its own.
  placement.begin(hovered);
});

// --- what the broken workbench still needs -------------------------------

// Always up while the bench is broken, so the cost of repairing it is
// readable from the moment the run starts rather than only after a click.
const benchLabel = document.getElementById('bench-label');
const benchHave = benchLabel.querySelector('.have');
const benchWant = benchLabel.querySelector('.want');
const benchFill = benchLabel.querySelector('.fill');
const benchPos = new THREE.Vector3();

benchWant.textContent = PROP_KINDS.workbench.cost.amount;

function updateBenchLabel() {
  if (!workbench || workbench.repaired) {
    benchLabel.hidden = true;
    return;
  }

  const { item, amount } = PROP_KINDS.workbench.cost;
  const held = inventory.count(item);
  const enough = held >= amount;

  benchHave.textContent = Math.min(held, amount);
  benchFill.style.width = `${Math.min(1, held / amount) * 100}%`;
  benchLabel.classList.toggle('ready', enough);

  benchPos.copy(workbench.mesh.position);
  benchPos.y += 2.3;
  benchPos.project(camera);

  // Same rule as the agent's label: gone when it is behind the camera or
  // off the edge of the screen.
  const onScreen = benchPos.z < 1 && Math.abs(benchPos.x) < 1.2 && Math.abs(benchPos.y) < 1.2;
  benchLabel.hidden = !onScreen;
  if (!onScreen) return;

  benchLabel.style.left = `${(benchPos.x * 0.5 + 0.5) * window.innerWidth}px`;
  benchLabel.style.top = `${(-benchPos.y * 0.5 + 0.5) * window.innerHeight}px`;
}

// --- the selected agent's stats panel ------------------------------------

const panel = document.getElementById('agent-panel');
const activityName = panel.querySelector('.activity-name');
const activityTime = panel.querySelector('.activity-time');
const activityFill = panel.querySelector('.activity .fill');
const meters = [...panel.querySelectorAll('.meter')].map((el) => ({
  stat: el.dataset.stat,
  fill: el.querySelector('.fill'),
  value: el.querySelector('.value')
}));
const traits = [...panel.querySelectorAll('[data-trait]')];

function meterColour(value) {
  if (value > 60) return '#7ad7ff';
  if (value > 25) return '#f0c04a';
  return '#e8646a';
}

function updatePanel() {
  const agent = selectedAgent();
  panel.hidden = !agent;
  if (!agent) return;

  panel.querySelector('.name').textContent = agent.name;

  const activity = agent.activity;
  activityName.textContent = activity ? activity.action : 'Idle';
  activityTime.textContent = activity ? `${activity.remaining.toFixed(1)}s` : '';
  activityFill.style.width = `${(activity?.progress ?? 0) * 100}%`;

  for (const meter of meters) {
    const value = agent.stats[meter.stat];
    meter.fill.style.width = `${value}%`;
    meter.fill.style.background = meterColour(value);
    meter.value.textContent = Math.round(value);
  }

  for (const trait of traits) {
    trait.textContent = agent.stats[trait.dataset.trait] ?? 'None';
  }
}

// --- loop ------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function frame() {
  const delta = Math.min(clock.getDelta(), 0.1);

  for (const agent of agents) agent.update(delta, props, (prop) => finishProp(prop, agent));
  updateSwarm(delta);
  updateGrowth(delta);
  syncTargets();
  markers.update(delta);
  placement.update(delta);
  controls.update(delta);
  updateLabel();
  updateBenchLabel();
  updatePanel();
  panels.update();
  updateGround(delta);
  updateLookAt();
  crafting.update();

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();

const loading = document.getElementById('loading');
loading.classList.add('hidden');
setTimeout(() => loading.remove(), 800);

console.log(`[ESTER] ${island.userData.blockCount} blocks, ${props.length} props`);

// Handle for the devtools console (F12) and for automated testing.
window.ESTER = { ITEMS, lookAt, wield, highlight, tillGround, canTill, digGround, canDig,
  beginSowing, sowPlot, canSow, showCrop, blockAt, propBox, workFarmland, fillBucket, waterFarmland, updateGround, ripe, equipTool, wearTool, wieldable, scene, camera, renderer, controls, island, person, agents, props, propsGroup, workbench, blocked, surface, markers, menu, panels, crafting, placement, selectBox, inventory, progression, settings, raycaster, THREE, saves, plant: beginPlanting, updateGrowth, finishProp, selectOnly, selectedAgent, applyBox, callSwarm, updateSwarm };
window.ESTER.debug = createDebug({ renderer, scene, island, props });
// One prop was the target when there was one agent and one job; a box can
// light a whole stand at once, so `targets` is the list and `targeted` is
// kept as the first of them.
Object.defineProperty(window.ESTER, 'targets', { get: () => [...targets] });
Object.defineProperty(window.ESTER, 'targeted', { get: () => [...targets][0] ?? null });
