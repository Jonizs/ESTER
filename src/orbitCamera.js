import * as THREE from 'three';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_RIGHT = new THREE.Vector3(1, 0, 0);

// Used only when no settings object was handed in.
const DEFAULT_ACTION_FOR = {
  r: 'resetView', R: 'resetView',
  f: 'freeCamera', F: 'freeCamera',
  '+': 'zoomIn', '=': 'zoomIn',
  '-': 'zoomOut', _: 'zoomOut',
  ArrowLeft: 'orbitLeft', ArrowRight: 'orbitRight',
  ArrowUp: 'orbitUp', ArrowDown: 'orbitDown'
};

// The four the free camera flies on - they orbit until F is pressed.
const MOVE_ACTIONS = new Set(['orbitLeft', 'orbitRight', 'orbitUp', 'orbitDown']);

/**
 * Quaternion-based orbit camera, with a free camera on F.
 *
 * Yaw turns around the world's vertical axis and pitch around the camera's
 * own right axis, so the island can be spun a full 360 degrees on every axis -
 * straight over the poles and upside down - with no pitch clamping, no gimbal
 * lock, and no roll creeping in when you swipe sideways.
 *
 * The free camera is the same rig flown rather than a second camera: the
 * arrows push the orbit TARGET along the ground instead of turning about it,
 * so a right-drag still orbits and the wheel still zooms wherever it has been
 * flown to. Two arrows at once make a diagonal.
 */
export class OrbitCamera {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.dom = domElement;

    this.target = options.target ?? new THREE.Vector3(0, 0, 0);
    this.minDistance = options.minDistance ?? 8;
    this.maxDistance = options.maxDistance ?? 220;
    this.baseRotateSpeed = options.rotateSpeed ?? 0.003;
    this.rotateSpeed = this.baseRotateSpeed;
    this.zoomSpeed = options.zoomSpeed ?? 0.0012;
    this.damping = options.damping ?? 0.12;

    // The free camera: how fast the arrows fly it, and how far it may roam
    // from where it started before it is held back.
    this.panSpeed = options.panSpeed ?? 16;
    this.panRadius = options.panRadius ?? 60;

    this.distance = options.distance ?? 52;
    this.targetDistance = this.distance;

    // Asked whether a block coordinate is inside the isle, so the camera can
    // pull back out rather than end up buried in the ground.
    this.isSolid = options.isSolid ?? null;

    // Which key does what, and how fast the camera turns. Shared with the
    // pause menu, which edits it in place.
    this.settings = options.settings ?? null;
    if (this.settings) this.setCameraSpeed(this.settings.cameraSpeed);

    // Free camera off to begin with: the arrows orbit until F says otherwise.
    this.freeCamera = options.freeCamera ?? false;
    this.onFreeCamera = options.onFreeCamera ?? null;

    this.orientation = new THREE.Quaternion();
    this.velocity = new THREE.Vector2(0, 0);

    this._offset = new THREE.Vector3();
    this._probe = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._scratch = new THREE.Quaternion();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    // Which movement keys are DOWN, rather than which was last pressed - two
    // at once is what makes a diagonal, so this cannot be one key.
    this._held = new Set();
    this._pointers = new Map();
    this._lastPinch = 0;
    this._home = {
      distance: this.distance,
      orientation: this.orientation.clone(),
      target: this.target.clone()
    };

    this.setStartView(options.pitch ?? 0.42, options.yaw ?? 0.7);
    this._home = {
      distance: this.targetDistance,
      orientation: this.orientation.clone(),
      target: this.target.clone()
    };

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

  /** Scale how far a drag or an arrow key turns the camera. */
  setCameraSpeed(scale) {
    this.rotateSpeed = this.baseRotateSpeed * scale;
  }

  /** Whether the camera is being turned right now. */
  isDragging() {
    return this._pointers.size > 0;
  }

  zoom(amount) {
    const next = this.targetDistance * (1 + amount * this.zoomSpeed);
    this.targetDistance = THREE.MathUtils.clamp(next, this.minDistance, this.maxDistance);
  }

