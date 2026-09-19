import * as THREE from 'three';
import {
  PROP_KINDS, GROUND_OFFSET,
  canMove, canPlace, placeProp, footprintCells, footprintCentre, footprintOf, syncBlocked
} from './props.js';

/**
 * Moving a placed station around the isle - and planting one that is not
 * standing anywhere yet.
 *
 * Entered with the move key while the cursor is over a station (see
 * `canMove`), or with `plant()` when something is being put down out of the
 * inventory. The two are deliberately the same screen and the same gesture:
 * a sapling is positioned exactly the way a bench is. What differs is only
 * what PLACE and CANCEL mean at the end of it - a move puts a station back
 * where it started when cancelled, a planting takes the new one away again.
 *
 * It owns the screen until it is placed or cancelled. The
 * station is nudged a cell at a time with the four arrows, or dragged
 * straight to a cell by pressing the left button on the isle and moving -
 * the camera stops orbiting on that drag for as long as the move is on, so
 * the same gesture that turns the isle carries the station instead.
 *
 * The station never occupies anything illegal, not even mid-move: a move is
 * simply refused unless every cell of the footprint is solid ground at one
 * height, clear of the other props and clear of the agent. A refusal flashes
 * the footprint red rather than moving the station somewhere it cannot be.
 *
 * The arrows are read from the camera, not the world: "forward" is away from
 * wherever it is looking, so they keep meaning the same thing once the isle
 * has been orbited.
 */

// How long the footprint stays red after a move is refused.
const REFUSED_FOR = 0.45;

const VALID = 0x8ad8ff;
const REFUSED = 0xff6e96;

