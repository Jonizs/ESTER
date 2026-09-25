import { itemIcon } from './icons.js';
import { ITEMS, isSingular, servesAs } from './inventory.js';

/**
 * The crafting screen.
 *
 * It is deliberately not one of the Tab/Q/W/E panels and has no key of its
 * own: the only way in is to walk up to the workbench in the middle of the
 * isle and click it, and the bench has to be repaired first. Once it is open
 * it behaves like the panels do - Esc or the scrim closes it, and the pause
 * menu takes precedence.
 *
 * The screen is the 4x4 grid in the top right, the craftable items flowing
 * around it, and what is held along the bottom. That last list is a *list* -
 * the item buttons the inventory page carries, PLANT among them, are
 * deliberately not here. This is the bench: what is on it is stock to build
 * from, not things to go and do. The grid is floated
 * rather than placed in a column (see style.css), which is what lets the
 * recipe list run down its left and then carry on underneath it - so a long
 * list fills the page instead of stacking up in a narrow strip.
 *
 * Moving stock onto the grid is Minecraft's set of gestures, because it is
 * the one every player already knows: left click takes the whole stack onto
 * the cursor, right click takes half of it, left click puts all of it down,
 * right click puts one down, and holding a button while dragging across
 * several cells spreads the stack over them - evenly with the left button,
 * one per cell with the right.
 *
 * **Nothing is ever taken out of the inventory to do this.** The grid and
 * the cursor are a *view* over what is held: `reserved()` counts what the
 * bench is currently showing and the stock tiles show the rest, so the
 * ledger in `inventory.js` never changes and there is nothing to give back.
 * That is what makes closing the screen - or quitting the game with it open,
 * where the autosave writes the inventory and knows nothing about a bench -
 * cost nothing. When a recipe eventually consumes what is on the grid, that
 * is the point where `inventory.take` belongs, not here.
 */

// The grid is 4x4.
export const GRID = { w: 4, h: 4 };

/**
 * Slots are numbered the way they are counted on screen: 1 is the top left,
 * the first row runs 1 2 3 4, and the next row starts back on the left, so
 * 5 is directly under 1. That is how a recipe is described ("slot 1 rock,
 * slot 2 rock") and how it is written down below - `cells[]` is the same
 * grid zero-indexed, and these two are the only places that convert.
 *
 *     1  2  3  4
 *     5  6  7  8
 *     9 10 11 12
 *    13 14 15 16
 */
const cellOfSlot = (slot) => slot - 1;
const rowOf = (index) => Math.floor(index / GRID.w);
const colOf = (index) => index % GRID.w;

/**
 * What can be made.
 *
 * `slots` is the shape, written in the numbering above. `yield` is how many
 * come out, and one of each named slot is spent per craft - a slot holding a
 * stack of twenty still only gives up one, which is why a full grid can be
 * worked through a craft at a time.
 *
 * **The shape is what matters, not where it sits.** A recipe is matched
 * against the grid trimmed to whatever is actually on it, so two rock side
 * by side is the recipe whether they are in slots 1 and 2, 3 and 4, or 15
 * and 16. What it will not do is wrap: slots 4 and 5 are the end of one row
 * and the start of the next, which is not two side by side and does not
 * match.
 *
 * `tool` is the exception to all of that: a recipe that names one wants that
 * tool *somewhere* on the grid and does not care where, so its cell is
 * lifted out before the shape is trimmed. A tool is not spent either - it
 * loses one use per craft and is gone when it runs out.
 */
