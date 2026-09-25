import * as THREE from 'three';
import { rand } from './noise.js';

/**
 * The few things standing on the island: a handful of trees and rocks.
 * Placement is seeded, so the isle looks the same every launch.
 */

const SEED = 20260918;

// Island blocks are unit cubes centred on their cell, so their top face - the
// ground everything stands on - is half a block above the cell's y.
export const GROUND_OFFSET = 0.5;

export const PROP_KINDS = {
  tree: {
    label: 'tree',
    action: 'Cutting down a tree',
    seconds: 6,
    yield: { item: 'wood', amount: 3 },
    // What the readout at the top of the screen draws beside its name.
    icon: 'wood',
    // Some of what comes down comes back as something to replant. The roll
    // is 0 to 2, so a felled tree is not a guaranteed replacement.
    drops: [{ item: 'sapling', min: 0, max: 2 }]
  },
  // A planted sapling. It is not work - there is nothing to do to it - so it
  // has no `action` and clicking it gives no order. It can be moved and it
  // can be picked back up, which is what `placed` and `portable` mark.
  sapling: {
    label: 'sapling',
    placed: true,
    portable: true,
    item: 'sapling',
    icon: 'sapling',
    grows: 'tree'
  },
  // A rock is broken up rather than carried off: four stone out of it, and
  // one lump too knocked about to be worth anything but standing back on
  // the isle.
  rock: {
    label: 'rock',
    action: 'Picking up a rock',
    seconds: 7,
    icon: 'stone',
    yield: { item: 'stone', amount: 4 },
    drops: [{ item: 'brokenStone', min: 1, max: 1 }]
  },
  // Weeds. Small, quick, and the only thing on the isle that gives fibre -
  // there is no fixed `yield`, only the roll, so a clump is 1 or 2 and never
  // nothing. `gap` is its own: weeds come up in patches, and holding them to
  // the same 2.2 cells the trees keep would scatter a dozen of them evenly
  // across the isle like planted crops.
  weed: {
    label: 'weeds',
    action: 'Pulling up weeds',
    seconds: 3,
    gap: 1.1,
    icon: 'fibre',
    // Fibre always, and sometimes a seed off the head of one - which is
    // where wheat comes from at all, so a weed is worth pulling twice over.
    drops: [
      { item: 'fibre', min: 1, max: 2 },
      { item: 'seeds', min: 0, max: 1 }
    ]
  },
  /**
   * Tilled ground. It is a prop rather than a change to the isle's blocks
   * because everything about it is run state - what is sown, how far along
   * it is, how much water is left - and props are what the save already
   * carries. It is flat and walkable, so it is not `solid`.
   */
  farmland: {
    label: 'farmland',
    placed: true,          // outlines on hover, like a station
    // ...but it does not go anywhere. It is a hole in the isle as much as a
    // prop - the block under it is pressed down and repainted - so carrying
    // it off would leave the dent behind and take the soil somewhere there
    // is none. Put it back to grass with a hoe instead.
    fixed: true,
    icon: 'seeds',
    // What it holds: 200ml is a bucketful, and a fresh plot is dry - turned
    // ground holds no water of its own, and nothing drinks until something
    // is sown in it.
    water: { start: 0, max: 200 },
    // Five minutes of *watered* growing, at 20ml a minute.
    growSeconds: 300,
    drinksPerMinute: 20
  },

  /**
   * A tub that fills itself. Placed out of the inventory like a sapling, and
   * from then on it is somewhere to fill a bucket from.
   */
  waterCatcher: {
    label: 'water catcher',
    placed: true,
    portable: true,
    item: 'waterCatcher',
    icon: 'waterCatcher',
    catches: 1,            // millilitres a second
    water: { start: 0, max: 500 }
  },

  /**
   * A length of wooden pipe. It stands on one cell and joins up on its own
   * to the pipes and water ports beside it - its arms are rebuilt whenever
   * what is next to it changes (src/machines.js). Walkable, like a plot.
   */
  pipe: {
    label: 'pipe',
    placed: true,
    portable: true,
    // A wrench's ctrl click takes it straight back up (main.js).
    mechanical: true,
    item: 'pipe',
    icon: 'pipe',
    // What one run of joined-up pipe can carry, in millilitres a second.
    flow: 20
  },

  /**
   * A box with a cog in it. Water goes in through the back, a crank handle
   * goes on the left, and turning it throws water out of the front over the
   * 3x3 patch of ground in front of it. `facing` is what lets it be turned
   * round - R while it is being placed, a wrench once it is down.
   */
  sprinkler: {
    label: 'sprinkler',
    placed: true,
    portable: true,
    // A wrench's ctrl click takes it straight back up (main.js).
    mechanical: true,
    item: 'sprinkler',
    icon: 'sprinkler',
    facing: true,
    water: { start: 0, max: 600 },
    // Millilitres a second thrown onto EACH of the nine cells while cranked.
    spray: 10
  },

  /**
   * A chest: somewhere to keep things that is not the agents' pack. What is
   * in it lives on the prop as `store` (src/stations.js), so the save keeps
   * it where it stands. A click opens it, like the repaired bench.
   */
  chest: {
    label: 'chest',
    placed: true,
    portable: true,
    item: 'chest',
    icon: 'chest',
    slots: 16
  },

  /**
   * A mill: wheat into its hopper, a crank on its side, flour out. It faces a
   * way only so the crank side can be chosen - it has no water port and
   * nothing it throws anywhere. `grinds` is what goes in and what comes out.
   */
  mill: {
    label: 'mill',
    placed: true,
    portable: true,
    // A wrench's ctrl click takes it straight back up (main.js).
    mechanical: true,
    item: 'mill',
    icon: 'mill',
    facing: true,
    grinds: { from: 'wheat', to: 'flour', perSecond: 2, batch: 10 }
  },

  /**
   * A campfire. It is lit from its own screen with a flint striker and burns
   * for three minutes; every log put on adds two more, up to ten logs' worth
   * on top of the lighting. When it runs out it is out, and wants a striker
   * again. `burning` on the prop is the seconds left, saved with it.
   */
  campfire: {
    label: 'campfire',
    placed: true,
    portable: true,
    item: 'campfire',
    icon: 'campfire',
    burns: { light: 180, perLog: 120, maxLogs: 10, striker: 'flintStriker', log: 'wood' }
  },

  /**
   * A mixing bowl: things go in, the crank goes round, something comes out.
   * It faces a way only so its crank side can be chosen, like the mill.
   * What is in it is `mixIn` (an item -> count map, water in ml) and what
   * has come out is `mixOut`; the recipes are in src/kitchen.js.
   */
  mixingBowl: {
    label: 'mixing bowl',
    placed: true,
    portable: true,
    mechanical: true,
    item: 'mixingBowl',
    icon: 'mixingBowl',
    facing: true,
    mixes: true
  },

  // The workbench is not harvested - it is repaired once, and then it is a
  // door into the crafting screen rather than a job.
  workbench: {
    label: 'workbench',
    action: 'Repairing the workbench',
    seconds: 8,
    cost: { item: 'wood', amount: 10 },
    // The only prop with a hitbox: it is walked around, not over.
    solid: true,
    // A station the player put down rather than something the isle grew:
    // it outlines on hover and it can be picked up and moved.
    placed: true,
    // Two cells wide, one deep - so it needs two solid, level blocks under
    // it. Trees and rocks have no footprint and default to their one cell.
    footprint: { w: 2, d: 1 }
  }
};

const ONE_CELL = { w: 1, d: 1 };

