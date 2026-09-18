/**
 * A* across the island's surface cells. The grid is a few hundred cells, so a
 * plain open list is quick enough.
 *
 * Movement is eight-way: the agent walks diagonally as well as along the
 * axes, so it does not have to stair-step its way across open ground.
 */

const DIAG = Math.SQRT2;

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

export function findPath(surface, start, goal, { adjacent = false } = {}) {
  const heightAt = (x, z) => {
    const h = surface.get(`${x},${z}`);
    return h === undefined ? null : h;
  };

  if (heightAt(start.x, start.z) === null) return null;
  if (start.x === goal.x && start.z === goal.z) return [];

  const startKey = `${start.x},${start.z}`;
  const open = [{ x: start.x, z: start.z, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const closed = new Set();

  // Standing diagonally beside a prop counts as being next to it.
  const reached = (x, z) => (adjacent
    ? chebyshev(x, z, goal.x, goal.z) === 1
    : x === goal.x && z === goal.z);

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
        if (Math.abs(sideA - here) > 1 || Math.abs(sideB - here) > 1) continue;
        if (Math.abs(sideA - there) > 1 || Math.abs(sideB - there) > 1) continue;
      }

      const nKey = `${nx},${nz}`;
      if (closed.has(nKey)) continue;

      const cost = (gScore.get(key) ?? Infinity) + stepCost + climb * 0.6;
      if (cost < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, key);
        gScore.set(nKey, cost);
        open.push({ x: nx, z: nz, f: cost + octile(nx, nz, goal.x, goal.z) });
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