  /** Turn the free camera on or off. */
  setFreeCamera(on) {
    if (this.freeCamera === on) return;
    this.freeCamera = on;
    // Whatever is held belongs to the mode it was pressed in.
    this._held.clear();
    this.onFreeCamera?.(on);
  }

  reset() {
    this.orientation.copy(this._home.orientation);
    this.targetDistance = this._home.distance;
    // The free camera moves the target, so putting the view back has to put
    // the position back too - this is the way home from the far side.
    this.target.copy(this._home.target);
    this.velocity.set(0, 0);
    this._held.clear();
  }

  /**
   * The ground-plane axes the arrows mean, read off the CAMERA rather than the
   * world - so "forward" stays into the screen once the isle has been orbited,
   * the same rule the mover's D-pad follows.
   */
  _groundAxes() {
    this._fwd.set(0, 0, -1).applyQuaternion(this.orientation);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() < 1e-8) {
      // Looking straight down (or straight up) the view direction has no
      // horizontal part at all. The camera's own up does, and pointed at the
      // ground from overhead that is the direction forward reads as on screen.
      this._fwd.set(0, 1, 0).applyQuaternion(this.orientation);
      this._fwd.y = 0;
    }
    this._fwd.normalize();
    // forward x up is +X in the camera's frame, which is its right.
    this._right.copy(this._fwd).cross(WORLD_UP).normalize();
  }

  /**
   * Fly the camera along the ground while the arrows are held.
   *
   * It is the orbit TARGET that moves, not the camera on its own: the camera
   * sits at target + offset, so moving the target takes the whole rig with it
   * and a right-drag still turns about whatever is being looked at.
   */
  _fly(delta) {
    let strafe = 0;
    let forward = 0;
    if (this._held.has('orbitLeft')) strafe -= 1;
    if (this._held.has('orbitRight')) strafe += 1;
    if (this._held.has('orbitUp')) forward += 1;
    if (this._held.has('orbitDown')) forward -= 1;
    if (!strafe && !forward) return;

    this._groundAxes();

    // Divided by the length, so two keys at once goes diagonally at the same
    // speed rather than 1.41 times faster than one.
    const step = this.panSpeed * this._flyScale() * delta / Math.hypot(strafe, forward);
    this.target.addScaledVector(this._right, strafe * step);
    this.target.addScaledVector(this._fwd, forward * step);
    this._holdInBounds();
  }

  /**
   * How much of `panSpeed` a second of holding an arrow is worth: more when
   * zoomed out, since the same distance crosses less of the screen, and scaled
   * by the camera-speed setting so one slider covers turning and flying both.
   */
  _flyScale() {
    const zoom = THREE.MathUtils.clamp(this.distance / this._home.distance, 0.4, 3);
    return zoom * (this.rotateSpeed / this.baseRotateSpeed);
  }

  /**
   * Keep the camera within `panRadius` of where it started. Free is not
   * boundless: the isle is a speck in the void and flying off far enough to
   * lose it leaves nothing on screen to steer back by.
   */
  _holdInBounds() {
    const home = this._home.target;
    const dx = this.target.x - home.x;
    const dz = this.target.z - home.z;
    const spread = Math.hypot(dx, dz);
    if (spread <= this.panRadius) return;
    const scale = this.panRadius / spread;
    this.target.x = home.x + dx * scale;
    this.target.z = home.z + dz * scale;
  }

  update(delta) {
    // Inertia from the last drag. Nothing turns on its own: the isle does not
    // drift, so an idle camera stands still.
    if (this.velocity.lengthSq() > 1e-6) {
      this.rotate(this.velocity.x, this.velocity.y);
      this.velocity.multiplyScalar(1 - this.damping);
    }

    // A key held when a panel opened is still held as far as the browser is
    // concerned, and its keyup goes to whatever took the keyboard - so the
    // held set is let go here rather than waiting for one that never comes.
    if (this.keyboardBlocked?.()) this._held.clear();
    else if (this.freeCamera) this._fly(delta);

    this.distance += (this.targetDistance - this.distance) * 0.12;

    // Push out far enough that the camera is not standing in a block. The
    // zoom the user asked for is left alone, so it settles back in of its own
    // accord as soon as the way is clear.
    const distance = this._clearOfBlocks(this.distance);

    this._offset.set(0, 0, distance).applyQuaternion(this.orientation);
    this.camera.position.copy(this.target).add(this._offset);
    this.camera.quaternion.copy(this.orientation);
  }

  /**
   * The nearest distance along the view ray, at or beyond `distance`, that
   * leaves the camera outside the island.
   *
   * The target sits inside the isle, so this cannot be a ray cast outwards
   * from it - it would hit the terrain immediately. It samples the camera's
   * own position instead, and a point just in front of it so the near plane
   * does not end up buried either.
   */
  _clearOfBlocks(distance) {
    if (!this.isSolid) return distance;

    this._dir.set(0, 0, 1).applyQuaternion(this.orientation);
    const margin = 0.45;

    let d = distance;
    for (let guard = 0; guard < 400; guard++) {
      this._probe.copy(this.target).addScaledVector(this._dir, d);
      const inCamera = this.isSolid(
        Math.round(this._probe.x), Math.round(this._probe.y), Math.round(this._probe.z)
      );
      this._probe.addScaledVector(this._dir, -margin);
      const inFront = this.isSolid(
        Math.round(this._probe.x), Math.round(this._probe.y), Math.round(this._probe.z)
      );
      if (!inCamera && !inFront) return d;
      d += 0.25;
      if (d > this.maxDistance) return d;
    }
    return d;
  }

  _bind() {
    const dom = this.dom;

    dom.addEventListener('pointerdown', (e) => {
      // Something else may own the drag - moving a station uses the same
      // press-and-move on the same canvas, and it takes precedence.
      if (this.pointerBlocked?.(e)) return;
      // The camera is turned with the RIGHT button. Left-drag belongs to the
      // selection box out on the isle, so it must never reach the orbit.
      // A touch or a pen has no buttons to choose between, so it still
      // orbits - and two of them still pinch.
      if (e.pointerType === 'mouse' && e.button !== 2) return;
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
      // The menu takes the keyboard while it is open, including whatever key
      // is being rebound.
      if (this.keyboardBlocked?.()) return;

      const action = this.settings
        ? this.settings.actionFor(e.key)
        : DEFAULT_ACTION_FOR[e.key] ?? null;

      // With the free camera on, the four arrows fly it instead of turning
      // it - the same actions, the mode decides what they do, so rebinding
      // them rebinds both. They are HELD rather than tapped: the step is
      // taken in the frame loop for as long as the key is down, which is what
      // lets two of them add up to a diagonal.
      if (this.freeCamera && MOVE_ACTIONS.has(action)) {
        e.preventDefault();
        this._held.add(action);
        return;
      }

      switch (action) {
        case 'resetView': this.reset(); break;
        case 'freeCamera': this.setFreeCamera(!this.freeCamera); break;
        case 'zoomIn': this.zoom(-260); break;
        case 'zoomOut': this.zoom(260); break;
        case 'orbitLeft': this.rotate(-28, 0); break;
        case 'orbitRight': this.rotate(28, 0); break;
        case 'orbitUp': this.rotate(0, -28); break;
        case 'orbitDown': this.rotate(0, 28); break;
        default: return;
      }
    });

    // Let go on the key coming up, whatever the mode is now - a key pressed
    // while flying and released after F turned the mode off must not stick.
    window.addEventListener('keyup', (e) => {
      const action = this.settings
        ? this.settings.actionFor(e.key)
        : DEFAULT_ACTION_FOR[e.key] ?? null;
      if (action) this._held.delete(action);
    });

    // Leaving the window takes the keyups with it, so the camera would fly on
    // by itself until the key was pressed and released again.
    window.addEventListener('blur', () => this._held.clear());
  }

  _pinch() {
    const [a, b] = [...this._pointers.values()];
    const spread = Math.hypot(a.x - b.x, a.y - b.y);
    if (this._lastPinch) this.zoom((this._lastPinch - spread) * 12);
    this._lastPinch = spread;
  }
}
