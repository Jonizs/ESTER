import * as THREE from 'three';
import { rand } from './noise.js';

/**
 * The few things standing on the island: a handful of trees, rocks and
 * flowers. Placement is seeded, so the isle looks the same every launch.
 */

const SEED = 20260918;

export const PROP_KINDS = {
  tree:   { label: 'tree',   action: 'Chopping wood',    seconds: 6 },
  rock:   { label: 'rock',   action: 'Breaking stone',   seconds: 7 },
  flower: { label: 'flower', action: 'Picking a flower', seconds: 4 }
};

const COUNTS = { tree: 9, rock: 6, flower: 11 };

export function createProps(surface, scene) {
  const group = new THREE.Group();
  group.name = 'props';
  scene.add(group);

  const props = [];
  const taken = new Set();

  // Cells far enough from the middle to leave the person somewhere to stand.
  const cells = [...surface.keys()]
    .map((key) => key.split(',').map(Number))
    .filter(([x, z]) => Math.hypot(x, z) > 2.5);

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
        // Keep props apart so the isle reads as sparse, not as a thicket.
        const tooClose = props.some((p) => Math.hypot(p.x - pick[0], p.z - pick[1]) < 2.2);
        if (tooClose) continue;
        taken.add(key);
        cell = pick;
      }
      if (!cell) continue;

      const [x, z] = cell;
      const mesh = buildProp(kind, salt);
      mesh.position.set(x, surface.get(`${x},${z}`) + 1, z);
      group.add(mesh);

      const prop = { id: `${kind}${i}`, kind, x, z, mesh, gone: false };
      mesh.userData.propId = prop.id;
      mesh.traverse((o) => { o.userData.propId = prop.id; });
      props.push(prop);
    }
  }

  return { group, props };
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
  } else if (kind === 'rock') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.75, 1), mat(0x8a8f9c, { metalness: 0.08 }));
    base.position.y = 0.37;
    base.castShadow = true;
    g.add(base);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), mat(0x9aa0ad));
    cap.position.set(0.22, 0.85, -0.12);
    cap.castShadow = true;
    g.add(cap);
  } else {
    // Flower: a short stem with a coloured head.
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), mat(0x4f8f4a));
    stem.position.y = 0.21;
    g.add(stem);

    const palette = [0xe86a8c, 0xf0c04a, 0xa87fe8, 0xf07a4a, 0xe8e2d0];
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.16, 0.3),
      mat(palette[Math.floor(rand(salt * 13, 3) * palette.length)], { emissive: 0x120a10 })
    );
    head.position.y = 0.5;
    g.add(head);

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.1), mat(0x57a052));
    leaf.position.set(0.13, 0.24, 0);
    g.add(leaf);
  }

  return g;
}
