import * as THREE from 'three';
import { findPath } from './pathfinding.js';

/**
 * Colonists and raiders. Both are blocky little figures that walk the island
 * grid; colonists additionally have needs, skills and a job queue.
 */

export const DAY = 3600;            // one in-game day, in game-seconds
const WALK_SPEED = 1.6;             // cells per game-second
const HUNGER_PER_SEC = 100 / (DAY * 1.6);
const TIRE_PER_SEC = 100 / (DAY * 1.25);

const SKILL_FOR_XP = { labor: 'labor', science: 'science', combat: 'combat' };

let nextId = 1;

export class Pawn {
  constructor(opts) {
    this.id = opts.id ?? `p${nextId++}`;
    this.name = opts.name ?? 'Someone';
    this.faction = opts.faction ?? 'colony';
    this.x = opts.x;
    this.z = opts.z;

    this.needs = opts.needs ?? { food: 85, rest: 85 };
    this.mood = opts.mood ?? 65;
    this.hp = opts.hp ?? 100;
    this.skills = opts.skills ?? { labor: 1, science: 1, combat: 1 };
    this.xp = opts.xp ?? { labor: 0, science: 0, combat: 0 };

    this.job = null;
    this.path = [];
    this.activity = 'idle';
    this.say = '';
    this.sayFor = 0;
    this.attackCooldown = 0;
    this.chatCooldown = 0;
    this.dead = false;

    this.pos = new THREE.Vector3(this.x, 0, this.z);
    this.mesh = buildPawnMesh(this.faction, opts.tint);
    this.mesh.userData.pawnId = this.id;
  }

  get alive() { return !this.dead && this.hp > 0; }

  /** Walk toward a cell. Returns false when no route exists. */
  moveTo(world, target, adjacent = false, ignoreBlocked = false) {
    const path = findPath(world, { x: this.x, z: this.z }, target, { adjacent, ignoreBlocked });
    if (!path) return false;
    this.path = path;
    return true;
  }

  atCell(x, z) { return this.x === x && this.z === z; }

  distanceTo(x, z) { return Math.abs(this.x - x) + Math.abs(this.z - z); }

  /** Advance along the current path. Returns true when it has arrived. */
  stepAlongPath(world, dt) {
    if (this.path.length === 0) return true;

    const [tx, tz] = this.path[0];
    const ty = world.standY(tx, tz) ?? this.pos.y;
    const target = new THREE.Vector3(tx, ty, tz);
    const delta = target.clone().sub(this.pos);
    const dist = delta.length();
    const step = WALK_SPEED * dt;

    if (dist <= step || dist < 0.001) {
      this.pos.copy(target);
      this.x = tx;
      this.z = tz;
      this.path.shift();
      return this.path.length === 0;
    }

    this.pos.addScaledVector(delta.normalize(), step);
    // Face the direction of travel.
    this.mesh.rotation.y = Math.atan2(delta.x, delta.z);
    return false;
  }

  decayNeeds(dt, moodDecayScale = 1) {
    if (this.faction !== 'colony') return;
    this.needs.food = Math.max(0, this.needs.food - HUNGER_PER_SEC * dt);
    if (this.activity !== 'sleep') {
      this.needs.rest = Math.max(0, this.needs.rest - TIRE_PER_SEC * dt);
    }

    // Mood drifts toward what the colonist's circumstances deserve.
    let target = 55;
    if (this.needs.food < 25) target -= 30;
    else if (this.needs.food > 70) target += 8;
    if (this.needs.rest < 25) target -= 22;
    else if (this.needs.rest > 70) target += 6;
    if (this.hp < 50) target -= 15;
    target += this.comfort ?? 0;

    const rate = (target > this.mood ? 0.9 : 0.55 * moodDecayScale) / 60;
    this.mood += (target - this.mood) * rate * dt * 0.06;
    this.mood = Math.max(0, Math.min(100, this.mood));

    // Starving and exhausted colonists take damage.
    if (this.needs.food <= 0) this.hp -= 1.6 * dt / 60;
    if (this.hp <= 0) this.dead = true;
  }

  gainXp(kind, amount) {
    if (!SKILL_FOR_XP[kind]) return false;
    this.xp[kind] = (this.xp[kind] ?? 0) + amount;
    const skill = SKILL_FOR_XP[kind];
    const need = 300 * this.skills[skill];
    if (this.xp[kind] >= need) {
      this.xp[kind] -= need;
      this.skills[skill] = Math.min(12, this.skills[skill] + 1);
      return true;
    }
    return false;
  }

  workRate(multiplier = 1) {
    return (1 + (this.skills.labor - 1) * 0.16) * multiplier * (this.mood < 25 ? 0.6 : 1);
  }

  speak(text, seconds = 4) {
    this.say = text;
    this.sayFor = seconds;
  }

  syncMesh(world) {
    if (this.path.length === 0) {
      const y = world.standY(this.x, this.z);
      if (y !== null) this.pos.y = y;
    }
    this.mesh.position.copy(this.pos);

    const bob = this.path.length > 0 ? Math.sin(performance.now() * 0.012) * 0.06 : 0;
    this.mesh.position.y += bob;

    const marker = this.mesh.getObjectByName('marker');
    if (marker) marker.position.y = 1.62 + Math.sin(performance.now() * 0.004) * 0.07;
    this.mesh.visible = this.alive;
  }

  toJSON() {
    return {
      id: this.id, name: this.name, faction: this.faction,
      x: this.x, z: this.z, needs: this.needs, mood: this.mood, hp: this.hp,
      skills: this.skills, xp: this.xp
    };
  }
}

// --- meshes ----------------------------------------------------------------

const COLONY_TINTS = [0x7fd4ff, 0xffd27f, 0xb5ff7f, 0xff9ecd, 0xc7a8ff, 0x7fffd4];

export function colonistTint(index) {
  return COLONY_TINTS[index % COLONY_TINTS.length];
}

function buildPawnMesh(faction, tint) {
  const group = new THREE.Group();
  const hostile = faction !== 'colony';

  const bodyColor = hostile ? 0x8c2f3a : (tint ?? 0x7fd4ff);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.72, 0.38),
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 })
  );
  body.position.y = 0.52;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.36, 0.36),
    new THREE.MeshStandardMaterial({ color: hostile ? 0xd9a7ad : 0xe8d9c5, roughness: 0.8 })
  );
  head.position.y = 1.06;
  head.castShadow = true;
  group.add(head);

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.32, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x3c4356, roughness: 0.9 })
  );
  legs.position.y = 0.16;
  group.add(legs);

  // A marker that draws over the scenery, so colonists can be found at a
  // glance instead of hunted for between the trees.
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.3, 4),
    new THREE.MeshBasicMaterial({
      color: hostile ? 0xff5566 : (tint ?? 0x7fd4ff),
      depthTest: false,
      transparent: true,
      opacity: 0.95
    })
  );
  marker.rotation.x = Math.PI;      // point down at the pawn
  marker.position.y = 1.62;
  marker.renderOrder = 3;
  marker.name = 'marker';
  group.add(marker);

  if (hostile) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xb9c2d0, metalness: 0.6, roughness: 0.3 })
    );
    blade.position.set(0.28, 0.6, 0);
    group.add(blade);
  }

  group.traverse((o) => { o.userData.pickable = true; });
  return group;
}

/** Ring drawn under the currently selected pawn. */
export function buildSelectionRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x7ad7ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.renderOrder = 2;
  return ring;
}