export const RECIPES = [
  {
    id: 'pebble',
    label: 'Pebble',
    item: 'pebble',
    yield: 8,
    slots: { 1: 'stone', 2: 'stone' }
  },
  {
    id: 'gravel',
    label: 'Gravel',
    item: 'gravel',
    yield: 4,
    slots: { 1: 'pebble', 2: 'pebble', 5: 'pebble', 6: 'pebble' }
  },
  {
    id: 'flint',
    label: 'Flint',
    item: 'flint',
    yield: 1,
    slots: {
      1: 'pebble', 2: 'pebble',
      5: 'gravel', 6: 'gravel',
      9: 'gravel', 10: 'gravel'
    }
  },
  {
    id: 'rope',
    label: 'Fibre Rope',
    item: 'rope',
    yield: 2,
    slots: {
      1: 'fibre', 2: 'fibre',
      5: 'fibre', 6: 'fibre',
      9: 'fibre', 10: 'fibre'
    }
  },
  {
    id: 'flintKnife',
    label: 'Flint Knife',
    item: 'flintKnife',
    yield: 1,
    slots: { 1: 'flint', 5: 'rope' }
  },
  {
    // The first recipe that needs a tool rather than only materials: two
    // wood and a knife to cut them with, wherever the knife is put.
    id: 'stick',
    label: 'Stick',
    item: 'stick',
    yield: 4,
    slots: { 1: 'wood', 2: 'wood' },
    tool: 'flintKnife'
  },
  {
    id: 'flintAxe',
    label: 'Flint Axe',
    item: 'flintAxe',
    yield: 1,
    slots: {
      1: 'flint', 2: 'flint', 3: 'stick',
      5: 'flint', 6: 'flint', 7: 'stick',
      10: 'stick', 11: 'stick',
      14: 'stick', 15: 'stick'
    }
  },
  {
    id: 'flintShovel',
    label: 'Flint Shovel',
    item: 'flintShovel',
    yield: 1,
    slots: {
      2: 'flint', 3: 'flint',
      6: 'stick', 7: 'stick',
      10: 'stick', 11: 'stick',
      14: 'stick', 15: 'stick'
    }
  },
  {
    id: 'flintHoe',
    label: 'Flint Hoe',
    item: 'flintHoe',
    yield: 1,
    slots: {
      1: 'flint', 2: 'flint', 3: 'stick',
      5: 'flint', 6: 'stick', 7: 'stick',
      10: 'stick', 11: 'stick',
      14: 'stick', 15: 'stick'
    }
  },
  {
    id: 'flintPickaxe',
    label: 'Flint Pickaxe',
    item: 'flintPickaxe',
    yield: 1,
    slots: {
      1: 'flint', 2: 'flint', 3: 'flint', 4: 'flint',
      6: 'stick', 7: 'stick',
      10: 'stick', 11: 'stick',
      14: 'stick', 15: 'stick'
    }
  },
  {
    // Splitting a log takes an axe, so this is the second recipe to want a
    // tool on the grid - and the first where the tool is the axe itself.
    id: 'plank',
    label: 'Plank',
    item: 'plank',
    yield: 8,
    slots: {
      1: 'wood', 2: 'wood',
      5: 'wood', 6: 'wood',
      9: 'wood', 10: 'wood'
    },
    tool: 'flintAxe'
  },
  {
    // A tub: walls down both sides and a floor across the bottom.
    id: 'waterCatcher',
    label: 'Water Catcher',
    item: 'waterCatcher',
    yield: 1,
    slots: {
      1: 'plank', 4: 'plank',
      5: 'plank', 8: 'plank',
      9: 'plank', 12: 'plank',
      13: 'plank', 14: 'plank', 15: 'plank', 16: 'plank'
    }
  },
  {
    // A pail with a rope handle down its side.
    id: 'bucket',
    label: 'Wooden Bucket',
    item: 'bucket',
    yield: 1,
    slots: {
      1: 'plank', 3: 'plank', 4: 'rope',
      5: 'plank', 7: 'plank', 8: 'rope',
      9: 'plank', 10: 'plank', 11: 'plank', 12: 'rope'
    }
  },
  {
    // Two rows of three planks, each bound at the end with rope.
    id: 'pipe',
    label: 'Wooden Pipe',
    item: 'pipe',
    yield: 4,
    slots: {
      1: 'plank', 2: 'plank', 3: 'plank', 4: 'rope',
      5: 'plank', 6: 'plank', 7: 'plank', 8: 'rope'
    }
  },
  {
    // Two sticks for the axle, two planks beside them for the wheel.
    id: 'cog',
    label: 'Wooden Cog',
    item: 'cog',
    yield: 1,
    slots: {
      1: 'stick', 2: 'plank',
      5: 'stick', 6: 'plank'
    }
  },
  {
    // The cog on the end of an arm of planks, and a rope grip bent down off
    // the far end of it.
    id: 'crankHandle',
    label: 'Crank Handle',
    item: 'crankHandle',
    yield: 1,
    slots: {
      1: 'cog', 2: 'plank', 3: 'plank',
      7: 'rope'
    }
  },
  {
    // A jaw of flint at the top corner and a stick handle running away from
    // it corner to corner.
    id: 'flintWrench',
    label: 'Flint Wrench',
    item: 'flintWrench',
    yield: 1,
    slots: {
      1: 'flint', 2: 'flint',
      5: 'flint', 6: 'stick',
      11: 'stick',
      16: 'stick'
    }
  },
  {
    // A cog boxed in by planks on every side.
    id: 'sprinkler',
    label: 'Basic Sprinkler',
    item: 'sprinkler',
    yield: 1,
    slots: {
      1: 'plank', 2: 'plank', 3: 'plank',
      5: 'plank', 6: 'cog', 7: 'plank',
      9: 'plank', 10: 'plank', 11: 'plank'
    }
  },
  {
    // Eight planks boxed round a rope to tie the lid down with.
    id: 'chest',
    label: 'Wooden Chest',
    item: 'chest',
    yield: 1,
    slots: {
      1: 'plank', 2: 'plank', 3: 'plank',
      5: 'plank', 6: 'rope', 7: 'plank',
      9: 'plank', 10: 'plank', 11: 'plank'
    }
  },
  {
    // A row of cogs between two rows of planks - the gearing, housed.
    id: 'mill',
    label: 'Basic Mill',
    item: 'mill',
    yield: 1,
    slots: {
      1: 'plank', 2: 'plank', 3: 'plank',
      5: 'cog', 6: 'cog', 7: 'cog',
      9: 'plank', 10: 'plank', 11: 'plank'
    }
  },
  {
    // Logs laid along the bottom, a bed of fibre on them for tinder, and
    // sticks leant up round the whole thing.
    id: 'campfire',
    label: 'Campfire',
    item: 'campfire',
    yield: 1,
    slots: {
      6: 'stick', 7: 'stick',
      9: 'stick', 10: 'fibre', 11: 'fibre', 12: 'stick',
      13: 'wood', 14: 'wood', 15: 'wood', 16: 'wood'
    }
  },
  {
    // A flint either side of a stone to strike them on.
    id: 'flintStriker',
    label: 'Flint Striker',
    item: 'flintStriker',
    yield: 1,
    slots: { 1: 'flint', 2: 'stone', 3: 'flint' }
  },
  {
    // A rope bound round with four sticks.
    id: 'cup',
    label: 'Cup',
    item: 'cup',
    yield: 1,
    slots: {
      2: 'stick',
      5: 'stick', 6: 'rope', 7: 'stick',
      10: 'stick'
    }
  },
  {
    // Planks in a shallow U - the bowl, seen from the side. One row less
    // deep than the water catcher's U, which is the same planks four rows
    // tall: the same shape twice would be one grid matching two recipes.
    id: 'mixingBowl',
    label: 'Mixing Bowl',
    item: 'mixingBowl',
    yield: 1,
    slots: {
      1: 'plank', 4: 'plank',
      5: 'plank', 8: 'plank',
      9: 'plank', 10: 'plank', 11: 'plank', 12: 'plank'
    }
  },
  {
    // Four stones laid in a row, a flat slab to go over a fire.
    id: 'cookingStone',
    label: 'Cooking Stone',
    item: 'cookingStone',
    yield: 1,
    slots: { 1: 'stone', 2: 'stone', 3: 'stone', 4: 'stone' }
  }
];

