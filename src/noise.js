// Small deterministic value-noise helpers. No dependencies, stable across runs
// so the island looks the same every time you launch the game.

function hash2(x, y, seed) {
  // Math.imul keeps every step in 32-bit integer space; plain `*` on constants
  // this large loses precision and collapses the hash to a constant.
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Value noise in [0, 1] over a continuous 2D domain. */
export function noise2(x, y, seed = 1337) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);

  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);

  return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf;
}

/** Layered value noise in [0, 1]. */
export function fbm2(x, y, octaves = 4, seed = 1337) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;

  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, y * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }

  return sum / norm;
}

/** Deterministic pseudo-random in [0, 1) from an integer index. */
export function rand(i, seed = 7) {
  return hash2(i, i * 31 + 17, seed);
}