/**
 * How long a sapling takes to come up, in seconds, and how much room a grown
 * tree needs around it.
 *
 * `hasPlantingRoom` keeps the clearance at the moment a sapling is put down,
 * measured to trees and saplings alike, so a sapling that cannot grow where
 * it stands cannot be planted there in the first place.
 *
 * `hasRoomToGrow`, the check at the end of the timer, measures to other
 * *trees* only. A sapling that has lost its room since - a neighbour grew,
 * or an older save put two of them close together - is then not stuck for
 * good: it stays a sapling and comes up once the tree beside it is felled.
 */
export const GROW_SECONDS = { min: 180, max: 240 };
export const GROW_CLEARANCE = 2;

/** A fresh sapling's own growing time. */
export function rollGrowSeconds() {
  return GROW_SECONDS.min + Math.random() * (GROW_SECONDS.max - GROW_SECONDS.min);
}

/**
 * Whether a sapling has the room to come up where it stands: no tree within
 * `GROW_CLEARANCE` cells. Exactly two cells apart is far enough.
 */
export function hasRoomToGrow(prop, props) {
  return !props.some((other) => (
    other !== prop && !other.gone && other.kind === 'tree' &&
    Math.hypot(other.x - prop.x, other.z - prop.z) < GROW_CLEARANCE
  ));
}

/**
 * Whether a cell is far enough from everything that grows for a sapling to
 * be put there at all.
 *
 * This is the same `GROW_CLEARANCE`, measured to saplings as well as trees:
 * a spot where the sapling would come up and immediately be stuck is not a
 * spot it may be planted in, so a refused place is the answer rather than a
 * sapling that quietly never grows. Once nothing may be planted within two
 * cells of another sapling, a pair that would deadlock each other cannot be
 * made in the first place - which is why measuring to saplings here does not
 * bring back the deadlock `hasRoomToGrow` avoids by ignoring them.
 */
export function hasPlantingRoom(cell, props, ignore = null) {
  return !props.some((other) => (
    other !== ignore && !other.gone &&
    (other.kind === 'tree' || other.kind === 'sapling') &&
    Math.hypot(other.x - cell.x, other.z - cell.z) < GROW_CLEARANCE
  ));
}

/** How many cells of ground a kind stands on. */
export function footprintOf(kind) {
  return PROP_KINDS[kind]?.footprint ?? ONE_CELL;
}

/**
 * The cells a kind covers when its anchor is at `cell`.
 *
 * The anchor is the low corner, not the middle, so a 2x1 anchored at (0,0)
 * covers (0,0) and (1,0). Everything that asks "is this cell taken" walks
 * this rather than comparing against `prop.x/prop.z`, which is only the
 * corner.
 */
export function footprintCells(kind, cell) {
  const { w, d } = footprintOf(kind);
  const cells = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cells.push({ x: cell.x + i, z: cell.z + j });
  return cells;
}

/** Where the middle of that footprint is - where the mesh actually stands. */
export function footprintCentre(kind, cell) {
  const { w, d } = footprintOf(kind);
  return { x: cell.x + (w - 1) / 2, z: cell.z + (d - 1) / 2 };
}

/**
 * Whether a kind may stand with its anchor at `cell`, and at what height.
 *
 * Every cell it covers has to be solid ground, all of it at the same height -
 * a bench half on a ledge would hang in the air - and nothing else may be
 * standing there. A kind that `grows` also has to keep `GROW_CLEARANCE` from
 * the trees and saplings already on the isle. Returns `{ height }` so a
 * ground of 0 is still an answer, or null when it cannot go there.
 */
export function canPlace(surface, kind, cell, { props = [], ignore = null, keepClear = [] } = {}) {
  let height = null;

  // Anything that grows keeps its distance from the rest: a sapling may not
  // be planted where it would have no room to come up.
  if (PROP_KINDS[kind]?.grows && !hasPlantingRoom(cell, props, ignore)) return null;

  for (const c of footprintCells(kind, cell)) {
    const y = surface.get(`${c.x},${c.z}`);
    if (y === undefined) return null;                       // off the isle
    if (height === null) height = y;
    else if (y !== height) return null;                     // not level

    if (keepClear.some((k) => k.x === c.x && k.z === c.z)) return null;

    for (const other of props) {
      if (other === ignore || other.gone) continue;
      if (footprintCells(other.kind, other).some((o) => o.x === c.x && o.z === c.z)) return null;
    }
  }

  return { height };
}

/** Stand a prop with its anchor at `cell`, centred over its footprint. */
export function placeProp(prop, cell, surface) {
  prop.x = cell.x;
  prop.z = cell.z;
  const centre = footprintCentre(prop.kind, cell);
  prop.mesh.position.set(centre.x, surface.get(`${cell.x},${cell.z}`) + GROUND_OFFSET, centre.z);
}

/**
 * Put a new prop into the world at `cell`, mesh and all.
 *
 * `spawned` marks it as something the run produced rather than something the
 * isle was generated with, which is how DEV RESET knows to take it away
 * again. The caller pushes nothing and wires nothing: the prop comes back
 * ready to be clicked, hovered and moved.
 */
let nextSpawnId = 0;

/** A shape seed for something the run grew, rather than the isle. */
const rollSalt = () => Math.floor(Math.random() * 100000);

export function spawnProp(kind, cell, { surface, group, props, extra = {} }) {
  // `salt` is what `buildProp` varies a prop's shape from - a tree's height,
  // a sapling's yaw. It is kept on the prop and saved with it, so a restored
  // one comes back the same tree rather than a different one in the same
  // spot.
  const salt = extra.salt ?? rollSalt();
  const mesh = buildProp(kind, salt);
  group.add(mesh);

  const prop = {
    id: `${kind}-${nextSpawnId++}`,
    kind,
    x: cell.x,
    z: cell.z,
    mesh,
    gone: false,
    spawned: true,
    ...extra,
    salt
  };

  placeProp(prop, cell, surface);
  tagProp(prop);
  buildOutline(prop);
  props.push(prop);
  return prop;
}

/** Everything under a prop answers to its id, so a click anywhere finds it. */
export function tagProp(prop) {
  prop.mesh.userData.propId = prop.id;
  prop.mesh.traverse((o) => { o.userData.propId = prop.id; });
}

/**
 * How much water a prop is holding, as a fraction, drawn in its tub.
 *
 * The mesh is scaled rather than rebuilt: this runs every frame a catcher is
 * filling, and rebuilding the geometry sixty times a second to move a
 * surface up by a millimetre would be absurd.
 */
export function setWaterLevel(prop, fraction) {
  const water = prop.mesh.getObjectByName('water');
  if (!water) return;
  const f = Math.max(0.001, Math.min(1, fraction));
  // The tub is 0.52 deep with a 0.1 floor; the surface rises from the floor.
  water.scale.y = f * 0.46;
  water.position.y = 0.1 + (f * 0.46) / 2;
}

/** Take a prop out of the world for good. */
export function removeProp(prop, group, props) {
  prop.gone = true;
  group.remove(prop.mesh);
  const at = props.indexOf(prop);
  if (at >= 0) props.splice(at, 1);
}

/**
 * A sapling becomes the tree it was going to be, in place and keeping its
 * cell. The mesh is rebuilt rather than swapped for a new prop, so anything
 * already holding this prop - the agent's task, the hover - keeps working.
 */
