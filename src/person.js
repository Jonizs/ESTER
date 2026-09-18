import * as THREE from 'three';
import { findPath } from './path.js';
import { PROP_KINDS, GROUND_OFFSET } from './props.js';

const WALK_SPEED = 2.2;        // cells per second

/**
 * The one inhabitant of the isle. Walks where you click, works whatever you
 * click on, and finds something to do on their own when left alone.
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
    this.action = 'Looking around';
    this.idleFor = 0;

    this.mesh = buildMesh();
    this.pos = new THREE.Vector3(this.x, this.groundAt(this.x, this.z), this.z);
    this.mesh.position.copy(this.pos);
  }

  groundAt(x, z) {
    const h = this.surface.get(`${x},${z}`);
    return h === undefined ? this.pos?.y ?? 0 : h + GROUND_OFFSET;
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
    this.action = `Walking to the ${PROP_KINDS[prop.kind].label}`;
    return true;
  }

  walkTo(cell) {
    if (!this.goTo(cell)) return false;
    this.task = null;
    this.action = 'Walking';
    return true;
  }

  update(dt, props, onFinish) {
    if (this.path.length > 0) {
      this._step(dt);
      if (!this.task) this.action = 'Walking';
      return;
    }

    if (this.task) {
      const { prop } = this.task;
      if (prop.gone) { this.task = null; return; }

      this.action = PROP_KINDS[prop.kind].action;
      this.mesh.rotation.y = Math.atan2(prop.x - this.x, prop.z - this.z);

      this.task.elapsed += dt;
      if (this.task.elapsed >= this.task.seconds) {
        this.task = null;
        this.idleFor = 0;
        // Set the fallback first so whatever onFinish says wins.
        this.action = 'Finished';
        onFinish?.(prop);
      }
      return;
    }

    // Nothing to do: stand about for a moment, then find their own work.
    this.idleFor += dt;
    if (this.action !== 'Resting' && this.action !== 'Looking around' && this.idleFor > 1.2) {
      this.action = 'Looking around';
    }
    if (this.idleFor > 4) {
      this.idleFor = 0;
      this._chooseSomethingToDo(props);
    }
  }

  _chooseSomethingToDo(props) {
    const available = props.filter((p) => !p.gone);
    if (available.length === 0) {
      this.action = 'Resting';
      return;
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    if (!this.workOn(pick)) this.action = 'Resting';
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

  group.traverse((o) => { o.userData.isPerson = true; });
  return group;
}