/**
 * A recipe's shape, trimmed to its own bounding box:
 * `{ w, h, rows: [[item | null, ...], ...] }`.
 *
 * Worked out once per recipe and kept, since `RECIPES` is written by hand
 * and never changes while the game is running.
 */
const shapes = new Map();

function shapeOf(recipe) {
  if (shapes.has(recipe.id)) return shapes.get(recipe.id);

  const indices = Object.keys(recipe.slots).map((slot) => cellOfSlot(Number(slot)));
  const shape = shapeFrom(indices, (i) => recipe.slots[i + 1]);
  shapes.set(recipe.id, shape);
  return shape;
}

/** The bounding box of some filled cells, as a grid of item names. */
function shapeFrom(indices, itemAt) {
  if (indices.length === 0) return null;

  const rows = indices.map(rowOf);
  const cols = indices.map(colOf);
  const top = Math.min(...rows);
  const left = Math.min(...cols);
  const h = Math.max(...rows) - top + 1;
  const w = Math.max(...cols) - left + 1;

  const out = Array.from({ length: h }, () => new Array(w).fill(null));
  for (const i of indices) out[rowOf(i) - top][colOf(i) - left] = itemAt(i);
  return { w, h, top, left, rows: out };
}

/** How many of each item a recipe spends, for the "can I afford it" check. */
export function recipeCost(recipe) {
  const cost = new Map();
  for (const item of Object.values(recipe.slots)) cost.set(item, (cost.get(item) ?? 0) + 1);
  return cost;
}