export function growProp(prop, salt = rollSalt()) {
  const grown = PROP_KINDS[prop.kind]?.grows;
  if (!grown) return false;

  for (const child of [...prop.mesh.children]) prop.mesh.remove(child);
  const built = buildProp(grown, salt);
  for (const child of [...built.children]) prop.mesh.add(child);
  // The tree it became is its own shape now, not the sapling's.
  prop.salt = salt;

  prop.kind = grown;
  delete prop.growth;
  delete prop.growSeconds;
  tagProp(prop);
  // A tree is scenery, not a station, so it gets no outline - and the old
  // sapling's outlines went with the meshes they were children of.
  return true;
}

/** Rebuild the set of cells nothing may walk onto, from where props are now. */
export function syncBlocked(props, blocked) {
  blocked.clear();
  for (const prop of props) {
    if (prop.gone || !PROP_KINDS[prop.kind]?.solid) continue;
    for (const c of footprintCells(prop.kind, prop)) blocked.add(`${c.x},${c.z}`);
  }
  return blocked;
}

const COUNTS = { tree: 9, rock: 10, weed: 14 };

/** How much room a kind keeps from whatever is already standing. */
const DEFAULT_GAP = 2.2;
const BENCH_GAP = 3.6;

/** Where the broken workbench stands: the middle of the isle. */
export const WORKBENCH_CELL = { x: 0, z: 0 };

// The tint a prop takes on once the agent has been set on it, until it
// arrives. Every prop builds its own materials, so this is safe to mutate.
const HIGHLIGHT = 0xffc83d;

// The hover outline: the edges of every mesh in a placed prop, drawn in the
// UI's ice blue. Depth testing is off so the whole shape reads at once
// instead of half of it hiding behind the rest - it only ever shows on
// something the cursor is already over, so there is nothing to see through.
const OUTLINE_COLOUR = 0x8ad8ff;

/**
 * Whether a prop can be picked up and moved right now.
 *
 * Anything that has still to be repaired is wreckage lying on the ground
 * rather than a station to reposition - `cost` is what marks a kind as
 * needing repair first, so this stays true of whatever is added next.
 */
export function canMove(prop) {
  const kind = prop && !prop.gone && PROP_KINDS[prop.kind];
  if (!kind?.placed) return false;
  if (kind.fixed) return false;
  if (kind.cost && !prop.repaired) return false;
  return true;
}

/** Give a prop's meshes their (hidden) edge outlines. Idempotent. */
export function buildOutline(prop) {
  prop.mesh.traverse((object) => {
    // LineSegments are not meshes, so the outlines being added here are not
    // themselves walked - and the guard keeps a rebuild from doubling up.
    if (!object.isMesh) return;
    // A hitbox is not a shape: outlining one draws a cage around thin air.
    if (object.userData.isHitPad || object.userData.noOutline) return;
    if (object.children.some((c) => c.userData.isOutline)) return;

    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(object.geometry),
      new THREE.LineBasicMaterial({
        color: OUTLINE_COLOUR,
        transparent: true,
        opacity: 0.95,
        depthTest: false
      })
    );
    line.userData.isOutline = true;
    line.renderOrder = 3;
    line.visible = false;
    // Never a click target, and never in the way of one.
    line.raycast = () => {};
    object.add(line);
  });
}

// A station whose screen nobody is close enough to open.
export const OUTLINE_OUT_OF_REACH = 0xff4d5e;

/** Show or hide a prop's outline, in its ice blue or in `colour`. */
export function setPropOutline(prop, on, colour = OUTLINE_COLOUR) {
  prop.mesh.traverse((object) => {
    if (!object.userData.isOutline) return;
    object.visible = on;
    if (on) object.material.color.setHex(colour);
  });
}

/** Light a prop up yellow, or put it back the way it was. */
export function setPropHighlight(prop, on) {
  prop.mesh.traverse((object) => {
    const material = object.material;
    if (!material?.isMeshStandardMaterial) return;
    if (on) {
      material.userData.baseEmissive ??= material.emissive.getHex();
      material.emissive.setHex(HIGHLIGHT);
      material.emissiveIntensity = 0.75;
    } else {
      material.emissive.setHex(material.userData.baseEmissive ?? 0x000000);
      material.emissiveIntensity = 1;
    }
  });
}

export function createProps(surface, scene) {
  const group = new THREE.Group();
  group.name = 'props';
  scene.add(group);

  const props = [];
  const taken = new Set();

  // The cells nothing may walk onto, for `path.js`. Only solid props are in
  // it, so trees and rocks stay walkable and cannot pen the agent in.
  const blocked = new Set();

  // Cells far enough from the middle to leave the person somewhere to stand.
  const cells = [...surface.keys()]
    .map((key) => key.split(',').map(Number))
    .filter(([x, z]) => Math.hypot(x, z) > 2.5);

  // The workbench goes down first, in the middle, so the scatter below can
  // never land on top of it - the trees and rocks already keep clear of the
  // centre, but the bench is what the run starts at and must be reachable.
  const bench = addWorkbench(surface, group, props, blocked);

  let salt = 0;
  for (const [kind, count] of Object.entries(COUNTS)) {
    for (let i = 0; i < count; i++) {
      let cell = null;
      // Walk the seeded sequence until an unused cell turns up.
      for (let attempt = 0; attempt < 60 && !cell; attempt++) {
        const pick = cells[Math.floor(rand(++salt * 7919, SEED) * cells.length)];
        if (!pick) continue;
        const key = `${pick[0]},${pick[1]}`;
        if (taken.has(key)) continue;
        // Keep props apart so the isle reads as sparse, not as a thicket -
        // and keep a wider clearing around the workbench, so the thing the
        // run starts at is not hidden behind a tree from half the angles.
        // The wider of the two kinds' own gaps, so a weed may come up close
        // to another weed without being allowed to crowd a tree - and the
        // bench keeps its clearing from everything.
        const tooClose = props.some((p) => {
          const gap = p.kind === 'workbench'
            ? BENCH_GAP
            : Math.max(PROP_KINDS[p.kind]?.gap ?? DEFAULT_GAP,
                       PROP_KINDS[kind]?.gap ?? DEFAULT_GAP);
          const c = footprintCentre(p.kind, p);
          return Math.hypot(c.x - pick[0], c.z - pick[1]) < gap;
        });
        if (tooClose) continue;
        taken.add(key);
        cell = pick;
      }
      if (!cell) continue;

      const [x, z] = cell;
      const mesh = buildProp(kind, salt);
      mesh.position.set(x, surface.get(`${x},${z}`) + GROUND_OFFSET, z);
      group.add(mesh);

      const prop = { id: `${kind}${i}`, kind, x, z, mesh, gone: false };
      tagProp(prop);
      props.push(prop);
    }
  }

  return { group, props, workbench: bench, blocked };
}

/**
 * The broken workbench in the middle of the isle. It is an ordinary prop as
 * far as clicking and pathing go, so `props` carries it; what is different is
 * that finishing the work repairs it instead of removing it, and once it is
 * repaired clicking it opens the crafting screen.
 */
