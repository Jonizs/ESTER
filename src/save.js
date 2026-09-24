import { PROP_KINDS, placeProp, spawnProp, removeProp, syncBlocked } from './props.js';

/**
 * Keeping a run across a restart.
 *
 * The point of this is the update loop: `WATCH.bat` closes the game and
 * relaunches it on the new build whenever something lands on `main`, and
 * before this that threw the run away. The run is now written down every few
 * seconds and read back on launch, so an update costs nothing but the
 * relaunch.
 *
 * It is `localStorage`, not a file: it is synchronous, so the run is back
 * before the first frame is drawn rather than a moment later with the isle
 * visibly rearranging itself, and the same code serves the desktop shell and
 * the web build. Electron keeps it in the app's own profile folder, which
 * `electron/main.cjs` pins by name so the packaged `ESTER.exe` and
 * `npm start` share one save rather than each having their own.
 *
 * It is still per machine. Nothing is uploaded anywhere, so a run does not
 * follow Jonas between his clones.
 *
 * What is *not* kept: what the agent was in the middle of. A walk and a job
 * are both dropped, and the agent is standing where it was, idle. Restoring
 * half a swing of an axe is not worth the machinery.
 */

const KEY = 'ester:save';

// Bumped whenever the shape below changes. An older save is dropped rather
// than half-read - there is nothing here worth a migration yet.
//
// 2: the inventory grew tools, which carry how worn each one is, so what it
//    writes went from `{ wood: 3 }` to `{ held, tools }`.
// 3: agents carry a tool, and props gained water and what is sown in them.
//
// Still 3 with the isle's dug ground (`island`), for the same reason: an
// older save simply has none of it and the isle stays as generated.
//
// Still 3 with the water works: a machine's `facing`, its `crank` and a
// pipe's end `modes` are only ever ADDED to an entry, never a change to what
// was there, so an older save is read whole and simply has none of them.
const SAVE_VERSION = 3;

// How often the run is written down while it is being played.
//
// On a timer rather than counted off the frame delta: the render loop's
// delta is capped, and it stops being anything like real time the moment
// frames stall or the window goes to the back - which is exactly when the
// run most needs to already be written down. An interval keeps its own
// clock, and the desktop window turns off background throttling, so it goes
// on ticking behind other windows.
const AUTOSAVE_MS = 5000;

/** localStorage, or null wherever it is unavailable (a blocked profile). */
function store() {
  try {
    const s = window.localStorage;
    s.getItem(KEY);          // a profile can have it and still refuse it
    return s;
  } catch {
    return null;
  }
}

