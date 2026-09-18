/**
 * What the agents have gathered.
 *
 * Nothing here is written to disk - like the rest of the game it lasts as
 * long as the window does. Items are only ever added; there is nothing to
 * spend them on yet.
 */

// Every item the game knows about, in the order the inventory lists them.
export const ITEMS = {
  wood:  { label: 'Wood' },
  stone: { label: 'Stone' }
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

    /** Only what is actually held, for the panel: [{ item, label, count }]. */
    entries() {
      return Object.keys(ITEMS)
        .filter((item) => this.count(item) > 0)
        .map((item) => ({ item, label: ITEMS[item].label, count: this.count(item) }));
    }
  };
}
