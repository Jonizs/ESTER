import * as THREE from 'three';
import { rand } from './noise.js';

/**
 * The few things standing on the island: a handful of trees and rocks.
 * Placement is seeded, so the isle looks the same every launch.
 */

const SEED = 20260918;

// Island blocks are unit cubes centred on their cell, so their top face - the
// ground everything stands on - is half a block above the cell's y.
export const GROUND_OFFSET = 0.5;

export const PROP_KINDS = {
  tree: { label: 'tree', action: 'Cutting down a tree', seconds: 6, yield: { item: 'wood', amount: 3 } },
  rock: { label: 'rock', action: 'Picking up a rock',   seconds: 7, yield: { item: 'stone', amount: 2 } },
  // The workbench is not harvested - it is repaired once, and then it is a
  // door into the crafting screen rather than a job.
  workbench: {
    label: 'workbench',
    action: 'Repairing the workbench',
    seconds: 8,
    cost: { item: 'wood', amount: 10 },
    // The only prop with a hitbox: it is walked around, not over.
    solid: true
  }
};

const COUNTS = { tree: 9, rock: 6 };

/** Where the broken workbench stands: the middle of the isle. */
export const WORKBENCH_CELL = { x: 0, z: 0 };

// The tint a prop takes on once the agent has been set on it, until it
// arrives. Every prop builds its own materials, so this is safe to mutate.
const HIGHLIGHT = 0xffc83d;

/** Light a prop up yellow, or put it back the way it was. */
export function setPropHighlight(prop, on) {
  prop.mesh.traverse((object) => {
    const material = object.material;
    if (!material?.isMeshStandardMaterial) return;
    if (on) {
      material.userData.baseEmissive ??= material.emissive.getHex();
      material.emissive.setHex(HIGHLIGHT);
      material.emissiveIntensity = 0.75;
    } else {
      material.emissive.setHex(material.userData.baseEmissive ?? 0x000000);
      material.emissiveIntensity = 1;
    }
  });
}

export function createProps(surface, scene) {
  const group = new THREE.Group();
  group.name = 'props';
  scene.add(group);

  const props = [];
  const taken = new Set();

  // The cells nothing may walk onto, for `path.js`. Only solid props are in
  // it, so trees and rocks stay walkable and cannot pen the agent in.
  const blocked = new Set();

  // Cells far enough from the middle to leave the person somewhere to stand.
  const cells = [...surface.keys()]
    .map((key) => key.split(',').map(Number))
    .filter(([x, z]) => Math.hypot(x, z) > 2.5);

  // The workbench goes down first, in the middle, so the scatter below can
  // never land on top of it - the trees and rocks already keep clear of the
  // centre, but the bench is what the run starts at and must be reachable.
  const bench = addWorkbench(surface, group, props, blocked);

  let salt = 0;
  for (const [kind, count] of Object.entries(COUNTS)) {
    for (let i = 0; i < count; i++) {
      let cell = null;
      // Walk the seeded sequence until an unused cell turns up.
      for (let attempt = 0; attempt < 60 && !cell; attempt++) {
        const pick = cells[Math.floor(rand(++salt * 7919, SEED) * cells.length)];
        if (!pick) continue;
        const key = `${pick[0]},${pick[1]}`;
        if (taken.has(key)) continue;
        // Keep props apart so the isle reads as sparse, not as a thicket -
        // and keep a wider clearing around the workbench, so the thing the
        // run starts at is not hidden behind a tree from half the angles.
        const tooClose = props.some((p) => {
          const gap = p.kind === 'workbench' ? 3.6 : 2.2;
          return Math.hypot(p.x - pick[0], p.z - pick[1]) < gap;
        });
        if (tooClose) continue;
        taken.add(key);
        cell = pick;
      }
      if (!cell) continue;

      const [x, z] = cell;
      const mesh = buildProp(kind, salt);
      mesh.position.set(x, surface.get(`${x},${z}`) + GROUND_OFFSET, z);
      group.add(mesh);

      const prop = { id: `${kind}${i}`, kind, x, z, mesh, gone: false };
      mesh.userData.propId = prop.id;
      mesh.traverse((o) => { o.userData.propId = prop.id; });
      props.push(prop);
    }
  }

  return { group, props, workbench: bench, blocked };
}

/**
 * The broken workbench in the middle of the isle. It is an ordinary prop as
 * far as clicking and pathing go, so `props` carries it; what is different is
 * that finishing the work repairs it instead of removing it, and once it is
 * repaired clicking it opens the crafting screen.
 */
