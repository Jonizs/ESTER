import { itemIcon } from './icons.js';
import { ITEMS, isSingular } from './inventory.js';

/**
 * The screens a station on the isle opens: a chest's store and a mill's
 * hopper.
 *
 * Opening one is not an order - it is a screen, the same as the repaired
 * bench - so no agent has to be selected or walk anywhere. Esc or the scrim
 * closes it, and the pause menu takes precedence.
 *
 * Unlike the crafting bench, which is only a VIEW over the inventory, what
 * goes in here really leaves it: a chest holds its things on the prop (and
 * the save writes them there), and wheat in a mill's hopper is the mill's.
 * Every move is `inventory.take`/`add` - or `detach`/`attach` for a tool,
 * so the wear on the one put away is the wear on the one taken back out.
 */

export const CHEST_SLOTS = 16;
const STACK = 64;

/** An empty chest's store: 16 slots, each null or `{ item, count, left? }`. */
export const emptyStore = () => new Array(CHEST_SLOTS).fill(null);

/**
 * Everything a store holds, handed back to the inventory - for a chest
 * picked back up, so nothing in it is lost with it.
 */
export function emptyInto(store, inventory) {
  for (let i = 0; i < (store?.length ?? 0); i++) {
    const slot = store[i];
    if (!slot) continue;
    if (isSingular(slot.item)) inventory.attach({ item: slot.item, left: slot.left });
    else inventory.add(slot.item, slot.count);
    store[i] = null;
  }
}