export function createCrafting({ inventory, blocked, onOpen }) {
  const root = document.getElementById('crafting');
  const stock = root.querySelector('#craft-stock');
  const stockSection = root.querySelector('.craft-stock');
  const grid = root.querySelector('#craft-grid');
  const recipeList = root.querySelector('#craft-recipes');
  const heldEl = root.querySelector('#craft-held');
  const outputEl = root.querySelector('#craft-output');
  const missingEl = root.querySelector('#craft-missing');

  // --- what is on the bench, and what is on the cursor ---------------------
  // Both are stacks: `{ item, count }`, or null for an empty cell / an empty
  // hand. Neither is saved and neither is spent - see the note above.
  const cells = new Array(GRID.w * GRID.h).fill(null);
  let held = null;

  /** How many of an item the bench and the cursor are showing between them. */
  function reserved(item) {
    let n = held?.item === item ? held.count : 0;
    for (const cell of cells) if (cell?.item === item) n += cell.count;
    return n;
  }

  /** How many of an item are still in the stock row, rather than on the bench. */
  function available(item) {
    return Math.max(0, inventory.count(item) - reserved(item));
  }

  /**
   * Keep the bench inside what is actually held.
   *
   * The world goes on while this screen is open - an agent finishing the
   * workbench spends ten wood - so what the grid is showing can outrun the
   * ledger. Anything over is taken off the cursor first and then off the
   * grid, so the bench never shows wood that is no longer there.
   */
  function reconcile() {
    for (const item of new Set([held?.item, ...cells.map((c) => c?.item)])) {
      if (!item) continue;
      let over = reserved(item) - inventory.count(item);
      if (over <= 0) continue;

      if (held?.item === item) {
        const off = Math.min(over, held.count);
        held.count -= off;
        over -= off;
        if (held.count <= 0) held = null;
      }
      for (let i = cells.length - 1; i >= 0 && over > 0; i--) {
        const cell = cells[i];
        if (cell?.item !== item) continue;
        const off = Math.min(over, cell.count);
        cell.count -= off;
        over -= off;
        if (cell.count <= 0) cells[i] = null;
      }
    }
  }

  // --- slots ---------------------------------------------------------------
  // A slot is either a cell of the grid or a stock tile. The stock is the
  // inventory itself, which is why putting something back there is simply
  // dropping it: the ledger never moved.

  /** What a grid cell holds, or what a stock tile is showing. */
  function slotStack(slot) {
    if (slot.type === 'grid') return cells[slot.index];
    const count = available(slot.item);
    return count > 0 ? { item: slot.item, count } : null;
  }

  /** Take a whole stack onto the cursor. */
  function takeAll(slot) {
    const stack = slotStack(slot);
    if (!stack) return;
    held = { item: stack.item, count: stack.count };
    if (slot.type === 'grid') cells[slot.index] = null;
  }

  /** Take half of a stack, the larger half when it is an odd number. */
  function takeHalf(slot) {
    const stack = slotStack(slot);
    if (!stack) return;
    const half = Math.ceil(stack.count / 2);
    held = { item: stack.item, count: half };
    if (slot.type === 'grid') {
      const left = stack.count - half;
      cells[slot.index] = left > 0 ? { item: stack.item, count: left } : null;
    }
  }

  /** Put the whole held stack into a grid cell, swapping with what is there. */
  function putAll(index) {
    if (!held) return;
    const cell = cells[index];
    if (!cell) {
      cells[index] = held;
      held = null;
    } else if (cell.item === held.item) {
      cell.count += held.count;
      held = null;
    } else {
      cells[index] = held;
      held = cell;
    }
  }

  /** Put a single one down. A cell holding something else is left alone. */
  function putOne(index) {
    if (!held) return;
    const cell = cells[index];
    if (cell && cell.item !== held.item) return;
    if (cell) cell.count += 1;
    else cells[index] = { item: held.item, count: 1 };
    held.count -= 1;
    if (held.count <= 0) held = null;
  }

  /**
   * How a drag would fall out: `index -> how many go in that cell`.
   *
   * Worked out rather than done, because the same answer is what the grid
   * draws *while* the drag is still going - the cells about to be filled
   * light up and say how many they are getting, so a drag is aimed rather
   * than guessed at. `spread` then applies exactly what was shown.
   *
   * `each` is how many go in every cell - an even share for a left drag, one
   * apiece for a right drag. Whatever will not divide stays on the cursor,
   * the way it does in the game everyone learned this from. Cells already
   * holding something else are left out rather than swapped: a drag is a
   * broad gesture and swapping four things at once is never what was meant.
   */
  function plan(indices, mode) {
    const share = new Map();
    if (!held) return share;

    const open = indices.filter((i) => !cells[i] || cells[i].item === held.item);
    if (open.length === 0) return share;

    const each = mode === 'one' ? 1 : Math.floor(held.count / open.length);
    if (each < 1) return share;

    let left = held.count;
    for (const i of open) {
      if (left < each) break;
      share.set(i, each);
      left -= each;
    }
    return share;
  }

  /** Lay the held stack out the way `plan` said it would fall. */
  function spread(indices, mode) {
    if (!held) return;
    for (const [i, n] of plan(indices, mode)) {
      if (cells[i]) cells[i].count += n;
      else cells[i] = { item: held.item, count: n };
      held.count -= n;
    }
    if (held && held.count <= 0) held = null;
  }

  /**
   * Put a cell's whole stack back in the inventory - shift click, and shift
   * drag to sweep several at once.
   *
   * Emptying the cell *is* the return: the grid was only ever a view over
   * what is held, so what the cell stops showing is back in the stock row
   * on the next frame with nothing changing hands.
   */
  function clearCell(index) {
    if (!cells[index]) return false;
    cells[index] = null;
    return true;
  }

  /**
   * What the grid should draw right now on top of what is in it: the cells a
   * drag is about to fill, and how many each is getting.
   *
   * A drag that has only touched one cell has not become a drag yet, so what
   * it previews is what a plain click there would do - the whole stack on
   * the left button, one on the right. A cell holding something else is
   * still aimed at (the left button swaps with it) but has no number to
   * show, which is `null`.
   */
  function preview() {
    if (!drag || drag.mode === 'clear' || !held) return null;

    if (drag.indices.length > 1) {
      return plan(drag.indices, drag.button === 0 ? 'even' : 'one');
    }

    const i = drag.indices[0];
    const cell = cells[i];
    if (cell && cell.item !== held.item) {
      // The left button swaps; the right button will not touch it.
      return drag.button === 0 ? new Map([[i, null]]) : new Map();
    }
    return new Map([[i, drag.button === 0 ? held.count : 1]]);
  }

  // --- what the grid adds up to --------------------------------------------

  /**
   * The recipe the grid is currently laid out as, or null.
   *
   * Both sides are trimmed to their own bounding box before they are
   * compared, which is the whole of "it can be placed anywhere": two rock in
   * slots 15 and 16 trim to exactly what two rock in slots 1 and 2 trim to.
   * A slot only has to *hold* the right item, not hold exactly one of it, so
   * a grid loaded up with stacks still reads as the recipe and can be
   * crafted over and over.
   */
  function match() {
    const filled = cells.map((cell, i) => (cell ? i : -1)).filter((i) => i >= 0);
    if (filled.length === 0) return null;

    for (const recipe of RECIPES) {
      const want = shapeOf(recipe);
      if (!want) continue;

      // A tool sits outside the shape: it is wanted somewhere on the grid
      // and nowhere in particular, so its cell is lifted out before the
      // rest is trimmed. Anything the tool `serves` will do - an axe
      // answers for a knife, and a knife does not answer for an axe.
      let toolAt = -1;
      if (recipe.tool) {
        toolAt = filled.find((i) => servesAs(cells[i].item, recipe.tool)) ?? -1;
        if (toolAt < 0) continue;
      }

      const shapeCells = filled.filter((i) => i !== toolAt);
      const laid = shapeFrom(shapeCells, (i) => cells[i].item);
      if (!laid || want.w !== laid.w || want.h !== laid.h) continue;

      let same = true;
      for (let r = 0; r < want.h && same; r++) {
        for (let c = 0; c < want.w; c++) {
          if (want.rows[r][c] !== laid.rows[r][c]) { same = false; break; }
        }
      }
      // Every other filled cell answered for one of the recipe's, so those
      // cells are exactly what the craft spends - the tool is not among
      // them, because it is worn rather than spent.
      if (same) return { recipe, used: shapeCells, toolAt };
    }
    return null;
  }

  /**
   * Take what the bench is offering.
   *
   * This is the one place the ledger actually moves: everything else on this
   * screen only rearranges a view of it. One of each laid-out slot is spent
   * and the yield is added, so the craft is locked in by *taking* it - up to
   * that moment the output slot is only showing what would happen, and
   * clearing the grid costs nothing.
   */
  /**
   * Take what the bench is offering.
   *
   * Shift takes *everything*: it crafts over and over until the grid no
   * longer adds up to anything, which is what shift clicking an output does
   * in the game these gestures come from. Every craft spends at least one
   * item off the grid, so it always runs down to nothing - the cap is only
   * there so a future recipe that somehow feeds itself cannot hang the
   * frame.
   */
  function takeOutput({ toInventory = false } = {}) {
    if (!toInventory) { craftOne({ toInventory }); return; }
    for (let n = 0; n < 4096 && craftOne({ toInventory }); n++) { /* until it runs out */ }
  }

  /** One craft, or false when the grid is not a recipe. */
  function craftOne({ toInventory = false } = {}) {
    // Square the grid with the ledger before reading it. A tool is worn
    // rather than spent, so when one breaks its cell still *claims* to hold
    // it until `reconcile` takes it away - and crafting everything runs
    // several crafts before anything is drawn, so without this a knife with
    // ten uses left went on making sticks until the wood ran out.
    reconcile();

    const found = match();
    if (!found) return false;
    const { recipe, used, toolAt } = found;

    // Onto the cursor, so it lands wherever the next click puts it - which
    // is the same rule as everything else here. A hand already full of
    // something else has nowhere to put it. Shift is the way past that: it
    // sends the yield straight to the inventory instead, so a full hand is
    // no reason to refuse.
    if (!toInventory && held && held.item !== recipe.item) return false;

    for (const i of used) {
      const cell = cells[i];
      inventory.take(cell.item, 1);
      cell.count -= 1;
      if (cell.count <= 0) cells[i] = null;
    }

    // A tool is worn, not spent: its cell keeps its count, and the cell
    // only empties when the tool actually breaks - which `reconcile` does on
    // its own, because the ledger is then one short of what the grid shows.
    if (toolAt >= 0) inventory.useTool(cells[toolAt].item);

    // The yield lands in the ledger either way. What shift changes is only
    // whether the cursor then lays claim to it: `held` is a view over the
    // inventory, so leaving it alone *is* leaving the pebbles in the stock
    // row, and they are in the slots below on the next frame.
    inventory.add(recipe.item, recipe.yield);
    if (toInventory) return true;
    if (held) held.count += recipe.yield;
    else held = { item: recipe.item, count: recipe.yield };
    return true;
  }

  // --- showing a recipe on the grid ----------------------------------------
  // Clicking a recipe card lays its shape over the grid in red so it can be
  // copied. It is a drawing and nothing else: the cells are not filled, and
  // anything actually on the grid is drawn over the top of it.
  let showcase = null;
  // Which cell of a shown recipe is the "anywhere" tool, so it can be drawn
  // as loose rather than as part of the shape. Set by `demo()`.
  let toolDemoAt = -1;

  /** Where a shown recipe's items would go: `cell index -> item`. */
  function demo() {
    const recipe = RECIPES.find((r) => r.id === showcase);
    const shape = recipe && shapeOf(recipe);
    if (!shape) return null;

    // Drawn in the corner it is written in, so a shape is always shown the
    // same way up in the same place.
    const out = new Map();
    for (let r = 0; r < shape.h; r++) {
      for (let c = 0; c < shape.w; c++) {
        if (shape.rows[r][c]) out.set(r * GRID.w + c, shape.rows[r][c]);
      }
    }

    // A tool goes in the first cell the shape left alone, marked apart from
    // the rest - it is wanted on the grid, not in that cell, and the drawing
    // has to say so or it reads as part of the shape.
    if (recipe.tool) {
      for (let i = 0; i < cells.length; i++) {
        if (!out.has(i)) { out.set(i, recipe.tool); toolDemoAt = i; break; }
      }
    } else {
      toolDemoAt = -1;
    }
    return out;
  }

  /**
   * The tool a recipe would be made with, out of what is still in stock:
   * the one it names if there is one, and anything that serves for it if
   * not - an axe will cut sticks when there is no knife to hand.
   */
  function toolFor(recipe) {
    if (!recipe.tool) return null;
    if (available(recipe.tool) > 0) return recipe.tool;
    return Object.keys(ITEMS).find((item) => servesAs(item, recipe.tool) && available(item) > 0) ?? null;
  }

  /**
   * Clicking a recipe lays it out on the grid from what is in stock.
   *
   * The whole bench is cleared first - it is a view over the ledger, so
   * nothing is lost by it - and then every cell of the shape takes as many
   * of its item as there are whole sets in stock, in the same corner the
   * red drawing is in, so whatever could not be found is left showing red
   * exactly where it goes. Forty wood on a two-wood recipe is twenty in
   * each cell, ready to be made in one go. Nothing is spent: this only
   * arranges, and the output slot is still where a craft is locked in.
   *
   * It used to put down one set and leave the rest to shift; every click
   * lays out the most now, on request, and `most: false` is only for a
   * caller that wants the single set.
   */
  function fillFrom(recipe, { most = true } = {}) {
    cells.fill(null);
    held = null;

    const layout = demo();
    if (!layout) return;

    const perSet = new Map();
    for (const [i, item] of layout) {
      if (i === toolDemoAt) continue;
      perSet.set(item, (perSet.get(item) ?? 0) + 1);
    }

    let sets = 1;
    if (most) {
      sets = Math.min(...[...perSet].map(([item, n]) => Math.floor(available(item) / n)));
      sets = Math.max(1, Number.isFinite(sets) ? sets : 1);
    }

    // `available` goes down as cells are filled, so a short item fills the
    // cells it can and leaves the rest empty rather than overdrawing.
    for (const [i, item] of layout) {
      if (i === toolDemoAt) continue;
      const give = Math.min(sets, available(item));
      if (give > 0) cells[i] = { item, count: give };
    }

    const tool = toolFor(recipe);
    if (tool && toolDemoAt >= 0) cells[toolDemoAt] = { item: tool, count: 1 };
  }

  /**
   * What a shown recipe is short of, for one craft: `[{ item, count }]`.
   *
   * Counted against everything held rather than cell by cell, because a
   * shape can be laid out anywhere on the grid - comparing against the
   * corner the drawing is in would call a recipe short the moment it was
   * moved one cell along. The grid, the cursor and the stock row are all
   * the one ledger, so the ledger is the whole answer.
   */
  function shortOf(recipe) {
    const short = [];
    for (const [item, need] of recipeCost(recipe)) {
      const have = inventory.count(item);
      if (have < need) short.push({ item, count: need - have });
    }
    if (recipe.tool) {
      const any = Object.keys(ITEMS).some((item) => servesAs(item, recipe.tool) && inventory.count(item) > 0);
      if (!any) short.push({ item: recipe.tool, count: 1 });
    }
    return short;
  }

  let missingKey = null;

  function updateMissing() {
    const recipe = showcase ? RECIPES.find((r) => r.id === showcase) : null;
    const short = recipe ? shortOf(recipe) : [];
    const key = short.map((s) => `${s.item}:${s.count}`).join(',');
    if (key === missingKey) return;
    missingKey = key;

    missingEl.hidden = short.length === 0;
    missingEl.innerHTML = short.length === 0 ? '' : '<span class="missing-label">Missing</span>'
      + short.map(({ item, count }) => `
        <span class="missing-item" style="--tint:${ITEMS[item]?.tint ?? '#e8646a'}">
          ${itemIcon(item, 20)}<b>${count}</b>${ITEMS[item]?.label ?? item}
        </span>`).join('');
  }

  /**
   * Draw a wear bar: how much of the tool is left, and green through to red
   * as it goes. The colour is written here rather than in the stylesheet
   * because it has to follow the same number the width does.
   */
  function setWear(bar, { left, max }) {
    const f = Math.max(0, Math.min(1, left / max));
    bar.style.width = `${f * 100}%`;
    bar.style.background = `hsl(${Math.round(120 * f)} 72% 55%)`;
  }

  // --- the grid ------------------------------------------------------------
  // Built once: sixteen cells that never change shape, only what is in them.
  for (let i = 0; i < GRID.w * GRID.h; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.cell = i;
    cell.innerHTML =
      '<div class="cell-icon"></div><div class="cell-count"></div><div class="cell-aim"></div>'
      + '<div class="cell-wear"><i></i></div>';
    grid.append(cell);
  }
  const cellEls = [...grid.querySelectorAll('.cell')];

  // Only redrawn when what the grid should *look* like changes - the frame
  // loop calls update() and rewriting sixteen lots of SVG every frame would
  // throw the hover away sixty times a second. The aim of a drag and the
  // shift cue are both in the key, because both are drawn on the cells.
  let gridKey = null;

  function updateGrid() {
    const aim = preview();
    const back = clearableCell();
    const shown = showcase ? demo() : null;
    const key = [
      // A tool's wear is in the key too, or a knife's bar would only move
      // when its stack size changed.
      cells.map((c) => (c ? `${c.item}:${c.count}:${inventory.wear(c.item)?.left ?? ''}` : '-')).join(','),
      aim ? [...aim].map(([i, n]) => `${i}=${n}`).join(',') : '',
      back,
      showcase ?? ''
    ].join('|');
    if (key === gridKey) return;
    gridKey = key;

    cells.forEach((cell, i) => {
      const el = cellEls[i];
      const aimed = aim?.has(i);
      const adding = aimed ? aim.get(i) : null;
      // What the cell draws, in the order the player needs it: what is
      // actually in it first, then what a drag is about to put there, then
      // what a shown recipe wants there. A real item always wins - the
      // recipe is a drawing under the bench, not a claim on the cell.
      const dragGhost = !cell && adding ? held.item : null;
      const demoGhost = !cell && !dragGhost ? shown?.get(i) ?? null : null;
      const art = cell?.item ?? dragGhost ?? demoGhost;

      el.classList.toggle('full', !!cell);
      el.classList.toggle('aim', !!aimed);
      el.classList.toggle('ghost', !!dragGhost);
      // Only an EMPTY cell of a shown recipe is drawn red. Now that showing
      // a recipe fills it from stock, red is what says "this one is
      // missing" - a filled cell tinted the same would make the missing ones
      // impossible to pick out, which is what it did.
      const wanted = !!shown?.has(i) && !cell;
      el.classList.toggle('demo', wanted);
      el.classList.toggle('loose', wanted && i === toolDemoAt);
      el.classList.toggle('back', i === back);
      el.dataset.label = cell ? ITEMS[cell.item]?.label ?? cell.item : '';
      if (art && ITEMS[art]?.tint) el.style.setProperty('--tint', ITEMS[art].tint);
      else el.style.removeProperty('--tint');

      el.querySelector('.cell-icon').innerHTML = art ? itemIcon(art, 40) : '';
      el.querySelector('.cell-count').textContent = cell && cell.count > 1 ? cell.count : '';
      // A swap has no number to show, only the cell lit - see `preview`.
      el.querySelector('.cell-aim').textContent = adding ? `+${adding}` : '';

      // How much is left on the tool that would actually be used - the most
      // worn one, which is the one a craft here would take.
      const worn = cell && isSingular(cell.item) ? inventory.wear(cell.item) : null;
      const bar = el.querySelector('.cell-wear');
      bar.hidden = !worn;
      if (worn) setWear(bar.firstElementChild, worn);
    });
  }

  // --- the output slot -----------------------------------------------------
  // What the grid adds up to, shown rather than made: nothing is spent until
  // it is taken out of here.
  let outputKey = null;

  function updateOutput() {
    const found = match();
    const recipe = found?.recipe ?? null;
    const key = recipe ? `${recipe.item}:${recipe.yield}` : '-';
    if (key === outputKey) return;
    outputKey = key;

    outputEl.classList.toggle('full', !!recipe);
    outputEl.dataset.label = recipe ? ITEMS[recipe.item]?.label ?? recipe.item : '';
    if (recipe && ITEMS[recipe.item]?.tint) {
      outputEl.style.setProperty('--tint', ITEMS[recipe.item].tint);
    } else {
      outputEl.style.removeProperty('--tint');
    }
    outputEl.querySelector('.cell-icon').innerHTML = recipe ? itemIcon(recipe.item, 44) : '';
    outputEl.querySelector('.cell-count').textContent = recipe ? recipe.yield : '';
  }

  // --- the stack on the cursor ---------------------------------------------
  let pointer = { x: 0, y: 0 };
  let heldKey = null;

  function updateHeld() {
    const key = held ? `${held.item}:${held.count}` : null;
    if (key !== heldKey) {
      heldKey = key;
      heldEl.hidden = !held;
      heldEl.innerHTML = held
        ? `${itemIcon(held.item, 34)}<span class="held-count">${held.count > 1 ? held.count : ''}</span>`
        : '';
    }
    if (held) {
      heldEl.style.left = `${pointer.x}px`;
      heldEl.style.top = `${pointer.y}px`;
    }
  }

  // --- the craftable items ------------------------------------------------
  // Rebuilt only when the list of recipes changes, like the tiles below.
  let recipeKey = null;

  function updateRecipes() {
    const key = RECIPES.map((r) => r.id).join(',');
    if (key !== recipeKey) {
      recipeKey = key;
      recipeList.textContent = '';
      recipeList.classList.toggle('is-empty', RECIPES.length === 0);

      if (RECIPES.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = 'Nothing to craft yet. Recipes will fill this side of the bench.';
        recipeList.append(empty);
      }

      for (const recipe of RECIPES) {
        // A picture and a name, and that is all: how it is laid out is
        // shown on the grid itself when the card is clicked, which says it
        // better than a line of text ever did.
        const card = document.createElement('div');
        card.className = 'recipe';
        card.dataset.recipe = recipe.id;
        card.innerHTML = `
          <div class="recipe-icon">${itemIcon(recipe.item, 34)}<span>${recipe.yield}</span></div>
          <div class="recipe-name">${recipe.label}</div>`;
        recipeList.append(card);
      }
    }

    // Whether each one can be afforded right now, and which one is being
    // shown on the grid - both written onto the cards already there.
    for (const recipe of RECIPES) {
      const card = recipeList.querySelector(`[data-recipe="${recipe.id}"]`);
      // The tool counts too: two wood is not enough to make sticks if there
      // is nothing on the isle to cut them with.
      const haveTool = !recipe.tool || Object.keys(ITEMS).some(
        (item) => servesAs(item, recipe.tool) && inventory.count(item) > 0
      );
      const enough = haveTool
        && [...recipeCost(recipe)].every(([item, n]) => inventory.count(item) >= n);
      card.classList.toggle('short', !enough);
      card.classList.toggle('showing', showcase === recipe.id);
    }
  }

  // Clicking a card lays the recipe over the grid; clicking it again, or
  // another one, puts it away. Delegated, because the cards are rebuilt.
  //
  // Showing one also lays it out: whatever is in stock goes into the cells
  // it belongs in, and whatever is not stays drawn in red there, with a line
  // under the bench saying how many are missing. Putting a recipe away
  // leaves the grid alone - by then it is the player's to do with as they
  // like.
  recipeList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-recipe]');
    if (!card) return;
    const again = showcase === card.dataset.recipe && !event.shiftKey;
    showcase = again ? null : card.dataset.recipe;
    if (!again) fillFrom(RECIPES.find((r) => r.id === showcase));
    recipeKey = null;         // so the cards pick up `showing`
    update();
  });

  // --- what is on the bench ------------------------------------------------
  // Like the inventory page's tiles, only smaller: these are slots to take
  // from rather than a page to read. The row is rebuilt only when *which*
  // items are in it changes, and the numbers are written on every frame
  // after that - and what is on the grid or the cursor is not in it, so
  // taking a stack empties its slot the way it should.
  let stockKey = null;

  function stockEntries() {
    return inventory.entries()
      .map((e) => ({ ...e, count: available(e.item) }))
      .filter((e) => e.count > 0);
  }

  function updateStock() {
    const entries = stockEntries();
    const key = entries.map((e) => e.item).join(',');
    if (key !== stockKey) {
      stockKey = key;
      stock.textContent = '';
      stock.classList.toggle('is-empty', entries.length === 0);

      if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = 'The bench is bare. Gather something first.';
        stock.append(empty);
      }

      for (const entry of entries) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.item = entry.item;
        // What it is called is on the tile as data rather than as text: the
        // slot shows the picture and the count, and CSS puts the name up
        // only while the cursor is on it.
        tile.dataset.label = ITEMS[entry.item].label;
        // The material's own colour, for the slot's glow.
        if (ITEMS[entry.item].tint) tile.style.setProperty('--tint', ITEMS[entry.item].tint);
        tile.innerHTML = `
          <div class="tile-icon">${itemIcon(entry.item, 40)}</div>
          <div class="tile-count"></div>
          ${isSingular(entry.item) ? '<div class="tile-wear"><i></i></div>' : ''}`;

        stock.append(tile);
      }
    }

    for (const entry of entries) {
      const tile = stock.querySelector(`[data-item="${entry.item}"]`);
      tile.querySelector('.tile-count').textContent = entry.count;

      const worn = isSingular(entry.item) ? inventory.wear(entry.item) : null;
      const bar = tile.querySelector('.tile-wear i');
      if (bar && worn) setWear(bar, worn);
    }
  }

  // --- the gestures --------------------------------------------------------

  /** The slot under an event, or null for anywhere else on the screen. */
  function slotAt(target) {
    const cellEl = target.closest?.('#craft-grid .cell');
    if (cellEl) return { type: 'grid', index: Number(cellEl.dataset.cell) };
    if (target.closest?.('#craft-output')) return { type: 'output' };
    const tile = target.closest?.('#craft-stock .tile');
    if (tile) return { type: 'stock', item: tile.dataset.item };
    // Anywhere else in the stock section is still the inventory, so a stack
    // dropped on the empty space beside the slots goes back rather than
    // being swallowed.
    if (stockSection.contains(target)) return { type: 'stock', item: null };
    return null;
  }

  // A drag is only a drag once it has crossed more than one cell; a press
  // and release on a single cell is an ordinary click. That is the same rule
  // Minecraft uses, and it is what lets the two gestures share a button.
  //
  // A shift drag is the exception: it takes effect cell by cell as it goes,
  // because it is a sweep rather than a share and there is nothing to work
  // out on the way back up.
  let drag = null;

  // Which cell the cursor is over and whether shift is down, so an empty
  // hand hovering a full cell with shift held can say that clicking it would
  // send that stack back. Without the cue the gesture is invisible, and a
  // sweep that clears the grid is not something to find out by accident.
  let hoverIndex = null;
  let shiftDown = false;

  /** The cell shift-clicking would return right now, or -1 for none. */
  function clearableCell() {
    if (!shiftDown || held || hoverIndex === null) return -1;
    return cells[hoverIndex] ? hoverIndex : -1;
  }

  function pointerDown(event) {
    if (event.button !== 0 && event.button !== 2) return;
    const slot = slotAt(event.target);
    if (!slot) return;
    event.preventDefault();

    // The output slot only ever gives: either button takes one craft's
    // worth, and that is the moment it is actually made. Shift sends it to
    // the inventory rather than onto the cursor - the same thing shift means
    // on a grid cell, which is why it is the same key.
    if (slot.type === 'output') {
      takeOutput({ toInventory: event.shiftKey });
      render();
      return;
    }

    // Shift with an empty hand sends a stack back where it came from, and
    // holds the sweep open so dragging on clears whatever else it crosses.
    if (event.shiftKey && !held && slot.type === 'grid') {
      drag = { mode: 'clear', button: event.button, indices: [slot.index] };
      clearCell(slot.index);
      render();
      return;
    }

    if (!held) {
      // An empty hand takes: the whole stack, or half of it.
      if (event.button === 0) takeAll(slot);
      else takeHalf(slot);
      render();
      return;
    }

    if (slot.type === 'stock') {
      // Back into the inventory. Nothing was ever taken out of it, so this
      // is only letting go: all of it, or one at a time.
      if (event.button === 0) held = null;
      else {
        held.count -= 1;
        if (held.count <= 0) held = null;
      }
      render();
      return;
    }

    // A full hand over the grid: this may turn into a drag, so what happens
    // is decided on the way back up. What it *would* do is drawn on the
    // cells in the meantime - see `preview`.
    drag = { mode: 'spread', button: event.button, indices: [slot.index] };
    render();
  }

  function pointerMove(event) {
    pointer = { x: event.clientX, y: event.clientY };
    const slot = slotAt(event.target);
    hoverIndex = slot?.type === 'grid' ? slot.index : null;

    if (drag && slot?.type === 'grid' && !drag.indices.includes(slot.index)) {
      drag.indices.push(slot.index);
      // A sweep empties as it goes; a share only shows what it is aiming at.
      if (drag.mode === 'clear') clearCell(slot.index);
    }

    updateHeld();
    if (isOpen()) updateGrid();
  }

  function pointerUp(event) {
    if (!drag) return;
    const { mode, button, indices } = drag;
    drag = null;

    if (mode === 'clear') {
      // Every cell it crossed was emptied on the way; nothing is left to do.
    } else if (indices.length > 1) {
      spread(indices, button === 0 ? 'even' : 'one');
    } else if (button === 0) {
      putAll(indices[0]);
    } else {
      putOne(indices[0]);
    }

    render();
    event.preventDefault?.();
  }

  root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointermove', pointerMove);
  root.addEventListener('pointerleave', () => { hoverIndex = null; if (isOpen()) updateGrid(); });
  window.addEventListener('pointerup', pointerUp);
  // The right button is a game gesture here, not a browser menu.
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  // Shift is only watched for the cue above, so it costs nothing while the
  // screen is shut. `getModifierState` rather than the key name, or a press
  // of the other shift reads as a release of the first.
  function trackShift(event) {
    const down = event.getModifierState?.('Shift') ?? false;
    if (down === shiftDown) return;
    shiftDown = down;
    if (isOpen()) updateGrid();
  }
  window.addEventListener('keydown', trackShift);
  window.addEventListener('keyup', trackShift);

  const isOpen = () => !root.hidden;

  function render() {
    reconcile();
    updateGrid();
    updateOutput();
    updateMissing();
    updateStock();
    updateHeld();
  }

  function update() {
    if (!isOpen()) return;
    updateRecipes();
    render();
  }

  function open() {
    onOpen?.();
    root.hidden = false;
    update();
  }

  /**
   * Closing clears the bench, and that costs nothing: the grid and the
   * cursor were only ever a view over the inventory, so everything laid out
   * on them is already held.
   */
  function close() {
    held = null;
    cells.fill(null);
    drag = null;
    hoverIndex = null;
    showcase = null;
    recipeKey = null;
    root.hidden = true;
    updateHeld();
  }

  root.querySelector('#crafting-close').addEventListener('click', close);
  root.querySelector('.scrim').addEventListener('pointerdown', close);

  window.addEventListener('keydown', (event) => {
    if (blocked?.()) return;
    if (event.key !== 'Escape' || !isOpen()) return;
    // Swallowed here so the same press does not also open the pause menu.
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, true);

  close();
  return { open, close, isOpen, update, cells, heldStack: () => held };
}
