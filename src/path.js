/**
 * A* across the island's surface cells. The grid is a few hundred cells, so a
 * plain open list is quick enough.
 */

const manhattan = (ax, az, bx, bz) => Math.abs(ax - bx) + Math.abs(az - bz);

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

  const reached = (x, z) => (adjacent
    ? manhattan(x, z, goal.x, goal.z) === 1
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
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      const there = heightAt(nx, nz);
      if (there === null) continue;

      const climb = Math.abs(there - here);
      if (climb > 1) continue;                  // too steep to step up

      const nKey = `${nx},${nz}`;
      if (closed.has(nKey)) continue;

      const cost = (gScore.get(key) ?? Infinity) + 1 + climb * 0.6;
      if (cost < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, key);
        gScore.set(nKey, cost);
        open.push({ x: nx, z: nz, f: cost + manhattan(nx, nz, goal.x, goal.z) });
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