export function createSaves({
  surface, propsGroup, props, blocked, person, inventory, progression, island,
  setWorkbenchRepaired, onSpawn, onDrop
}) {

  /** Everything worth keeping, as a plain object. */
  function collect() {
    return {
      v: SAVE_VERSION,
      at: Date.now(),
      inventory: inventory.saveState(),
      person: person.saveState(),
      progression: progression.saveState(),
      // What has been dug out of the isle and put back into it. The isle is
      // regenerated from its seed on launch, so without this every hole
      // came back filled while everything else was as it was left.
      island: island?.saveState(),
      props: props.map((prop) => {
        const entry = { id: prop.id, kind: prop.kind, x: prop.x, z: prop.z };
        if (prop.gone) entry.gone = true;
        if (prop.spawned) entry.spawned = true;
        if (prop.repaired) entry.repaired = true;
        if (prop.growSeconds !== undefined) {
          entry.growth = prop.growth ?? 0;
          entry.growSeconds = prop.growSeconds;
        }
        // Worked ground and anything that holds liquid. A plot's `growth` is
        // seconds of watered growing rather than a sapling's countdown, so
        // it is written beside `sown` and read back the same way.
        if (prop.water !== undefined) entry.water = prop.water;
        if (prop.sown !== undefined) {
          entry.sown = !!prop.sown;
          entry.growth = prop.growth ?? 0;
        }
        // What its shape was rolled from, so it comes back the same one.
        if (prop.salt !== undefined) entry.salt = prop.salt;
        // The water works: which way a machine faces, the crank on its side,
        // and what each end of a pipe has been set to with a wrench.
        if (prop.facing !== undefined) entry.facing = prop.facing;
        if (prop.crank) entry.crank = true;
        if (prop.modes && Object.keys(prop.modes).length) entry.modes = { ...prop.modes };
        // What is kept in it: a chest's slots, a mill's wheat and flour.
        if (prop.store) entry.store = prop.store.map((slot) => (slot ? { ...slot } : null));
        if (prop.grain !== undefined) entry.grain = prop.grain;
        if (prop.flour !== undefined) entry.flour = prop.flour;
        if (prop.burning !== undefined) entry.burning = prop.burning;
        // The kitchen: a cooking stone on a fire, what is in a mixing bowl.
        if (prop.cooker) entry.cooker = JSON.parse(JSON.stringify(prop.cooker));
        if (prop.mixIn) entry.mixIn = { ...prop.mixIn };
        if (prop.mixOut) entry.mixOut = { ...prop.mixOut };
        return entry;
      })
    };
  }

  function write() {
    const s = store();
    if (!s) return false;
    try {
      s.setItem(KEY, JSON.stringify(collect()));
      return true;
    } catch {
      // A full or refused profile is not worth interrupting the game over.
      return false;
    }
  }

  function read() {
    const s = store();
    if (!s) return null;
    try {
      const raw = s.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.v === SAVE_VERSION ? data : null;
    } catch {
      return null;
    }
  }

  function clear() {
    try { store()?.removeItem(KEY); } catch { /* nothing to clear */ }
  }

  /**
   * Put a saved run back on the isle. Returns false when there is nothing to
   * restore, so a first launch simply carries on with the world as built.
   */
  function restore() {
    const data = read();
    if (!data) return false;

    // The ground first: a spawned prop is stood on whatever `surface` says
    // when it is put back, and a plot sinks the top block of its column, so
    // both need the holes to be there already.
    island?.loadState(data.island);

    // Anything the last run put on the isle goes first: what the save holds
    // is the whole list, so growing it rather than replacing it would double
    // every sapling on every launch.
    for (const prop of [...props]) {
      // Through the caller, not `removeProp` directly: some props are more
      // than their mesh. A plot is a dent pressed into the isle too, and
      // dropping it without letting that block back up leaves a brown
      // hollow behind that nothing can ever turn into farmland again.
      if (!prop.spawned) continue;
      if (onDrop) onDrop(prop);
      else removeProp(prop, propsGroup, props);
    }

    for (const entry of data.props ?? []) {
      if (entry.spawned) {
        const extra = {};
        if (entry.growSeconds !== undefined) {
          extra.growth = entry.growth ?? 0;
          extra.growSeconds = entry.growSeconds;
        }
        if (entry.water !== undefined) extra.water = entry.water;
        if (entry.sown !== undefined) {
          extra.sown = entry.sown;
          extra.growth = entry.growth ?? 0;
        }
        if (entry.salt !== undefined) extra.salt = entry.salt;
        if (entry.facing !== undefined) extra.facing = entry.facing;
        if (entry.crank) extra.crank = true;
        if (entry.kind === 'pipe') extra.modes = { ...(entry.modes ?? {}) };
        if (Array.isArray(entry.store)) extra.store = entry.store.map((slot) => (slot ? { ...slot } : null));
        if (entry.grain !== undefined) extra.grain = entry.grain;
        if (entry.flour !== undefined) extra.flour = entry.flour;
        if (entry.burning !== undefined) extra.burning = entry.burning;
        if (entry.cooker) extra.cooker = entry.cooker;
        if (entry.mixIn) extra.mixIn = { ...entry.mixIn };
        if (entry.mixOut) extra.mixOut = { ...entry.mixOut };
        const prop = spawnProp(entry.kind, entry, { surface, group: propsGroup, props, extra });
        onSpawn?.(prop);
        continue;
      }

      // Something the isle was generated with: it is already standing, so
      // only what the run did to it is written back.
      const prop = props.find((p) => p.id === entry.id);
      if (!prop) continue;

      prop.gone = !!entry.gone;
      prop.mesh.visible = !prop.gone;
      if (surface.has(`${entry.x},${entry.z}`)) placeProp(prop, entry, surface);

      // Only a kind that can actually be repaired has its state written back,
      // and only when it differs. Without the kind check this fired on every
      // tree and rock: their `repaired` is `undefined`, `!!entry.repaired` is
      // `false`, and `undefined !== false` - so every one of them was rebuilt
      // as a broken workbench the moment a save was restored.
      if (PROP_KINDS[prop.kind]?.cost && prop.repaired !== !!entry.repaired) {
        setWorkbenchRepaired?.(prop, !!entry.repaired);
      }
    }

    syncBlocked(props, blocked);

    inventory.loadState(data.inventory);
    person.loadState(data.person);
    progression.loadState(data.progression);

    return true;
  }

  const timer = setInterval(write, AUTOSAVE_MS);

  /** Stop autosaving. Nothing calls this yet; it is here so a test can. */
  function stop() {
    clearInterval(timer);
  }

  // Whatever has happened since the last autosave, written down as the
  // window goes.
  //
  // All three, because no one of them covers every way out: `pagehide` is
  // the browser's reload and tab close, but it does *not* fire when the
  // desktop shell's window is closed - that one is `beforeunload`, which is
  // why a plain close used to cost the last few seconds of the run.
  // `visibilitychange` catches the window merely being put to the back,
  // which is when an update is most likely to arrive and restart it.
  window.addEventListener('pagehide', write);
  window.addEventListener('beforeunload', write);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') write();
  });

  return { write, restore, clear, stop, collect, hasSave: () => read() !== null };
}
