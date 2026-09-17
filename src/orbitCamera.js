import * as THREE from 'three';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_RIGHT = new THREE.Vector3(1, 0, 0);

/**
 * Quaternion-based orbit camera.
 *
 * Yaw turns around the world's vertical axis and pitch around the camera's
 * own right axis, so the island can be spun a full 360 degrees on every axis -
 * straight over the poles and upside down - with no pitch clamping, no gimbal
 * lock, and no roll creeping in when you swipe sideways.
 */
export class OrbitCamera {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.dom = domElement;

    this.target = options.target ?? new THREE.Vector3(0, 0, 0);
    this.minDistance = options.minDistance ?? 8;
    this.maxDistance = options.maxDistance ?? 220;
    this.rotateSpeed = options.rotateSpeed ?? 0.003;
    this.zoomSpeed = options.zoomSpeed ?? 0.0012;
    this.damping = options.damping ?? 0.12;
    this.autoSpinSpeed = options.autoSpinSpeed ?? 0.03;

    this.distance = options.distance ?? 52;
    this.targetDistance = this.distance;
    this.autoSpin = options.autoSpin ?? true;

    this.orientation = new THREE.Quaternion();
    this.velocity = new THREE.Vector2(0, 0);

    this.targetGoal = this.target.clone();
    this._offset = new THREE.Vector3();
    this._scratch = new THREE.Quaternion();
    this._pointers = new Map();
    this._lastPinch = 0;
    this._home = { distance: this.distance, orientation: this.orientation.clone() };

    this.setStartView(options.pitch ?? 0.42, options.yaw ?? 0.7);
    this._home = { distance: this.targetDistance, orientation: this.orientation.clone() };

    this._bind();
    this.update(0);
  }

  /** Point the camera at the island from a pleasant three-quarter angle. */
  setStartView(pitch, yaw) {
    this.orientation.identity();
    this.rotate(yaw / this.rotateSpeed, pitch / this.rotateSpeed);
    this.velocity.set(0, 0);
  }

  /** Apply a rotation in pixels of drag. */
  rotate(dx, dy) {
    // Yaw premultiplies around WORLD up: applying it in the camera's local
    // frame instead makes a sideways swipe slowly roll the horizon over.
    this._scratch.setFromAxisAngle(WORLD_UP, -dx * this.rotateSpeed);
    this.orientation.premultiply(this._scratch);

    // Pitch postmultiplies around the camera's own right axis - unclamped, so
    // it keeps going over the pole and out the other side.
    this._scratch.setFromAxisAngle(LOCAL_RIGHT, -dy * this.rotateSpeed);
    this.orientation.multiply(this._scratch);

    this.orientation.normalize();
  }

  zoom(amount) {
    const next = this.targetDistance * (1 + amount * this.zoomSpeed);
    this.targetDistance = THREE.MathUtils.clamp(next, this.minDistance, this.maxDistance);
  }

  reset() {
    this.orientation.copy(this._home.orientation);
    this.targetDistance = this._home.distance;
    this.velocity.set(0, 0);
  }

  update(delta) {
    // Inertia from the last drag, then auto-spin when the user is idle.
    if (this.velocity.lengthSq() > 1e-6) {
      this.rotate(this.velocity.x, this.velocity.y);
      this.velocity.multiplyScalar(1 - this.damping);
    } else if (this.autoSpin && this._pointers.size === 0) {
      this.rotate(this.autoSpinSpeed * delta * 60, 0);
    }

    this.distance += (this.targetDistance - this.distance) * 0.12;
    this.target.lerp(this.targetGoal, 0.08);

    this._offset.set(0, 0, this.distance).applyQuaternion(this.orientation);
    this.camera.position.copy(this.target).add(this._offset);
    this.camera.quaternion.copy(this.orientation);
  }

  /** Glide the orbit centre to a new point, e.g. a selected colonist. */
  focus(point) {
    this.targetGoal.set(point.x, point.y + 0.6, point.z);
  }

  _bind() {
    const dom = this.dom;

    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.velocity.set(0, 0);
      dom.classList.add('dragging');
    });

    dom.addEventListener('pointermove', (e) => {
      const prev = this._pointers.get(e.pointerId);
      if (!prev) return;

      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._pointers.size >= 2) {
        this._pinch();
        return;
      }

      this.rotate(dx, dy);
      this.velocity.set(dx * 0.4, dy * 0.4);
    });

    const release = (e) => {
      this._pointers.delete(e.pointerId);
      this._lastPinch = 0;
      if (this._pointers.size === 0) dom.classList.remove('dragging');
    };
    dom.addEventListener('pointerup', release);
    dom.addEventListener('pointercancel', release);
    dom.addEventListener('pointerleave', release);

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY);
    }, { passive: false });

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'r': case 'R': this.reset(); break;
        case 'f': case 'F': this.autoSpin = !this.autoSpin; break;
        case '+': case '=': this.zoom(-260); break;
        case '-': case '_': this.zoom(260); break;
        case 'ArrowLeft': this.rotate(-28, 0); break;
        case 'ArrowRight': this.rotate(28, 0); break;
        case 'ArrowUp': this.rotate(0, -28); break;
        case 'ArrowDown': this.rotate(0, 28); break;
        default: return;
      }
    });
  }

  _pinch() {
    const [a, b] = [...this._pointers.values()];
    const spread = Math.hypot(a.x - b.x, a.y - b.y);
    if (this._lastPinch) this.zoom((this._lastPinch - spread) * 12);
    this._lastPinch = spread;
  }
}
