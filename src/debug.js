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

    reset() {
      renderer.shadowMap.enabled = original.shadows;
      sun.shadow.bias = original.bias;
      sun.shadow.normalBias = original.normalBias;
      sun.shadow.radius = original.radius;
      this.frustum(original.frustum);
      fills.forEach((l, i) => { l.intensity = original.fills[i]; });
      sun.intensity = original.sun;
      this.flat(false);
      say('back to normal');
    }
  };
}