function addWorkbench(surface, group, props, blocked) {
  // The anchor whose footprint sits nearest the middle of the isle and is
  // actually legal - two level cells side by side. The middle cell on its own
  // is not enough now that the bench is two wide.
  let cell = null;
  let best = Infinity;
  for (const key of surface.keys()) {
    const [x, z] = key.split(',').map(Number);
    const candidate = { x, z };
    if (!canPlace(surface, 'workbench', candidate, { props })) continue;
    const centre = footprintCentre('workbench', candidate);
    const d = Math.hypot(centre.x - WORKBENCH_CELL.x, centre.z - WORKBENCH_CELL.z);
    if (d < best) { best = d; cell = candidate; }
  }
  if (!cell) return null;

  const mesh = new THREE.Group();
  group.add(mesh);

  const prop = {
    id: 'workbench',
    kind: 'workbench',
    x: cell.x,
    z: cell.z,
    home: { x: cell.x, z: cell.z },   // where DEV RESET puts it back
    mesh,
    gone: false,
    repaired: false
  };

  placeProp(prop, cell, surface);
  setWorkbenchState(prop, false);
  props.push(prop);
  syncBlocked(props, blocked);
  return prop;
}

/** Swap the bench between its broken and its repaired build. */
export function setWorkbenchState(prop, repaired) {
  prop.repaired = repaired;
  const mesh = prop.mesh;
  for (const child of [...mesh.children]) mesh.remove(child);
  buildWorkbench(mesh, repaired);
  // Everything under it answers to the same prop id, so a click anywhere on
  // the bench finds it.
  mesh.userData.propId = prop.id;
  mesh.traverse((o) => { o.userData.propId = prop.id; });
  // The meshes are new, so their outlines are too.
  buildOutline(prop);
}

// The tabletop, and where its underside sits - the legs are measured off
// this rather than given their own height, so they always meet it.
const TOP_Y = 0.86;
const TOP_THICK = 0.16;
const UNDERSIDE = TOP_Y - TOP_THICK / 2;

// How far a leg runs up into the top. They used to stop exactly at the
// underside, which leaves a hairline seam to see through at the joint - the
// same reason the island's cubes are drawn a hair oversized.
const LEG_INSET = 0.04;

function buildWorkbench(g, repaired) {
  const wood = repaired ? 0x8a5f37 : 0x6a5136;
  const trim = repaired ? 0x9c6c3f : 0x6e5338;

  // The bench proper - top and legs - is built upright either way, and then
  // tipped over as a whole when it is broken. Building it once and rotating
  // it keeps the two states the same object rather than two drawings of it.
  const frame = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, TOP_THICK, 0.95),
    mat(wood, repaired ? { emissive: 0x1a0d04, emissiveIntensity: 1 } : {})
  );
  top.position.y = TOP_Y;
  top.castShadow = true;
  frame.add(top);

  // Four legs when it is whole; the front-left one has snapped off when it is
  // not, which is what put the bench on its side in the first place. Every
  // leg standing runs from the ground into the top, broken or not - a shorter
  // leg on the broken bench left it hanging in mid air once tipped over.
  const legs = repaired
    ? [[-0.6, -0.34], [0.6, -0.34], [-0.6, 0.34], [0.6, 0.34]]
    : [[0.6, -0.34], [0.6, 0.34], [-0.6, 0.34]];
  const h = UNDERSIDE + LEG_INSET;
  for (const [x, z] of legs) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, 0.15), mat(trim));
    leg.position.set(x, h / 2, z);
    leg.castShadow = true;
    frame.add(leg);
  }

  if (!repaired) {
    // Over it goes, all the way: the tabletop down flat on the grass and the
    // legs in the air. Half a turn reads as a collapsed bench at a glance,
    // where a quarter turn just reads as a board standing on its end.
    //
    // Exactly half a turn, with no lean off square - a tilt rests the bench
    // on one corner of the top and holds the rest of it clear of the ground.
    // The yaw is what keeps it from looking placed; it turns the bench on the
    // spot without lifting any of it.
    frame.rotation.z = Math.PI;
    frame.rotation.y = 0.34;

    // Then dropped until whatever is now lowest is resting on the ground,
    // measured rather than guessed - the numbers above can be retuned
    // without the bench ending up buried or hovering.
    frame.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(frame);
    frame.position.y = -box.min.y;
  }

  g.add(frame);

  if (repaired) {
    // A vice and a lamp, so a working bench reads as one at a glance.
    const vice = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), mat(0x8a8f9c, { metalness: 0.3 }));
    vice.position.set(0.5, 1.05, 0);
    vice.castShadow = true;
    frame.add(vice);

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.26, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0x7ad7ff,
        emissive: 0x2f9bd6,
        emissiveIntensity: 1.6,
        roughness: 0.4
      })
    );
    lamp.position.set(-0.45, 1.08, 0);
    frame.add(lamp);
  } else {
    // The snapped leg and a plank, lying on the ground where they fell -
    // outside the frame, so tipping it does not take them with it.
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.15), mat(trim));
    shard.position.set(-0.52, 0.08, -0.58);
    shard.rotation.set(0, 0.7, Math.PI / 2);
    shard.castShadow = true;
    g.add(shard);

    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.28), mat(wood));
    plank.position.set(0.28, 0.06, 0.62);
    plank.rotation.y = 0.5;
    plank.castShadow = true;
    g.add(plank);
  }
}

// --- pipes -------------------------------------------------------------------

// A pipe is a square wooden duct lying just off the ground.
const PIPE_WIDTH = 0.2;
const PIPE_Y = 0.2;
const PIPE_WOOD = 0xb07a45;
const PIPE_BAND = 0x7a4f28;

// How far an arm reaches for each kind of neighbour. Level, it meets the
// neighbour's arm at the shared edge. Down a block, it runs out over the
// ledge to the riser the lower pipe puts up. Up a block, it stops short of
// the taller column's face and climbs, keeping clear of the block.
const RISER_AT = 0.38;

// Into a port: far enough to go through a wall standing a little in from the
// edge of the next cell. Into the bottom of one a block up: just over the
// top of its column, so it runs in under the floor.
const PORT_REACH = 0.62;
const PORT_LOW = 0.12;

/**
 * Hang a pipe's arms off its hub, one per link.
 *
 * `links` is `[{ dx, dz, dh, port, mode }]` (see src/machines.js): which way
 * it runs, how much higher the neighbour's ground is, whether it is a water
 * port rather than another pipe, and what the end has been set to with a
 * wrench. An end into a port is how the mode is seen - an intake end is
 * narrowed, an outlet end runs on into the thing with a collar round it.
 *
 * The meshes are rebuilt rather than moved, so the caller has to hand the
 * new ones what every prop mesh gets (shadow side, tag, outline).
 */
