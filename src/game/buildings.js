import * as THREE from 'three';
import { BUILDINGS } from './defs.js';

/**
 * Placed structures. A building starts as a blueprint that colonists work on;
 * once its work is done it becomes active and runs its own behaviour.
 */

let nextId = 1;

export class Building {
  constructor(type, x, z, { id, built = false, work = 0 } = {}) {
    this.id = id ?? `b${nextId++}`;
    this.type = type;
    this.spec = BUILDINGS[type];
    this.x = x;
    this.z = z;
    this.built = built;
    this.work = work;              // work units contributed so far
    this.hp = 100;
    this.timer = 0;                // per-building behaviour clock
    this.stock = 0;                // farm growth / smelter progress
    this.occupant = null;          // pawn id using it
    this.mesh = buildMesh(type);
    this.mesh.userData.buildingId = this.id;
    this.setGhost(!built);
  }

  get label() { return this.spec.label; }
  get workNeeded() { return this.spec.work; }
  get progress() { return Math.min(1, this.work / this.workNeeded); }

  setGhost(isGhost) {
    this.mesh.traverse((o) => {
      if (!o.material) return;
      o.material = o.material.clone();
      o.material.transparent = isGhost;
      o.material.opacity = isGhost ? 0.42 : 1;
      if (isGhost) o.material.depthWrite = false;
    });
  }

  place(world) {
    const y = world.standY(this.x, this.z) ?? 0;
    this.mesh.position.set(this.x, y, this.z);
  }

  finish() {
    this.built = true;
    this.work = this.workNeeded;
    this.setGhost(false);
  }

  toJSON() {
    return { id: this.id, type: this.type, x: this.x, z: this.z, built: this.built, work: this.work, hp: this.hp, stock: this.stock };
  }
}

// --- meshes ----------------------------------------------------------------

function m(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });
}

function buildMesh(type) {
  const g = new THREE.Group();

  switch (type) {
    case 'campfire': {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.8), m(0x6a6f7b));
      ring.position.y = 0.08;
      g.add(ring);
      const logs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), m(0x5a3f2b));
      logs.position.y = 0.24;
      g.add(logs);
      const flame = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.46, 0.32),
        m(0xffa43d, { emissive: 0xff7a18, emissiveIntensity: 1.4 })
      );
      flame.position.y = 0.55;
      flame.name = 'flame';
      g.add(flame);
      const light = new THREE.PointLight(0xffa04d, 2.4, 11, 2);
      light.position.y = 0.9;
      g.add(light);
      break;
    }
    case 'bedroll': {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 1.1), m(0x4a6f8f));
      pad.position.y = 0.07;
      g.add(pad);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.28), m(0xdfe6f0));
      pillow.position.set(0, 0.18, -0.36);
      g.add(pillow);
      break;
    }
    case 'farm': {
      const soil = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), m(0x5a4632));
      soil.position.y = 0.06;
      g.add(soil);
      for (let i = 0; i < 4; i++) {
        const sprout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), m(0x6fc06a));
        sprout.position.set(((i % 2) - 0.5) * 0.44, 0.25, (Math.floor(i / 2) - 0.5) * 0.44);
        sprout.name = 'crop';
        sprout.scale.y = 0.2;
        g.add(sprout);
      }
      break;
    }
    case 'workbench': {
      const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.16, 0.7), m(0x7b5a3c));
      top.position.y = 0.62;
      g.add(top);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), m(0x5d4630));
      legs.position.y = 0.3;
      g.add(legs);
      const tool = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.22), m(0xa8b2c4, { metalness: 0.5 }));
      tool.position.set(0.25, 0.75, 0);
      g.add(tool);
      break;
    }
    case 'lab': {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.7, 0.8), m(0x4f5b73));
      desk.position.y = 0.35;
      g.add(desk);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.45, 0.08),
        m(0x2b6ea8, { emissive: 0x2f86c6, emissiveIntensity: 1.1 })
      );
      screen.position.set(0, 0.92, -0.2);
      g.add(screen);
      break;
    }
    case 'wall': {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 1), m(0x7b8290));
      w.position.y = 0.75;
      w.castShadow = true;
      g.add(w);
      break;
    }
    case 'turret': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), m(0x5a6272, { metalness: 0.4 }));
      base.position.y = 0.2;
      g.add(base);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.55), m(0x8b94a6, { metalness: 0.5 }));
      head.position.y = 0.62;
      head.name = 'turretHead';
      g.add(head);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.85), m(0xc6cede, { metalness: 0.7, roughness: 0.3 }));
      barrel.position.set(0, 0.62, 0.5);
      barrel.name = 'barrel';
      head.add(barrel);
      break;
    }
    case 'quarry': {
      const pit = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1), m(0x6f7684));
      pit.position.y = 0.15;
      g.add(pit);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), m(0x7b5a3c));
      frame.position.set(-0.35, 0.6, -0.35);
      g.add(frame);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.14), m(0x8a6a48));
      arm.position.set(0, 1.0, -0.35);
      g.add(arm);
      const rubble = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.4), m(0x9aa0ad));
      rubble.position.set(0.3, 0.42, 0.28);
      g.add(rubble);
      break;
    }
    case 'smelter': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.9), m(0x6d6257));
      body.position.y = 0.5;
      body.castShadow = true;
      g.add(body);
      const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.12),
        m(0xff8a3d, { emissive: 0xff6a12, emissiveIntensity: 1.3 })
      );
      mouth.position.set(0, 0.4, 0.46);
      g.add(mouth);
      break;
    }
    case 'beacon': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.1), m(0x53607a, { metalness: 0.4 }));
      base.position.y = 0.2;
      g.add(base);
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), m(0x8f9cb5, { metalness: 0.6 }));
      mast.position.y = 1.6;
      mast.castShadow = true;
      g.add(mast);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        m(0x7ad7ff, { emissive: 0x39b5ff, emissiveIntensity: 1.8 })
      );
      lamp.position.y = 3.1;
      lamp.name = 'lamp';
      g.add(lamp);
      const light = new THREE.PointLight(0x7ad7ff, 3, 26, 2);
      light.position.y = 3.1;
      g.add(light);
      break;
    }
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), m(0x8899aa));
      box.position.y = 0.4;
      g.add(box);
    }
  }

  g.traverse((o) => { o.userData.pickable = true; });
  return g;
}
