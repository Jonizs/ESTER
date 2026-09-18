import * as THREE from 'three';
import { createIsland, ISLAND_RADIUS } from './island.js';
import { createSpace } from './space.js';
import { OrbitCamera } from './orbitCamera.js';
import { createProps, PROP_KINDS } from './props.js';
import { Person } from './person.js';

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
const { props } = createProps(surface, scene);

// --- the person ------------------------------------------------------------

const person = new Person(surface, startingCell());
scene.add(person.mesh);

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

function finishProp(prop) {
  prop.gone = true;
  prop.mesh.visible = false;
  person.action = `Collected a ${PROP_KINDS[prop.kind].label}`;
}

// --- controls --------------------------------------------------------------

const controls = new OrbitCamera(camera, canvas, {
  target: new THREE.Vector3(0, 1, 0),
  distance: ISLAND_RADIUS * 2.1,
  minDistance: ISLAND_RADIUS * 0.5,
  maxDistance: ISLAND_RADIUS * 14,
  autoSpin: false,
  pitch: 0.5
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let press = null;

canvas.addEventListener('pointerdown', (e) => {
  press = { x: e.clientX, y: e.clientY, t: performance.now() };
});

canvas.addEventListener('pointerup', (e) => {
  const started = press;
  press = null;
  if (!started) return;
  // Anything more than a nudge was the camera being dragged, not a click.
  if (Math.hypot(e.clientX - started.x, e.clientY - started.y) > 6) return;
  if (performance.now() - started.t > 500) return;
  handleClick(e);
});

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  for (const hit of raycaster.intersectObject(scene, true)) {
    let object = hit.object;
    while (object) {
      if (object.userData.propId) {
        const prop = props.find((p) => p.id === object.userData.propId);
        if (prop && !prop.gone) { person.workOn(prop); return; }
      }
      object = object.parent;
    }

    // Otherwise walk to whatever patch of island was clicked.
    const x = Math.round(hit.point.x);
    const z = Math.round(hit.point.z);
    if (surface.has(`${x},${z}`)) { person.walkTo({ x, z }); return; }
  }
}

// --- action label ----------------------------------------------------------

const label = document.getElementById('action');
const labelPos = new THREE.Vector3();

function updateLabel() {
  label.textContent = person.action;

  labelPos.copy(person.pos);
  labelPos.y += 2.1;
  labelPos.project(camera);

  // Hide it when the person is behind the camera or off screen.
  const onScreen = labelPos.z < 1 && Math.abs(labelPos.x) < 1.2 && Math.abs(labelPos.y) < 1.2;
  label.classList.toggle('visible', onScreen);
  if (!onScreen) return;

  label.style.left = `${(labelPos.x * 0.5 + 0.5) * window.innerWidth}px`;
  label.style.top = `${(-labelPos.y * 0.5 + 0.5) * window.innerHeight}px`;
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
  controls.update(delta);
  updateLabel();

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();

const loading = document.getElementById('loading');
loading.classList.add('hidden');
setTimeout(() => loading.remove(), 800);

console.log(`[ESTER] ${island.userData.blockCount} blocks, ${props.length} props`);

// Handle for the devtools console (F12) and for automated testing.
window.ESTER = { scene, camera, renderer, controls, island, person, props, surface, raycaster, THREE };