export function setPipeShape(prop, links) {
  const old = prop.mesh.getObjectByName('arms');
  if (old) prop.mesh.remove(old);

  const arms = new THREE.Group();
  arms.name = 'arms';
  const wood = mat(PIPE_WOOD);
  const band = mat(PIPE_BAND);
  const W = PIPE_WIDTH;

  /** A box from `a` to `b` along one axis, `w` across. */
  function run(dx, dz, from, to, w, material, y = PIPE_Y) {
    const len = to - from;
    if (len <= 0.001) return;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(dx ? len : w, w, dz ? len : w),
      material
    );
    const mid = (from + to) / 2;
    box.position.set(dx * mid, y, dz * mid);
    box.castShadow = true;
    arms.add(box);
  }

  /** The last stretch into a port, drawn the way its end is set. */
  function end(dx, dz, from, to, y, mode) {
    if (mode === 'in') {
      // Narrowed: the last stretch before the thing is a thinner neck.
      run(dx, dz, from, to - 0.16, W, wood, y);
      run(dx, dz, to - 0.16, to, W * 0.55, band, y);
    } else if (mode === 'out') {
      // Run on into the thing, with a collar where it goes in.
      run(dx, dz, from, to + 0.12, W, wood, y);
      run(dx, dz, to - 0.1, to - 0.02, W + 0.1, band, y);
    } else {
      run(dx, dz, from, to, W, wood, y);
    }
  }

  /** A vertical length at `at` along the arm, from `y0` up to `y1`. */
  function riser(dx, dz, at, y0, y1) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(W, y1 - y0 + W, W), wood);
    box.position.set(dx * at, (y0 + y1) / 2, dz * at);
    box.castShadow = true;
    arms.add(box);
  }

  for (const link of links) {
    const { dx, dz, dh } = link;

    if (link.port) {
      if (dh > 0) {
        // Into the BOTTOM of a thing standing a block higher: up the face of
        // its column and in under its floor.
        run(dx, dz, 0, RISER_AT + W / 2, W, wood);
        riser(dx, dz, RISER_AT, PIPE_Y, dh + PORT_LOW);
        end(dx, dz, RISER_AT - W / 2, 0.7, dh + PORT_LOW, link.mode);
      } else {
        // Into its side, on the level.
        end(dx, dz, 0, PORT_REACH, PIPE_Y, link.mode);
      }
      continue;
    }

    // Another pipe. Level, the two arms meet at the shared edge; down a
    // block, this one runs out over the ledge to the riser the lower one
    // puts up; up a block, it stops short of the taller column and climbs.
    let reach = 0.5;
    if (dh < 0) reach = 1 - RISER_AT + W / 2;
    if (dh > 0) reach = RISER_AT + W / 2;
    run(dx, dz, 0, reach, W, wood);
    if (dh > 0) riser(dx, dz, RISER_AT, PIPE_Y, PIPE_Y + dh);

    // A band where two pipes meet, so a run reads as lengths joined up.
    if (dh === 0) run(dx, dz, 0.4, 0.5, W + 0.04, band);
  }

  // A lone pipe still reads as a pipe: a short stub either way.
  if (links.length === 0) {
    run(1, 0, 0, 0.3, W, wood);
    run(-1, 0, 0, 0.3, W, wood);
  }

  prop.mesh.add(arms);
}

/**
 * Put a crank handle on a machine's crank side, or take it off.
 *
 * The machine is built facing +Z with its cog on +X, so the handle goes on
 * there too and turns with the rest of it. The part that spins is named
 * `crank-arm`, which is what src/machines.js turns while it is being worked.
 */
export function setCrank(prop, on) {
  prop.crank = !!on;
  const old = prop.mesh.getObjectByName('crank');
  if (old) prop.mesh.remove(old);
  if (!on) return;

  const crank = new THREE.Group();
  crank.name = 'crank';

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.08), mat(0x5a3a1d));
  shaft.position.set(0.54, 0.3, 0);
  crank.add(shaft);

  // The arm turns about the shaft, so it is its own group pivoted there.
  const arm = new THREE.Group();
  arm.name = 'crank-arm';
  arm.position.set(0.64, 0.3, 0);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.1), mat(0xc99359));
  lever.position.y = 0.14;
  arm.add(lever);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.08), mat(0xd3b167));
  grip.position.set(0.1, 0.3, 0);
  arm.add(grip);
  crank.add(arm);

  crank.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  prop.mesh.add(crank);
}

/**
 * The cog on a machine's crank side: a toothed wheel flat against the +X
 * wall, where the crank handle goes on. Every machine has the same one.
 */
function buildCog() {
  const cog = new THREE.Group();
  cog.name = 'cog';
  const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.3), mat(0xc99359));
  cog.add(wheel);
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.1), mat(0xa8763f));
    tooth.rotation.x = (i * Math.PI) / 4;
    cog.add(tooth);
  }
  const axle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat(0x5a3a1d));
  axle.position.x = 0.04;
  cog.add(axle);
  cog.position.set(0.43, 0.3, 0);
  cog.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return cog;
}

/**
 * Put a cooking stone on a campfire, or take it off - and show how hot it is
 * and whether there is anything on it. The slab glows red as it heats past
 * the point where it cooks.
 */
export function setCookStone(prop, cooker) {
  let stone = prop.mesh.getObjectByName('cookstone');
  if (!cooker) {
    if (stone) prop.mesh.remove(stone);
    return false;
  }
  let built = false;
  if (!stone) {
    stone = new THREE.Group();
    stone.name = 'cookstone';
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.07, 0.7),
      mat(0x8b929c, { emissive: 0x000000, emissiveIntensity: 1 })
    );
    slab.name = 'slab';
    slab.position.y = 0.5;
    slab.castShadow = true;
    stone.add(slab);
    // Four stones propping it up out of the flames.
    for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.1), mat(0x6f767f));
      leg.position.set(x, 0.24, z);
      leg.castShadow = true;
      stone.add(leg);
    }
    const food = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.22), mat(0xf0dfb4));
    food.name = 'food';
    food.position.y = 0.585;
    stone.add(food);
    prop.mesh.add(stone);
    built = true;
  }
  const hot = Math.max(0, Math.min(1, (cooker.temp - 150) / 330));
  const slab = stone.getObjectByName('slab');
  slab.material.emissive.setRGB(0.55 * hot, 0.1 * hot, 0.02 * hot);
  const food = stone.getObjectByName('food');
  const on = cooker.input?.count > 0 ? cooker.input.item : cooker.output?.count > 0 ? cooker.output.item : null;
  food.visible = !!on;
  if (on) food.material.color.setHex(on === 'bread' ? 0xc98a3c : 0xf0dfb4);
  return built;
}

// --- the fire itself --------------------------------------------------------
//
// A voxel fire, drawn as a loop of small cubes rather than a few boxes that
// only stretch. A breathing core sits on the logs; flame cubes rise out of it,
// shrinking and cooling from white-yellow through orange to red as they go;
// embers drift up and away; smoke puffs grow and thin out above it all. Every
// cube runs on its own phase off one clock, so nothing moves in step.
//
// All of it is unlit (`MeshBasicMaterial`): a flame is a light, not a thing a
// light falls on, and lit emissive boxes either clipped to cream or went dull.
// None of it casts a shadow or takes a ray - it moves every frame, and the
// hover readout must not flicker as a flame passes under the cursor.

const FLAME_CUBES = 16;
const EMBERS = 7;
const PUFFS = 5;

const FLAME_HOT = new THREE.Color(0xffe27a);
const FLAME_MID = new THREE.Color(0xffa22a);
const FLAME_COOL = new THREE.Color(0xd8360c);
const SMOKE = new THREE.Color(0x4a4640);

/** A number 0..1 that is the same for the same inputs - a cube's own quirks. */
const quirk = (i, k) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function fireCube(part, i, size, color, opacity = 1) {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({
      color, transparent: opacity < 1 || part !== 'core', opacity, depthWrite: part === 'core',
      // Out of the tone mapping, or the scene's filmic curve washes a flame's
      // orange out to cream; smoke stays in it, being no light at all.
      toneMapped: part === 'smoke'
    })
  );
  cube.userData.part = part;
  cube.userData.seed = i;
  cube.userData.noOutline = true;
  cube.raycast = () => {};
  return cube;
}

