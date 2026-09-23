import * as THREE from 'three';

/**
 * The X-ray cut: when the agent being watched is hidden behind the isle or
 * something standing on it, whatever lies between the camera and them is cut
 * away so they can be seen, and whatever lies beyond them is left alone.
 *
 * The isle loses WHOLE BLOCKS. The isle's instanced meshes get a few lines
 * of shader that ask where each block's CENTRE is, and throw the entire
 * block away if that centre is inside a tube running from the eye to the
 * agent's chest. It used to test each fragment instead, which cut a round
 * lens through the terrain with the edges of blocks sliced off along it -
 * a hole in the picture rather than blocks taken out of the way. Testing
 * the centre makes it all of a block or none of it. Being a shader it still
 * follows the camera round as it orbits, and the instance matrices are
 * never touched, so digging and farmland are none the wiser.
 *
 * The one block the agent is standing on is never taken (`uCutKeep`), or
 * they would be left standing on nothing. Everything else in the tube goes,
 * lower ground included - holding back everything below their feet left
 * whole slopes standing in the way when the camera looked down at them.
 *
 * Props are not cut, they are HIDDEN, whole. A tree sliced down the middle
 * by the tube read as a broken model rather than as something moved out of
 * the way, so anything standing in the tube is put on a layer the camera
 * does not draw. That same layer is one the pointer's raycaster does not
 * test, so a click goes straight through a hidden tree to whatever is behind
 * it - and the sun's shadow pass skips it too, so it does not leave its
 * shadow lying over the agent it was hidden to reveal.
 *
 * It only opens when something actually is in the way. Standing in the open
 * the radius is 0 and nothing is thrown away; it grows over a fraction of a
 * second when the agent goes out of sight, and shuts again a moment after
 * they come back into it, so a line of sight that just grazes a ridge does
 * not flicker the hole open and shut.
 *
 * The shadow pass is left as it is - a hill that is cut away for the camera
 * still stands in the sun's way, which is the world being honest about it.
 */

const RADIUS = 3.3;          // how far a block's centre may be from the line - wide, so the gap is a proper view and not a slot
const SHORT_OF = 0;          // right up to the agent: the one block they stand on is kept on its own (uCutKeep), and stopping short left the blocks beside them covering them
const CHEST = 0.9;           // the height on the agent the tube is aimed at
const OPEN_RATE = 16;        // blocks of radius a second, growing or shrinking
const LINGER = 0.35;         // seconds it stays open once they are back in view
const HIDDEN_LAYER = 1;      // a layer nothing renders or picks from

