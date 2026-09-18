import * as THREE from 'three';

/**
 * Console helpers for pinning down a rendering artifact that only shows up on
 * real hardware. Headless Chromium runs on SwiftShader, so anything the GPU
 * does differently has to be narrowed down on the machine that can see it.
 *
 * Open devtools (F12) and call these on `ESTER.debug`. Each one prints what it
 * did; `reset()` puts everything back.
 */
export function createDebug({ renderer, scene, island, props }) {
  const sun = scene.children.find((c) => c.isDirectionalLight && c.castShadow);
  const fills = scene.children.filter(
    (c) => (c.isDirectionalLight && !c.castShadow) || c.isHemisphereLight || c.isAmbientLight
  );

  const original = {
    shadows: renderer.shadowMap.enabled,
    bias: sun.shadow.bias,
    normalBias: sun.shadow.normalBias,
    radius: sun.shadow.radius,
    frustum: sun.shadow.camera.right,
    fills: fills.map((l) => l.intensity),
    sun: sun.intensity,
    materials: new Map()
  };

  // Every island and prop material, so `flat()` can swap them and put them back.
  const lit = [];
  for (const group of [island, ...props.map((p) => p.mesh)]) {
    group.traverse((o) => {
      if (!o.material || !o.material.isMeshStandardMaterial) return;
      lit.push(o);
      original.materials.set(o, o.material);
    });
  }

  const refresh = () => scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  const say = (msg) => console.log(`[ESTER debug] ${msg}`);

  return {
    /** Shadows off. If the bright slivers survive this, they are not shadows. */
    shadows(on = false) {
      renderer.shadowMap.enabled = on;
      refresh();
      say(`shadows ${on ? 'on' : 'off'}`);
    },

    /** The two shadow biases, the usual cause of light leaking at contacts. */
    bias(value = 0) { sun.shadow.bias = value; say(`shadow.bias = ${value}`); },
    normalBias(value = 0) { sun.shadow.normalBias = value; say(`shadow.normalBias = ${value}`); },

    /**
     * Widen the shadow camera. The isle's bounding sphere is about 25 across
     * and the frustum is 22, so the far corners may fall outside it and come
     * out unshadowed.
     */
    frustum(half = 28) {
      const c = sun.shadow.camera;
      c.left = -half; c.right = half; c.top = half; c.bottom = -half;
      c.updateProjectionMatrix();
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      say(`shadow frustum = +/-${half}`);
    },

    /** Drop the fill lights, leaving the sun. Shows if a fill is doing it. */
    sunOnly() {
      fills.forEach((l) => { l.intensity = 0; });
      say('fill lights off, sun only');
    },

    /**
     * No lighting at all - flat colour per block. Nothing here is lit, shaded
     * or shadowed, so anything bright that survives this is geometry or the
     * rasteriser, not the lighting.
     */
    flat(on = true) {
      for (const o of lit) {
        if (on) {
          const base = original.materials.get(o);
          o.material = new THREE.MeshBasicMaterial({ color: base.color, vertexColors: base.vertexColors });
        } else {
          o.material = original.materials.get(o);
        }
      }
      refresh();
      say(`flat (unlit) ${on ? 'on' : 'off'}`);
    },

    /**
     * Print this exact camera, so the same view can be set up elsewhere.
     * The artifact does not show in headless Chromium, and the likeliest
     * reason left is that the angle was never matched.
     */
    where() {
      const { camera, controls } = window.ESTER;
      const pose = {
        position: camera.position.toArray().map((n) => +n.toFixed(3)),
        quaternion: camera.quaternion.toArray().map((n) => +n.toFixed(4)),
        target: controls.target.toArray().map((n) => +n.toFixed(3)),
        distance: +controls.distance.toFixed(3)
      };
      console.log('[ESTER debug] camera pose - copy this whole line:');
      console.log(JSON.stringify(pose));
      return pose;
    },

    /**
     * Cycle candidate shadow setups. Call try(1), try(2)... and say which
     * number makes the bright dashes go; try(0) is what the game ships with.
     */
    try(n = 0) {
      const cam = sun.shadow.camera;
      const setSide = (side) => {
        scene.traverse((o) => { if (o.material && o.castShadow) o.material.shadowSide = side; });
      };
      const setMap = (size) => {
        sun.shadow.mapSize.set(size, size);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      };

      // start from what ships, then change the one thing
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      sun.shadow.bias = -0.0001;
      sun.shadow.normalBias = 0;
      setSide(null);
      setMap(4096);

      const presets = {
        0: 'as shipped',
        1: 'stronger depth bias (-0.001)',
        2: 'much stronger depth bias (-0.004)',
        3: 'PCF filtering instead of PCF soft',
        4: 'hard shadows, no filtering',
        5: 'cast from front faces, normalBias 0.02',
        6: 'shadow map 8192',
        7: 'shadow map 1024 (should make it worse - confirms it is the map)'
      };
      if (n === 1) sun.shadow.bias = -0.001;
      if (n === 2) sun.shadow.bias = -0.004;
      if (n === 3) renderer.shadowMap.type = THREE.PCFShadowMap;
      if (n === 4) renderer.shadowMap.type = THREE.BasicShadowMap;
      if (n === 5) { setSide(THREE.FrontSide); sun.shadow.normalBias = 0.02; }
      if (n === 6) setMap(8192);
      if (n === 7) setMap(1024);

      cam.updateProjectionMatrix();
      refresh();
      say(`try(${n}): ${presets[n] ?? 'unknown'}`);
    },

    reset() {
      renderer.shadowMap.enabled = original.shadows;
      sun.shadow.bias = original.bias;
      sun.shadow.normalBias = original.normalBias;
      sun.shadow.radius = original.radius;
      this.frustum(original.frustum);
      fills.forEach((l, i) => { l.intensity = original.fills[i]; });
      sun.intensity = original.sun;
      this.flat(false);
      scene.traverse((o) => { if (o.material && o.castShadow) o.material.shadowSide = null; });
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      sun.shadow.mapSize.set(4096, 4096);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      refresh();
      say('back to normal');
    }
  };
}
