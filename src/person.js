import * as THREE from 'three';
import { findPath } from './path.js';
import { PROP_KINDS, GROUND_OFFSET, footprintCells } from './props.js';

const WALK_SPEED = 2.2;        // cells per second on the level
const HOP_SPEED = 1.5;         // slower while hopping up or down a block
const HOP_HEIGHT = 0.28;       // how far the arc lifts them clear of the edge

const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;

/**
 * Height part-way through a step, as a fraction `t` of the way across.
 *
 * The cell edge is crossed halfway, so a straight line from one cell's ground
 * to the next puts them inside the block they are climbing. Going up they
 * gain the height first and arc over the edge; going down they hold their
 * height until they are out past it and only then drop. Both keep them clear
 * of the taller block's top face while they are still over it.
 */
function hopHeight(from, to, t) {
  const climb = to - from;
  if (Math.abs(climb) < 0.01) return from;      // level: no bob at all

  if (climb > 0) {
    const rise = Math.min(1, t / 0.45);
    return from + climb * easeOut(rise) + HOP_HEIGHT * Math.sin(Math.PI * t);
  }

  const fall = Math.max(0, (t - 0.5) / 0.5);
  return from + climb * easeIn(fall) + HOP_HEIGHT * 0.6 * Math.sin(Math.PI * Math.min(1, t / 0.7));
}

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
const FRESH_STATS = {
  health: 100,
  food: 100,
  water: 100,
  happiness: 100,
  education: null,           // none to start with
  tool: null,                // none to start with
  mastery: null              // none to start with
};

export class Person {
  constructor(surface, startCell, { name = 'Ester', blocked } = {}) {
    this.surface = surface;
    this.name = name;                 // shown in the agent list
    this.home = { x: startCell.x, z: startCell.z };   // where a reset puts them
    this.blocked = blocked ?? new Set();              // cells they cannot enter

    this.mesh = buildMesh();
    this.highlight = this.mesh.getObjectByName('selection');
    this.pos = new THREE.Vector3();

    this.reset();
  }

  /** Back to the start of a run: home, idle, fed, nothing selected. */
  reset() {
    this.x = this.home.x;
    this.z = this.home.z;

    this.path = [];
    this.segment = null;       // the step being walked, for the hop arc
    this.task = null;          // { prop, seconds, elapsed }
    this.action = null;        // only set while actually working
    this.stats = { ...FRESH_STATS };

    this.setSelected(false);
    this.mesh.rotation.y = 0;
    this.pos.set(this.x, this.groundAt(this.x, this.z), this.z);
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
    const path = findPath(this.surface, { x: this.x, z: this.z }, cell, { adjacent, blocked: this.blocked });
    if (!path) return false;
    this.path = path;
    this.segment = null;       // start the next step from wherever they are
    return true;
  }

  /** Walk over and work on a prop. */
  workOn(prop) {
    if (prop.gone) return false;
    // Every cell the prop stands on is somewhere to walk up beside, so a
    // station two cells wide is reached from whichever side is nearest.
    if (!this.goTo(footprintCells(prop.kind, prop), { adjacent: true })) return false;
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

    // Each step is walked as its own segment, so the hop can be shaped from
    // where it began rather than from wherever they happen to be now.
    let segment = this.segment;
    if (!segment || segment.tx !== tx || segment.tz !== tz) {
      segment = this.segment = {
        tx,
        tz,
        fromX: this.pos.x,
        fromZ: this.pos.z,
        fromY: this.pos.y,
        toY: this.groundAt(tx, tz),
        distance: Math.hypot(tx - this.pos.x, tz - this.pos.z),
        travelled: 0
      };
    }

    const hopping = Math.abs(segment.toY - segment.fromY) > 0.01;
    const speed = hopping ? HOP_SPEED : WALK_SPEED;

    let t = 1;
    if (segment.distance > 0.0001) {
      segment.travelled += speed * dt;
      t = Math.min(1, segment.travelled / segment.distance);
    }

    // Horizontal travel is a straight line; only the height is shaped.
    this.pos.x = segment.fromX + (tx - segment.fromX) * t;
    this.pos.z = segment.fromZ + (tz - segment.fromZ) * t;
    this.pos.y = hopHeight(segment.fromY, segment.toY, t);

    const dx = tx - segment.fromX;
    const dz = tz - segment.fromZ;
    if (dx !== 0 || dz !== 0) this.mesh.rotation.y = Math.atan2(dx, dz);

    if (t >= 1) {
      this.x = tx;
      this.z = tz;
      this.pos.set(tx, segment.toY, tz);
      this.path.shift();
      this.segment = null;
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