export function createStations({ inventory, blocked, onOpen, onCrank, crankState }) {
  const root = document.getElementById('station');
  const title = root.querySelector('.station-title');
  const hint = root.querySelector('.station-hint');
  const chestView = root.querySelector('.chest-view');
  const millView = root.querySelector('.mill-view');
  const chestGrid = root.querySelector('#chest-grid');
  const stockEl = root.querySelector('#station-stock');
  const millIn = root.querySelector('#mill-in');
  const millOut = root.querySelector('#mill-out');
  const millFill = root.querySelector('.mill-fill');
  const crankButton = root.querySelector('#mill-crank');
  const millNote = root.querySelector('#mill-note');

  let prop = null;            // the station whose screen is up
  let stockKey = null;        // what the stock row was last built from

  const isOpen = () => !root.hidden;

  // --- the chest -------------------------------------------------------------

  /** Put `count` of a plain item into the store: onto its stacks, then empties. */
  function stow(store, item, count) {
    let left = count;
    for (const slot of store) {
      if (left <= 0) break;
      if (slot?.item !== item || slot.count >= STACK) continue;
      const n = Math.min(left, STACK - slot.count);
      slot.count += n;
      left -= n;
    }
    for (let i = 0; i < store.length && left > 0; i++) {
      if (store[i]) continue;
      const n = Math.min(left, STACK);
      store[i] = { item, count: n };
      left -= n;
    }
    return count - left;                       // how many actually went in
  }

  /** From the inventory into the chest: all of it, or `one`. */
  function putIn(item, one) {
    const store = prop.store;
    if (isSingular(item)) {
      // A tool is its own slot, wear and all.
      const times = one ? 1 : inventory.count(item);
      for (let k = 0; k < times; k++) {
        const free = store.indexOf(null);
        if (free < 0) return;
        const held = inventory.detach(item);
        if (!held) return;
        store[free] = { item, count: 1, left: held.left };
      }
      return;
    }
    const want = one ? 1 : inventory.count(item);
    // Only spend what there was room for.
    const probe = store.map((s) => (s ? { ...s } : null));
    const fits = stow(probe, item, want);
    if (fits <= 0 || !inventory.take(item, fits)) return;
    stow(store, item, fits);
  }

  /** From a chest slot back into the inventory: the whole stack, or `one`. */
  function takeOut(index, one) {
    const slot = prop.store[index];
    if (!slot) return;
    if (isSingular(slot.item)) {
      inventory.attach({ item: slot.item, left: slot.left });
      prop.store[index] = null;
      return;
    }
    const n = one ? 1 : slot.count;
    inventory.add(slot.item, n);
    slot.count -= n;
    if (slot.count <= 0) prop.store[index] = null;
  }

  function drawSlot(el, item, count, { ghost = false, label = null } = {}) {
    el.classList.toggle('full', !!item && !ghost);
    el.classList.toggle('ghost', ghost);
    el.dataset.label = label ?? (item ? ITEMS[item]?.label ?? item : '');
    if (item) el.style.setProperty('--tint', ITEMS[item]?.tint ?? 'var(--accent)');
    else el.style.removeProperty('--tint');
    const key = `${item}|${ghost}`;
    if (el.dataset.drawn !== key) {
      el.dataset.drawn = key;
      el.querySelector('.slot-icon').innerHTML = item ? itemIcon(item, 48) : '';
    }
    const badge = el.querySelector('.slot-count');
    badge.textContent = count;
    badge.hidden = !(count > 0) || ghost;
  }

  function makeSlot(className = 'slot') {
    const el = document.createElement('div');
    el.className = className;
    el.innerHTML = '<div class="slot-icon"></div><div class="slot-count"></div>';
    return el;
  }

  const chestSlots = [];
  for (let i = 0; i < CHEST_SLOTS; i++) {
    const el = makeSlot();
    el.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      event.preventDefault();
      takeOut(i, event.button === 2);
      update();
    });
    chestSlots.push(el);
    chestGrid.append(el);
  }

  // --- the mill --------------------------------------------------------------

  /** Wheat from the inventory into the hopper: all of it, or one. */
  function fillHopper(one) {
    const n = one ? 1 : inventory.count('wheat');
    if (n <= 0 || !inventory.take('wheat', n)) return;
    prop.grain = (prop.grain ?? 0) + n;
  }

  millIn.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    // Left puts wheat in; right takes what is in the hopper back out.
    if (event.button === 0) fillHopper(false);
    if (event.button === 2 && prop.grain > 0) {
      inventory.add('wheat', prop.grain);
      prop.grain = 0;
    }
    update();
  });

  millOut.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (!(prop.flour > 0)) return;
    const n = event.button === 2 ? 1 : prop.flour;
    inventory.add('flour', n);
    prop.flour -= n;
    update();
  });

  crankButton.addEventListener('click', () => {
    if (prop) onCrank?.(prop);
    update();
  });

  // --- the stock row ---------------------------------------------------------

  function drawStock() {
    const entries = inventory.entries();
    const key = entries.map((e) => e.item).join(',');
    if (key !== stockKey) {
      stockKey = key;
      stockEl.replaceChildren();
      for (const entry of entries) {
        const el = makeSlot('slot stock');
        el.dataset.item = entry.item;
        el.addEventListener('pointerdown', (event) => {
          if (event.button !== 0 && event.button !== 2) return;
          event.preventDefault();
          const one = event.button === 2;
          if (prop?.kind === 'chest') putIn(entry.item, one);
          else if (prop?.kind === 'mill' && entry.item === 'wheat') fillHopper(one);
          update();
        });
        stockEl.append(el);
      }
      if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = 'Nothing held.';
        stockEl.append(empty);
      }
    }
    for (const el of stockEl.querySelectorAll('.slot')) {
      const item = el.dataset.item;
      drawSlot(el, item, inventory.count(item));
      // In the mill, only wheat is anything to click on.
      el.classList.toggle('dim', prop?.kind === 'mill' && item !== 'wheat');
    }
  }

  // --- drawing ---------------------------------------------------------------

  function update() {
    if (!isOpen() || !prop) return;
    if (prop.gone) { close(); return; }

    if (prop.kind === 'chest') {
      prop.store.forEach((slot, i) => drawSlot(chestSlots[i], slot?.item ?? null, slot?.count ?? 0));
    } else {
      const grain = prop.grain ?? 0;
      const flour = prop.flour ?? 0;
      // The two pictures are always there - a grain going in and flour
      // coming out - greyed until there is some of it.
      drawSlot(millIn, 'wheat', grain, { ghost: grain <= 0, label: 'Wheat in' });
      drawSlot(millOut, 'flour', flour, { ghost: flour <= 0, label: 'Flour out' });
      millFill.style.width = `${Math.round((prop.grindProgress ?? 0) * 100)}%`;

      const state = crankState?.(prop) ?? { ok: false, why: '' };
      crankButton.disabled = !state.ok;
      millNote.textContent = state.why;
    }
    drawStock();
  }

  // --- opening and closing ---------------------------------------------------

  function open(next) {
    if (!next) return;
    onOpen?.();
    prop = next;
    const chest = prop.kind === 'chest';
    title.textContent = chest ? 'Wooden Chest' : 'Basic Mill';
    hint.textContent = chest
      ? 'Click a slot to take the stack back out, right click for one. Click what is held below to put it in.'
      : 'Wheat goes in on the left. Turning the crank grinds it into flour, one for one - two a second, ten at a go.';
    chestView.hidden = !chest;
    millView.hidden = chest;
    stockKey = null;
    root.hidden = false;
    update();
  }

  function close() {
    root.hidden = true;
    prop = null;
  }

  root.querySelector('#station-close').addEventListener('click', close);
  root.querySelector('.scrim').addEventListener('pointerdown', close);
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  // Capture phase, like the other screens, so Esc closes this rather than
  // pausing the game behind it.
  window.addEventListener('keydown', (event) => {
    if (blocked?.()) return;
    if (event.key !== 'Escape' || !isOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, true);

  root.hidden = true;
  return { open, close, isOpen, update, get prop() { return prop; } };
}
