import { icon, itemIcon } from './icons.js';
import { ITEMS } from './inventory.js';

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

// The grid is 4x4. Nothing is dropped into it yet; the cells are here so the
// bench looks like a bench and so the recipes have somewhere to lay out.
export const GRID = { w: 4, h: 4 };

/**
 * What can be made. Each entry is
 * `{ id, label, item, cost: [{ item, amount }] }`.
 *
 * Empty for now, on purpose - recipes are coming. Everything below already
 * reads this list, so adding one is all that is needed to see it on screen.
 */
export const RECIPES = [];

export function createCrafting({ inventory, blocked, onOpen }) {
  const root = document.getElementById('crafting');
  const stock = root.querySelector('#craft-stock');
  const stockSection = root.querySelector('.craft-stock');
  const grid = root.querySelector('#craft-grid');
  const recipeList = root.querySelector('#craft-recipes');
  const heldEl = root.querySelector('#craft-held');

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

  // --- the grid ------------------------------------------------------------
  // Built once: sixteen cells that never change shape, only what is in them.
  for (let i = 0; i < GRID.w * GRID.h; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.cell = i;
    cell.innerHTML =
      '<div class="cell-icon"></div><div class="cell-count"></div><div class="cell-aim"></div>';
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
    const key = [
      cells.map((c) => (c ? `${c.item}:${c.count}` : '-')).join(','),
      aim ? [...aim].map(([i, n]) => `${i}=${n}`).join(',') : '',
      back
    ].join('|');
    if (key === gridKey) return;
    gridKey = key;

    cells.forEach((cell, i) => {
      const el = cellEls[i];
      const aimed = aim?.has(i);
      const adding = aimed ? aim.get(i) : null;
      // An empty cell a drag is about to fill shows what is coming, greyed
      // back, so the shape of the drag is readable before it is let go.
      const ghost = !cell && adding ? held.item : null;
      const shown = cell?.item ?? ghost;

      el.classList.toggle('full', !!cell);
      el.classList.toggle('aim', !!aimed);
      el.classList.toggle('ghost', !!ghost);
      el.classList.toggle('back', i === back);
      el.dataset.label = cell ? ITEMS[cell.item]?.label ?? cell.item : '';
      if (shown && ITEMS[shown]?.tint) el.style.setProperty('--tint', ITEMS[shown].tint);
      else el.style.removeProperty('--tint');

      el.querySelector('.cell-icon').innerHTML = shown ? itemIcon(shown, 40) : '';
      el.querySelector('.cell-count').textContent = cell && cell.count > 1 ? cell.count : '';
      // A swap has no number to show, only the cell lit - see `preview`.
      el.querySelector('.cell-aim').textContent = adding ? `+${adding}` : '';
    });
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
        const card = document.createElement('div');
        card.className = 'recipe';
        card.dataset.recipe = recipe.id;
        card.innerHTML = `
          <div class="recipe-icon">${icon(recipe.item ?? recipe.id, 22)}</div>
          <div class="recipe-name">${recipe.label}</div>
          <div class="recipe-cost">${
            (recipe.cost ?? [])
              .map((c) => `<span><b>${c.amount}</b> ${ITEMS[c.item]?.label ?? c.item}</span>`)
              .join('')
          }</div>`;
        recipeList.append(card);
      }
    }

    // Whether each one can be afforded right now, which is written onto the
    // cards that are already there.
    for (const recipe of RECIPES) {
      const card = recipeList.querySelector(`[data-recipe="${recipe.id}"]`);
      const enough = (recipe.cost ?? []).every((c) => inventory.count(c.item) >= c.amount);
      card.classList.toggle('short', !enough);
    }
  }

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
          <div class="tile-count"></div>`;

        stock.append(tile);
      }
    }

    for (const entry of entries) {
      stock.querySelector(`[data-item="${entry.item}"] .tile-count`).textContent = entry.count;
    }
  }

  // --- the gestures --------------------------------------------------------

  /** The slot under an event, or null for anywhere else on the screen. */
  function slotAt(target) {
    const cellEl = target.closest?.('#craft-grid .cell');
    if (cellEl) return { type: 'grid', index: Number(cellEl.dataset.cell) };
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
