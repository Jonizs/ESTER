import * as THREE from 'three';
import { findPath, floorsAt, standable, HEADROOM } from './path.js';

/**
 * F2: the analysis panel. A dev readout, top right under the see-through
 * badge, that walks through what a plain LEFT CLICK at the cursor would do
 * and says, check by check, why it would or would not send the selected
 * agent there. It mirrors `handleClick` in `main.js` - if the two ever
 * disagree, the panel is what is wrong - and it only reads, it never orders
 * anyone about.
 *
 * It runs off the frame loop, a few times a second while it is open, and not
 * at all while it is closed: the route check is a whole A* search.
 */

const EVERY_MS = 150;

// A neighbour's step, in the eight directions the pathing takes.
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function createAnalysis({ scene, island, surface, props, blocked, raycaster, cutaway, blockAt, selectedAgent, busyPlot, carrying }) {
  const root = document.getElementById('analysis');
  const list = root.querySelector('.analysis-lines');
  const where = root.querySelector('.analysis-where');
  let open = false;
  const centre = new THREE.Vector3();
  let last = 0;

  function propOf(object) {
    while (object) {
      if (object.userData.person) return { agent: object.userData.person };
      if (object.userData.propId) return { prop: props.find((p) => p.id === object.userData.propId) };
      object = object.parent;
    }
    return null;
  }

  /** The checks, in the order a click meets them: `[ok, text]`, and a verdict. */
  function analyse() {
    const lines = [];
    const add = (ok, text) => lines.push([ok, text]);
    let place = '';

    const agent = selectedAgent();
    if (!agent) add(false, 'No agent selected - a click walks nobody anywhere');
    else add(true, `Agent selected: ${agent.name}`);
    if (carrying()) add(false, 'Something is on the cursor - a click puts it down (or away) instead');

    let cut = 0;
    let ground = null;
    for (const hit of raycaster.intersectObject(scene, true)) {
      if (cutaway.hidesHit(hit)) { cut++; continue; }
      const owner = propOf(hit.object);
      if (owner?.agent) { add(false, `Pointing at ${owner.agent.name} - a click selects them`); return { lines, place }; }
      if (owner?.prop && !owner.prop.gone) {
        const prop = owner.prop;
        // A plot with a crop coming up passes the click to the ground under
        // it, the same as `handleClick` lets it fall through.
        if (prop.kind === 'farmland' && busyPlot(prop)) { add(true, 'Passes over a growing plot to the ground'); continue; }
        add(false, `Pointing at a ${prop.kind} - a click works or opens it, it is not a walk`);
        return { lines, place };
      }
      if (!hit.object.isInstancedMesh || hit.object.parent !== island) continue;
      ground = hit;
      break;
    }
    if (cut) add(true, `Went through ${cut} face(s) the see-through cut hides`);
    if (!ground) { add(false, 'Nothing of the isle under the cursor (the void)'); return { lines, place }; }

    const { x, y, z } = blockAt(ground);
    const top = surface.get(`${x},${z}`);
    const layer = island.userData.layerAt(x, y, z) ?? '?';
    place = `block ${x}, ${y}, ${z} (${layer}) - column top ${top ?? 'none'}`;

    if (top === undefined) { add(false, 'That column is not on the heightmap'); return { lines, place }; }
    const normal = ground.normal ?? ground.face?.normal;
    const face = !normal ? 'unknown'
      : normal.y > 0.5 ? 'top' : normal.y < -0.5 ? 'bottom' : 'side';
    if (face !== 'top') add(false, `Hit the ${face} face - only a TOP face is somewhere to walk`);
    else add(true, 'Hit a top face');
    // Somewhere to stand: the top of the column, or a tunnel floor - a block
    // with HEADROOM blocks of air over it. Whatever is in the way is named,
    // and said to be hidden when it is the see-through camera hiding it.
    const isSolid = island.userData.isSolid;
    if (y === top) add(true, 'Block is the top of its column');
    else {
      const over = [];
      for (let h = 1; h <= HEADROOM; h++) if (isSolid(x, y + h, z)) over.push(y + h);
      if (!over.length) add(true, `Tunnel floor: ${HEADROOM} blocks of air over it (column top is ${top})`);
      else {
        const hidden = over.filter((yy) => cutaway.hides(centre.set(x, yy, z)));
        add(false, `No room to stand: block(s) at height ${over.join(', ')} over it`
          + (hidden.length ? ` - ${hidden.length === over.length ? 'all' : 'some'} HIDDEN by the see-through camera (G), they are really there` : ''));
      }
    }
    const floor = standable(surface, isSolid, x, y, z) ? y : null;

    if (floor === top && blocked.has(`${x},${z}`)) add(false, 'Cell is blocked by something solid standing on it (a station)');
    const standing = props.filter((p) => !p.gone && p.x === x && p.z === z).map((p) => p.kind);
    if (standing.length && floor === top) add(true, `Standing there (not blocking): ${standing.join(', ')}`);

    if (!agent || floor === null) return { lines, place };
    const from = { x: Math.round(agent.x), y: agent.floor, z: Math.round(agent.z) };
    if (from.x === x && from.z === z && from.y === floor) { add(true, 'The agent is already standing there'); return { lines, place }; }

    // Steps out of the floor: a neighbouring floor more than one block up
    // or down cannot be stepped to.
    let steps = 0;
    for (const [dx, dz] of NEIGHBOURS) {
      if (floorsAt(surface, isSolid, x + dx, z + dz).some((f) => Math.abs(f - floor) <= 1)) steps++;
    }
    if (!steps) add(false, 'Walled in: no neighbouring floor within 1 block up or down');
    else add(true, `${steps} of 8 neighbours have a floor within a step`);

    const path = findPath(surface, from, { x, y: floor, z }, { blocked, isSolid });
    if (path) add(true, `Route found: ${path.length} step(s) from ${from.x}, ${from.y}, ${from.z}`);
    else if (steps) add(false, `No route from where they stand (${from.x}, ${from.y}, ${from.z}) - no chain of floors 1 step apart with 2 blocks of headroom joins them`);
    return { lines, place };
  }

  function draw() {
    const { lines, place } = analyse();
    const walks = lines.length > 0 && lines.every(([ok]) => ok) && lines.some(([, t]) => t.startsWith('Route found'));
    root.classList.toggle('walks', walks);
    where.textContent = place || '-';
    list.replaceChildren(...lines.map(([ok, text]) => {
      const row = document.createElement('div');
      row.className = ok ? 'ok' : 'no';
      row.textContent = `${ok ? '✓' : '✗'} ${text}`;
      return row;
    }));
    root.querySelector('.analysis-verdict').textContent = walks ? 'A CLICK HERE WALKS' : 'A CLICK HERE DOES NOT WALK';
  }

  return {
    toggle() { open = !open; root.hidden = !open; last = 0; return open; },
    get open() { return open; },
    /** Once a frame; `aim` points the raycaster at the cursor and says whether there is one. */
    update(aim) {
      if (!open) return;
      const now = performance.now();
      if (now - last < EVERY_MS) return;
      last = now;
      if (!aim()) { where.textContent = 'cursor off the canvas'; list.replaceChildren(); return; }
      draw();
    }
  };
}
