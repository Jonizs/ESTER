import * as THREE from 'three';
import { createIsland, ISLAND_RADIUS } from './island.js';
import { createSpace } from './space.js';
import { OrbitCamera } from './orbitCamera.js';
import { Game } from './game/game.js';
import { Input } from './game/input.js';
import { UI } from './game/ui.js';

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

const space = createSpace(scene);

const island = createIsland();
scene.add(island);

const controls = new OrbitCamera(camera, canvas, {
  target: new THREE.Vector3(0, 1, 0),
  distance: ISLAND_RADIUS * 2.2,
  minDistance: ISLAND_RADIUS * 0.6,
  maxDistance: ISLAND_RADIUS * 14,
  autoSpin: false,
  pitch: 0.62
});

// --- colony ---------------------------------------------------------------

const game = new Game(scene, island);
if (!(Game.hasSave() && game.load())) game.startNewColony();

const input = new Input({ game, camera, controls, renderer, scene });
const ui = new UI(game, input);

window.addEventListener('beforeunload', () => game.save());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- loop -----------------------------------------------------------------

const clock = new THREE.Clock();
let uiTick = 0;

function frame() {
  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.elapsedTime;

  game.update(delta);
  input.update();

  space.update(elapsed, delta);
  space.setDayPhase(game.timeOfDay);
  controls.update(delta);

  // The HUD does not need to redraw every frame; four times a second is
  // enough for meters and clocks, and keeps the DOM work off the hot path.
  uiTick += delta;
  if (uiTick > 0.25) { uiTick = 0; ui.render(); }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();

const loading = document.getElementById('loading');
loading.classList.add('hidden');
setTimeout(() => loading.remove(), 800);

console.log(`[ESTER] island: ${island.userData.blockCount} blocks, ${game.world.nodes.size} resource nodes`);

// Handle for the devtools console (F12) and for automated testing.
window.ESTER = {
  scene, camera, renderer, controls, island, game, input, ui,
  debug: {
    give(res, n = 100) { game.addResource(res, n); },
    giveAll(n = 200) { for (const r of ['wood', 'stone', 'food', 'metal']) game.addResource(r, n); },
    skipDays(n = 1) { game.state.elapsed += n * 3600; game.emit(); },
    raid(n = 3) { game._spawnRaiders(n); },
    finishBuilds() { for (const b of game.buildings) if (!b.built) b.finish(); game.emit(); },
    completeResearch(id) { game.state.research.current = id; game.state.research.progress = 1e9; game._completeResearch(); },
    run(seconds, step = 0.1) { for (let t = 0; t < seconds; t += step) game.update(step); game.emit(); }
  }
};
