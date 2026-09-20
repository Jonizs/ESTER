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
    // Which agent was clicked, now that there can be more than one standing
    // on the isle at once - `isPerson` only says that one of them was hit.
    this.mesh.traverse((o) => { o.userData.person = this; });
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
    this.queue = [];           // the rest of a batch of work, nearest first
    this.action = null;        // only set while actually working
    this.stats = { ...FRESH_STATS };

    this.setSelected(false);
    this.mesh.rotation.y = 0;
    this.pos.set(this.x, this.groundAt(this.x, this.z), this.z);
    this.mesh.position.copy(this.pos);
  }

  /**
   * For the save: where they are and how they are doing.
   *
   * What they were in the middle of is deliberately left out - a walk and a
   * job are both dropped, and a restored run has them standing idle where
   * they were.
   */
  saveState() {
    return { x: this.x, z: this.z, stats: { ...this.stats } };
  }

  loadState(state) {
    if (!state) return;

    if (this.surface.has(`${state.x},${state.z}`)) {
      this.x = state.x;
      this.z = state.z;
    }
    this.stats = { ...this.stats, ...(state.stats ?? {}) };

    // Whatever they were doing does not survive the restart.
    this.path = [];
    this.segment = null;
    this.task = null;
    this.queue = [];
    this.action = null;

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

  /** Walk over and work on a prop. Whatever was queued behind is dropped. */
  workOn(prop) {
    this.queue = [];
    return this._begin(prop);
  }

  /**
   * A whole batch of work, from a box dragged over the isle.
   *
   * The list is a queue rather than one order: the nearest job is started
   * now and the rest are kept, and each time one is finished the next
   * nearest to wherever they now stand is picked up. Anything unreachable
   * is skipped rather than stalling the batch.
   */
  workOnAll(list) {
    this.queue = list.filter((prop) => !prop.gone && PROP_KINDS[prop.kind]?.action);
    return this._startNextJob();
  }

  /** How much work they have on: the job in hand and everything behind it. */
  jobCount() {
    return this.queue.length + (this.task ? 1 : 0);
  }

  /**
   * Put one more job behind whatever they are doing, up to `limit` in all.
   *
   * With nothing on they simply start it. An order already given is never
   * interrupted by this - that is the whole point of it - and asking twice
   * for the same thing does nothing rather than queueing it twice.
   */
  queueUp(prop, limit = Infinity) {
    if (prop.gone || !PROP_KINDS[prop.kind]?.action) return false;
    if (this.task?.prop === prop || this.queue.includes(prop)) return false;
    if (!this.task) return this._begin(prop);
    if (this.jobCount() >= limit) return false;
    this.queue.push(prop);
    return true;
  }

  /** Walk over and work on a prop, leaving the queue alone. */
  _begin(prop) {
    if (prop.gone || !PROP_KINDS[prop.kind]?.action) return false;
    // Every cell the prop stands on is somewhere to walk up beside, so a
    // station two cells wide is reached from whichever side is nearest.
    if (!this.goTo(footprintCells(prop.kind, prop), { adjacent: true })) return false;
    this.task = { prop, seconds: PROP_KINDS[prop.kind].seconds, elapsed: 0 };
    // Nothing is shown while walking there; the label appears once the work
    // actually starts.
    this.action = null;
    return true;
  }

  /**
   * Take the nearest job off the queue and start it. Anything felled in the
   * meantime, or with no way to it, is dropped and the next one tried.
   */
  _startNextJob() {
    while (this.queue.length > 0) {
      let pick = 0;
      let best = Infinity;
      for (let i = 0; i < this.queue.length; i++) {
        const prop = this.queue[i];
        const d = Math.hypot(prop.x - this.x, prop.z - this.z);
        if (d < best) { best = d; pick = i; }
      }
      const [prop] = this.queue.splice(pick, 1);
      if (this._begin(prop)) return true;
    }
    return false;
  }

  /**
   * Walk up beside a prop, taking no work from it.
   *
   * This is what a click on the repaired workbench is: somewhere to go and
   * stand, not a job. `_begin` cannot serve - it insists on an `action` and
   * hangs a task off the agent, and there is no work here to do.
   */
  walkToProp(prop) {
    if (prop.gone) return false;
    if (!this.goTo(footprintCells(prop.kind, prop), { adjacent: true })) return false;
    // Being sent somewhere calls off the batch as well as the current job,
    // exactly as walking to a cell does.
    this.queue = [];
    this.task = null;
    this.action = null;
    return true;
  }

  walkTo(cell) {
    if (!this.goTo(cell)) return false;
    // Being sent somewhere calls off the batch as well as the current job.
    this.queue = [];
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
      // Somebody else got there first: on to whatever else was queued.
      if (prop.gone) { this.task = null; this.action = null; this._startNextJob(); return; }

      this.action = PROP_KINDS[prop.kind].action;
      this.mesh.rotation.y = Math.atan2(prop.x - this.x, prop.z - this.z);

      this.task.elapsed += dt;
      if (this.task.elapsed >= this.task.seconds) {
        this.task = null;
        this.action = null;
        onFinish?.(prop);
        // The rest of a batch follows on its own; a single order leaves the
        // queue empty, so this does nothing at all.
        this._startNextJob();
      }
      return;
    }

    // Nothing queued and nothing to do. The agent waits for orders - it
    // never finds its own work.
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
