import * as THREE from 'three';
import { rand } from './noise.js';

/**
 * The void the island hangs in: a nebula gradient shell, two star layers and
 * a slow belt of debris blocks. Everything is added to the scene and the
 * animated bits are returned for the render loop.
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

  // --- Debris belt --------------------------------------------------------
  const debris = createDebris(70);
  scene.add(debris);

  // --- Lighting -----------------------------------------------------------
  const sun = new THREE.DirectionalLight(0xfff0d4, 2.4);
  sun.position.set(48, 62, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // Cool bounce from the void below, so the underside is not pitch black.
  const rim = new THREE.DirectionalLight(0x8fb0e0, 1.15);
  rim.position.set(-40, -30, -25);
  scene.add(rim);

  // Soft up-light so the flat underside of the isle is readable from below.
  const underglow = new THREE.DirectionalLight(0x7c9ade, 0.6);
  underglow.position.set(0, -50, 8);
  scene.add(underglow);

  scene.add(new THREE.HemisphereLight(0x8fb6ff, 0x1a2444, 0.6));
  scene.add(new THREE.AmbientLight(0x243056, 0.6));

  return {
    sun,

    /**
     * Swing the sun around the island for the colony's day/night cycle.
     * @param {number} t 0 = midnight, 0.5 = midday.
     */
    setDayPhase(t) {
      const angle = (t - 0.25) * Math.PI * 2;
      const height = Math.sin(angle);
      sun.position.set(Math.cos(angle) * 60, height * 70, 34);

      const daylight = Math.max(0, height);
      sun.intensity = 0.25 + daylight * 2.3;
      sun.color.setHSL(0.09 + daylight * 0.04, 0.55 - daylight * 0.35, 0.55 + daylight * 0.2);
      underglow.intensity = 0.6 + (1 - daylight) * 0.35;
      rim.intensity = 0.9 + (1 - daylight) * 0.6;
    },

    /** Called once per frame from the render loop. */
    update(elapsed, delta) {
      starLayers[0].rotation.y = elapsed * 0.004;
      starLayers[1].rotation.y = -elapsed * 0.007;
      debris.rotation.y += delta * 0.035;
      debris.children.forEach((rock, i) => {
        rock.rotation.x += delta * (0.12 + rand(i, 3) * 0.25);
        rock.rotation.z += delta * (0.08 + rand(i, 9) * 0.2);
      });
    }
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

function createDebris(count) {
  const group = new THREE.Group();
  group.name = 'debris';

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x6b7285,
    roughness: 0.9,
    metalness: 0.08
  });

  for (let i = 0; i < count; i++) {
    const rock = new THREE.Mesh(geometry, material);

    const angle = rand(i, 11) * Math.PI * 2;
    const radius = 60 + rand(i, 22) * 110;
    const height = (rand(i, 33) - 0.5) * 80;
    const scale = 0.5 + Math.pow(rand(i, 44), 2) * 3.4;

    rock.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    rock.scale.setScalar(scale);
    rock.rotation.set(rand(i, 55) * Math.PI, rand(i, 66) * Math.PI, rand(i, 77) * Math.PI);
    group.add(rock);
  }

  return group;
}