function addWorkbench(surface, group, props, blocked) {
  // The middle cell if the isle has one, otherwise the nearest that exists.
  let cell = null;
  let best = Infinity;
  for (const key of surface.keys()) {
    const [x, z] = key.split(',').map(Number);
    const d = Math.hypot(x - WORKBENCH_CELL.x, z - WORKBENCH_CELL.z);
    if (d < best) { best = d; cell = { x, z }; }
  }
  if (!cell) return null;

  const mesh = new THREE.Group();
  mesh.position.set(cell.x, surface.get(`${cell.x},${cell.z}`) + GROUND_OFFSET, cell.z);
  group.add(mesh);

  const prop = {
    id: 'workbench',
    kind: 'workbench',
    x: cell.x,
    z: cell.z,
    mesh,
    gone: false,
    repaired: false
  };

  setWorkbenchState(prop, false);
  props.push(prop);
  if (PROP_KINDS[prop.kind].solid) blocked.add(`${prop.x},${prop.z}`);
  return prop;
}

/** Swap the bench between its broken and its repaired build. */
export function setWorkbenchState(prop, repaired) {
  prop.repaired = repaired;
  const mesh = prop.mesh;
  for (const child of [...mesh.children]) mesh.remove(child);
  buildWorkbench(mesh, repaired);
  // Everything under it answers to the same prop id, so a click anywhere on
  // the bench finds it.
  mesh.userData.propId = prop.id;
  mesh.traverse((o) => { o.userData.propId = prop.id; });
}

function buildWorkbench(g, repaired) {
  const wood = repaired ? 0x8a5f37 : 0x4f3d2c;
  const trim = repaired ? 0x9c6c3f : 0x584431;

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.16, 0.95),
    mat(wood, repaired ? { emissive: 0x1a0d04, emissiveIntensity: 1 } : {})
  );
  top.position.y = 0.86;
  // A broken bench is a bench that has given way on one side.
  if (!repaired) { top.rotation.z = -0.17; top.position.y = 0.72; top.position.x = -0.06; }
  top.castShadow = true;
  g.add(top);

  // Four legs when it is whole; the front-left one is snapped off when it
  // is not, which is what makes the top tilt.
  const legs = repaired
    ? [[-0.6, -0.34], [0.6, -0.34], [-0.6, 0.34], [0.6, 0.34]]
    : [[0.6, -0.34], [0.6, 0.34], [-0.6, 0.34]];
  for (const [x, z] of legs) {
    const h = repaired ? 0.78 : 0.7;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, 0.15), mat(trim));
    leg.position.set(x, h / 2, z);
    leg.castShadow = true;
    g.add(leg);
  }

  if (repaired) {
    // A vice and a lamp, so a working bench reads as one at a glance.
    const vice = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), mat(0x8a8f9c, { metalness: 0.3 }));
    vice.position.set(0.5, 1.05, 0);
    vice.castShadow = true;
    g.add(vice);

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.26, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0x7ad7ff,
        emissive: 0x2f9bd6,
        emissiveIntensity: 1.6,
        roughness: 0.4
      })
    );
    lamp.position.set(-0.45, 1.08, 0);
    g.add(lamp);
  } else {
    // The snapped leg and a plank, lying where they fell.
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.15), mat(trim));
    shard.position.set(-0.62, 0.08, -0.52);
    shard.rotation.z = Math.PI / 2;
    shard.castShadow = true;
    g.add(shard);

    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.28), mat(wood));
    plank.position.set(0.15, 0.06, 0.66);
    plank.rotation.y = 0.5;
    plank.castShadow = true;
    g.add(plank);
  }
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
}

function buildProp(kind, salt) {
  const g = new THREE.Group();

  if (kind === 'tree') {
    // A short trunk under a broad two-tier crown, rather than a bare pole
    // with a tuft on top.
    const h = 1.5 + rand(salt, 5) * 0.6;
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, 0.42), mat(0x6b4a2f));
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 1.9), mat(0x2b7149));
    skirt.position.y = h + 0.3;
    skirt.castShadow = true;
    g.add(skirt);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.8, 1.45), mat(0x357f52));
    crown.position.y = h + 1.0;
    crown.castShadow = true;
    g.add(crown);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.85), mat(0x3f9560));
    top.position.y = h + 1.65;
    top.castShadow = true;
    g.add(top);
  } else {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.75, 1), mat(0x8a8f9c, { metalness: 0.08 }));
    base.position.y = 0.37;
    base.castShadow = true;
    g.add(base);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), mat(0x9aa0ad));
    cap.position.set(0.22, 0.85, -0.12);
    cap.castShadow = true;
    g.add(cap);
  }

  return g;
}