function buildFire() {
  const fire = new THREE.Group();
  fire.name = 'flame';
  // The heart of it, sat on the crossed logs: a pale-hot block inside an
  // orange one, both breathing.
  const heart = fireCube('core', 0, 0.16, 0xffd24a);
  heart.position.y = 0.16;
  fire.add(heart);
  const shell = fireCube('core', 1, 0.26, 0xf06a14, 0.85);
  shell.position.y = 0.15;
  fire.add(shell);
  for (let i = 0; i < FLAME_CUBES; i++) fire.add(fireCube('flame', i, 1, FLAME_HOT.getHex(), 0.95));
  for (let i = 0; i < EMBERS; i++) fire.add(fireCube('ember', i, 0.035, 0xffb84a));
  for (let i = 0; i < PUFFS; i++) fire.add(fireCube('smoke', i, 1, SMOKE.getHex(), 0.3));
  fire.visible = false;
  return fire;
}

/**
 * Light the fire or put it out, and move every cube of it to where it is at
 * time `t` (seconds). Called every frame for every campfire; out, it only
 * hides the group and turns the glow down.
 */
export function animateFire(prop, t, lit) {
  const fire = prop.mesh.getObjectByName('flame');
  const glow = prop.mesh.getObjectByName('fireLight');
  if (!fire) return;
  fire.visible = !!lit;
  if (glow) {
    // Two uneven waves and a quicker one on top, so it never visibly loops.
    glow.intensity = lit
      ? 3.2 + 0.6 * Math.sin(t * 7.3) + 0.35 * Math.sin(t * 13.1 + 1.7) + 0.2 * Math.sin(t * 23.9)
      : 0;
  }
  if (!lit) return;

  for (const cube of fire.children) {
    const { part, seed: i } = cube.userData;

    if (part === 'core') {
      const b = 1 + 0.12 * Math.sin(t * (8 + i * 3) + i) + 0.06 * Math.sin(t * 19 + i * 2);
      cube.scale.set(b, b * (1 + 0.15 * Math.sin(t * 6 + i)), b);
      cube.rotation.y = t * (i ? -0.6 : 0.9);
      continue;
    }

    if (part === 'flame') {
      // A flame cube's life: born low and hot in the core, risen and gone
      // at about 0.75, a little under a second later.
      const life = 0.7 + quirk(i, 1) * 0.35;
      const u = (t / life + quirk(i, 2)) % 1;
      const a = quirk(i, 3) * Math.PI * 2;
      const r = 0.1 * (1 - u) * (0.4 + quirk(i, 4));
      const sway = 0.05 * Math.sin(t * 5 + i) * u;
      cube.position.set(Math.cos(a) * r + sway, 0.14 + u * (0.62 + quirk(i, 5) * 0.25), Math.sin(a) * r);
      const size = (0.2 + quirk(i, 6) * 0.08) * Math.pow(1 - u, 0.8);
      cube.scale.setScalar(Math.max(0.001, size));
      cube.rotation.set(u * 2 + i, u * 3 + i, 0);
      const c = cube.material.color;
      if (u < 0.35) c.copy(FLAME_HOT).lerp(FLAME_MID, u / 0.35);
      else c.copy(FLAME_MID).lerp(FLAME_COOL, (u - 0.35) / 0.65);
      cube.material.opacity = 0.95 * (1 - u * u);
      continue;
    }

    if (part === 'ember') {
      // Sparks: slower, higher, drifting off sideways and blinking out.
      const life = 1.8 + quirk(i, 7) * 1.2;
      const u = (t / life + quirk(i, 8)) % 1;
      const a = quirk(i, 9) * Math.PI * 2;
      cube.position.set(
        Math.cos(a) * u * 0.35 + 0.06 * Math.sin(t * 3 + i),
        0.3 + u * (1.1 + quirk(i, 10) * 0.6),
        Math.sin(a) * u * 0.35
      );
      cube.material.opacity = u < 0.1 ? u * 10 : (1 - u) * (0.6 + 0.4 * Math.sin(t * 20 + i * 5));
      continue;
    }

    if (part === 'smoke') {
      // Smoke: grows, thins and drifts as it climbs clear of the flames.
      const life = 3.2 + quirk(i, 11) * 1.4;
      const u = (t / life + quirk(i, 12)) % 1;
      cube.position.set(
        0.08 * Math.sin(t * 0.7 + i) + u * 0.25 * (quirk(i, 13) - 0.5),
        0.75 + u * 1.5,
        0.08 * Math.cos(t * 0.6 + i * 2)
      );
      cube.scale.setScalar(0.1 + u * 0.3);
      cube.rotation.set(t * 0.3 + i, t * 0.4 + i, 0);
      cube.material.opacity = 0.28 * Math.sin(Math.PI * u);
    }
  }
}

/** Show a campfire's flames, or put them out (the first frame of `animateFire`). */
export function setFireLit(prop, lit) {
  animateFire(prop, 0, lit);
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
}

/** How far the block under a plot is pressed down to make the dent. */
export const FARMLAND_SINK = 0.16;

/** And what that block is repainted, so the floor of the dent is soil. */
export const FARMLAND_SOIL = 0x6b4a2c;

/**
 * A block of nothing, there to be hit by a ray and by nothing else.
 *
 * An invisible mesh is still raycast - three.js stopped skipping them - so
 * this gives a prop a hitbox that has nothing to do with how big it looks.
 * It is marked so the outline builder leaves it alone: tracing the edges of
 * a box nobody can see would draw a cage around thin air.
 */
function hitPad(w, h, d, y) {
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  pad.name = 'hit';
  pad.position.y = y;
  pad.visible = false;
  pad.userData.isHitPad = true;
  return pad;
}

/**
 * Reach the hitbox from the floor of the dent up to `top`.
 *
 * A crop is a handful of thin blades with air between them, so without this
 * the cursor falls straight through the gaps and the plot cannot be picked
 * up at all once anything is growing on it.
 */
function padUpTo(prop, top) {
  const pad = prop.mesh.getObjectByName('hit');
  if (!pad) return;
  const bottom = -FARMLAND_SINK - 0.05;
  pad.scale.y = Math.max(0.1, top - bottom);
  pad.position.y = bottom + pad.scale.y / 2;
}

/**
 * What is growing in a plot, drawn at one of six stages.
 *
 * A crop is a stage rather than a height so it reads as a plant changing
 * rather than a mesh being stretched: every 20% of the way to ripe it comes
 * up taller, and the last one turns gold and puts out heads. The blades are
 * rebuilt only when the stage actually changes - four times over five
 * minutes - so this costs nothing per frame.
 *
 * `stage` is null for bare ground. Returns true when something changed, so
 * the caller knows to re-tag the new meshes.
 */
const CROP_STAGES = 6;

