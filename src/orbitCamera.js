import * as THREE from 'three';

/**
 * Quaternion-based orbit camera.
 *
 * Rotation is accumulated in the camera's own local frame, so the island can
 * be spun a full 360 degrees on every axis - straight over the poles and
 * upside down - without gimbal lock or the "up" vector snapping.
 */
export class OrbitCamera {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.dom = domElement;

    this.target = options.target ?? new THREE.Vector3(0, 0, 0);
    this.minDistance = options.minDistance ?? 8;
    this.maxDistance = options.maxDistance ?? 220;
    this.rotateSpeed = options.rotateSpeed ?? 0.0045;
    this.zoomSpeed = options.zoomSpeed ?? 0.0012;
    this.damping = options.damping ?? 0.086;
    this.autoSpinSpeed = options.autoSpinSpeed ?? 0.055;

    this.distance = options.distance ?? 52;
    this.targetDistance = this.distance;
    this.autoSpin = options.autoSpin ?? true;

    this.orientation = new THREE.Quaternion();
    this.velocity = new THREE.Vector2(0, 0);

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
    this._scratch.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -dx * this.rotateSpeed);
    this.orientation.multiply(this._scratch);
    this._scratch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -dy * this.rotateSpeed);
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

    this._offset.set(0, 0, this.distance).applyQuaternion(this.orientation);
    this.camera.position.copy(this.target).add(this._offset);
    this.camera.quaternion.copy(this.orientation);
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
      this.velocity.set(dx * 0.55, dy * 0.55);
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
        case 'ArrowLeft': this.rotate(-22, 0); break;
        case 'ArrowRight': this.rotate(22, 0); break;
        case 'ArrowUp': this.rotate(0, -22); break;
        case 'ArrowDown': this.rotate(0, 22); break;
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
