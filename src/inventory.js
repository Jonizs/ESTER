/**
 * What the agents have gathered, and what has been made from it.
 *
 * What is held is part of the saved run (src/save.js), so this has a
 * `saveState`/`loadState` pair beside its `reset` - anything that gains run
 * state needs all three.
 *
 * Most of it is a plain count: five wood is five wood and one is as good as
 * another. A **tool** is not. A flint knife with three uses left and a fresh
 * one are both "a flint knife" to look at, but they are not the same thing,
 * so tools are kept as a list of what is left on each one rather than as a
 * number. `count()` still answers how many there are, which is what every
 * tile, recipe and check already asks for.
 */

// Every item the game knows about, in the order the inventory lists them.
export const ITEMS = {
  // `tint` is the colour its icon is drawn in, so a row of tiles is read by
  // colour as much as by shape. They are all luminous - no flat greys.
  wood:  { label: 'Wood',  tint: '#e6a96b' },
  stone: { label: 'Stone', tint: '#a9bde4' },
  // Cut a tree down and some of it comes back as saplings. `plants` is the
  // prop kind the item puts on the ground, which is what gives the item its
  // PLANT button on the inventory tiles.
  sapling: { label: 'Sapling', tint: '#7fd694', plants: 'sapling' },
  // Pulled out of the weeds growing across the isle.
  fibre: { label: 'Fibre', tint: '#bcd07a' },

  // --- made at the bench ---------------------------------------------------
  pebble: { label: 'Pebble', tint: '#cbd6ef' },
  gravel: { label: 'Gravel', tint: '#aebbd6' },
  flint:  { label: 'Flint',  tint: '#7f9ad0' },
  rope:   { label: 'Fibre Rope', tint: '#e0c27f' },
  stick:  { label: 'Stick',  tint: '#c99359' },

  plank:  { label: 'Plank',  tint: '#e0b070' },
  seeds:  { label: 'Wheat Seeds', tint: '#cfe08a' },
  wheat:  { label: 'Wheat',  tint: '#f0d07a' },

  /**
   * Tools. `uses` is what a fresh one carries and `serves` is what it can
   * stand in for in a recipe - an axe does a knife's work, and the knife
   * does not do the axe's, which is the whole reason this is a list rather
   * than a rank.
   *
   * `wields` marks the ones an agent can carry and work with, and `work` is
   * what that does: `speed` multiplies how fast the job goes, `drops` is
   * what extra comes off it, and `wear` is what one job costs the tool.
   */
  flintKnife: {
    label: 'Flint Knife', tint: '#a8c4e8', uses: 10, serves: ['flintKnife'], wields: true,
    work: { weed: { speed: 1.25, wear: 1, drops: [{ item: 'seeds', min: 1, max: 1 }] } }
  },
  flintAxe: {
    label: 'Flint Axe', tint: '#93b8f0', uses: 120, serves: ['flintKnife', 'flintAxe'], wields: true,
    work: { tree: { speed: 1.15, wear: 3, drops: [{ item: 'wood', min: 1, max: 1 }] } }
  },
  flintShovel: {
    label: 'Flint Shovel', tint: '#9ec0d8', uses: 120, serves: ['flintShovel'], wields: true
  },
  // The hoe does no gathering of its own; what it is for is the ground.
  // `tills` is what lets a click on grass turn it over - see main.js.
  flintHoe: {
    label: 'Flint Hoe', tint: '#b9d09a', uses: 120, serves: ['flintHoe'], wields: true, tills: true
  },

  /**
   * A vessel carries liquid rather than wear. It is kept one by one for the
   * same reason a tool is: a full bucket and an empty one are not the same
   * thing, however alike they look on a shelf.
   */
  bucket: {
    label: 'Wooden Bucket', tint: '#d8b98a', capacity: 200, wields: true, holds: 'water'
  },

  // An item that puts a station on the ground, the way a sapling does.
  waterCatcher: { label: 'Water Catcher', tint: '#8ad8ff', plants: 'waterCatcher' }
};

/** Whether an item is worn down by use rather than spent outright. */
export const isTool = (item) => !!ITEMS[item]?.uses;

/** Whether an item carries liquid about with it. */
export const isVessel = (item) => !!ITEMS[item]?.capacity;

/**
 * Whether each one of an item is its own thing rather than one of a count.
 *
 * A tool has wear and a bucket has what is in it, and neither is a number
 * you can average over a stack - so both are kept one by one. A fresh tool
 * starts full and an empty bucket starts empty, which is the only difference
 * between them as far as the ledger is concerned.
 */
export const isSingular = (item) => isTool(item) || isVessel(item);
const freshCharge = (item) => (isTool(item) ? ITEMS[item].uses : 0);
const fullCharge = (item) => ITEMS[item].uses ?? ITEMS[item].capacity;

