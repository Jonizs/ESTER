import { ITEMS } from './inventory.js';
import { itemIcon } from './icons.js';

/**
 * The pickup notes: a small card in the bottom right for everything that
 * comes into the inventory - its picture, "+3 Wood", and how many are held
 * now. The same item arriving again while its card is still up adds onto
 * that card rather than stacking a second one, so felling a row of trees is
 * one card counting up, not a column of them.
 *
 * Asked for by name, and the one exception to "there are no toasts": it
 * says only what was just gained, sits out of the way in the corner, and
 * takes no clicks.
 */

const SHOW_MS = 3200;   // how long a card stays after its last gain
const MAX_CARDS = 5;    // older ones are pushed out once there are more

export function createPickups(inventory) {
  const root = document.getElementById('pickups');
  const cards = new Map();   // item -> { el, amount, timer }

  function dismiss(item) {
    const card = cards.get(item);
    if (!card) return;
    cards.delete(item);
    clearTimeout(card.timer);
    card.el.classList.add('leaving');
    card.el.addEventListener('animationend', () => card.el.remove(), { once: true });
    // A tab in the background does not run animations; do not leave it.
    setTimeout(() => card.el.remove(), 600);
  }

  function gain(item, amount) {
    const spec = ITEMS[item];
    let card = cards.get(item);
    if (!card) {
      const el = document.createElement('div');
      el.className = 'pickup';
      el.style.setProperty('--tint', spec?.tint ?? '#7ad7ff');
      el.innerHTML = `<span class="pickup-icon">${itemIcon(item, 26)}</span>
        <span class="pickup-text"><b class="pickup-amount"></b> <span class="pickup-name"></span></span>
        <span class="pickup-total"></span>`;
      el.querySelector('.pickup-name').textContent = spec?.label ?? item;
      root.append(el);
      card = { el, amount: 0, timer: 0 };
      cards.set(item, card);
      while (cards.size > MAX_CARDS) dismiss(cards.keys().next().value);
    } else {
      // Moved to the bottom, nearest the corner, and bumped.
      root.append(card.el);
      card.el.classList.remove('bump');
      void card.el.offsetWidth;
      card.el.classList.add('bump');
    }
    card.amount += amount;
    card.el.querySelector('.pickup-amount').textContent = `+${card.amount}`;
    card.el.querySelector('.pickup-total').textContent = inventory.count(item);
    clearTimeout(card.timer);
    card.timer = setTimeout(() => dismiss(item), SHOW_MS);
  }

  inventory.onGain(gain);

  return {
    /** Clear every card at once - a DEV RESET. */
    clear() { for (const item of [...cards.keys()]) dismiss(item); }
  };
}
