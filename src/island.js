import * as THREE from 'three';
import { fbm2, noise2, rand } from './noise.js';

const BLOCK = 1;

// Neighbouring blocks sit exactly one unit apart, so a unit cube meets the
// next one edge to edge with nothing to spare. At that seam the rasteriser
// has two surfaces claiming the same pixel and can let a sliver of whatever
// is behind through - against a shaded wall that is the brightly lit ground
// beyond, which reads as a hard bright dash at the foot of the wall, one per
// block. Drawing each cube a hair oversized makes neighbours overlap instead
// of meeting, which closes the seam. Positions stay on whole numbers, so
// nothing else in the game has to know.
const SEAM_OVERLAP = 0.004;
const RADIUS = 15;
const SEED = 20260917;

// Palette for the isle: grass all over the top, then soil over stone, with
// bedrock at the keel tip.
const LAYERS = {
  grass: { color: 0x4fae78, roughness: 0.88, metalness: 0.0 },
  moss: { color: 0x3a8a5e, roughness: 0.9, metalness: 0.0 },
  dirt: { color: 0x6d503c, roughness: 0.95, metalness: 0.0 },
  stone: { color: 0x8b8d92, roughness: 0.82, metalness: 0.03 },
  bedrock: { color: 0x5a6173, roughness: 0.8, metalness: 0.06, emissive: 0x16283c, emissiveIntensity: 0.12 }
};

// Buried blocks are drawn from the same palette, so the isle is layered all
// the way through rather than being a painted shell around a void. They are
// split into their own meshes purely so they can skip the shadow pass: the
// surface already occludes the light, so including them would only cost time.
const CORE_SUFFIX = ':core';

const key = (x, y, z) => `${x},${y},${z}`;

/**
 * Builds the voxel island: a noisy disc of terrain with a tapering rocky
 * underside, rendered as one InstancedMesh per material layer.
 *
 * Returns a THREE.Group centred on the origin.
 */