/** Whether one item will do the work a recipe asks a named tool for. */
export const servesAs = (item, needed) => !!ITEMS[item]?.serves?.includes(needed);

export function createInventory() {
  // Plain materials: item -> how many.
  const counts = new Map();
  // Tools: item -> [uses left on each one]. The length is how many there are.
  const kits = new Map();

  /** The most worn one of a kind, which is the one that gets used next. */
  function worstOf(item) {
    const list = kits.get(item);
    if (!list?.length) return -1;
    let at = 0;
    for (let i = 1; i < list.length; i++) if (list[i] < list[at]) at = i;
    return at;
  }

  return {
    /** Number held, zero if none have ever been picked up. */
    count(item) {
      if (isSingular(item)) return kits.get(item)?.length ?? 0;
      return counts.get(item) ?? 0;
    },

    add(item, amount = 1) {
      if (!ITEMS[item]) return;
      if (isSingular(item)) {
        const list = kits.get(item) ?? [];
        for (let i = 0; i < amount; i++) list.push(freshCharge(item));
        kits.set(item, list);
        return;
      }
      counts.set(item, this.count(item) + amount);
    },

    /** Drop everything, for a fresh run. */
    reset() {
      counts.clear();
      kits.clear();
    },

    /** Spend items. Returns false, changing nothing, if there are too few. */
    take(item, amount = 1) {
      if (this.count(item) < amount) return false;
      if (isSingular(item)) {
        // The most worn go first, so a nearly spent tool is used up rather
        // than a fresh one being broken open.
        const list = kits.get(item);
        list.sort((a, b) => a - b).splice(0, amount);
        return true;
      }
      counts.set(item, this.count(item) - amount);
      return true;
    },

    /**
     * Wear one use off a tool, retiring it when it runs out. Returns false
     * if there is none of that tool to use.
     *
     * The most worn one is always what is picked up, so a pile of knives is
     * worked through one at a time instead of all of them ending up part
     * used - and the tile's wear bar, which shows that same one, is telling
     * the truth about what the next craft will cost.
     */
    useTool(item) {
      const at = worstOf(item);
      if (at < 0) return false;
      const list = kits.get(item);
      list[at] -= 1;
      if (list[at] <= 0) list.splice(at, 1);
      return true;
    },

    /**
     * Take one out and hand back what was on it: `{ item, left }`, or null.
     *
     * This is how a tool leaves the ledger to be carried by an agent. The
     * most worn goes first, the same as everything else - and because the
     * instance is handed over whole, what is left on it goes with it rather
     * than being averaged back into the pile when it comes home.
     */
    detach(item) {
      const at = worstOf(item);
      if (at < 0) return null;
      const [left] = kits.get(item).splice(at, 1);
      return { item, left };
    },

    /** Put a carried one back, with whatever is left on it. */
    attach(held) {
      if (!held || !isSingular(held.item)) return false;
      const list = kits.get(held.item) ?? [];
      list.push(Math.max(0, Math.min(held.left, fullCharge(held.item))));
      kits.set(held.item, list);
      return true;
    },

    /** How worn the next one to be used is: `{ left, max }`, or null. */
    wear(item) {
      const at = worstOf(item);
      if (at < 0) return null;
      return { left: kits.get(item)[at], max: fullCharge(item) };
    },

    /** What is held, for the save. Empties are left out. */
    saveState() {
      const held = {};
      for (const [item, count] of counts) if (count > 0) held[item] = count;

      const tools = {};
      for (const [item, list] of kits) if (list.length) tools[item] = [...list];

      return { held, tools };
    },

    /** Put a saved run's items back, dropping whatever is held now. */
    loadState(state) {
      counts.clear();
      kits.clear();

      for (const [item, count] of Object.entries(state?.held ?? {})) {
        if (ITEMS[item] && !isSingular(item) && count > 0) counts.set(item, count);
      }
      for (const [item, list] of Object.entries(state?.tools ?? {})) {
        if (!isSingular(item) || !Array.isArray(list)) continue;
        // Clamped to what a fresh one carries: a save written before a tool's
        // `uses` was retuned must not hand back one that lasts longer than
        // the game now says it can.
        const kept = list
          .map((left) => Math.max(0, Math.min(Math.round(left), fullCharge(item))))
          .filter((left) => left > 0 || isVessel(item));
        if (kept.length) kits.set(item, kept);
      }
    },

    /** Only what is actually held, for the panel: [{ item, label, count }]. */
    entries() {
      return Object.keys(ITEMS)
        .filter((item) => this.count(item) > 0)
        .map((item) => ({ item, label: ITEMS[item].label, count: this.count(item) }));
    }
  };
}
