import { icon } from './icons.js';
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
 * There are no recipes yet; what it does show is what is on the bench to work
 * with, read straight off the inventory.
 */
export function createCrafting({ inventory, blocked, onOpen }) {
  const root = document.getElementById('crafting');
  const stock = root.querySelector('#craft-stock');
  const mark = root.querySelector('.blank-mark');

  mark.innerHTML = icon('crafting', 34);

  // Like the overview's tiles: the row is rebuilt only when what is held
  // changes, and the numbers are written onto it every frame after that.
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
        tile.innerHTML = `
          <div class="tile-icon">${icon(entry.item, 24)}</div>
          <div class="tile-count"></div>
          <div class="tile-label">${ITEMS[entry.item].label}</div>`;
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