export function createIsland() {
  const group = new THREE.Group();
  group.name = 'island';

  const cells = [];
  const filled = new Set();
  // "x,z" -> y of the topmost block: the ground anything on the isle stands on.
  const surface = new Map();

  // --- Pass 1: height of each column --------------------------------------
  const columns = new Map();
  for (let x = -RADIUS; x <= RADIUS; x++) {
    for (let z = -RADIUS; z <= RADIUS; z++) {
      const dist = Math.hypot(x, z);

      // Wobbly coastline instead of a perfect circle.
      const edge = RADIUS * (0.72 + 0.34 * fbm2(x * 0.11, z * 0.11, 3, SEED));
      if (dist > edge) continue;

      const inland = 1 - dist / edge;

      // Surface relief: rolling hills plus a couple of sharper ridges.
      // Broad shape from one low-frequency octave (fbm alone averages toward
      // the middle and flattens the whole island), plus hills and a ridge.
      const base = noise2(x * 0.085, z * 0.085, SEED + 5);
      const hills = fbm2(x * 0.17, z * 0.17, 3, SEED + 7);
      const ridge = Math.pow(noise2(x * 0.05, z * 0.05, SEED + 11), 2.4);
      const top = Math.round(base * 4.5 + (hills - 0.5) * 3 + ridge * 2.5 - 1);

      // Underside: an iceberg keel tapering to a point under the centre,
      // kept shorter than the island is wide so it does not dominate.
      const bulk = Math.pow(inland, 1.4);
      const jitter = fbm2(x * 0.19, z * 0.19, 2, SEED + 23);
      const bottom = -Math.round(1 + bulk * 11 + jitter * 2);

      columns.set(`${x},${z}`, { x, z, top, bottom });
    }
  }

  // --- Pass 1b: flatten out single-cell pits and spikes --------------------
  // Rounding the noise leaves isolated one-block dents. Their side walls face
  // away from the sun and read as hard dark blotches on otherwise open ground,
  // so a median pass over each column's neighbourhood smooths them away while
  // leaving the broad hills and ridges intact.
  for (let pass = 0; pass < 2; pass++) {
    const smoothed = new Map();
    for (const [cellKey, column] of columns) {
      const heights = [column.top];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighbour = columns.get(`${column.x + dx},${column.z + dz}`);
        if (neighbour) heights.push(neighbour.top);
      }
      heights.sort((a, b) => a - b);
      smoothed.set(cellKey, heights[Math.floor(heights.length / 2)]);
    }
    for (const [cellKey, top] of smoothed) columns.get(cellKey).top = top;
  }

  // --- Pass 1c: stack the blocks ------------------------------------------
  let deepest = 0;
  for (const column of columns.values()) if (column.bottom < deepest) deepest = column.bottom;

  for (const { x, z, top, bottom } of columns.values()) {
    surface.set(`${x},${z}`, top);

    for (let y = bottom; y <= top; y++) {
      filled.add(key(x, y, z));
      cells.push({ x, y, z, top });
    }
  }

  // --- Pass 2: sort every block into a material ---------------------------
  // The isle is solid. Buried blocks are kept and layered like the rest; they
  // are simply bucketed separately so they can be drawn without shadows.
  const buckets = {};
  const bucketFor = (name) => (buckets[name] ??= []);

  for (const cell of cells) {
    const { x, y, z, top } = cell;

    const buried =
      filled.has(key(x + 1, y, z)) &&
      filled.has(key(x - 1, y, z)) &&
      filled.has(key(x, y + 1, z)) &&
      filled.has(key(x, y - 1, z)) &&
      filled.has(key(x, y, z + 1)) &&
      filled.has(key(x, y, z - 1));
    const fromTop = top - y;

    let layer;
    if (fromTop === 0) {
      // The whole surface is turf - no bare patches of earth or stone worn
      // through it.
      layer = 'grass';
    } else if (fromTop === 1) {
      layer = 'moss';
    } else if (fromTop <= 3) {
      layer = 'dirt';
    } else if (y <= deepest + 2) {
      // Only the last few blocks of the whole isle, at the tip of the keel.
      layer = 'bedrock';
    } else {
      layer = 'stone';
    }

    bucketFor(buried ? layer + CORE_SUFFIX : layer).push(cell);
  }

  // --- Pass 3: one InstancedMesh per layer -------------------------------
  // Where every block ended up, so one can be dug out again later.
  const blocks = new Map();

  const size = BLOCK + SEAM_OVERLAP;
  const geometry = new THREE.BoxGeometry(size, size, size);
  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();

  for (const [name, list] of Object.entries(buckets)) {
    if (list.length === 0) continue;

    const hidden = name.endsWith(CORE_SUFFIX);
    const spec = LAYERS[hidden ? name.slice(0, -CORE_SUFFIX.length) : name];
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: spec.roughness,
      metalness: spec.metalness,
      emissive: spec.emissive ?? 0x000000,
      emissiveIntensity: spec.emissiveIntensity ?? 0
    });

    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.name = `island-${name}`;
    // Buried blocks skip the shadow *pass* - the surface occludes the light,
    // so rendering them into the shadow map is work for nothing. They do
    // still RECEIVE: once a shovel takes the block above one out, that
    // buried block is the floor of a pit and has to be shaded by the walls
    // around it, or a dug hole comes out as a bright square. Receiving is
    // the cheap half of it and only costs where a fragment is actually
    // drawn, which for a buried block is nowhere until it is dug out.
    mesh.castShadow = !hidden;
    mesh.receiveShadow = true;

    list.forEach((cell, i) => {
      matrix.makeTranslation(cell.x * BLOCK, cell.y * BLOCK, cell.z * BLOCK);
      mesh.setMatrixAt(i, matrix);
      // Which instance of which mesh holds this block, and what it is made
      // of - so a block can be found again and taken out.
      blocks.set(key(cell.x, cell.y, cell.z), {
        mesh,
        index: i,
        layer: hidden ? name.slice(0, -CORE_SUFFIX.length) : name
      });

      // Per-block shade variation so flat faces do not read as one slab.
      // It only ever darkens: multiplying a layer colour above 1 pushed the
      // brightest blocks past what the tone mapping can hold, and they clipped
      // out as hard bright slivers against their neighbours.
      const shade = 0.90 + 0.10 * rand(Math.imul(cell.x, 73856093) ^ Math.imul(cell.y, 19349663) ^ Math.imul(cell.z, 83492791), SEED);
      tint.setHex(spec.color).multiplyScalar(shade);
      mesh.setColorAt(i, tint);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }

  group.userData.blockCount = Object.values(buckets).reduce((n, l) => n + l.length, 0);
  group.userData.surfaceBlockCount = Object.entries(buckets)
    .filter(([name]) => !name.endsWith(CORE_SUFFIX))
    .reduce((n, [, list]) => n + list.length, 0);
  group.userData.surface = surface;

  // Is this block coordinate inside the isle? Every column is solid from its
  // bottom to its top, so the columns map answers it without a voxel set.
  // The camera uses it to keep itself out of the ground.
  group.userData.isSolid = (x, y, z) => {
    const column = columns.get(`${x},${z}`);
    return !!column && y >= column.bottom && y <= column.top;
  };

  /** What a block is made of: 'grass', 'dirt', 'stone', 'bedrock'. */
  group.userData.layerAt = (x, y, z) => blocks.get(key(x, y, z))?.layer ?? null;

  /**
   * Take the top block off a column.
   *
   * The instance is scaled to nothing rather than the mesh being rebuilt -
   * an `InstancedMesh` cannot lose a member, and rebuilding one of these to
   * drop a single cube would be absurd. The block stays in `blocks` so it
   * can be found again if anything ever puts it back.
   *
   * `surface` and `columns` are both moved down with it, which is what
   * everything else on the isle reads: pathing, prop placement, where an
   * agent's feet go. Returns the layer that came out, or null if that block
   * was not there to take.
   */
  /**
   * Press the top block of a column down into the ground, or let it back up.
   *
   * Tilled soil has to be a dent rather than a tray standing on the grass,
   * and the grass block's own top face is opaque: anything drawn below it is
   * simply hidden. So the block itself is pressed down - the instance matrix
   * is scaled and shifted so its top face sits `depth` lower while its
   * bottom stays put - and the neighbours' side faces, which were coincident
   * before, become the turf walls of the dent.
   *
   * `surface` is deliberately NOT moved: the column is still the same height
   * as far as pathing, prop placement and where an agent's feet go are
   * concerned. It is a dent of a few centimetres, not a dug block - that is
   * `digBlock`.
   *
   * It is also *recoloured*, and that is what makes the dent's floor the
   * block itself rather than a slab drawn over it. A slab has to be as wide
   * as the cell to leave no gap at the rim, which means it and the
   * neighbouring cubes claim the same space and the two flicker against each
   * other the moment the camera moves. Nothing can z-fight with a block that
   * is simply painted a different colour.
   */
  const sunk = new Map();
  const wasColour = new THREE.Color();

  group.userData.sinkBlock = (x, z, depth, colour) => {
    const column = columns.get(`${x},${z}`);
    if (!column) return false;
    const found = blocks.get(key(x, column.top, z));
    if (!found) return false;

    const held = { y: column.top, mesh: found.mesh, index: found.index, colour: null };
    if (found.mesh.instanceColor) {
      found.mesh.getColorAt(found.index, wasColour);
      held.colour = wasColour.getHex();
    }
    sunk.set(`${x},${z}`, held);

    const m = new THREE.Matrix4()
      .makeTranslation(x * BLOCK, column.top * BLOCK - depth / 2, z * BLOCK)
      .multiply(new THREE.Matrix4().makeScale(1, 1 - depth, 1));
    found.mesh.setMatrixAt(found.index, m);
    found.mesh.instanceMatrix.needsUpdate = true;

    if (colour !== undefined && found.mesh.instanceColor) {
      found.mesh.setColorAt(found.index, wasColour.setHex(colour));
      found.mesh.instanceColor.needsUpdate = true;
    }
    return true;
  };

  group.userData.raiseBlock = (x, z) => {
    const was = sunk.get(`${x},${z}`);
    if (!was) return false;
    sunk.delete(`${x},${z}`);
    // Only if it is still the same block: a column dug out from under a
    // plot has nothing to put back.
    const found = blocks.get(key(x, was.y, z));
    if (!found || found.mesh !== was.mesh) return false;
    found.mesh.setMatrixAt(found.index, new THREE.Matrix4()
      .makeTranslation(x * BLOCK, was.y * BLOCK, z * BLOCK));
    found.mesh.instanceMatrix.needsUpdate = true;
    if (was.colour !== null && found.mesh.instanceColor) {
      found.mesh.setColorAt(found.index, wasColour.setHex(was.colour));
      found.mesh.instanceColor.needsUpdate = true;
    }
    return true;
  };

  group.userData.digBlock = (x, z) => {
    const column = columns.get(`${x},${z}`);
    if (!column) return null;
    // Never punch through: a column keeps its last block whatever is done
    // to it, so the isle can be dug into but not dug away.
    if (column.top <= column.bottom) return null;

    const y = column.top;
    const found = blocks.get(key(x, y, z));
    if (!found) return null;

    const gone = new THREE.Matrix4().makeScale(0, 0, 0);
    found.mesh.setMatrixAt(found.index, gone);
    found.mesh.instanceMatrix.needsUpdate = true;
    // The bounding sphere was measured with that block in it; leaving it
    // stale only ever over-covers, but the raycast uses it, so it is kept
    // honest.
    found.mesh.computeBoundingSphere();

    // What came out is what can go back in, and only that: the block is
    // still in `blocks`, scaled to nothing, so `fillBlock` has something to
    // put back. There is no instance above the isle's original surface, so
    // a hole can be filled and the isle cannot be built up.
    column.top = y - 1;
    // Whatever was pressed down here is gone with it, so there is nothing
    // left to let back up.
    sunk.delete(`${x},${z}`);
    surface.set(`${x},${z}`, column.top);
    group.userData.blockCount -= 1;
    return found.layer;
  };

  /**
   * Is there a hole here to fill? A column can only be built back up to
   * where it started - the instances above that were never made.
   */
  group.userData.canFill = (x, z) => {
    const column = columns.get(`${x},${z}`);
    if (!column) return false;
    return blocks.has(key(x, column.top + 1, z));
  };

  /**
   * Put a block back on top of a column that has been dug into.
   *
   * The instance is scaled back to full rather than a new one being made,
   * which is the same reasoning as `digBlock` in reverse. It is repainted
   * as `layer` and its record updated to match, so a shovel dug out and put
   * back reads as the earth it is now rather than the turf it was.
   */
  group.userData.fillBlock = (x, z, layer = 'dirt') => {
    const column = columns.get(`${x},${z}`);
    if (!column) return false;

    const y = column.top + 1;
    const found = blocks.get(key(x, y, z));
    if (!found) return false;

    found.mesh.setMatrixAt(found.index, new THREE.Matrix4()
      .makeTranslation(x * BLOCK, y * BLOCK, z * BLOCK));
    found.mesh.instanceMatrix.needsUpdate = true;
    found.mesh.computeBoundingSphere();

    const spec = LAYERS[layer] ?? LAYERS.dirt;
    if (found.mesh.instanceColor) {
      const shade = 0.90 + 0.10 * rand(Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791), SEED);
      found.mesh.setColorAt(found.index, new THREE.Color().setHex(spec.color).multiplyScalar(shade));
      found.mesh.instanceColor.needsUpdate = true;
    }
    found.layer = layer;

    column.top = y;
    surface.set(`${x},${z}`, y);
    group.userData.blockCount += 1;
    return true;
  };

  return group;
}

export const ISLAND_RADIUS = RADIUS;
