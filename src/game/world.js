import * as THREE from 'three';
import { fbm2, rand } from '../noise.js';

/**
 * The playable layer on top of the voxel island: which cells can be walked,
 * and the harvestable resource nodes scattered over them.
 */

export const NODE_TYPES = {
  tree:  { label: 'Tree',   yields: 'wood',  amount: 20, work: 120, color: 0x6b4a2f, regrow: 5200 },
  rock:  { label: 'Rock',   yields: 'stone', amount: 30, work: 165, color: 0x8a8f9c },
  bush:  { label: 'Berries',yields: 'food',  amount: 12, work: 70,  color: 0x4f8f4a, regrow: 1400 },
  ore:   { label: 'Ore',    yields: 'metal', amount: 14, work: 200, color: 0x5d6b82 }
};

const SEED = 20260917;

export class World {
  constructor(islandGroup, scene) {
    this.island = islandGroup;
    this.scene = scene;
    this.surface = islandGroup.userData.surface;
    this.nodes = new Map();
    this.nodeGroup = new THREE.Group();
    this.nodeGroup.name = 'nodes';
    scene.add(this.nodeGroup);

    this._nextId = 1;
    this._cells = [...this.surface.keys()];
  }

  key(x, z) { return `${x},${z}`; }

  height(x, z) {
    const h = this.surface.get(this.key(x, z));
    return h === undefined ? null : h;
  }

  /** Ground level a pawn stands on at this cell, or null off-island. */
  standY(x, z) {
    const h = this.height(x, z);
    return h === null ? null : h + 1;
  }

  isWalkable(x, z) {
    if (this.height(x, z) === null) return false;
    return !this.blockedBy(x, z);
  }

  /** Nodes and solid buildings block movement; set by the game each build. */
  blockedBy(x, z) {
    return this._blocked?.has(this.key(x, z)) ?? false;
  }

  setBlocked(cells) {
    this._blocked = new Set(cells);
  }

  /**
   * Cells reachable in one step: adjacent, on-island, and not a big climb.
   * With `ignoreBlocked` the walls are treated as passable, which is how
   * raiders find a route they then smash through.
   */
  neighbours(x, z, ignoreBlocked = false) {
    const out = [];
    const from = this.height(x, z);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      const h = this.height(nx, nz);
      if (h === null) continue;
      if (Math.abs(h - from) > 1) continue;
      if (!ignoreBlocked && this.blockedBy(nx, nz)) continue;
      out.push([nx, nz]);
    }
    return out;
  }

  worldPos(x, z, yOffset = 0) {
    return new THREE.Vector3(x, (this.standY(x, z) ?? 0) + yOffset, z);
  }

  /** A roughly central, open cell for the drop pod. */
  landingSite() {
    let best = null;
    for (const cellKey of this._cells) {
      const [x, z] = cellKey.split(',').map(Number);
      const flat = this.neighbours(x, z).length;
      const score = flat * 10 - Math.hypot(x, z);
      if (!best || score > best.score) best = { x, z, score };
    }
    return best ? { x: best.x, z: best.z } : { x: 0, z: 0 };
  }

  /** Deterministic scatter of trees, rocks, bushes and ore. */
  populate() {
    let i = 0;
    for (const cellKey of this._cells) {
      const [x, z] = cellKey.split(',').map(Number);
      i++;

      // Keep the landing area clear.
      if (Math.hypot(x, z) < 3.5) continue;

      const forest = fbm2(x * 0.14, z * 0.14, 3, SEED + 71);
      const roll = rand(i * 7919, SEED + 13);

      let type = null;
      if (forest > 0.58 && roll < 0.40) type = 'tree';
      else if (forest < 0.5 && roll < 0.19) type = 'rock';
      else if (roll > 0.94) type = 'bush';
      else if (forest < 0.34 && roll > 0.86 && roll < 0.92) type = 'ore';

      if (type) this.addNode(type, x, z);
    }
    return this.nodes.size;
  }

  addNode(type, x, z) {
    const spec = NODE_TYPES[type];
    const id = `n${this._nextId++}`;
    const mesh = buildNodeMesh(type, this._nextId);
    const y = this.standY(x, z) ?? 0;
    mesh.position.set(x, y, z);
    this.nodeGroup.add(mesh);

    const node = { id, type, x, z, amount: spec.amount, mesh, depleted: false, regrowAt: 0 };
    mesh.userData.nodeId = id;
    this.nodes.set(id, node);
    return node;
  }

  nodeAt(x, z) {
    for (const node of this.nodes.values()) {
      if (node.x === x && node.z === z && !node.depleted) return node;
    }
    return null;
  }

  depleteNode(node) {
    const spec = NODE_TYPES[node.type];
    if (spec.regrow) {
      node.depleted = true;
      node.mesh.visible = false;
      node.regrowAt = spec.regrow;
    } else {
      node.depleted = true;
      this.nodeGroup.remove(node.mesh);
      disposeTree(node.mesh);
      this.nodes.delete(node.id);
    }
  }

  /** Berry bushes come back after a while. */
  update(gameDelta) {
    for (const node of this.nodes.values()) {
      if (!node.depleted || !node.regrowAt) continue;
      node.regrowAt -= gameDelta;
      if (node.regrowAt <= 0) {
        node.depleted = false;
        node.amount = NODE_TYPES[node.type].amount;
        node.mesh.visible = true;
        node.regrowAt = 0;
      }
    }
  }

  /**
   * Cells with something standing on them. Used for placement checks only -
   * trees deliberately do NOT block movement, because a dense forest would
   * otherwise fence pawns into pockets they can never leave.
   */
  occupiedCells() {
    const cells = [];
    for (const node of this.nodes.values()) {
      if (!node.depleted && node.type !== 'bush') cells.push(this.key(node.x, node.z));
    }
    return cells;
  }
}

