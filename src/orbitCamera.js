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

// How far short of a block the free camera stops. The near plane is only 0.1,
// so an eye allowed to come to rest flush against a face sees straight past it
// into the unlit inside of the isle and the screen fills with black - checking
// only the cell the eye is in lets it get exactly that close.
const EYE_MARGIN = 0.35;

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
 * The free camera is the same rig flown rather than a second camera, but
 * nothing is locked in the middle of it: a right-drag turns the eye about
 * ITSELF, the way it does in Minecraft or CS, and forward is wherever the
 * middle of the screen is pointing - look up and forward takes you up. The
 * orbit is still underneath (the eye is target + offset), so switching back
 * needs no second camera; the free camera just keeps the eye still and moves
 * the target out from under it instead.
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

    // The free camera: how fast the arrows fly the eye, how far the wheel
    // pushes it along its own view line, and how far it may roam from the
    // middle of the isle before it is held back.
    this.panSpeed = options.panSpeed ?? 16;
    this.dollySpeed = options.dollySpeed ?? 0.02;
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
    // The eye's own position, the direction it is looking, and its right -
    // all three are wanted every frame it is being flown.
    this._eye = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._move = new THREE.Vector3();
    this._ahead = new THREE.Vector3();
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

  /**
   * Apply a rotation in pixels of drag.
   *
   * Orbiting swings the camera around the target. The free camera must not:
   * being pinned to a point in the middle is the one thing it is for. So the
   * eye is noted before the turn and put back after it, which leaves the
   * TARGET to swing around the eye instead - the same maths read the other
   * way up, and every other part of the rig carries on as it was.
   */
  rotate(dx, dy) {
    const turnInPlace = this.freeCamera;
    if (turnInPlace) this._eyeAt(this._eye);

    // Yaw premultiplies around WORLD up: applying it in the camera's local
    // frame instead makes a sideways swipe slowly roll the horizon over.
    this._scratch.setFromAxisAngle(WORLD_UP, -dx * this.rotateSpeed);
    this.orientation.premultiply(this._scratch);

    // Pitch postmultiplies around the camera's own right axis - unclamped, so
    // it keeps going over the pole and out the other side.
    this._scratch.setFromAxisAngle(LOCAL_RIGHT, -dy * this.rotateSpeed);
    this.orientation.multiply(this._scratch);

    this.orientation.normalize();

    if (turnInPlace) this._setEyeAt(this._eye);
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
    // Free, there is nothing in the middle to zoom towards, so the wheel
    // flies the eye along its own view line instead. It goes through the same
    // step as the arrows do, so it cannot push the eye into the isle or past
    // the leash the way changing `distance` behind everyone's back would.
    if (this.freeCamera) {
      this._look.set(0, 0, -1).applyQuaternion(this.orientation);
      this._stepEye(this._look, -amount * this.dollySpeed);
      return;
    }

    const next = this.targetDistance * (1 + amount * this.zoomSpeed);
    this.targetDistance = THREE.MathUtils.clamp(next, this.minDistance, this.maxDistance);
  }

  /**
   * Turn the free camera on or off.
   *
   * Locking back on puts the view home. Free, the target is left wherever the
   * eye happened to be looking - out in the void, or under the isle - and an
   * orbit about a point like that is not a view anyone asked for: the isle
   * would swing around something off in the dark. Going the other way resets
   * nothing, because the eye carries on from exactly where the orbit had it.
   */
  setFreeCamera(on) {
    if (this.freeCamera === on) return;
    this.freeCamera = on;

    if (on) {
      // A zoom still easing towards its target would carry the eye along on
      // its own for a few frames, and free the eye moves only when it is
      // flown. Whatever is held belongs to the mode it was pressed in.
      this.distance = this.targetDistance;
      this._held.clear();
    } else {
      this.reset();   // which lets the held keys go as well
    }

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

  /** Where the eye actually is: the target, plus the offset it is held at. */
  _eyeAt(out) {
    out.set(0, 0, this.distance).applyQuaternion(this.orientation).add(this.target);
    return out;
  }

  /** Put the eye there, by moving the target out from under it. */
  _setEyeAt(eye) {
    this.target.set(0, 0, -this.distance).applyQuaternion(this.orientation).add(eye);
  }

  /**
   * Fly the eye while the arrows are held.
   *
   * Up is forward and down is back, and forward is the middle of the SCREEN
   * rather than a flattened compass heading - so looking up and holding
   * forward climbs, and looking down dives. That is the whole of the vertical
   * movement; it needs no keys of its own.
   *
   * Left and right strafe, and they stay level however far the eye is pitched.
   * The camera's own right axis is horizontal by construction - yaw is applied
   * about the world's up and pitch about that same right axis, so pitching
   * never tilts it - which is why this can read the axis straight off the
   * orientation rather than crossing anything.
   */
  _fly(delta) {
    let strafe = 0;
    let forward = 0;
    if (this._held.has('orbitLeft')) strafe -= 1;
    if (this._held.has('orbitRight')) strafe += 1;
    if (this._held.has('orbitUp')) forward += 1;
    if (this._held.has('orbitDown')) forward -= 1;
    if (!strafe && !forward) return;

    this._look.set(0, 0, -1).applyQuaternion(this.orientation);
    this._right.copy(LOCAL_RIGHT).applyQuaternion(this.orientation);

    this._move.set(0, 0, 0)
      .addScaledVector(this._look, forward)
      .addScaledVector(this._right, strafe)
      // Normalised, so two keys at once goes diagonally at the same speed
      // rather than 1.41 times faster than one.
      .normalize();

    this._stepEye(this._move, this.panSpeed * this._flyScale() * delta);
  }

  /**
   * How much of `panSpeed` a second of holding an arrow is worth. Only the
   * camera-speed setting scales it, so one slider covers turning and flying
   * both - a free camera that sped up as it was zoomed would be scaling off a
   * distance that no longer means anything once nothing is in the middle.
   */
  _flyScale() {
    return this.rotateSpeed / this.baseRotateSpeed;
  }

  /**
   * Move the eye by `dir * amount`, one axis at a time.
   *
   * Axis at a time is what makes it SLIDE: a step that would end inside the
   * isle, or past the leash, gives up only the axis that did it, so flying
   * into a wall runs along it instead of sticking dead. Taking the step whole
   * or not at all is the version that sticks.
   */
  _stepEye(dir, amount) {
    if (!amount) return;
    this._eyeAt(this._eye);

    // Both tests ask whether a step makes things WORSE, never whether it ends
    // somewhere bad. An eye that is already in a block - toggled free while
    // zoomed into the terrain - or somehow already past the leash would
    // otherwise have every step out of it refused too, and be stuck for good.
    const wasBuried = this._inBlock(this._eye);
    const leash = this.panRadius * this.panRadius;
    const home = this._home.target;

    for (const axis of ['x', 'y', 'z']) {
      const step = dir[axis] * amount;
      if (!step) continue;
      const was = this._eye[axis];
      const reachWas = this._eye.distanceToSquared(home);
      this._eye[axis] = was + step;

      // Probe a little BEYOND where the step lands, so the eye pulls up short
      // of the face rather than against it.
      this._ahead.copy(this._eye);
      this._ahead[axis] += Math.sign(step) * EYE_MARGIN;

      const buries = !wasBuried &&
        (this._inBlock(this._eye) || this._inBlock(this._ahead));
      const reachNow = this._eye.distanceToSquared(home);
      const strays = reachNow > leash && reachNow > reachWas;
      if (buries || strays) this._eye[axis] = was;
    }

    this._setEyeAt(this._eye);
  }

  /** Whether that point is inside a block of the isle. */
  _inBlock(p) {
    if (!this.isSolid) return false;
    return this.isSolid(Math.round(p.x), Math.round(p.y), Math.round(p.z));
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
    //
    // Free, the eye is the player's and nothing else may move it: it is kept
    // out of the isle by refusing the step instead, so there is nothing here
    // to push it out of and a shove would only fight the hand on the keys.
    const distance = this.freeCamera ? this.distance : this._clearOfBlocks(this.distance);

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
