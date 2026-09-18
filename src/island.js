import * as THREE from 'three';
import { fbm2, noise2, rand } from './noise.js';

const BLOCK = 1;
const RADIUS = 15;
const SEED = 20260917;

// Palette for the isle: turf over soil over stone, bedrock at the keel tip.
const LAYERS = {
  grass: { color: 0x4fae78, roughness: 0.88, metalness: 0.0 },
  moss: { color: 0x3a8a5e, roughness: 0.9, metalness: 0.0 },
  dirt: { color: 0x6d503c, roughness: 0.95, metalness: 0.0 },
  stone: { color: 0x8b8d92, roughness: 0.82, metalness: 0.03 },
  bedrock: { color: 0x5a6173, roughness: 0.8, metalness: 0.06, emissive: 0x16283c, emissiveIntensity: 0.12 }
};

const key = (x, y, z) => `${x},${y},${z}`;

/**
 * Builds the voxel island: a noisy disc of terrain with a tapering rocky
 * underside, rendered as one InstancedMesh per material layer.
 *
 * Returns a THREE.Group centred on the origin.
 */
export function createIsland() {
  const group = new THREE.Group();
  group.name = 'island';

  const cells = [];
  const filled = new Set();
  // "x,z" -> y of the topmost block: the ground anything on the isle stands on.
  const surface = new Map();

  // --- Pass 1: height of each column --------------------------------------
  const columns = new Map();
  for (let x = -RADIUS; x <= RADIUS; x++) {
    for (let z = -RADIUS; z <= RADIUS; z++) {
      const dist = Math.hypot(x, z);

      // Wobbly coastline instead of a perfect circle.
      const edge = RADIUS * (0.72 + 0.34 * fbm2(x * 0.11, z * 0.11, 3, SEED));
      if (dist > edge) continue;

      const inland = 1 - dist / edge;

      // Surface relief: rolling hills plus a couple of sharper ridges.
      // Broad shape from one low-frequency octave (fbm alone averages toward
      // the middle and flattens the whole island), plus hills and a ridge.
      const base = noise2(x * 0.085, z * 0.085, SEED + 5);
      const hills = fbm2(x * 0.17, z * 0.17, 3, SEED + 7);
      const ridge = Math.pow(noise2(x * 0.05, z * 0.05, SEED + 11), 2.4);
      const top = Math.round(base * 4.5 + (hills - 0.5) * 3 + ridge * 2.5 - 1);

      // Underside: an iceberg keel tapering to a point under the centre,
      // kept shorter than the island is wide so it does not dominate.
      const bulk = Math.pow(inland, 1.4);
      const jitter = fbm2(x * 0.19, z * 0.19, 2, SEED + 23);
      const bottom = -Math.round(1 + bulk * 11 + jitter * 2);

      columns.set(`${x},${z}`, { x, z, top, bottom });
    }
  }

  // --- Pass 1b: flatten out single-cell pits and spikes --------------------
  // Rounding the noise leaves isolated one-block dents. Their side walls face
  // away from the sun and read as hard dark blotches on otherwise open ground,
  // so a median pass over each column's neighbourhood smooths them away while
  // leaving the broad hills and ridges intact.
  for (let pass = 0; pass < 2; pass++) {
    const smoothed = new Map();
    for (const [cellKey, column] of columns) {
      const heights = [column.top];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighbour = columns.get(`${column.x + dx},${column.z + dz}`);
        if (neighbour) heights.push(neighbour.top);
      }
      heights.sort((a, b) => a - b);
      smoothed.set(cellKey, heights[Math.floor(heights.length / 2)]);
    }
    for (const [cellKey, top] of smoothed) columns.get(cellKey).top = top;
  }

  // --- Pass 1c: stack the blocks ------------------------------------------
  let deepest = 0;
  for (const column of columns.values()) if (column.bottom < deepest) deepest = column.bottom;

  for (const { x, z, top, bottom } of columns.values()) {
    surface.set(`${x},${z}`, top);

    for (let y = bottom; y <= top; y++) {
      filled.add(key(x, y, z));
      cells.push({ x, y, z, top });
    }
  }

  // --- Pass 2: keep only cells with at least one exposed face ------------
  const buckets = { grass: [], moss: [], dirt: [], stone: [], bedrock: [] };

  for (const cell of cells) {
    const { x, y, z, top } = cell;

    const buried =
      filled.has(key(x + 1, y, z)) &&
      filled.has(key(x - 1, y, z)) &&
      filled.has(key(x, y + 1, z)) &&
      filled.has(key(x, y - 1, z)) &&
      filled.has(key(x, y, z + 1)) &&
      filled.has(key(x, y, z - 1));
    if (buried) continue;

    const fromTop = top - y;

    let layer;
    if (fromTop === 0) {
      // Bare patches of earth and stone worn through the turf.
      const wear = fbm2(x * 0.46, z * 0.46, 2, SEED + 41);
      if (wear > 0.70) layer = 'dirt';
      else if (wear < 0.28) layer = 'stone';
      else layer = 'grass';
    } else if (fromTop === 1) {
      layer = 'moss';
    } else if (fromTop <= 3) {
      layer = 'dirt';
    } else if (y <= deepest + 2) {
      // Only the last few blocks of the whole isle, at the tip of the keel.
      layer = 'bedrock';
    } else {
      layer = 'stone';
    }

    buckets[layer].push(cell);
  }

  // --- Pass 3: one InstancedMesh per layer -------------------------------
  const geometry = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();

  for (const [name, list] of Object.entries(buckets)) {
    if (list.length === 0) continue;

    const spec = LAYERS[name];
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: spec.roughness,
      metalness: spec.metalness,
      emissive: spec.emissive ?? 0x000000,
      emissiveIntensity: spec.emissiveIntensity ?? 0
    });

    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.name = `island-${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    list.forEach((cell, i) => {
      matrix.makeTranslation(cell.x * BLOCK, cell.y * BLOCK, cell.z * BLOCK);
      mesh.setMatrixAt(i, matrix);

      // Per-block shade variation so flat faces do not read as one slab.
      const shade = 0.86 + 0.28 * rand(Math.imul(cell.x, 73856093) ^ Math.imul(cell.y, 19349663) ^ Math.imul(cell.z, 83492791), SEED);
      tint.setHex(spec.color).multiplyScalar(shade);
      mesh.setColorAt(i, tint);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }

  group.userData.blockCount = Object.values(buckets).reduce((n, l) => n + l.length, 0);
  group.userData.surface = surface;
  return group;
}

export const ISLAND_RADIUS = RADIUS;
