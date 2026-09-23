import * as THREE from 'three';
import { PROP_KINDS, GROUND_OFFSET, setPipeShape, setCrank, setWaterLevel } from './props.js';

/**
 * The water works: pipes, what they join up to, and the machines on the end.
 *
 * A pipe is a prop on one cell. It joins itself up to whatever is beside it
 * on the four sides - another pipe up to a block higher or lower, or a
 * water PORT on the level (its side) or a block up (its bottom) - and its
 * arms are rebuilt whenever that changes. Nothing has to be told a pipe was
 * laid: `update` notices the isle's pipes and ports have moved and works the
 * links out again, which is also what keeps a station being dragged about in
 * the mover joined up the whole way.
 *
 * Water moves by GRAVITY and nothing else. Everything joined by one run of
 * pipe is one network, and a network can carry `PROP_KINDS.pipe.flow`
 * millilitres a second in all, from whatever holds water into whatever has
 * room - but only ever down, or along the level, never up. Two catchers on
 * the level share out until they are equally full rather than sloshing back
 * and forth.
 *
 * Each end of a pipe that goes into something can be set with a wrench:
 * both ways (as laid), `in` - the thing only ever takes water from the pipe,
 * drawn as a narrowed neck - or `out` - the thing only ever gives water to
 * it, drawn as the pipe running on into it with a collar. The mode lives on
 * the pipe, keyed by the direction of that end, so it is saved with it.
 */

/** The four sides, in the order `facing` counts them: +Z, +X, -Z, -X. */
export const SIDES = [
  { x: 0, z: 1 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: -1, z: 0 }
];

const keyOf = (x, z) => `${x},${z}`;

/**
 * Which way a machine is looking, and its other sides from there.
 *
 * Built facing +Z with the cog on +X, a turn of a quarter about Y takes +Z to
 * +X - so the crank side is always the next side round from the front, and
 * the back is the one opposite.
 */
export function sidesOf(prop) {
  const f = prop.facing ?? 0;
  return { front: SIDES[f], crank: SIDES[(f + 1) % 4], back: SIDES[(f + 2) % 4] };
}

/** Turn the mesh to the way the prop is facing. */
export function applyFacing(prop) {
  prop.mesh.rotation.y = (prop.facing ?? 0) * (Math.PI / 2);
}

/** Where an agent stands to work the crank. */
export function crankCell(prop) {
  const { crank } = sidesOf(prop);
  return { x: prop.x + crank.x, z: prop.z + crank.z };
}

/** The 3x3 patch of ground in front of a sprinkler that it throws water on. */
export function sprayCells(prop) {
  const { front, crank } = sidesOf(prop);
  const cells = [];
  for (let d = 1; d <= 3; d++) {
    for (let l = -1; l <= 1; l++) {
      cells.push({ x: prop.x + front.x * d + crank.x * l, z: prop.z + front.z * d + crank.z * l });
    }
  }
  return cells;
}

/**
 * The directions a thing has a water port on, and what it does with water.
 *
 * A catcher is an open tub: any side will do, and it gives as well as takes.
 * A sprinkler only has the port on its back, and it only ever takes - it
 * gets rid of water by being cranked, not down a pipe.
 */
function portsOf(prop) {
  if (prop.kind === 'waterCatcher') return { sides: SIDES, gives: true, takes: true };
  if (prop.kind === 'sprinkler') return { sides: [sidesOf(prop).back], gives: false, takes: true };
  return null;
}

/** Whether something is a thing a pipe can join to at all. */
export const hasPorts = (prop) => !!portsOf(prop);

// --- the guide: what a machine will do, drawn on the isle -------------------

const GUIDE_SPRAY = 0x6fc4ee;
const GUIDE_CRANK = 0xff5a5a;
const GUIDE_INPUT = 0x3f9fff;

const sprayTile = new THREE.MeshBasicMaterial({
  color: GUIDE_SPRAY, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide
});
const sprayEdge = new THREE.LineBasicMaterial({ color: GUIDE_SPRAY, transparent: true, opacity: 0.9 });
const inputFill = new THREE.MeshBasicMaterial({
  color: GUIDE_INPUT, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide
});
const crankEdge = new THREE.LineBasicMaterial({
  color: GUIDE_CRANK, transparent: true, opacity: 1, depthTest: false
});
const inputEdge = new THREE.LineBasicMaterial({
  color: GUIDE_INPUT, transparent: true, opacity: 1, depthTest: false
});

