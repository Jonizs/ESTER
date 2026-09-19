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
  const grid = root.querySelector('#craft-grid');
  const recipeList = root.querySelector('#craft-recipes');

  // --- the grid -----------------------------------------------------------
  // Built once: sixteen cells that never change shape.
  for (let i = 0; i < GRID.w * GRID.h; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.cell = i;
    grid.append(cell);
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
  // Like the inventory page's tiles: the row is rebuilt only when what is
  // held changes, and the numbers are written onto it every frame after that.
  let stockKey = null;

  function updateStock() {
    const entries = inventory.entries();
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
        // Drawn large: the picture is what the slot reads as.
        tile.innerHTML = `
          <div class="tile-icon">${itemIcon(entry.item, 64)}</div>
          <div class="tile-count"></div>`;

        stock.append(tile);
      }
    }

    for (const entry of entries) {
      stock.querySelector(`[data-item="${entry.item}"] .tile-count`).textContent = entry.count;
    }
  }

  const isOpen = () => !root.hidden;

  function update() {
    if (!isOpen()) return;
    updateRecipes();
    updateStock();
  }

  function open() {
    onOpen?.();
    root.hidden = false;
    update();
  }

  function close() {
    root.hidden = true;
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
  return { open, close, isOpen, update };
}