export function setCropStage(prop, stage) {
  if (prop.cropStage === stage) return false;
  prop.cropStage = stage;

  const old = prop.mesh.getObjectByName('crop');
  if (old) prop.mesh.remove(old);
  if (stage === null || stage === undefined) {
    // Bare: the hitbox is the dent and a hair over the rim, which is what
    // lets a plot below the grass be hovered at a low angle at all.
    padUpTo(prop, 0.18);
    return true;
  }

  const crop = new THREE.Group();
  crop.name = 'crop';

  const t = stage / (CROP_STAGES - 1);
  const h = 0.10 + t * 0.62;
  // Green while it is growing, gold once it is ready.
  const green = new THREE.Color(0x6aa84f);
  const tint = green.clone().lerp(new THREE.Color(0xd8b24a), Math.max(0, t - 0.4) / 0.6);

  const TUFTS = [[-0.26, -0.29], [0.02, -0.29], [0.28, -0.29],
                 [-0.26, 0.00], [0.02, 0.00], [0.28, 0.00],
                 [-0.26, 0.29], [0.02, 0.29], [0.28, 0.29]];

  TUFTS.forEach(([x, z], i) => {
    const tall = h * (0.82 + rand(prop.salt * 7 + i, 31) * 0.36);
    const geo = new THREE.BoxGeometry(0.09, tall, 0.09);
    geo.translate(0, tall / 2, 0);
    const blade = new THREE.Mesh(geo, mat(tint.getHex()));
    // Out of the floor of the dent, not off the grass.
    blade.position.set(x, -FARMLAND_SINK, z);
    blade.castShadow = true;
    crop.add(blade);

    // Ripe: a head on every stalk, which is what says it is ready without
    // having to read the number at the top of the screen.
    if (stage === CROP_STAGES - 1) {
      // Sunk well down over the top of its stalk rather than balanced on it:
      // an overlap of a hair left a thin seam under each head, and from low
      // down they read as floating over the crop.
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.17, 0.15), mat(0xe8cc63));
      head.position.set(x, -FARMLAND_SINK + tall + 0.01, z);
      head.castShadow = true;
      crop.add(head);
    }
  });

  prop.mesh.add(crop);
  // Over the tallest a blade can have rolled, plus its head.
  padUpTo(prop, -FARMLAND_SINK + h * 1.18 + (stage === CROP_STAGES - 1 ? 0.25 : 0.06));
  return true;
}

/**
 * Which of the six stages a plot is showing, from how far along it is.
 *
 * Five stages of twenty percent each while it grows, and the sixth is ripe -
 * so the gold only arrives when the crop is actually ready to come up, not
 * at 99%.
 */
export function cropStageOf(fraction) {
  if (fraction >= 1) return CROP_STAGES - 1;
  return Math.min(CROP_STAGES - 2, Math.floor(fraction * (CROP_STAGES - 1)));
}

