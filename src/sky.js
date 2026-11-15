import * as THREE from 'three';

/**
 * Things passing by in the void, every so often: comets streaking across the
 * far sky, and lumps of rock drifting slowly past the isle, tumbling.
 *
 * Asked for by name - before this nothing in the scene moved on its own.
 * It is dressing, not world generation, so it rolls `Math.random()` freely.
 * None of it takes a ray or casts a shadow: a click, the hover readout and
 * the camera's own collision all see straight through it.
 */

const COMET_EVERY = [5, 14];        // seconds between comets
const COMET_DIST = [200, 320];      // how far out across the sky
const COMET_SECONDS = [2.8, 4.5];
const TAIL = 14;

const ROCK_EVERY = [14, 30];        // seconds between rocks
const ROCK_MAX = 3;                 // at most this many drifting at once
const ROCK_PASS = [34, 70];         // closest they come to the middle of the isle
const ROCK_SPEED = [1.6, 3.2];      // blocks a second
const ROCK_SPAN = 110;              // where a rock starts and ends, off-centre

const between = ([a, b]) => a + Math.random() * (b - a);
const noRay = (o) => { o.raycast = () => {}; };

export function createSky(scene) {
  const group = new THREE.Group();
  group.name = 'sky';
  scene.add(group);

  // --- comets ---------------------------------------------------------------
  // A pale head and a tail of cubes behind it, smaller and fainter towards
  // the end - the same voxel look as the fire. Additive, so they glow.
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const comets = [];

  function makeComet() {
    const comet = new THREE.Group();
    const parts = [];
    for (let i = 0; i <= TAIL; i++) {
      const f = i / TAIL;
      const m = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.55 - f * 0.08, 0.8, 0.85 - f * 0.35),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false
      }));
      noRay(m);
      parts.push(m);
      comet.add(m);
    }
    comet.userData.parts = parts;
    comet.visible = false;
    group.add(comet);
    return comet;
  }

  function launchComet(comet) {
    // Start somewhere up in the sky and fall across it, mostly downward.
    const dist = between(COMET_DIST);
    const az = Math.random() * Math.PI * 2;
    const el = 0.25 + Math.random() * 0.6;
    const start = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(dist);
    // Sideways along the sky and down.
    const side = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az)).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
    const dir = side.multiplyScalar(0.8 + Math.random() * 0.6).add(new THREE.Vector3(0, -1, 0)).normalize();
    const seconds = between(COMET_SECONDS);
    Object.assign(comet.userData, {
      start, dir, seconds, age: 0,
      speed: dist * (0.28 + Math.random() * 0.2),
      size: 4 + Math.random() * 4,
      gap: 1.6 + Math.random() * 1.2
    });
    comet.visible = true;
  }

  function updateComet(comet, dt) {
    const d = comet.userData;
    d.age += dt;
    if (d.age >= d.seconds) { comet.visible = false; return; }
    const u = d.age / d.seconds;
    // In and out softly rather than popping.
    const fade = Math.min(1, u / 0.15) * Math.min(1, (1 - u) / 0.3);
    const head = d.start.clone().addScaledVector(d.dir, d.speed * d.age);
    d.parts.forEach((m, i) => {
      const f = i / TAIL;
      m.position.copy(head).addScaledVector(d.dir, -i * d.gap * d.size * 0.6);
      m.scale.setScalar(d.size * (1 - f * 0.8));
      m.rotation.set(d.age * 2 + i, d.age * 3 + i * 0.7, 0);
      m.material.opacity = fade * Math.pow(1 - f, 0.7);
    });
  }

  // --- drifting rocks ---------------------------------------------------------
  // A clump of a few stone cubes, lit like the isle's own stone, crossing
  // past at a distance and turning slowly as it goes.
  const rocks = [];
  const STONES = [0x7d838c, 0x6a7078, 0x8f949b, 0x5c6168];

  function makeRock() {
    const rock = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 6);
    const scale = 0.8 + Math.random() * 1.8;
    for (let i = 0; i < n; i++) {
      const s = (0.5 + Math.random() * 0.9) * scale;
      const m = new THREE.Mesh(cubeGeo, new THREE.MeshStandardMaterial({
        color: STONES[Math.floor(Math.random() * STONES.length)],
        roughness: 0.95
      }));
      m.scale.set(s, s * (0.7 + Math.random() * 0.5), s);
      if (i) m.position.set((Math.random() - 0.5) * scale * 1.4, (Math.random() - 0.5) * scale, (Math.random() - 0.5) * scale * 1.4);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      noRay(m);
      rock.add(m);
    }
    // A pass along a straight line that comes no nearer the isle than
    // ROCK_PASS, from one side of the view to the other.
    const az = Math.random() * Math.PI * 2;
    const pass = between(ROCK_PASS);
    const across = new THREE.Vector3(-Math.sin(az), (Math.random() - 0.5) * 0.15, Math.cos(az)).normalize();
    const nearest = new THREE.Vector3(Math.cos(az) * pass, -12 + Math.random() * 26, Math.sin(az) * pass);
    Object.assign(rock.userData, {
      from: nearest.clone().addScaledVector(across, -ROCK_SPAN),
      dir: across,
      speed: between(ROCK_SPEED),
      travelled: 0,
      spin: new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)
    });
    rock.position.copy(rock.userData.from);
    group.add(rock);
    return rock;
  }

  function dropRock(rock) {
    group.remove(rock);
    rock.traverse((o) => { if (o.isMesh) o.material.dispose(); });
  }

  // --- the clock --------------------------------------------------------------
  let nextComet = 2 + Math.random() * 4;
  let nextRock = 3;
  const cometPool = [makeComet(), makeComet()];

  function update(dt) {
    nextComet -= dt;
    if (nextComet <= 0) {
      const free = cometPool.find((c) => !c.visible);
      if (free) launchComet(free);
      nextComet = between(COMET_EVERY);
    }
    for (const comet of cometPool) if (comet.visible) updateComet(comet, dt);

    nextRock -= dt;
    if (nextRock <= 0) {
      if (rocks.length < ROCK_MAX) rocks.push(makeRock());
      nextRock = between(ROCK_EVERY);
    }
    for (let i = rocks.length - 1; i >= 0; i--) {
      const rock = rocks[i];
      const d = rock.userData;
      d.travelled += d.speed * dt;
      rock.position.copy(d.from).addScaledVector(d.dir, d.travelled);
      rock.rotation.x += d.spin.x * dt;
      rock.rotation.y += d.spin.y * dt;
      rock.rotation.z += d.spin.z * dt;
      if (d.travelled > ROCK_SPAN * 2) { dropRock(rock); rocks.splice(i, 1); }
    }
  }

  return { update, group, comets: cometPool, rocks };
}
