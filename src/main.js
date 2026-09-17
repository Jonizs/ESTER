import * as THREE from 'three';
import { createIsland, ISLAND_RADIUS } from './island.js';
import { createSpace } from './space.js';
import { OrbitCamera } from './orbitCamera.js';

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

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

const space = createSpace(scene);

const island = createIsland();
scene.add(island);

const controls = new OrbitCamera(camera, canvas, {
  target: new THREE.Vector3(0, 1, 0),
  distance: ISLAND_RADIUS * 2.8,
  minDistance: ISLAND_RADIUS * 1.25,
  maxDistance: ISLAND_RADIUS * 14
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function frame() {
  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.elapsedTime;

  // The isle drifts gently, as if untethered.
  island.position.y = Math.sin(elapsed * 0.35) * 0.45;
  island.rotation.y = Math.sin(elapsed * 0.11) * 0.02;

  space.update(elapsed, delta);
  controls.update(delta);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();

const loading = document.getElementById('loading');
loading.classList.add('hidden');
setTimeout(() => loading.remove(), 800);

console.log(`[ESTER] island built from ${island.userData.blockCount} visible blocks`);
