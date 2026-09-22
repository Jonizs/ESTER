import * as THREE from 'three';

/**
 * Click markers: the little wave that pulses out of the ground where the
 * agent has been sent, the way a move order reads in a MOBA.
 *
 * A couple of rings expand and fade from the same spot, staggered slightly so
 * it reads as a pulse rather than a single blink. Rings come from a fixed pool
 * - nothing is allocated per click.
 *
 * Green on purpose: the selection ring under the agent is the UI accent cyan,
 * and the two read as the same thing if the wave borrows that colour.
 */

const LIFE = 0.55;       // seconds a single ring lives for
const RINGS = 2;         // rings per ping
const STAGGER = 0.13;    // seconds between them
const POOL = 10;

export function createMarkers(scene, { color = 0x7df5a5 } = {}) {
  const group = new THREE.Group();
  group.name = 'markers';
  scene.add(group);

  const geometry = new THREE.RingGeometry(0.34, 0.46, 36);
  const rings = [];

  for (let i = 0; i < POOL; i++) {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    mesh.rotation.x = -Math.PI / 2;   // flat on the ground
    mesh.renderOrder = 2;
    mesh.visible = false;
    // Never a click target. A spent ring is only hidden, and three.js still
    // raycasts hidden meshes - so a ring left lying where an earlier click
    // landed caught the next click that passed through it, and the agent
    // walked to the cell under the old ring instead of the one under the
    // cursor.
    mesh.raycast = () => {};
    group.add(mesh);
    rings.push({ mesh, active: false, age: 0, delay: 0 });
  }

  /** Pulse a wave at a point on the ground. */
  function ping(x, y, z) {
    let placed = 0;
    for (const ring of rings) {
      if (ring.active) continue;
      ring.active = true;
      ring.age = 0;
      ring.delay = placed * STAGGER;
      // Just clear of the block face, so it does not z-fight with the turf.
      ring.mesh.position.set(x, y + 0.04, z);
      ring.mesh.visible = false;
      if (++placed === RINGS) break;
    }
  }

  function update(dt) {
    for (const ring of rings) {
      if (!ring.active) continue;
      ring.age += dt;

      const t = (ring.age - ring.delay) / LIFE;
      if (t < 0) continue;             // still waiting its turn
      if (t >= 1) {
        ring.active = false;
        ring.mesh.visible = false;
        ring.mesh.material.opacity = 0;
        continue;
      }

      ring.mesh.visible = true;
      const scale = 0.45 + t * 1.05;
      ring.mesh.scale.set(scale, scale, scale);
      ring.mesh.material.opacity = Math.pow(1 - t, 1.5) * 0.9;
    }
  }

  return { group, ping, update };
}
