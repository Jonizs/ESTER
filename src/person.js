import * as THREE from 'three';
import { findPath } from './path.js';
import { PROP_KINDS, GROUND_OFFSET, footprintCells } from './props.js';
import { ITEMS } from './inventory.js';

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

/**
 * One thing to do, whichever kind it is.
 *
 * The queue used to be a list of props, which is why ctrl could only ever
 * add a tree or a rock: everything else - tilling, digging, reaping,
 * filling a bucket - went through `doAt`, which cleared the queue and
 * replaced whatever was on. A job is now either a prop to harvest or a
 * `doAt` with its target and options kept beside it, and `_startNextJob`
 * runs whichever it finds.
 *
 * `at` is on both of them because that is what "nearest first" measures.
 */
const propJob = (prop) => ({ prop, target: null, opts: null, at: { x: prop.x, z: prop.z } });
const cellJob = (target, opts) => ({ prop: null, target, opts, at: { x: target.x, z: target.z } });

/** Where a job is and what it is called - a running task answers too. */
function spotOf(job) {
  const at = job.at ?? (job.prop ? { x: job.prop.x, z: job.prop.z } : null);
  if (!at) return null;
  // A queued job keeps its request in `opts`; a running one has it written
  // onto the task itself. `person.action` is the *displayed* line and is
  // null while they are still walking, so it is deliberately not this.
  return { x: at.x, z: at.z, action: (job.opts ? job.opts.action : job.action) ?? null };
}

/** The same work in the same place: asking twice should do nothing. */
function sameSpot(a, b) {
  const p = spotOf(a);
  const q = spotOf(b);
  return !!p && !!q && p.x === q.x && p.z === q.z && p.action === q.action;
}

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
    this.queue = [];           // the rest of the work, nearest first
    this.action = null;        // only set while actually working
    this.stats = { ...FRESH_STATS };

    // What they are carrying and working with: `{ item, left }`, the whole
    // instance rather than a name, so the wear on *this* one travels with
    // it. It is out of the inventory while it is held - a tool in someone's
    // hand is not stock on the bench. `main.js` owns putting it back.
    this.tool = null;

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
    // The tool goes with them: it is out of the inventory while it is held,
    // so a run that did not write it down would lose it on the next launch.
    return {
      x: this.x, z: this.z,
      stats: { ...this.stats },
      tool: this.tool ? { ...this.tool } : null
    };
  }

  loadState(state) {
    if (!state) return;

    if (this.surface.has(`${state.x},${state.z}`)) {
      this.x = state.x;
      this.z = state.z;
    }
    this.stats = { ...this.stats, ...(state.stats ?? {}) };
    this.tool = state.tool && ITEMS[state.tool.item] ? { ...state.tool } : null;

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
    this.queue = list
      .filter((prop) => !prop.gone && PROP_KINDS[prop.kind]?.action)
      .map(propJob);
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
    if (this.task?.prop === prop || this.queue.some((job) => job.prop === prop)) return false;
    if (!this.task) return this._begin(prop);
    if (this.jobCount() >= limit) return false;
    this.queue.push(propJob(prop));
    return true;
  }

  /**
   * The same, for a job with its own ending rather than a prop to harvest.
   *
   * Tilling, digging, reaping, filling a bucket and watering a plot all go
   * through this, so ctrl means the same thing whatever is being asked for
   * - which it did not, for a long time: the queue could only ever hold
   * things to *cut down or pick up*, and every other order went in
   * instead of what was already on.
   */
  queueAt(target, opts = {}, limit = Infinity) {
    const job = cellJob(target, opts);
    if (this.task && sameSpot(this.task, job)) return false;
    if (this.queue.some((other) => sameSpot(other, job))) return false;
    if (!this.task) return this._doAt(target, opts);
    if (this.jobCount() >= limit) return false;
    this.queue.push(job);
    return true;
  }

  /**
   * What the tool in hand does to a kind of job: `{ speed, wear, drops }`,
   * or null when it is no help with this one. A knife is nothing to a tree.
   */
  toolWork(kind) {
    return (this.tool && ITEMS[this.tool.item]?.work?.[kind]) || null;
  }

  /** Walk over and work on a prop, leaving the queue alone. */
  _begin(prop) {
    if (prop.gone || !PROP_KINDS[prop.kind]?.action) return false;
    // Every cell the prop stands on is somewhere to walk up beside, so a
    // station two cells wide is reached from whichever side is nearest.
    if (!this.goTo(footprintCells(prop.kind, prop), { adjacent: true })) return false;
    // The right tool makes the job quicker. Measured when the work is taken
    // on rather than every frame, so swapping tools halfway does not stretch
    // or shorten what is already under way.
    const speed = this.toolWork(prop.kind)?.speed ?? 1;
    this.task = { prop, seconds: PROP_KINDS[prop.kind].seconds / speed, elapsed: 0 };
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
        const { at } = this.queue[i];
        const d = Math.hypot(at.x - this.x, at.z - this.z);
        if (d < best) { best = d; pick = i; }
      }
      const [job] = this.queue.splice(pick, 1);

      if (job.prop) {
        if (this._begin(job.prop)) return true;
        continue;
      }
      // A job on a prop that has since gone - a plot somebody else put back
      // to grass - is dropped rather than stalling the rest.
      if (job.target.kind && job.target.gone) continue;
      if (this._doAt(job.target, job.opts)) return true;
    }
    return false;
  }

  /**
   * A one-off job with its own ending: go somewhere, spend a moment, then do
   * the thing. Tilling a patch of grass, filling a bucket and watering a
   * crop are all this - work that is not *harvesting a prop*, which is all
   * `workOn` has ever been able to say.
   *
   * `target` is a prop to stand beside or a cell to stand on. It replaces
   * whatever was in hand and clears the queue, like any other single order.
   */
  doAt(target, opts = {}) {
    this.queue = [];
    return this._doAt(target, opts);
  }

  /** The same, leaving the queue alone - what the queue itself runs. */
  //
  // `tick` is called with the frame's delta for every frame of the work
  // itself - cranking a machine does its work all the way through rather than
  // at the end - and `face` is what they turn to look at when the cell they
  // are standing on is not it.
  _doAt(target, { seconds = 1, action = null, then = null, adjacent = false, tick = null, face = null } = {}) {
    const cells = target.kind
      ? footprintCells(target.kind, target)
      : [{ x: target.x, z: target.z }];
    if (!this.goTo(cells, { adjacent })) return false;

    this.task = {
      prop: target.kind ? target : null,
      at: { x: target.x, z: target.z },
      seconds, elapsed: 0, action, then, tick, face
    };
    this.action = null;        // nothing is said until they get there
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
      const { prop, at } = this.task;
      // Somebody else got there first: on to whatever else was queued.
      if (prop?.gone) { this.task = null; this.action = null; this._startNextJob(); return; }

      // A job with its own `then` says what it is; a plain one on a prop
      // takes the line off the kind, which is where it has always been.
      this.action = this.task.action ?? PROP_KINDS[prop.kind].action;
      const face = this.task.face ?? prop ?? at;
      this.mesh.rotation.y = Math.atan2(face.x - this.x, face.z - this.z);

      this.task.tick?.(dt);
      this.task.elapsed += dt;
      if (this.task.elapsed >= this.task.seconds) {
        const done = this.task.then;
        this.task = null;
        this.action = null;
        if (done) done();
        else onFinish?.(prop);
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
