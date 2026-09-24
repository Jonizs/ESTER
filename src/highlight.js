import * as THREE from 'three';

/**
 * The corner brackets drawn around whatever the cursor is over.
 *
 * It is not the prop outline: that traces every edge of a station and says
 * "this can be picked up". This is a box around *anything* - a block of the
 * isle as much as a prop - and it says only "this is what a click would land
 * on". Twelve corners with three short arms each, rather than a full wire
 * box, because a complete cage over a block of grass reads as a selection
 * and this is only a cursor.
 *
 * The colour is what carries the second meaning: white is plain hover, and
 * anything else is a gesture that is armed and would do something here.
 */
const ARM = 0.26;        // how far along each edge a corner arm reaches
const GROW = 0.02;       // stand the box off the surface so it never z-fights

export const HIGHLIGHT_PLAIN = 0xffffff;
export const HIGHLIGHT_WORK = 0x9ae66e;
// Would work here, but is being refused - a block only seen through the
// see-through camera's cut.
export const HIGHLIGHT_REFUSED = 0xff5a5a;

export function createHighlight(scene) {
  // 8 corners x 3 arms x 2 ends x 3 floats.
  const positions = new Float32Array(8 * 3 * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: HIGHLIGHT_PLAIN,
    transparent: true,
    opacity: 0.55,
    // The whole box reads at once rather than half of it hiding inside the
    // thing it is drawn around - the same reasoning as the prop outline.
    depthTest: false
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 4;
  lines.frustumCulled = false;
  lines.visible = false;
  lines.raycast = () => {};       // never a click target
  scene.add(lines);

  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const drawn = new THREE.Vector3(-1, -1, -1);

  /** Lay the corner arms out for a box of this size, centred on nothing. */
  function shape(w, h, d) {
    if (drawn.x === w && drawn.y === h && drawn.z === d) return;
    drawn.set(w, h, d);

    const half = [w / 2, h / 2, d / 2];
    // The arms never run past the middle of an edge, so a thin box (a plot
    // is a hand's breadth tall) keeps its corners as corners instead of
    // closing up into a solid cage.
    const arm = [Math.min(ARM, w * 0.4), Math.min(ARM, h * 0.4), Math.min(ARM, d * 0.4)];

    let at = 0;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const corner = [sx * half[0], sy * half[1], sz * half[2]];
      const sign = [sx, sy, sz];
      for (let axis = 0; axis < 3; axis++) {
        positions[at++] = corner[0];
        positions[at++] = corner[1];
        positions[at++] = corner[2];
        for (let i = 0; i < 3; i++) {
          positions[at++] = i === axis ? corner[i] - sign[i] * arm[i] : corner[i];
        }
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  /** Draw the brackets around a world-space box. */
  function showBox(box, colour = HIGHLIGHT_PLAIN) {
    if (!box || box.isEmpty()) { hide(); return; }
    box.getSize(size);
    box.getCenter(centre);
    shape(size.x + GROW, size.y + GROW, size.z + GROW);
    lines.position.copy(centre);
    material.color.setHex(colour);
    material.opacity = colour === HIGHLIGHT_PLAIN ? 0.55 : 0.9;
    lines.visible = true;
  }

  const cellBox = new THREE.Box3();

  /** Draw them around one block of the isle, given its centre. */
  function showCell(x, y, z, colour = HIGHLIGHT_PLAIN) {
    cellBox.min.set(x - 0.5, y - 0.5, z - 0.5);
    cellBox.max.set(x + 0.5, y + 0.5, z + 0.5);
    showBox(cellBox, colour);
  }

  function hide() {
    lines.visible = false;
  }

  return { showBox, showCell, hide, object: lines };
}
