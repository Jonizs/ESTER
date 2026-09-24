/**
 * A* across the island's surface cells. The grid is a few hundred cells, so a
 * plain open list is quick enough.
 *
 * Movement is eight-way: the agent walks diagonally as well as along the
 * axes, so it does not have to stair-step its way across open ground.
 *
 * `blocked` is the set of cells something solid is standing on - the
 * workbench, today. They are walked around rather than over, corners
 * included, so the agent never crosses one even diagonally.
 *
 * `goal` may be one cell or several. Several is what a station wider than a
 * single cell needs: any cell of its footprint will do, so the agent walks up
 * to whichever side of it is nearest rather than round to one corner.
 */

const DIAG = Math.SQRT2;

const EMPTY = new Set();

// Eight neighbours, each with what the step costs on flat ground.
const NEIGHBOURS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, DIAG], [1, -1, DIAG], [-1, 1, DIAG], [-1, -1, DIAG]
];

// Octile distance: the cheapest possible eight-way route ignoring terrain, so
// it never overestimates and A* still returns the shortest path.
const octile = (ax, az, bx, bz) => {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return dx + dz + (DIAG - 2) * Math.min(dx, dz);
};

const chebyshev = (ax, az, bx, bz) => Math.max(Math.abs(ax - bx), Math.abs(az - bz));

/**
 * How far an agent reaches, in blocks up or down from the block at their
 * feet (the one above the column they stand on). Anything they work - a
 * block, a prop, a plot - has to be within this of where they stand as well
 * as beside it, so a face three blocks down a pit wall is not dug from the
 * rim: they have to go down to it.
 */
export const REACH = 2;

/**
 * Whether someone standing on a column of height `h` can reach `target`.
 * A target with `y` is that block; one without is whatever stands on its
 * column - a prop, in the block above the ground.
 */
export function withinReach(surface, h, target) {
  const y = target.y ?? (surface.get(`${target.x},${target.z}`) ?? -Infinity) + 1;
  return Math.abs(y - (h + 1)) <= REACH;
}

/** Whether there is anywhere beside `target` to stand and reach it from. */
export function reachable(surface, target, blocked = EMPTY) {
  for (const [dx, dz] of NEIGHBOURS) {
    const x = target.x + dx;
    const z = target.z + dz;
    const h = surface.get(`${x},${z}`);
    if (h === undefined || blocked.has(`${x},${z}`)) continue;
    if (withinReach(surface, h, target)) return true;
  }
  return false;
}

export function findPath(surface, start, goal, { adjacent = false, blocked = EMPTY } = {}) {
  const targets = Array.isArray(goal) ? goal : [goal];
  if (targets.length === 0) return null;
  const heightAt = (x, z) => {
    const h = surface.get(`${x},${z}`);
    return h === undefined ? null : h;
  };

  // Where the agent may stand. Wherever it already is always counts, so a
  // cell that becomes solid underneath it is never a trap.
  const startKey = `${start.x},${start.z}`;
  const open_ = (x, z) => {
    const key = `${x},${z}`;
    return key === startKey || !blocked.has(key);
  };

  if (heightAt(start.x, start.z) === null) return null;
  if (!adjacent && targets.some((t) => t.x === start.x && t.z === start.z)) return [];
  // Walking onto something solid is not a route, only walking up beside it.
  if (!adjacent && targets.every((t) => blocked.has(`${t.x},${t.z}`))) return null;

  const open = [{ x: start.x, z: start.z, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const closed = new Set();

  // Standing diagonally beside a prop counts as being next to it. With
  // several targets, reaching any one of them is arriving.
  // And only from somewhere within `REACH` of it, up or down.
  const reached = (x, z) => targets.some((t) => (adjacent
    ? chebyshev(x, z, t.x, t.z) === 1 && withinReach(surface, heightAt(x, z), t)
    : x === t.x && z === t.z));

  // The heuristic has to stay optimistic, so it measures to the nearest
  // target - anything else can stop A* returning the shortest route.
  const heuristic = (x, z) => {
    let best = Infinity;
    for (const t of targets) best = Math.min(best, octile(x, z, t.x, t.z));
    return best;
  };

  let guard = 20000;
  while (open.length && guard-- > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const current = open.splice(best, 1)[0];
    const key = `${current.x},${current.z}`;

    if (reached(current.x, current.z)) return rebuild(cameFrom, key);
    if (closed.has(key)) continue;
    closed.add(key);

    const here = heightAt(current.x, current.z);
    for (const [dx, dz, stepCost] of NEIGHBOURS) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      const there = heightAt(nx, nz);
      if (there === null) continue;
      if (!open_(nx, nz)) continue;

      const climb = Math.abs(there - here);
      if (climb > 1) continue;                  // too steep to step up

      // A diagonal passes over the corner shared with the two cells beside
      // it, so both have to be there and within a step of each end. Without
      // this the agent clips the corner of a raised block, or slips through
      // the gap between two of them.
      if (dx !== 0 && dz !== 0) {
        const sideA = heightAt(current.x + dx, current.z);
        const sideB = heightAt(current.x, current.z + dz);
        if (sideA === null || sideB === null) continue;
        // Both shoulders of the diagonal have to be clear too, or the agent
        // shaves the corner of whatever is standing beside it.
        if (!open_(current.x + dx, current.z) || !open_(current.x, current.z + dz)) continue;
        if (Math.abs(sideA - here) > 1 || Math.abs(sideB - here) > 1) continue;
        if (Math.abs(sideA - there) > 1 || Math.abs(sideB - there) > 1) continue;
      }

      const nKey = `${nx},${nz}`;
      if (closed.has(nKey)) continue;

      const cost = (gScore.get(key) ?? Infinity) + stepCost + climb * 0.6;
      if (cost < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, key);
        gScore.set(nKey, cost);
        open.push({ x: nx, z: nz, f: cost + heuristic(nx, nz) });
      }
    }
  }

  return null;
}

function rebuild(cameFrom, endKey) {
  const path = [];
  let key = endKey;
  while (cameFrom.has(key)) {
    const [x, z] = key.split(',').map(Number);
    path.push([x, z]);
    key = cameFrom.get(key);
  }
  return path.reverse();
}
