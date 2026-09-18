import * as THREE from 'three';
import { findPath } from './path.js';
import { PROP_KINDS, GROUND_OFFSET } from './props.js';

const WALK_SPEED = 2.2;        // cells per second

// How fast the needs run down, in points per second. Food and water empty in
// a little under ten minutes of play; happiness drifts slower.
const DRAIN = { food: 0.18, water: 0.24, happiness: 0.05 };

/**
 * The agent: the one inhabitant of the isle. It only ever does what it is
 * told - walk where you click, work what you click on - and stands still
 * otherwise. It never picks up work on its own.
 *
 * `action` is always a plain sentence, because it is shown on screen.
 */
export class Person {
  constructor(surface, startCell) {
    this.surface = surface;
    this.x = startCell.x;
    this.z = startCell.z;

    this.path = [];
    this.task = null;          // { prop, seconds, elapsed }
    this.action = null;        // only set while actually working
    this.selected = false;

    this.stats = {
      health: 100,
      food: 100,
      water: 100,
      happiness: 100,
      education: null,         // none to start with
      tool: null,              // none to start with
      mastery: null            // none to start with
    };

    this.mesh = buildMesh();
    this.highlight = this.mesh.getObjectByName('selection');
    this.pos = new THREE.Vector3(this.x, this.groundAt(this.x, this.z), this.z);
    this.mesh.position.copy(this.pos);
  }

  groundAt(x, z) {
    const h = this.surface.get(`${x},${z}`);
    return h === undefined ? this.pos?.y ?? 0 : h + GROUND_OFFSET;
  }

  /** The work in progress, or null: { action, elapsed, seconds, remaining }.
   *  Null while walking to the job - only work under way counts. */
  get activity() {
    if (!this.task || !this.action) return null;
    const { seconds, elapsed } = this.task;
    return {
      action: this.action,
      elapsed,
      seconds,
      remaining: Math.max(0, seconds - elapsed),
      progress: Math.min(1, elapsed / seconds)
    };
  }

  setSelected(on) {
    this.selected = on;
    if (this.highlight) this.highlight.visible = on;
  }

  /** Send them to a cell. Returns false if there is no way there. */
  goTo(cell, { adjacent = false } = {}) {
    const path = findPath(this.surface, { x: this.x, z: this.z }, cell, { adjacent });
    if (!path) return false;
    this.path = path;
    return true;
  }

  /** Walk over and work on a prop. */
  workOn(prop) {
    if (prop.gone) return false;
    if (!this.goTo({ x: prop.x, z: prop.z }, { adjacent: true })) return false;
    this.task = { prop, seconds: PROP_KINDS[prop.kind].seconds, elapsed: 0 };
    // Nothing is shown while walking there; the label appears once the work
    // actually starts.
    this.action = null;
    return true;
  }

  walkTo(cell) {
    if (!this.goTo(cell)) return false;
    this.task = null;
    this.action = null;
    return true;
  }

  update(dt, props, onFinish) {
    this._drain(dt);

    if (this.path.length > 0) {
      this._step(dt);
      if (!this.task) this.action = null;
      return;
    }

    if (this.task) {
      const { prop } = this.task;
      if (prop.gone) { this.task = null; this.action = null; return; }

      this.action = PROP_KINDS[prop.kind].action;
      this.mesh.rotation.y = Math.atan2(prop.x - this.x, prop.z - this.z);

      this.task.elapsed += dt;
      if (this.task.elapsed >= this.task.seconds) {
        this.task = null;
        this.action = null;
        onFinish?.(prop);
      }
      return;
    }

    // Nothing to do. The agent waits for orders - it never finds its own work.
    this.action = null;
  }

  _drain(dt) {
    const s = this.stats;
    s.food = Math.max(0, s.food - DRAIN.food * dt);
    s.water = Math.max(0, s.water - DRAIN.water * dt);
    s.happiness = Math.max(0, s.happiness - DRAIN.happiness * dt);
    // Health only slips once something is actually empty.
    const starving = (s.food === 0 ? 1 : 0) + (s.water === 0 ? 1 : 0);
    if (starving > 0) s.health = Math.max(0, s.health - 0.5 * starving * dt);
  }

  _step(dt) {
    const [tx, tz] = this.path[0];
    const target = new THREE.Vector3(tx, this.groundAt(tx, tz), tz);
    const delta = target.clone().sub(this.pos);
    const distance = delta.length();
    const step = WALK_SPEED * dt;

    if (distance <= step || distance < 0.001) {
      this.pos.copy(target);
      this.x = tx;
      this.z = tz;
      this.path.shift();
    } else {
      this.pos.addScaledVector(delta.normalize(), step);
      this.mesh.rotation.y = Math.atan2(delta.x, delta.z);
    }

    this.mesh.position.copy(this.pos);
  }
}

function buildMesh() {
  const group = new THREE.Group();
  group.name = 'person';

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.34, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x3c4356, roughness: 0.9 })
  );
  legs.position.y = 0.17;
  legs.castShadow = true;
  group.add(legs);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.72, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x7fd4ff, roughness: 0.7 })
  );
  body.position.y = 0.7;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.36, 0.36),
    new THREE.MeshStandardMaterial({ color: 0xe8d9c5, roughness: 0.8 })
  );
  head.position.y = 1.24;
  head.castShadow = true;
  group.add(head);

  // Selection ring, lying flat on the ground under their feet.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.44, 0.58, 28),
    new THREE.MeshBasicMaterial({
      color: 0x7ad7ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    })
  );
  ring.name = 'selection';
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.visible = false;
  group.add(ring);

  group.traverse((o) => { o.userData.isPerson = true; });
  return group;
}