// --- meshes ----------------------------------------------------------------

const boxCache = new Map();
function box(w, h, d) {
  const k = `${w},${h},${d}`;
  if (!boxCache.has(k)) boxCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxCache.get(k);
}

const matCache = new Map();
function mat(color, opts = {}) {
  const k = `${color}-${JSON.stringify(opts)}`;
  if (!matCache.has(k)) {
    matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));
  }
  return matCache.get(k);
}

function buildNodeMesh(type, salt) {
  const group = new THREE.Group();

  if (type === 'tree') {
    const h = 2.4 + Math.round(rand(salt * 31, 5) * 2);
    const trunk = new THREE.Mesh(box(0.34, h, 0.34), mat(0x6b4a2f));
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const leaf = new THREE.Mesh(box(1.15, 1.1, 1.15), mat(0x2f7d4f));
    leaf.position.y = h + 0.35;
    leaf.castShadow = true;
    group.add(leaf);

    const leaf2 = new THREE.Mesh(box(0.75, 0.7, 0.75), mat(0x3b9560));
    leaf2.position.y = h + 1.05;
    leaf2.castShadow = true;
    group.add(leaf2);
  } else if (type === 'rock') {
    const r = new THREE.Mesh(box(0.9, 0.7, 0.9), mat(0x8a8f9c, { metalness: 0.08 }));
    r.position.y = 0.35;
    r.castShadow = true;
    group.add(r);
    const r2 = new THREE.Mesh(box(0.5, 0.45, 0.5), mat(0x9aa0ad));
    r2.position.set(0.25, 0.75, -0.15);
    group.add(r2);
  } else if (type === 'bush') {
    const b = new THREE.Mesh(box(0.7, 0.5, 0.7), mat(0x4f8f4a));
    b.position.y = 0.26;
    group.add(b);
    for (let i = 0; i < 3; i++) {
      const berry = new THREE.Mesh(box(0.14, 0.14, 0.14), mat(0xd6455a, { emissive: 0x5c1420 }));
      berry.position.set((rand(salt + i, 2) - 0.5) * 0.5, 0.45, (rand(salt + i, 9) - 0.5) * 0.5);
      group.add(berry);
    }
  } else if (type === 'ore') {
    const o = new THREE.Mesh(box(0.8, 0.6, 0.8), mat(0x5d6b82, { metalness: 0.4, roughness: 0.4 }));
    o.position.y = 0.3;
    o.castShadow = true;
    group.add(o);
    const glint = new THREE.Mesh(box(0.3, 0.2, 0.3), mat(0x9fd0e8, { emissive: 0x2d6f96, emissiveIntensity: 0.8 }));
    glint.position.y = 0.66;
    group.add(glint);
  }

  group.traverse((o) => { o.userData.pickable = true; });
  return group;
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !boxCache.has('keep')) { /* geometries are shared via cache */ }
  });
}
