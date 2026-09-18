import * as THREE from 'three';
import { rand } from './noise.js';

/**
 * The void the island hangs in: a nebula gradient shell and two star layers.
 * Nothing here moves - the scene is deliberately still.
 */
export function createSpace(scene) {
  // --- Nebula shell (inside-out sphere, painted by a gradient shader) ----
  const nebula = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1f3672) },
        midColor: { value: new THREE.Color(0x35195f) },
        bottomColor: { value: new THREE.Color(0x070814) },
        glowColor: { value: new THREE.Color(0x6aa6e0) }
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform vec3 glowColor;
        varying vec3 vPos;

        void main() {
          vec3 dir = normalize(vPos);
          float h = dir.y * 0.5 + 0.5;

          vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.55, h));
          col = mix(col, topColor, smoothstep(0.45, 1.0, h));

          // Faint cold bloom off to one side, like a distant star cluster.
          float bloom = pow(max(dot(dir, normalize(vec3(-0.6, 0.35, -0.7))), 0.0), 5.0);
          col += glowColor * bloom * 0.7;

          float far = pow(max(dot(dir, normalize(vec3(0.7, -0.2, 0.5))), 0.0), 9.0);
          col += vec3(0.42, 0.24, 0.55) * far * 0.5;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
  );
  nebula.name = 'nebula';
  scene.add(nebula);

  // --- Stars -------------------------------------------------------------
  const starLayers = [
    starField(2600, 320, 700, 1.7, 0.95),
    starField(1400, 180, 420, 1.1, 0.55)
  ];
  starLayers.forEach((layer) => scene.add(layer));

  // --- Lighting -----------------------------------------------------------
  const sun = new THREE.DirectionalLight(0xfff0d4, 2.4);
  sun.position.set(48, 62, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);

  // The frustum is wrapped tightly around the isle. At +/-40 most of the
  // shadow map was spent on empty void, leaving too few texels on the ground.
  sun.shadow.camera.near = 40;
  sun.shadow.camera.far = 140;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;

  // Blocky geometry self-shadows badly with a depth bias alone - it showed up
  // as hard dark half-quad triangles across flat ground. normalBias offsets
  // the lookup along the surface normal instead, which suits unit cubes.
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.06;
  sun.shadow.radius = 2.5;
  scene.add(sun);

  // Cool bounce from the void below, so the underside is not pitch black.
  // Kept close to neutral: a saturated blue here stains the whole flank and
  // the stone stops reading as stone.
  const rim = new THREE.DirectionalLight(0xa8b6c8, 0.85);
  rim.position.set(-40, -30, -25);
  scene.add(rim);

  // Soft up-light so the flat underside of the isle is readable from below.
  const underglow = new THREE.DirectionalLight(0x93a2b8, 0.5);
  underglow.position.set(0, -50, 8);
  scene.add(underglow);

  // Fill, so the block faces turned away from the sun read as shaded stone
  // rather than as black holes in the ground.
  scene.add(new THREE.HemisphereLight(0xb8cdec, 0x3b3f4c, 0.8));
  scene.add(new THREE.AmbientLight(0x4b5064, 0.7));

  return {
    sun,
    starLayers
  };
}

function starField(count, innerRadius, outerRadius, size, opacity) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Uniform direction on the sphere, random distance in the shell.
    const u = rand(i, 101) * 2 - 1;
    const theta = rand(i, 202) * Math.PI * 2;
    const r = innerRadius + rand(i, 303) * (outerRadius - innerRadius);
    const s = Math.sqrt(Math.max(0, 1 - u * u));

    positions[i * 3 + 0] = Math.cos(theta) * s * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(theta) * s * r;

    // Mostly white, some blue and a few warm ones.
    const pick = rand(i, 404);
    if (pick > 0.9) tint.setHex(0xffd9a8);
    else if (pick > 0.6) tint.setHex(0xa8c8ff);
    else tint.setHex(0xffffff);

    const b = 0.5 + rand(i, 505) * 0.5;
    colors[i * 3 + 0] = tint.r * b;
    colors[i * 3 + 1] = tint.g * b;
    colors[i * 3 + 2] = tint.b * b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      fog: false
    })
  );
  points.name = 'stars';
  return points;
}