function buildProp(kind, salt) {
  const g = new THREE.Group();

  if (kind === 'sapling') {
    // Deliberately small: a shoot and two leaves, nothing like the bulk of
    // the tree it turns into, so the two never read as the same thing.
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), mat(0x6b5a34));
    stem.position.y = 0.22;
    stem.castShadow = true;
    g.add(stem);

    const leafA = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.3), mat(0x4f9a5e));
    leafA.position.set(0.17, 0.44, 0);
    leafA.rotation.z = -0.35;
    leafA.castShadow = true;
    g.add(leafA);

    const leafB = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.26), mat(0x468f57));
    leafB.position.set(-0.15, 0.36, 0.04);
    leafB.rotation.z = 0.4;
    leafB.castShadow = true;
    g.add(leafB);

    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2), mat(0x57a869));
    tip.position.y = 0.55;
    tip.castShadow = true;
    g.add(tip);

    g.rotation.y = rand(salt, 11) * Math.PI;
    return g;
  }

  if (kind === 'farmland') {
    // A dent, not a tray - and the floor of it is the isle's own block,
    // pressed down by `island.sinkBlock` and repainted `FARMLAND_SOIL`.
    // There is deliberately no slab of soil here: a slab has to be as wide
    // as the cell to leave no gap at the rim, which puts it and the
    // neighbouring cubes in the same space, and the two flicker against each
    // other the moment the camera moves. A block that is simply painted
    // another colour cannot z-fight with anything.
    //
    // The furrows are all that is drawn, and they are what say it has been
    // hoed. They are well inside the cell and sunk into the floor, so they
    // touch nothing either.
    for (let i = -1; i <= 1; i++) {
      const furrow = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.12), mat(0x553a21));
      furrow.position.set(0, -FARMLAND_SINK + 0.01, i * 0.28);
      furrow.receiveShadow = true;
      g.add(furrow);
    }

    // And a block of nothing over the top of it, purely to be hit by the
    // cursor. A dent is *below* the grass, so a ray coming in at anything
    // but a steep angle meets the rim first and the plot could not be
    // hovered at all. `setCropStage` stretches it up over whatever is
    // growing, or the gaps between the blades are see-through. It is never
    // drawn and never casts.
    g.add(hitPad(1, 1, 1, 0));
    return g;
  }

  if (kind === 'waterCatcher') {
    // Four walls and a floor, open to the sky. The water inside is a
    // separate mesh so it can be raised and lowered as it fills - it is
    // named, which is how `setCatcherLevel` finds it again.
    const WALL = 0x8a5c30;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), mat(WALL));
    floor.position.y = 0.05;
    floor.castShadow = true;
    g.add(floor);

    for (const [dx, dz, w, d] of [[0, 0.44, 0.9, 0.08], [0, -0.44, 0.9, 0.08],
                                  [0.44, 0, 0.08, 0.9], [-0.44, 0, 0.08, 0.9]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.52, d), mat(0xa8763f));
      wall.position.set(dx, 0.26, dz);
      wall.castShadow = true;
      g.add(wall);
    }

    const water = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1, 0.8),
      mat(0x3f9fd8, { transparent: true, opacity: 0.85 })
    );
    water.name = 'water';
    water.scale.y = 0.001;
    water.position.y = 0.1;
    g.add(water);
    return g;
  }

  if (kind === 'pipe') {
    // Only the hub: the arms depend on what is beside it, and
    // `setPipeShape` hangs them off this once that is known.
    const hub = new THREE.Mesh(
      new THREE.BoxGeometry(PIPE_WIDTH + 0.06, PIPE_WIDTH + 0.06, PIPE_WIDTH + 0.06),
      mat(PIPE_BAND)
    );
    hub.position.y = PIPE_Y;
    hub.castShadow = true;
    g.add(hub);
    return g;
  }

  if (kind === 'sprinkler') {
    // Built facing +Z: the nozzle out of the front, the water port on the
    // back and the cog on the +X side, where the crank handle goes on. The
    // whole group is turned for the other three facings.
    const WALL = 0x8a5c30;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), mat(WALL));
    floor.position.y = 0.05;
    floor.castShadow = true;
    g.add(floor);

    for (const [dx, dz, w, d] of [[0, 0.36, 0.8, 0.08], [0, -0.36, 0.8, 0.08],
                                  [0.36, 0, 0.08, 0.8], [-0.36, 0, 0.08, 0.8]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.56, d), mat(0xa8763f));
      wall.position.set(dx, 0.28, dz);
      wall.castShadow = true;
      g.add(wall);
    }

    // The water inside, the same named block a catcher has, so
    // `setWaterLevel` raises it the same way.
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 1, 0.64),
      mat(0x3f9fd8, { transparent: true, opacity: 0.85 })
    );
    water.name = 'water';
    water.scale.y = 0.001;
    water.position.y = 0.1;
    g.add(water);

    // The nozzle: a stub out of the front wall, tipped up so it throws the
    // water forward over the patch in front.
    const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.42), mat(PIPE_WOOD));
    nozzle.position.set(0, 0.46, 0.5);
    nozzle.rotation.x = -0.45;
    nozzle.castShadow = true;
    g.add(nozzle);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.06), mat(PIPE_BAND));
    lip.position.set(0, 0.55, 0.69);
    lip.rotation.x = -0.45;
    g.add(lip);

    // The water port on the back, banded blue so it reads as the way in.
    const port = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.14), mat(PIPE_WOOD));
    port.position.set(0, 0.2, -0.45);
    g.add(port);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.05), mat(0x3f9fd8, { emissive: 0x0d3550 }));
    band.position.set(0, 0.2, -0.5);
    g.add(band);

    g.add(buildCog());
    return g;
  }

  if (kind === 'campfire') {
    // A ring of stones, two logs crossed in it, and the flames - a named
    // group `animateFire` shows, hides and moves every frame.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.16), mat(i % 2 ? 0x8b929c : 0x9aa0ad));
      stone.position.set(Math.cos(a) * 0.36, 0.065, Math.sin(a) * 0.36);
      stone.rotation.y = -a;
      stone.castShadow = true;
      g.add(stone);
    }
    for (const turn of [0.4, -0.4]) {
      const log = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.12), mat(0x6b4a2f));
      log.position.y = 0.08;
      log.rotation.y = turn;
      log.castShadow = true;
      g.add(log);
    }
    const ash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), mat(0x3a3530));
    ash.position.y = 0.02;
    g.add(ash);

    g.add(buildFire());
    // The glow on the ground round it. A light that is added or taken away
    // makes every material in the scene recompile, so this one is always
    // there and simply turned down to nothing while the fire is out.
    const glow = new THREE.PointLight(0xff8a3a, 0, 4.5, 1.6);
    glow.name = 'fireLight';
    glow.position.y = 0.45;
    g.add(glow);
    return g;
  }

  if (kind === 'mixingBowl') {
    // A wooden bowl on a low stand, the paddle standing in it - the paddle is
    // the `runner`, so it goes round with the crank the way a millstone does.
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.62), mat(0x8a5c30));
    stand.position.y = 0.11;
    stand.castShadow = true;
    g.add(stand);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.72), mat(0xa8763f));
    floor.position.y = 0.26;
    floor.castShadow = true;
    g.add(floor);
    for (const [dx, dz, w, d] of [[0, 0.36, 0.8, 0.08], [0, -0.36, 0.8, 0.08],
                                  [0.36, 0, 0.08, 0.8], [-0.36, 0, 0.08, 0.8]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), mat(0xc99359));
      wall.position.set(dx, 0.4, dz);
      wall.castShadow = true;
      g.add(wall);
    }
    // What is in it, shown as a pale layer once there is anything.
    const batter = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.62), mat(0xf0dfb4));
    batter.name = 'batter';
    batter.position.y = 0.33;
    batter.visible = false;
    g.add(batter);
    const paddle = new THREE.Group();
    paddle.name = 'runner';
    paddle.position.y = 0.3;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat(0xe0b070));
    shaft.position.set(0.1, 0.25, 0);
    shaft.rotation.z = -0.25;
    shaft.castShadow = true;
    paddle.add(shaft);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), mat(0xe0b070));
    blade.position.set(0.04, 0.05, 0);
    paddle.add(blade);
    g.add(paddle);
    g.add(buildCog());
    return g;
  }

  if (kind === 'chest') {
    // A box with its lid on and two bands round it, smaller than a cell so
    // it does not read as another isle block.
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.56), mat(0xa8763f));
    body.position.y = 0.21;
    body.castShadow = true;
    g.add(body);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.62), mat(0xc99359));
    lid.position.y = 0.49;
    lid.castShadow = true;
    g.add(lid);
    for (const x of [-0.25, 0.25]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.58, 0.64), mat(0x6b451f));
      band.position.set(x, 0.29, 0);
      g.add(band);
    }
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.05), mat(0xd3b167));
    clasp.position.set(0, 0.4, 0.31);
    g.add(clasp);
    return g;
  }

  if (kind === 'mill') {
    // Built facing +Z with the crank side on +X, the same as the sprinkler.
    // A wooden housing, two millstones on it - the top one turns while it is
    // cranked - and a hopper of wheat over them.
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.8), mat(0xa8763f));
    housing.position.y = 0.21;
    housing.castShadow = true;
    g.add(housing);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), mat(0x8b929c));
    bed.position.y = 0.48;
    bed.castShadow = true;
    g.add(bed);
    const runner = new THREE.Group();
    runner.name = 'runner';
    runner.position.y = 0.6;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), mat(0xaab1bd));
    stone.castShadow = true;
    runner.add(stone);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.16), mat(0x5a606b));
    runner.add(eye);
    g.add(runner);
    const hopper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.34), mat(0xc99359));
    hopper.position.y = 0.8;
    hopper.castShadow = true;
    g.add(hopper);
    const grain = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.28), mat(0xf0d07a));
    grain.position.y = 0.9;
    g.add(grain);
    // A spout out of the front with a little heap of flour under it.
    const spout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.2), mat(0x8a5c30));
    spout.position.set(0, 0.3, 0.48);
    g.add(spout);
    const heap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.14), mat(0xf4eee0));
    heap.position.set(0, 0.04, 0.48);
    g.add(heap);
    g.add(buildCog());
    return g;
  }

  if (kind === 'weed') {
    // A low tuft: a few blades leaning out of one cell, none of them taller
    // than a third of a block, so it reads as ground cover rather than as
    // something to walk around. They are turned off the salt, which is what
    // keeps a patch of them from looking stamped out of one mould.
    const BLADES = [
      { w: 0.14, h: 0.40, x: 0.00, z: 0.02, lean: 0.10, tint: 0x5f9a4a },
      { w: 0.12, h: 0.31, x: 0.21, z: -0.12, lean: -0.34, tint: 0x6fa855 },
      { w: 0.12, h: 0.34, x: -0.20, z: 0.13, lean: 0.38, tint: 0x548f43 },
      { w: 0.11, h: 0.24, x: 0.10, z: 0.22, lean: -0.22, tint: 0x77b05c },
      { w: 0.11, h: 0.27, x: -0.13, z: -0.19, lean: 0.28, tint: 0x67a251 }
    ];

    BLADES.forEach((b, i) => {
      const h = b.h * (0.8 + rand(salt * 13 + i, 23) * 0.45);

      // The blade turns about its FOOT, not its middle. A box rotated about
      // its centre swings its base off the ground - that is what left every
      // weed hovering, one corner at a time - so the geometry is pushed up
      // by half its height first and the mesh then sits at ground level.
      const geo = new THREE.BoxGeometry(b.w, h, b.w);
      geo.translate(0, h / 2, 0);

      // Even pivoted at the foot, a lean tips the base square up on one
      // side: its corners end up at +/-(w/2)*sin(lean). Sinking the blade by
      // exactly that much puts the raised corner back on the grass and
      // buries the opposite one, so the blade meets the ground either way.
      const blade = new THREE.Mesh(geo, mat(b.tint));
      blade.position.set(b.x, -(b.w / 2) * Math.abs(Math.sin(b.lean)), b.z);
      blade.rotation.z = b.lean;
      blade.castShadow = true;
      g.add(blade);
    });

    g.rotation.y = rand(salt, 17) * Math.PI * 2;
    return g;
  }

  if (kind === 'tree') {
    // A short trunk under a broad two-tier crown, rather than a bare pole
    // with a tuft on top.
    const h = 1.5 + rand(salt, 5) * 0.6;
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, 0.42), mat(0x6b4a2f));
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 1.9), mat(0x2b7149));
    skirt.position.y = h + 0.3;
    skirt.castShadow = true;
    g.add(skirt);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.8, 1.45), mat(0x357f52));
    crown.position.y = h + 1.0;
    crown.castShadow = true;
    g.add(crown);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.85), mat(0x3f9560));
    top.position.y = h + 1.65;
    top.castShadow = true;
    g.add(top);
  } else {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.75, 1), mat(0x8a8f9c, { metalness: 0.08 }));
    base.position.y = 0.37;
    base.castShadow = true;
    g.add(base);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), mat(0x9aa0ad));
    cap.position.set(0.22, 0.85, -0.12);
    cap.castShadow = true;
    g.add(cap);
  }

  return g;
}
