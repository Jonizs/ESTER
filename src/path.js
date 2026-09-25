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
export function reachable(surface, target, blocked = EMPTY, isSolid = null) {
  for (const [dx, dz] of NEIGHBOURS) {
    const x = target.x + dx;
    const z = target.z + dz;
    const top = surface.get(`${x},${z}`);
    for (const h of floorsAt(surface, isSolid, x, z)) {
      if (h === top && blocked.has(`${x},${z}`)) continue;
      if (withinReach(surface, h, target)) return true;
    }
  }
  return false;
}

/**
 * Where someone can stand in a column: every block with ground under the
 * feet and two blocks of air over it (`HEADROOM`), top first. Without
 * `isSolid` there is one, the top of the column, which is all the isle had
 * before tunnels. With it, a tunnel dug into the side of a cliff is a floor
 * of its own underneath the column's top.
 */
export const HEADROOM = 2;

export function floorsAt(surface, isSolid, x, z) {
  const top = surface.get(`${x},${z}`);
  if (top === undefined) return [];
  if (!isSolid) return [top];
  const floors = [top];
  // Anything under the top with air over it is a hole dug into the column.
  // `isSolid.bottomAt` is where the column ends; below that is the void.
  const bottom = isSolid.bottomAt?.(x, z) ?? top - 32;
  for (let y = top - 1; y >= bottom; y--) {
    if (!isSolid(x, y, z)) continue;
    let clear = true;
    for (let h = 1; h <= HEADROOM; h++) if (isSolid(x, y + h, z)) { clear = false; break; }
    if (clear) floors.push(y);
  }
  return floors;
}

/** Whether a block can be stood on: solid, with `HEADROOM` of air over it. */
export function standable(surface, isSolid, x, y, z) {
  if (surface.get(`${x},${z}`) === y) return true;
  if (!isSolid || !isSolid(x, y, z)) return false;
  for (let h = 1; h <= HEADROOM; h++) if (isSolid(x, y + h, z)) return false;
  return true;
}

/**
 * A* over the FLOORS of the isle: a node is a cell and the height stood at
 * in it, `x,y,z`, so a tunnel under a column's top is somewhere to walk as
 * well as the top itself. The path comes back as `[x, z, y]` steps.
 *
 * `start` and each goal may carry `y`, the floor; without it that is the
 * top of the column. `blocked` - a solid station - only blocks the TOP of
 * its column: a tunnel dug under the bench is still a tunnel.
 */
export function findPath(surface, start, goal, { adjacent = false, blocked = EMPTY, isSolid = null } = {}) {
  const targets = Array.isArray(goal) ? goal : [goal];
  if (targets.length === 0) return null;
  const topAt = (x, z) => surface.get(`${x},${z}`);
  const solid = (x, y, z) => (isSolid ? isSolid(x, y, z) : y <= (topAt(x, z) ?? -Infinity));

  const floorCache = new Map();
  const floors = (x, z) => {
    const k = `${x},${z}`;
    let list = floorCache.get(k);
    if (!list) floorCache.set(k, list = floorsAt(surface, isSolid, x, z));
    return list;
  };

  const startTop = topAt(start.x, start.z);
  if (startTop === undefined) return null;
  const startY = start.y ?? startTop;
  const startKey = `${start.x},${startY},${start.z}`;

  // Where the agent may stand. Wherever it already is always counts, so a
  // cell that becomes solid underneath it is never a trap.
  const open_ = (x, y, z) => `${x},${y},${z}` === startKey
    || y !== topAt(x, z) || !blocked.has(`${x},${z}`);

  // Air for someone at height `y` to pass through this cell at: the two
  // blocks over the floor, over the HIGHER of the two floors being stepped
  // between, so a hop up does not put their head through the ceiling.
  const headClear = (x, z, y) => {
    for (let h = 1; h <= HEADROOM; h++) if (solid(x, y + h, z)) return false;
    return true;
  };

  const goalY = (t) => t.y ?? topAt(t.x, t.z);
  if (!adjacent && targets.some((t) => t.x === start.x && t.z === start.z && goalY(t) === startY)) return [];
  // Walking onto something solid is not a route, only walking up beside it.
  if (!adjacent && targets.every((t) => goalY(t) === topAt(t.x, t.z) && blocked.has(`${t.x},${t.z}`))) return null;

  const open = [{ x: start.x, y: startY, z: start.z, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const closed = new Set();

  // Standing diagonally beside a prop counts as being next to it. With
  // several targets, reaching any one of them is arriving - and only from
  // somewhere within `REACH` of it, up or down.
  const reached = (x, y, z) => targets.some((t) => (adjacent
    ? chebyshev(x, z, t.x, t.z) === 1 && withinReach(surface, y, t)
    : x === t.x && z === t.z && y === goalY(t)));

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
    const { x: cx, y: here, z: cz } = current;
    const key = `${cx},${here},${cz}`;

    if (reached(cx, here, cz)) return rebuild(cameFrom, key);
    if (closed.has(key)) continue;
    closed.add(key);

    for (const [dx, dz, stepCost] of NEIGHBOURS) {
      const nx = cx + dx;
      const nz = cz + dz;
      for (const there of floors(nx, nz)) {
        const climb = Math.abs(there - here);
        if (climb > 1) continue;                  // too steep to step up
        if (!open_(nx, there, nz)) continue;
        const high = Math.max(here, there);
        if (!headClear(cx, cz, high) || !headClear(nx, nz, high)) continue;

        // A diagonal passes over the corner shared with the two cells
        // beside it, so both have to have a floor within a step of each end
        // and room to pass at the height of the higher one. Without this the
        // agent clips the corner of a raised block, or slips through the gap
        // between two of them.
        if (dx !== 0 && dz !== 0) {
          const side = (sx, sz) => floors(sx, sz).some((f) => Math.abs(f - here) <= 1
            && Math.abs(f - there) <= 1 && open_(sx, f, sz) && headClear(sx, sz, Math.max(high, f)));
          if (!side(cx + dx, cz) || !side(cx, cz + dz)) continue;
        }

        const nKey = `${nx},${there},${nz}`;
        if (closed.has(nKey)) continue;

        const cost = (gScore.get(key) ?? Infinity) + stepCost + climb * 0.6;
        if (cost < (gScore.get(nKey) ?? Infinity)) {
          cameFrom.set(nKey, key);
          gScore.set(nKey, cost);
          open.push({ x: nx, y: there, z: nz, f: cost + heuristic(nx, nz) });
        }
      }
    }
  }

  return null;
}

function rebuild(cameFrom, endKey) {
  const path = [];
  let key = endKey;
  while (cameFrom.has(key)) {
    const [x, y, z] = key.split(',').map(Number);
    path.push([x, z, y]);
    key = cameFrom.get(key);
  }
  return path.reverse();
}