/**
 * Everything a machine will touch, drawn over the isle: the nine cells it
 * waters, its crank side outlined red and its water intake filled blue - on
 * the machine's own face and on the ground beside it, where the agent will
 * stand and where the pipe goes. World coordinates, rebuilt whenever it
 * moves or turns; the caller disposes of it with `disposeGuide`.
 */
export function buildGuide(prop, surface) {
  const g = new THREE.Group();
  g.name = 'machine-guide';
  const groundAt = (c) => {
    const h = surface.get(keyOf(c.x, c.z));
    return h === undefined ? null : h + GROUND_OFFSET + 0.035;
  };
  const tile = (c, material, edge) => {
    const y = groundAt(c);
    if (y === null) return;
    const plane = new THREE.PlaneGeometry(0.9, 0.9);
    plane.rotateX(-Math.PI / 2);
    if (material) {
      const mesh = new THREE.Mesh(plane, material);
      mesh.position.set(c.x, y, c.z);
      mesh.raycast = () => {};
      g.add(mesh);
    }
    if (edge) {
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(plane), edge);
      line.position.set(c.x, y + 0.005, c.z);
      line.raycast = () => {};
      g.add(line);
    }
  };

  // Only what this machine actually has: a mill throws no water and takes
  // none in, so all it shows is where its crank goes.
  const sprays = !!PROP_KINDS[prop.kind]?.spray;
  const intake = !!portsOf(prop);
  if (sprays) for (const c of sprayCells(prop)) tile(c, sprayTile, sprayEdge);

  const { crank, back } = sidesOf(prop);
  tile(crankCell(prop), null, crankEdge);
  if (intake) tile({ x: prop.x + back.x, z: prop.z + back.z }, inputFill, inputEdge);

  // The two faces of the machine itself: a red frame round the crank side
  // and a blue panel over the intake.
  const base = groundAt(prop) ?? 0;
  const face = (side, material, edge) => {
    const plane = new THREE.PlaneGeometry(0.86, 0.62);
    // A plane faces +Z; turn it to face out of this side.
    plane.rotateY(Math.atan2(side.x, side.z));
    const at = new THREE.Vector3(prop.x + side.x * 0.47, base + 0.3, prop.z + side.z * 0.47);
    if (material) {
      const mesh = new THREE.Mesh(plane, material);
      mesh.position.copy(at);
      mesh.raycast = () => {};
      g.add(mesh);
    }
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(plane), edge);
    line.position.copy(at);
    line.raycast = () => {};
    line.renderOrder = 4;
    g.add(line);
  };
  face(crank, null, crankEdge);
  if (intake) face(back, inputFill, inputEdge);

  return g;
}

/** Free a guide's geometry; the materials are shared and kept. */
export function disposeGuide(guide) {
  if (!guide) return;
  guide.parent?.remove(guide);
  guide.traverse((o) => o.geometry?.dispose());
}

// --- the running water works -------------------------------------------------

/** How long a turned machine shows its guide for, after a wrench. */
const FLASH_SECONDS = 3;

// The spray: small blue drops arcing out of the nozzle onto the nine cells.
const DROPS_PER_MACHINE = 18;
const MAX_DROPS = 96;

