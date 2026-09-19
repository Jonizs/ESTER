import * as THREE from 'three';
import { createIsland, ISLAND_RADIUS } from './island.js';
import { createSpace } from './space.js';
import { OrbitCamera } from './orbitCamera.js';
import {
  createProps, setPropHighlight, setPropOutline, setWorkbenchState,
  canMove, canPlace, placeProp, footprintCells, syncBlocked,
  spawnProp, removeProp, growProp, hasRoomToGrow, rollGrowSeconds,
  GROUND_OFFSET, PROP_KINDS
} from './props.js';
import { Person } from './person.js';
import { createMarkers } from './markers.js';
import { createSettings, keyLabel } from './settings.js';
import { createMenu } from './menu.js';
import { createPanels } from './panels.js';
import { createCrafting } from './crafting.js';
import { createPlacement } from './placement.js';
import { createInventory, ITEMS } from './inventory.js';
import { createProgression } from './progression.js';
import { createDebug } from './debug.js';
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

// The prop the agent is on its way to, lit up until it gets there.
let targeted = null;

function setTarget(prop) {
  if (targeted === prop) return;
  if (targeted) setPropHighlight(targeted, false);
  targeted = prop;
  if (prop) setPropHighlight(prop, true);
}

/** Drop the highlight once the agent has walked up to it - or lost the job. */
function updateTarget() {
  if (!targeted) return;
  const arrived = person.path.length === 0;
  if (arrived || person.task?.prop !== targeted || targeted.gone) setTarget(null);
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

function finishProp(prop) {
  if (targeted === prop) setTarget(null);

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
  for (const drop of kind.drops ?? []) {
    const n = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
    if (n > 0) inventory.add(drop.item, n);
  }

  prop.gone = true;
  prop.mesh.visible = false;
}

/**
 * A click on the workbench. Repaired, it opens crafting; broken, it is a job
 * like any other - but only once there is the wood to pay for it, and the
 * wood is only spent when the work is finished.
 */
function useWorkbench(prop) {
  // Opening the repaired bench is not an order, so it needs no selection -
  // it is the same as pressing Tab. Repairing it is an order, and does.
  if (prop.repaired) { crafting.open(); return; }
  if (!ordersAllowed()) return;
  if (person.task?.prop === prop) return;   // already on its way

  const cost = PROP_KINDS.workbench.cost;
  // The badge over the bench already says how much wood it wants and how
  // much there is, so a click without enough simply does nothing.
  if (inventory.count(cost.item) < cost.amount) return;
  if (person.workOn(prop)) setTarget(prop);
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

// --- controls --------------------------------------------------------------

const settings = createSettings();

const controls = new OrbitCamera(camera, canvas, {
  target: new THREE.Vector3(0, 1, 0),
  distance: ISLAND_RADIUS * 2.1,
  minDistance: ISLAND_RADIUS * 0.5,
  maxDistance: ISLAND_RADIUS * 14,
  autoSpin: false,
  pitch: 0.5,
  isSolid: island.userData.isSolid,
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
  blocked: () => menu.isOpen() || crafting.isOpen() || placement.isActive(),
  onSelect: (agent) => selectOnly(agent),
  onPlantItem: (item) => beginPlanting(item)
});

// Crafting is a screen of its own, reached by clicking the repaired bench
// rather than by a key. Built before the menu for the same reason the panels
// are: its Esc handler has to run first.
const crafting = createCrafting({
  inventory,
  blocked: () => menu.isOpen() || placement.isActive(),
  onOpen: () => panels.close(),
  onPlantItem: (item) => beginPlanting(item)
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

  const prop = spawnProp(kind, cell, {
    surface,
    group: propsGroup,
    props,
    extra: { growth: 0, growSeconds: rollGrowSeconds() }
  });
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
  setTarget(null);

  for (const prop of [...props]) {
    setPropHighlight(prop, false);
    // Anything the run itself put on the isle - a planted sapling, or the
    // tree one grew into - goes away rather than being reset in place.
    if (prop.spawned) { removeProp(prop, propsGroup, props); continue; }
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
  plantedAt = null;

  person.reset();
  inventory.reset();
  progression.reset();

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

// The drifting motes behind every pane. Built once, from the markup, and then
// left to CSS - nothing here runs per frame.
createStarfields();

// Full screen on launch. The desktop window opens that way on its own; in a
// browser this waits for the first click or key press, which is the only
// moment the request is allowed.
autoFullscreen();

// The menu owns the keyboard while it is open, and a station being moved
// owns the left-drag - both are the same gesture on the same canvas.
controls.keyboardBlocked = () => menu.isOpen();
controls.pointerBlocked = () => placement.isActive();

function leaveGame() {
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

  // Right click clears the selection, wherever it lands.
  if (started.button === 2) { selectOnly(null); return; }
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
 * Whether a click may order the agent about.
 *
 * *Every* order needs a selected agent - walking somewhere as much as working
 * on something - so a stray click on the isle never moves anyone.
 */
function ordersAllowed() {
  return agents.some((a) => a.selected);
}

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  for (const hit of raycaster.intersectObject(scene, true)) {
    let object = hit.object;
    while (object) {
      // The agent itself: select it and show its stats.
      if (object.userData.isPerson) { selectOnly(person); return; }

      if (object.userData.propId) {
        const prop = props.find((p) => p.id === object.userData.propId);
        if (prop && prop.kind === 'workbench') { useWorkbench(prop); return; }
        if (prop && !prop.gone) {
          // Nothing to do to a sapling: there is no work on it, so the click
          // is simply spent rather than becoming an order to walk there.
          if (!PROP_KINDS[prop.kind].action) return;
          if (!ordersAllowed()) return;
          if (person.workOn(prop)) setTarget(prop);
          return;
        }
      }
      object = object.parent;
    }

    // Otherwise walk to whatever patch of island was clicked.
    const x = Math.round(hit.point.x);
    const z = Math.round(hit.point.z);
    if (surface.has(`${x},${z}`)) {
      if (!ordersAllowed()) return;
      if (person.walkTo({ x, z })) {
        setTarget(null);
        markers.ping(x, surface.get(`${x},${z}`) + GROUND_OFFSET, z);
      }
      return;
    }
  }

  // Clicked the void: nothing is selected any more.
  selectOnly(null);
}

// --- the job label over the agent's head --------------------------------

const label = document.getElementById('action');
const labelText = label.querySelector('.text');
const labelFill = label.querySelector('.fill');
const labelPos = new THREE.Vector3();

function updateLabel() {
  const activity = person.activity;

  // Only actual work is announced - walking about and standing around are not.
  if (!activity) {
    label.classList.remove('visible');
    return;
  }

  labelText.textContent = activity.action;
  labelFill.style.width = `${activity.progress * 100}%`;

  labelPos.copy(person.pos);
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
let hovered = null;
let pointerAt = null;

function setHovered(prop) {
  if (hovered === prop) return;
  if (hovered) setPropOutline(hovered, false);
  hovered = prop;
  if (hovered) setPropOutline(hovered, true);
  canvas.style.cursor = hovered ? 'pointer' : '';
}

function refreshHover() {
  // A move keeps its own station lit, whatever the cursor is over.
  if (placement.isActive()) { setHovered(placement.prop); return; }
  if (!pointerAt || menu.isOpen() || panels.isOpen() || crafting.isOpen()) {
    setHovered(null);
    return;
  }

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((pointerAt.x - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((pointerAt.y - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObject(propsGroup, true)[0];
  const prop = hit && props.find((p) => p.id === hit.object.userData.propId);
  if (!prop || prop.gone || !PROP_KINDS[prop.kind]?.placed) { setHovered(null); return; }

  // Something hit first is something in the way - a brow of the isle between
  // the cursor and the station, most likely.
  const ground = raycaster.intersectObject(island, true)[0];
  setHovered(ground && ground.distance < hit.distance ? null : prop);
}

canvas.addEventListener('pointermove', (event) => {
  pointerAt = { x: event.clientX, y: event.clientY };
  refreshHover();
});

canvas.addEventListener('pointerleave', () => {
  pointerAt = null;
  refreshHover();
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
  panel.hidden = !person.selected;
  if (panel.hidden) return;

  panel.querySelector('.name').textContent = person.name;

  const activity = person.activity;
  activityName.textContent = activity ? activity.action : 'Idle';
  activityTime.textContent = activity ? `${activity.remaining.toFixed(1)}s` : '';
  activityFill.style.width = `${(activity?.progress ?? 0) * 100}%`;

  for (const meter of meters) {
    const value = person.stats[meter.stat];
    meter.fill.style.width = `${value}%`;
    meter.fill.style.background = meterColour(value);
    meter.value.textContent = Math.round(value);
  }

  for (const trait of traits) {
    trait.textContent = person.stats[trait.dataset.trait] ?? 'None';
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

  person.update(delta, props, finishProp);
  updateGrowth(delta);
  updateTarget();
  markers.update(delta);
  placement.update(delta);
  controls.update(delta);
  updateLabel();
  updateBenchLabel();
  updatePanel();
  panels.update();
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
window.ESTER = { scene, camera, renderer, controls, island, person, agents, props, propsGroup, workbench, blocked, surface, markers, menu, panels, crafting, placement, inventory, progression, settings, raycaster, THREE, plant: beginPlanting, updateGrowth, finishProp };
window.ESTER.debug = createDebug({ renderer, scene, island, props });
Object.defineProperty(window.ESTER, 'targeted', { get: () => targeted });