export function createCutaway({ island, propsGroup, props, camera }) {
  const uniforms = {
    uCutEye: { value: new THREE.Vector3() },
    uCutAt: { value: new THREE.Vector3() },
    uCutRadius: { value: 0 },
    uCutKeep: { value: new THREE.Vector3(0, -1e9, 0) }
  };

  // Off with G. When off nothing is ever cut or hidden, whoever is selected.
  let enabled = true;

  const patched = new WeakSet();

  /**
   * Give one of the isle's materials the cut. Only instanced meshes are
   * patched - the isle's blocks. Props are hidden whole by layer instead,
   * and the agents are never cut at all.
   */
  function patch(material) {
    if (!material || patched.has(material)) return;
    if (!material.isMeshStandardMaterial) return;
    patched.add(material);

    const before = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      before?.call(material, shader, renderer);
      Object.assign(shader.uniforms, uniforms);

      // Where each fragment is in the world. Worked out here rather than
      // borrowed from three's own `worldPosition`, which only exists when
      // some other feature happens to have asked for it - and the isle is
      // instanced, so the instance's own matrix has to go in too.
      // The CENTRE of the block this vertex belongs to, which every vertex
      // of the block agrees on - so the test below says yes or no for the
      // whole block at once. A block pressed down into a plot is still
      // centred on its cell as far as this is concerned, near enough.
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 cutAt = vec4( 0.0, 0.0, 0.0, 1.0 );
          #ifdef USE_INSTANCING
            cutAt = instanceMatrix * cutAt;
          #endif
          vCutWorld = ( modelMatrix * cutAt ).xyz;`);

      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vCutWorld;
          uniform vec3 uCutEye;
          uniform vec3 uCutAt;
          uniform float uCutRadius;
          uniform vec3 uCutKeep;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if ( uCutRadius > 0.001 ) {
            vec3 cutAxis = uCutAt - uCutEye;
            float cutLen = length( cutAxis );
            vec3 cutDir = cutAxis / cutLen;
            vec3 cutRel = vCutWorld - uCutEye;
            float cutT = dot( cutRel, cutDir );
            if ( distance( vCutWorld, uCutKeep ) > 0.3
                 && cutT > 0.0 && cutT < cutLen - ${SHORT_OF.toFixed(2)}
                 && length( cutRel - cutDir * cutT ) < uCutRadius ) discard;
          }`);
    };
    // Every patched material compiles to the same extra code, so they can
    // share programs with each other - just not with unpatched ones.
    material.customProgramCacheKey = () => 'cutaway';
    material.needsUpdate = true;
  }

  /** Give everything under an object the cut. Idempotent. */
  function watch(object) {
    object.traverse((o) => {
      if (!o.material || !o.isInstancedMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) patch(m);
    });
  }

  // --- is the agent hidden at all? -----------------------------------------

  const eye = new THREE.Vector3();
  const at = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  // Every layer: a prop that is hidden BECAUSE it is in the way is still in
  // the way, or hiding it would shut the cut and show it again next frame.
  ray.layers.enableAll();

  /**
   * Whether the isle or a prop stands between the eye and the agent.
   *
   * The isle is walked through its own voxel test rather than raycast - it
   * is thousands of instanced blocks and a cast at it costs half a
   * millisecond, while stepping along the line asking `isSolid` costs next
   * to nothing. The props are cast at, which is cheap; the hit pads that let
   * a sunken plot be clicked are invisible and hide nothing, so they are
   * skipped.
   */
  function blockedTo(point) {
    const len = eye.distanceTo(point) - 0.35;
    if (len <= 0) return false;
    dir.subVectors(point, eye).normalize();

    for (let t = 0.3; t < len; t += 0.2) {
      probe.copy(eye).addScaledVector(dir, t);
      if (island.userData.isSolid(Math.round(probe.x), Math.round(probe.y), Math.round(probe.z))) return true;
    }

    ray.set(eye, dir);
    ray.far = len;
    return ray.intersectObject(propsGroup, true).some((hit) => !hit.object.userData.isHitPad);
  }

  // Head, chest, feet and both shoulders, relative to where they stand.
  const MARKS = [[0, 1.45, 0], [0, 0.9, 0], [0, 0.2, 0], [0.28, 0.9, 0], [-0.28, 0.9, 0]];
  const mark = new THREE.Vector3();
  const side = new THREE.Vector3();

  /**
   * Whether the agent is FULLY out of sight - every one of a handful of
   * points on them, head to feet and shoulder to shoulder, blocked. A cut
   * that opened the moment a ridge hid their feet took the scenery away
   * while the agent was still plainly standing there.
   */
  function hidden(agent) {
    const base = agent.mesh.position;
    // "Sideways" is across the line of sight, so the shoulders are the ones
    // the camera would actually see either side of them.
    side.subVectors(base, eye).setY(0);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize().set(-side.z, 0, side.x);
    return MARKS.every(([s, y]) => blockedTo(mark.copy(base).addScaledVector(side, s).setY(base.y + y)));
  }

  // --- the props in the way -------------------------------------------------

  const hiddenProps = new Set();
  const box = new THREE.Box3();
  const meet = new THREE.Vector3();

  /** Every mesh of a prop onto a layer, outlines and hit pads included. */
  function putOn(prop, layer) {
    prop.mesh.traverse((o) => o.layers.set(layer));
  }

  /**
   * The props in the tube AND in front of the agent.
   *
   * In the tube: the box comes within `RADIUS` of the line from the eye to
   * the agent, the same width the isle is cut to, so everything between the
   * camera and them clears out together.
   *
   * In front: the box's own middle is nearer the eye, along that line, than
   * the agent is by at least `BEHIND_MARGIN`. This is the half that was
   * wrong. The test used to be where the line first ENTERED the box grown by
   * the whole radius - 3.3 blocks of padding - so a tree standing well
   * BEHIND the agent was "entered" long before the line reached them and
   * vanished from behind them. Measuring the prop itself puts camera ->
   * agent -> tree back the right way round: the tree stays. Something level
   * with the agent, beside them, stays too.
   */
  const BEHIND_MARGIN = 0.5;
  const mid = new THREE.Vector3();
  const onLine = new THREE.Vector3();
  function propsInTheWay() {
    const inWay = new Set();
    const len = eye.distanceTo(at);
    if (len <= 0) return inWay;
    dir.subVectors(at, eye).normalize();

    for (const prop of props) {
      if (prop.gone) continue;
      box.setFromObject(prop.mesh);
      box.getCenter(mid);
      const t = mid.sub(eye).dot(dir);
      if (t <= 0 || t > len - BEHIND_MARGIN) continue;       // behind the eye, or at/behind the agent
      onLine.copy(eye).addScaledVector(dir, t);
      if (box.distanceToPoint(onLine) < RADIUS) inWay.add(prop);
    }
    return inWay;
  }

  /** Hide exactly `wanted`, bringing back anything no longer in it. */
  function hideOnly(wanted) {
    for (const prop of hiddenProps) {
      if (wanted.has(prop)) continue;
      putOn(prop, 0);
      hiddenProps.delete(prop);
    }
    for (const prop of wanted) {
      if (hiddenProps.has(prop)) continue;
      putOn(prop, HIDDEN_LAYER);
      hiddenProps.add(prop);
    }
  }

  let radius = 0;
  let linger = 0;

  /**
   * Once a frame: aim the tube at `agent` (or nobody) from wherever the
   * camera is now, and open or close it.
   */
  function update(agent, dt) {
    let want = 0;
    if (agent && enabled) {
      eye.copy(camera.position);
      at.copy(agent.mesh.position);
      at.y += CHEST;
      // The block under their feet: their cell, one half block below them.
      // Read off the heightmap rather than the agent's own height, which
      // bobs through the air mid-hop.
      const kx = Math.round(agent.x);
      const kz = Math.round(agent.z);
      uniforms.uCutKeep.value.set(kx, island.userData.surface.get(`${kx},${kz}`) ?? -1e9, kz);
      if (hidden(agent)) linger = LINGER;
      else linger = Math.max(0, linger - dt);
      if (linger > 0) want = RADIUS;
    } else {
      linger = 0;
    }

    const step = OPEN_RATE * dt;
    radius = want > radius ? Math.min(want, radius + step) : Math.max(want, radius - step);

    uniforms.uCutEye.value.copy(eye);
    uniforms.uCutAt.value.copy(at);
    uniforms.uCutRadius.value = radius;

    // Props go the moment the tube opens and come back the moment it shuts;
    // they are whole things, so there is no size to grow them through.
    hideOnly(want > 0 && agent ? propsInTheWay() : new Set());
  }

  /**
   * Whether a point in the world is inside the cut right now - the same test
   * the shader makes. A click or a hover that lands on a face nobody can see
   * has to go through it to whatever is actually on screen, or clicking the
   * agent through the hole would walk them into the hill instead.
   */
  function hides(point) {
    if (radius <= 0.001) return false;
    if (point.distanceTo(uniforms.uCutKeep.value) < 0.3) return false;
    const axis = dir.subVectors(uniforms.uCutAt.value, uniforms.uCutEye.value);
    const len = axis.length();
    axis.divideScalar(len);
    probe.subVectors(point, uniforms.uCutEye.value);
    const t = probe.dot(axis);
    if (t <= 0 || t >= len - SHORT_OF) return false;
    return probe.addScaledVector(axis, -t).length() < radius;
  }

  /**
   * Whether a ray's hit is on a block the cut has taken away. The shader
   * decides by the block's centre, so this does too - the hit point itself
   * is on a face and would disagree along every edge.
   */
  const centre = new THREE.Vector3();
  const instance = new THREE.Matrix4();
  function hidesHit(hit) {
    if (!hit.object.isInstancedMesh || hit.instanceId === undefined) return false;
    hit.object.getMatrixAt(hit.instanceId, instance);
    centre.setFromMatrixPosition(instance).applyMatrix4(hit.object.matrixWorld);
    return hides(centre);
  }

  return {
    watch, update, hides, hidesHit, uniforms,
    get enabled() { return enabled; },
    /** G: switch the whole thing on or off. Off puts everything back. */
    toggle() {
      enabled = !enabled;
      if (!enabled) { radius = 0; linger = 0; uniforms.uCutRadius.value = 0; hideOnly(new Set()); }
      return enabled;
    },
    get radius() { return radius; },
    /** The props hidden right now, for anything that needs to know. */
    isHidden: (prop) => hiddenProps.has(prop)
  };
}