export function createMachines({ scene, surface, props, onRebuilt }) {
  let signature = null;
  let networks = [];                 // [{ pipes: [], ends: [{ tank, pipe, dir, mode }] }]
  const links = new Map();           // pipe -> [{ dx, dz, dh, port, mode, tank }]
  const flashes = [];                // [{ prop, guide, left }]
  const spraying = new Map();        // machine -> seconds of spray left to show
  let clock = 0;

  const drops = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.07, 0.07, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x8fd4ff, transparent: true, opacity: 0.9 }),
    MAX_DROPS
  );
  drops.name = 'spray';
  drops.count = 0;
  drops.frustumCulled = false;
  drops.raycast = () => {};          // dressing, never a click target
  scene.add(drops);

  const heightOf = (p) => surface.get(keyOf(p.x, p.z));

  /** Everything that matters to the links, as one string to compare. */
  function signatureNow() {
    let s = '';
    for (const p of props) {
      if (p.gone || !(p.kind === 'pipe' || hasPorts(p))) continue;
      s += `${p.kind}:${p.x},${p.z},${p.facing ?? ''},${heightOf(p)}`;
      if (p.kind === 'pipe' && p.modes) s += JSON.stringify(p.modes);
      s += '|';
    }
    return s;
  }

  /** Work every pipe's links and the networks out again, and reshape. */
  function relink() {
    const at = new Map();
    for (const p of props) {
      if (p.gone) continue;
      if (p.kind === 'pipe' || hasPorts(p)) at.set(keyOf(p.x, p.z), p);
    }

    links.clear();
    for (const pipe of props) {
      if (pipe.gone || pipe.kind !== 'pipe') continue;
      const h = heightOf(pipe);
      const list = [];
      for (const d of SIDES) {
        const other = at.get(keyOf(pipe.x + d.x, pipe.z + d.z));
        if (!other) continue;
        const dh = heightOf(other) - h;
        if (other.kind === 'pipe') {
          if (Math.abs(dh) <= 1) list.push({ dx: d.x, dz: d.z, dh, port: false, pipe: other });
          continue;
        }
        // A port has to face the pipe, and the pipe has to come in at its
        // side (level) or its bottom (a block below it).
        const ports = portsOf(other);
        if (!ports.sides.some((s) => s.x === -d.x && s.z === -d.z)) continue;
        if (dh !== 0 && dh !== 1) continue;
        const mode = pipe.modes?.[keyOf(d.x, d.z)] ?? null;
        list.push({ dx: d.x, dz: d.z, dh, port: true, mode, tank: other });
      }
      links.set(pipe, list);

      const shape = JSON.stringify(list.map(({ dx, dz, dh, port, mode }) => [dx, dz, dh, port, mode]));
      if (pipe.linkKey !== shape) {
        pipe.linkKey = shape;
        setPipeShape(pipe, list);
        onRebuilt?.(pipe);
      }
    }

    // Networks: pipes joined to pipes, and the tanks on the ends of them.
    networks = [];
    const seen = new Set();
    for (const start of links.keys()) {
      if (seen.has(start)) continue;
      const net = { pipes: [], ends: [] };
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const pipe = stack.pop();
        net.pipes.push(pipe);
        for (const link of links.get(pipe) ?? []) {
          if (link.port) {
            net.ends.push({ tank: link.tank, pipe, mode: link.mode });
          } else if (!seen.has(link.pipe)) {
            seen.add(link.pipe);
            stack.push(link.pipe);
          }
        }
      }
      networks.push(net);
    }
  }

  /** Move water round one network, downhill or on the level only. */
  function flow(net, dt) {
    if (net.ends.length < 2) return;

    // A tank can sit on the end of more than one pipe in a network; it can
    // give if any of its ends lets it, and take if any of them does.
    const tanks = new Map();
    for (const end of net.ends) {
      const ports = portsOf(end.tank);
      const t = tanks.get(end.tank) ?? { prop: end.tank, gives: false, takes: false };
      if (ports.gives && end.mode !== 'in') t.gives = true;
      if (ports.takes && end.mode !== 'out') t.takes = true;
      tanks.set(end.tank, t);
    }

    const maxOf = (p) => PROP_KINDS[p.kind].water.max;
    const sources = [...tanks.values()].filter((t) => t.gives)
      .sort((a, b) => heightOf(b.prop) - heightOf(a.prop));
    const sinks = [...tanks.values()].filter((t) => t.takes)
      .sort((a, b) => heightOf(a.prop) - heightOf(b.prop));

    let budget = PROP_KINDS.pipe.flow * dt;
    for (const sink of sinks) {
      for (const source of sources) {
        if (budget <= 0) return;
        if (source.prop === sink.prop) continue;
        const hs = heightOf(source.prop);
        const hk = heightOf(sink.prop);
        if (hk > hs) continue;                         // never uphill

        const ws = source.prop.water ?? 0;
        const wk = sink.prop.water ?? 0;
        let amount = Math.min(budget, ws, maxOf(sink.prop) - wk);
        // On the level between two tanks that both give, water only finds
        // its level: it stops once both are as full as each other.
        if (hk === hs && sink.gives) {
          const ms = maxOf(source.prop);
          const mk = maxOf(sink.prop);
          amount = Math.min(amount, (ws * mk - wk * ms) / (ms + mk));
        }
        if (amount <= 1e-6) continue;

        source.prop.water = ws - amount;
        sink.prop.water = wk + amount;
        budget -= amount;
      }
    }
  }

  // --- the spray --------------------------------------------------------

  const dropMatrix = new THREE.Matrix4();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const at = new THREE.Vector3();

  function drawSpray(dt) {
    let n = 0;
    for (const [machine, left] of spraying) {
      const remaining = left - dt;
      if (remaining <= 0 || machine.gone) { spraying.delete(machine); continue; }
      spraying.set(machine, remaining);

      // The crank goes round while it is being worked, and a millstone with it.
      const arm = machine.mesh.getObjectByName('crank-arm');
      if (arm) arm.rotation.x -= dt * 7;
      const runner = machine.mesh.getObjectByName('runner');
      if (runner) runner.rotation.y += dt * 2.5;
      // Only a machine that throws water has drops to draw.
      if (!PROP_KINDS[machine.kind]?.spray) continue;

      const { front } = sidesOf(machine);
      const base = machine.mesh.position;
      from.set(base.x + front.x * 0.72, base.y + 0.6, base.z + front.z * 0.72);
      const cells = sprayCells(machine);
      for (let i = 0; i < DROPS_PER_MACHINE && n < MAX_DROPS; i++) {
        const cell = cells[i % cells.length];
        const h = surface.get(keyOf(cell.x, cell.z));
        if (h === undefined) continue;
        const t = (clock * 1.3 + i / DROPS_PER_MACHINE) % 1;
        to.set(cell.x, h + GROUND_OFFSET + 0.05, cell.z);
        at.lerpVectors(from, to, t);
        at.y += Math.sin(Math.PI * t) * 0.9;
        dropMatrix.makeTranslation(at.x, at.y, at.z);
        drops.setMatrixAt(n++, dropMatrix);
      }
    }
    drops.count = n;
    drops.instanceMatrix.needsUpdate = true;
  }

  // --- what main.js calls ---------------------------------------------------

  function update(dt) {
    clock += dt;
    const now = signatureNow();
    if (now !== signature) {
      signature = now;
      relink();
    }
    for (const net of networks) flow(net, dt);

    // A sprinkler's water shows in its box the way a catcher's does.
    for (const p of props) {
      if (!p.gone && p.kind === 'sprinkler') {
        setWaterLevel(p, (p.water ?? 0) / PROP_KINDS.sprinkler.water.max);
      }
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const flash = flashes[i];
      flash.left -= dt;
      if (flash.left <= 0 || flash.prop.gone) {
        disposeGuide(flash.guide);
        flashes.splice(i, 1);
      }
    }

    drawSpray(dt);
  }

  /** A pipe's links, as last worked out. */
  const linksOf = (pipe) => links.get(pipe) ?? [];

  /**
   * Which of a pipe's port ends a point on it is nearest to, or null if it
   * goes into nothing. With one end it is that one wherever the pipe was
   * hit; with two it is whichever way from the middle the point lies.
   */
  function pipeEndAt(pipe, point) {
    const ends = linksOf(pipe).filter((l) => l.port);
    if (ends.length <= 1) return ends[0] ?? null;
    const vx = point.x - pipe.mesh.position.x;
    const vz = point.z - pipe.mesh.position.z;
    let best = ends[0];
    let score = -Infinity;
    for (const end of ends) {
      const s = end.dx * vx + end.dz * vz;
      if (s > score) { score = s; best = end; }
    }
    return best;
  }

  /** A world box around one end of a pipe, for the cursor's brackets. */
  function endBox(pipe, end) {
    const p = pipe.mesh.position;
    const cx = p.x + end.dx * 0.42;
    const cz = p.z + end.dz * 0.42;
    const top = p.y + 0.45 + Math.max(0, end.dh);
    return new THREE.Box3(
      new THREE.Vector3(cx - (end.dx ? 0.26 : 0.2), p.y, cz - (end.dz ? 0.26 : 0.2)),
      new THREE.Vector3(cx + (end.dx ? 0.26 : 0.2), top, cz + (end.dz ? 0.26 : 0.2))
    );
  }

  /** Both ways -> fills only -> drains only -> both ways. */
  function cycleMode(pipe, end) {
    const key = keyOf(end.dx, end.dz);
    const next = { null: 'in', in: 'out', out: null }[pipe.modes?.[key] ?? null];
    pipe.modes = { ...(pipe.modes ?? {}) };
    if (next) pipe.modes[key] = next;
    else delete pipe.modes[key];
    return next;
  }

  /** Whether any pipe goes into this thing. */
  function piped(prop) {
    for (const list of links.values()) if (list.some((l) => l.tank === prop)) return true;
    return false;
  }

  /**
   * Whether a wrench may turn a machine round: only with nothing joined to
   * it - no pipe into its intake, and no crank on its side.
   */
  function canRotate(prop) {
    if (!prop || prop.gone || !PROP_KINDS[prop.kind]?.facing) return false;
    return !prop.crank && !piped(prop);
  }

  /** Show a machine's guide for a moment - what a turn has changed. */
  function flash(prop) {
    for (const f of flashes) if (f.prop === prop) { disposeGuide(f.guide); f.left = 0; }
    const guide = buildGuide(prop, surface);
    scene.add(guide);
    flashes.push({ prop, guide, left: FLASH_SECONDS });
  }

  /** A quarter turn round, and the guide shown so the change can be seen. */
  function rotate(prop) {
    prop.facing = ((prop.facing ?? 0) + 1) % 4;
    applyFacing(prop);
    flash(prop);
  }

  /**
   * One frame of cranking: throw water on the nine cells in front.
   *
   * `spray` millilitres a second onto EACH cell, whether or not there is
   * anything there to catch it - so a full box is 600 / 90, a little under
   * seven seconds of cranking. Only turned ground holds on to it. Returns
   * false once it is dry, which is what stops the crank going round.
   */
  function spray(prop, dt) {
    const water = prop.water ?? 0;
    if (water <= 0) return false;

    const cells = sprayCells(prop);
    const per = PROP_KINDS.sprinkler.spray * dt;
    const f = Math.min(1, water / (per * cells.length));
    for (const cell of cells) {
      const plot = props.find((p) => !p.gone && p.kind === 'farmland' && p.x === cell.x && p.z === cell.z);
      if (!plot) continue;
      plot.water = Math.min(PROP_KINDS.farmland.water.max, (plot.water ?? 0) + per * f);
    }
    prop.water = Math.max(0, water - per * cells.length * f);
    spraying.set(prop, 0.25);
    return true;
  }

  /** Show a machine being worked - its crank going round - for a moment. */
  function turn(prop) {
    spraying.set(prop, 0.25);
  }

  /** Put what a saved or freshly built machine carries back on its mesh. */
  function dress(prop) {
    if (PROP_KINDS[prop.kind]?.facing) applyFacing(prop);
    if (prop.crank) setCrank(prop, true);
    onRebuilt?.(prop);
  }

  /** For DEV RESET: nothing flashing, nothing spraying. */
  function reset() {
    for (const f of flashes) disposeGuide(f.guide);
    flashes.length = 0;
    spraying.clear();
    drops.count = 0;
    signature = null;
  }

  return {
    update, links: linksOf, pipeEndAt, endBox, cycleMode, canRotate, rotate, flash,
    spray, turn, dress, reset, piped,
    get networks() { return networks; }
  };
}

/** What an end has been set to, as the readout says it. */
export function modeLabel(mode) {
  if (mode === 'in') return 'fills it only';
  if (mode === 'out') return 'drains it only';
  return 'both ways';
}
