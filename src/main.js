import * as THREE from 'three';
import { createIsland, ISLAND_RADIUS } from './island.js';
import { createSpace } from './space.js';
import { OrbitCamera } from './orbitCamera.js';
import { createProps, setPropHighlight, setWorkbenchState, GROUND_OFFSET, PROP_KINDS } from './props.js';
import { Person } from './person.js';
import { createMarkers } from './markers.js';
import { createSettings, keyLabel } from './settings.js';
import { createMenu } from './menu.js';
import { createPanels } from './panels.js';
import { createCrafting } from './crafting.js';
import { createInventory } from './inventory.js';
import { createProgression } from './progression.js';
import { createDebug } from './debug.js';

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
const { props, workbench, blocked } = createProps(surface, scene);

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
    if (props?.some((p) => p.x === x && p.z === z)) continue;
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

function finishProp(prop) {
  if (targeted === prop) setTarget(null);

  // The bench is repaired rather than carried off: it stays standing, gets
  // its missing leg back, and from then on it is the way into crafting.
  if (prop.kind === 'workbench') {
    const cost = PROP_KINDS.workbench.cost;
    inventory.take(cost.item, cost.amount);
    setWorkbenchState(prop, true);
    prop.mesh.traverse((o) => {
      if (o.material && o.castShadow) o.material.shadowSide = THREE.FrontSide;
    });
    toast('The workbench is whole again. Click it to craft.');
    return;
  }

  const gathered = PROP_KINDS[prop.kind].yield;
  if (gathered) inventory.add(gathered.item, gathered.amount);
  prop.gone = true;
  prop.mesh.visible = false;
}

/**
 * A click on the workbench. Repaired, it opens crafting; broken, it is a job
 * like any other - but only once there is the wood to pay for it, and the
 * wood is only spent when the work is finished.
 */
function useWorkbench(prop) {
  if (prop.repaired) { crafting.open(); return; }
  if (person.task?.prop === prop) return;   // already on its way

  const cost = PROP_KINDS.workbench.cost;
  const held = inventory.count(cost.item);
  if (held < cost.amount) {
    toast(`The workbench needs ${cost.amount} wood to repair - ${held} gathered.`);
    return;
  }
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
scene.traverse((object) => {
  if (object.material && object.castShadow) object.material.shadowSide = THREE.FrontSide;
});

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
  blocked: () => menu.isOpen() || crafting.isOpen(),
  onSelect: (agent) => agent.setSelected(true)
});

// Crafting is a screen of its own, reached by clicking the repaired bench
// rather than by a key. Built before the menu for the same reason the panels
// are: its Esc handler has to run first.
const crafting = createCrafting({
  inventory,
  blocked: () => menu.isOpen(),
  onOpen: () => panels.close()
});

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
  setTarget(null);

  for (const prop of props) {
    setPropHighlight(prop, false);
    if (prop.kind === 'workbench') {
      setWorkbenchState(prop, false);
      prop.mesh.traverse((o) => {
        if (o.material && o.castShadow) o.material.shadowSide = THREE.FrontSide;
      });
      continue;
    }
    prop.gone = false;
    prop.mesh.visible = true;
  }

  person.reset();
  inventory.reset();
  progression.reset();

  controls.reset();
  panels.close();
  crafting.close();
  menu.close();
  toast('Reset. The isle is as it was at boot.');
}

// The corner hints name whatever the keys are bound to now, so rebinding
// something does not leave the help lying about it.
function showBindingsInHelp() {
  for (const slot of document.querySelectorAll('#help [data-help]')) {
    slot.textContent = keyLabel(settings.bindings[slot.dataset.help]);
  }
}

showBindingsInHelp();

// The menu owns the keyboard while it is open.
controls.keyboardBlocked = () => menu.isOpen();

function leaveGame() {
  // The desktop build can actually quit; in a browser tab all that can be
  // done is close the window, which only works if the page opened it.
  if (window.ester?.quit) { window.ester.quit(); return; }
  window.close();
  // Still here, so the browser refused: say so rather than do nothing.
  document.getElementById('menu').querySelector('#menu-leave').textContent = 'CLOSE THIS TAB TO LEAVE';
}

// --- passing notices ------------------------------------------------------

const toastEl = document.getElementById('toast');
let toastTimer = null;

/** A short line at the top of the screen, for things a click could not do. */
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 3200);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let press = null;

canvas.addEventListener('pointerdown', (e) => {
  if (menu.isOpen() || crafting.isOpen()) return;
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
  if (started.button === 2) { person.setSelected(false); return; }
  if (started.button === 0) handleClick(e);
});

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  for (const hit of raycaster.intersectObject(scene, true)) {
    let object = hit.object;
    while (object) {
      // The agent itself: select it and show its stats.
      if (object.userData.isPerson) { person.setSelected(true); return; }

      if (object.userData.propId) {
        const prop = props.find((p) => p.id === object.userData.propId);
        if (prop && prop.kind === 'workbench') { useWorkbench(prop); return; }
        if (prop && !prop.gone) {
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
      if (person.walkTo({ x, z })) {
        setTarget(null);
        markers.ping(x, surface.get(`${x},${z}`) + GROUND_OFFSET, z);
      }
      return;
    }
  }

  // Clicked the void: nothing is selected any more.
  person.setSelected(false);
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
  updateTarget();
  markers.update(delta);
  controls.update(delta);
  updateLabel();
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
window.ESTER = { scene, camera, renderer, controls, island, person, agents, props, workbench, surface, markers, menu, panels, crafting, inventory, progression, settings, raycaster, THREE };
window.ESTER.debug = createDebug({ renderer, scene, island, props });
Object.defineProperty(window.ESTER, 'targeted', { get: () => targeted });
