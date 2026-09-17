/**
 * A* over the island's walkable cells. Grids here are tiny (a few hundred
 * cells), so a plain binary-heap-free open list is fast enough.
 */

const heuristic = (ax, az, bx, bz) => Math.abs(ax - bx) + Math.abs(az - bz);

/**
 * @returns {Array<[number, number]>|null} cells from start (exclusive) to goal
 *   (inclusive), or null when no route exists.
 */
export function findPath(world, start, goal, { adjacent = false, ignoreBlocked = false } = {}) {
  const startKey = `${start.x},${start.z}`;
  const goalKey = `${goal.x},${goal.z}`;
  if (startKey === goalKey) return [];

  const open = [{ x: start.x, z: start.z, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const closed = new Set();

  // Standing next to the goal is enough when harvesting or building.
  const isGoal = (x, z) => {
    if (adjacent) return heuristic(x, z, goal.x, goal.z) === 1;
    return x === goal.x && z === goal.z;
  };

  let guard = 20000;
  while (open.length && guard-- > 0) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bestIdx].f) bestIdx = i;
    const current = open.splice(bestIdx, 1)[0];
    const currentKey = `${current.x},${current.z}`;

    if (isGoal(current.x, current.z)) return reconstruct(cameFrom, currentKey);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    for (const [nx, nz] of world.neighbours(current.x, current.z, ignoreBlocked)) {
      const nKey = `${nx},${nz}`;
      if (closed.has(nKey)) continue;

      // Climbing a block costs extra, so pawns prefer level ground.
      const climb = Math.abs(world.height(nx, nz) - world.height(current.x, current.z));
      const tentative = (gScore.get(currentKey) ?? Infinity) + 1 + climb * 0.6;

      if (tentative < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentative);
        open.push({ x: nx, z: nz, f: tentative + heuristic(nx, nz, goal.x, goal.z) });
      }
    }
  }

  return null;
}

function reconstruct(cameFrom, endKey) {
  const path = [];
  let key = endKey;
  while (cameFrom.has(key)) {
    const [x, z] = key.split(',').map(Number);
    path.push([x, z]);
    key = cameFrom.get(key);
  }
  return path.reverse();
}
