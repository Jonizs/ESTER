/**
 * What the agents have gathered.
 *
 * What is held is part of the saved run (src/save.js), so this has a
 * `saveState`/`loadState` pair beside its `reset` - anything that gains run
 * state needs all three.
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
  sapling: { label: 'Sapling', tint: '#7fd694', plants: 'sapling' }
};

export function createInventory() {
  const counts = new Map();

  return {
    /** Number held, zero if none have ever been picked up. */
    count(item) {
      return counts.get(item) ?? 0;
    },

    add(item, amount = 1) {
      if (!ITEMS[item]) return;
      counts.set(item, this.count(item) + amount);
    },

    /** Drop everything, for a fresh run. */
    reset() {
      counts.clear();
    },

    /** Spend items. Returns false, changing nothing, if there are too few. */
    take(item, amount = 1) {
      if (this.count(item) < amount) return false;
      counts.set(item, this.count(item) - amount);
      return true;
    },

    /** What is held, for the save: { wood: 3 }. Empties are left out. */
    saveState() {
      const held = {};
      for (const [item, count] of counts) if (count > 0) held[item] = count;
      return held;
    },

    /** Put a saved run's items back, dropping whatever is held now. */
    loadState(held) {
      counts.clear();
      for (const [item, count] of Object.entries(held ?? {})) {
        if (ITEMS[item] && count > 0) counts.set(item, count);
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