export function createPlacement({
  scene, camera, canvas, surface, props, blocked, person, island,
  blockedBy, onBegin, onEnd, onPlant, onPickUp, onDiscard
}) {
  // Its own ray rather than the one main.js clicks with: this is built before
  // that exists, and a drag has no business sharing state with a click.
  const raycaster = new THREE.Raycaster();
  const root = document.getElementById('mover');
  const title = root.querySelector('.mover-what');
  const hint = root.querySelector('.mover-hint');
  const pickUpButton = root.querySelector('#mover-pickup');

  // The footprint under the station: one flat tile per cell it covers, plus
  // the outline of the whole rectangle.
  const marker = new THREE.Group();
  marker.name = 'footprint';
  marker.visible = false;
  scene.add(marker);

  const tileMaterial = new THREE.MeshBasicMaterial({
    color: VALID, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: VALID, transparent: true, opacity: 0.95, depthTest: false
  });

  let prop = null;            // the station being moved, or being planted
  let origin = null;          // where it stood when the move began
  let planting = false;       // it is being put down, not repositioned
  let refused = 0;            // seconds of red left on the footprint
  let dragging = false;       // the left button is down on the isle

  const isActive = () => prop !== null;

  // --- the footprint marker -----------------------------------------------

  function buildMarker(kind) {
    for (const child of [...marker.children]) {
      child.geometry.dispose();
      marker.remove(child);
    }

    const { w, d } = footprintOf(kind);
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), tileMaterial);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(i - (w - 1) / 2, 0, j - (d - 1) / 2);
        marker.add(tile);
      }
    }

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w - 0.06, 0.02, d - 0.06)),
      edgeMaterial
    );
    marker.add(outline);
  }

  function showMarker() {
    const centre = footprintCentre(prop.kind, prop);
    // Just clear of the block face, so it does not z-fight with the turf.
    marker.position.set(centre.x, surface.get(`${prop.x},${prop.z}`) + GROUND_OFFSET + 0.03, centre.z);
    marker.visible = true;
  }

  // --- moving it ----------------------------------------------------------

  /** Try to stand the station at `cell`. Returns false, and flashes, if not. */
  function moveTo(cell) {
    if (!isActive()) return false;
    if (cell.x === prop.x && cell.z === prop.z) return true;

    const spot = canPlace(surface, prop.kind, cell, {
      props,
      ignore: prop,
      // The agent is not something to drop a bench on top of.
      keepClear: [{ x: person.x, z: person.z }]
    });

    if (!spot) {
      refused = REFUSED_FOR;
      return false;
    }

    placeProp(prop, cell, surface);
    // The station blocks where it is *now*, not where it was when the move
    // began - a half-finished move still has to be a consistent world.
    syncBlocked(props, blocked);
    reroute();
    showMarker();
    return true;
  }

  /**
   * Keep a walking agent off the station's new cells.
   *
   * It can only be standing clear of them - that is checked before the move -
   * but the rest of its route may now run straight through, so it is sent to
   * the same place again and takes the way round. If there is no way round
   * any more, it stops where it is rather than walking through.
   */
  function reroute() {
    if (person.path.length === 0) return;
    if (!person.path.some(([x, z]) => blocked.has(`${x},${z}`))) return;

    const [dx, dz] = person.path[person.path.length - 1];
    if (!person.goTo({ x: dx, z: dz })) {
      person.path = [];
      person.segment = null;
    }
  }

  /**
   * One cell in a screen direction. `dx` is right on screen, `dz` is away
   * from the camera, so the arrows keep meaning the same thing whichever way
   * the isle has been turned.
   */
  function nudge(dx, dz) {
    if (!isActive()) return;

    const step = new THREE.Vector3();
    if (dz !== 0) {
      camera.getWorldDirection(step);
      step.multiplyScalar(dz);
    } else {
      step.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(dx);
    }

    step.y = 0;
    // Looking straight down there is no flat direction to take; fall back to
    // the screen's own up, which is the isle's -Z from directly above.
    if (step.lengthSq() < 1e-6) step.set(0, 0, dz !== 0 ? -dz : 0);
    if (step.lengthSq() < 1e-6) return;

    // Snap to whichever axis it points along most, so a cell step is a cell
    // step rather than a diagonal slide.
    const ax = Math.abs(step.x) >= Math.abs(step.z)
      ? { x: Math.sign(step.x), z: 0 }
      : { x: 0, z: Math.sign(step.z) };

    moveTo({ x: prop.x + ax.x, z: prop.z + ax.z });
  }

  /** Put the station under the cursor, footprint and all. */
  function dragToPointer(clientX, clientY) {
    if (!isActive()) return;

    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    ), camera);

    const hit = raycaster.intersectObject(island, true)[0];
    if (!hit) return;

    // The cursor holds the middle of the footprint, not its corner.
    const { w, d } = footprintOf(prop.kind);
    moveTo({
      x: Math.round(hit.point.x - (w - 1) / 2),
      z: Math.round(hit.point.z - (d - 1) / 2)
    });
  }

  // --- beginning and ending -----------------------------------------------

  /** The parts of a move and a planting that are the same. */
  function start(next) {
    prop = next;
    refused = 0;

    // Whatever the agent was doing to this station is no longer about a place
    // it is standing, so it is dropped rather than followed.
    if (person.task?.prop === prop) { person.task = null; person.action = null; }

    buildMarker(prop.kind);
    showMarker();
    canvas.style.cursor = 'grab';

    const { w, d } = footprintOf(prop.kind);
    title.textContent = PROP_KINDS[prop.kind].label.toUpperCase();
    hint.textContent = `Needs ${w * d} solid ${w * d === 1 ? 'block' : 'blocks'}, level and clear`;
    // Only something already standing can be taken back into the inventory;
    // one still being planted is put away with CANCEL.
    pickUpButton.hidden = planting || !PROP_KINDS[prop.kind]?.portable;
    root.hidden = false;

    onBegin?.(prop);
    return true;
  }

  /** Reposition a station that is already standing. */
  function begin(next) {
    if (!canMove(next)) return false;
    planting = false;
    origin = { x: next.x, z: next.z };
    return start(next);
  }

  /**
   * Position something that has just been put into the world out of the
   * inventory. The caller has already stood it somewhere legal; this is only
   * about moving it from there to where it is wanted.
   */
  function plant(next) {
    if (!next) return false;
    planting = true;
    origin = null;
    return start(next);
  }

  function finish() {
    const moved = prop;
    prop = null;
    origin = null;
    planting = false;
    dragging = false;
    marker.visible = false;
    root.hidden = true;
    canvas.style.cursor = '';
    syncBlocked(props, blocked);
    onEnd?.(moved);
  }

  /**
   * Leave it where it now stands.
   *
   * A planting is only paid for here, at the end - so a cancelled one costs
   * nothing - and `onPlant` is what decides whether another one follows
   * straight away, which is how several saplings go down without the
   * inventory being reopened between them.
   */
  function commit() {
    if (!isActive()) return;
    const placed = prop;
    const wasPlanting = planting;
    finish();
    if (wasPlanting) onPlant?.(placed);
  }

  /** Put it back where the move started - or take it away again, if it was
   *  never standing anywhere to begin with. */
  function cancel() {
    if (!isActive()) return;
    const dropped = prop;
    const wasPlanting = planting;
    if (!wasPlanting) placeProp(prop, origin, surface);
    finish();
    if (wasPlanting) onDiscard?.(dropped);
  }

  /** Take a station that is standing back into the inventory. */
  function pickUp() {
    if (!isActive() || planting) return;
    if (!PROP_KINDS[prop.kind]?.portable) return;
    const taken = prop;
    finish();
    onPickUp?.(taken);
  }

  function update(dt) {
    if (refused > 0) {
      refused = Math.max(0, refused - dt);
      const colour = refused > 0 ? REFUSED : VALID;
      tileMaterial.color.setHex(colour);
      edgeMaterial.color.setHex(colour);
    }
  }

  // --- the panel ----------------------------------------------------------

  for (const button of root.querySelectorAll('[data-step]')) {
    const [dx, dz] = button.dataset.step.split(',').map(Number);
    button.addEventListener('click', () => nudge(dx, dz));
  }

  // --- dragging it on the isle --------------------------------------------
  // Left button down on the canvas and move, which is also how the camera
  // orbits - so while a move is on, `controls.pointerBlocked` hands the
  // gesture to us instead. The station is not moved on the press itself,
  // only once the cursor actually travels, so a plain click never teleports
  // it somewhere by accident.

  canvas.addEventListener('pointerdown', (event) => {
    if (!isActive() || event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    canvas.style.cursor = 'grabbing';
    // Capture keeps the drag alive if the cursor leaves the canvas, but it is
    // only an improvement - a browser that refuses it must not lose the drag.
    try { canvas.setPointerCapture(event.pointerId); } catch { /* no capture */ }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragToPointer(event.clientX, event.clientY);
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = isActive() ? 'grab' : '';
    try {
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    } catch { /* it was never captured */ }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  root.querySelector('#mover-place').addEventListener('click', commit);
  root.querySelector('#mover-cancel').addEventListener('click', cancel);
  pickUpButton.addEventListener('click', pickUp);

  // --- keyboard -----------------------------------------------------------
  // Capture phase, before the pause menu, so Esc puts the station back
  // instead of pausing the game behind the panel.
  window.addEventListener('keydown', (event) => {
    if (!isActive() || blockedBy?.()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      cancel();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopImmediatePropagation();
      commit();
      return;
    }

    const steps = {
      ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0]
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    event.stopImmediatePropagation();   // the camera orbits on the arrows too
    nudge(step[0], step[1]);
  }, true);

  root.hidden = true;
  return {
    begin, plant, commit, cancel, pickUp, isActive, update, moveTo, nudge, dragToPointer,
    get prop() { return prop; },
    get planting() { return planting; }
  };
}
