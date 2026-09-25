import { itemIcon } from './icons.js';
import { ITEMS } from './inventory.js';

/**
 * Handing a tool to an agent.
 *
 * There are two ways in and they meet here, because they are the same
 * question asked from either end: from the inventory page you pick the tool
 * first and then who is to carry it, and out on the isle you pick the agent
 * first and then what they should wield. One list of tiles serves both.
 *
 * It is a small panel rather than a page of its own - it is a choice, not a
 * screen, so it closes the moment one is made.
 */
export function createWield({ agents, inventory, blocked, onEquip, onOpen }) {
  const root = document.getElementById('wield');
  const titleEl = root.querySelector('.wield-title');
  const listEl = root.querySelector('.wield-list');

  const isOpen = () => !root.hidden;

  function close() {
    root.hidden = true;
    listEl.textContent = '';
  }

  function open(title, options, emptyText = 'Nothing to hand out yet.') {
    onOpen?.();
    titleEl.textContent = title;
    listEl.textContent = '';

    if (options.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = emptyText;
      listEl.append(empty);
    }

    for (const option of options) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'wield-tile';
      if (option.on) tile.classList.add('on');
      if (option.tint) tile.style.setProperty('--tint', option.tint);
      tile.innerHTML = `
        <div class="wield-art">${option.art}</div>
        <div class="wield-name">${option.label}</div>
        ${option.note ? `<div class="wield-note">${option.note}</div>` : ''}`;
      tile.addEventListener('click', () => {
        option.pick();
        close();
      });
      listEl.append(tile);
    }

    root.hidden = false;
  }

  /** From the isle: this agent, and everything they could pick up. */
  function chooseTool(agent) {
    if (!agent) return;

    const held = agent.tool?.item ?? null;
    const options = [];

    // Empty hands first, so putting a tool down is as easy as picking one up
    // and is never hidden behind a full list.
    options.push({
      label: 'Bare hands',
      art: '<span class="wield-none"></span>',
      on: !held,
      pick: () => onEquip?.(agent, null)
    });

    for (const item of Object.keys(ITEMS)) {
      if (!ITEMS[item].wields) continue;
      // What they are already holding is out of the ledger, so it is listed
      // from the agent rather than from the count - otherwise the tool in
      // their hand is the one thing missing from the list.
      const inStock = inventory.count(item);
      if (inStock === 0 && held !== item) continue;

      const wear = held === item
        ? { left: agent.tool.left, max: ITEMS[item].uses ?? ITEMS[item].capacity }
        : inventory.wear(item);

      options.push({
        label: ITEMS[item].label,
        tint: ITEMS[item].tint,
        art: itemIcon(item, 40),
        on: held === item,
        note: wear ? `${Math.round(wear.left)} / ${wear.max}` : null,
        pick: () => onEquip?.(agent, item)
      });
    }

    open(`${agent.name ?? 'Agent'} — what to wield`, options);
  }

  /** From the inventory page: this tool, and everyone who could carry it. */
  function chooseAgent(item) {
    const options = agents.map((agent) => ({
      label: agent.name ?? 'Agent',
      art: `<span class="wield-who">${agent.tool ? itemIcon(agent.tool.item, 28) : ''}</span>`,
      on: agent.tool?.item === item,
      note: agent.tool ? ITEMS[agent.tool.item].label : 'empty handed',
      pick: () => onEquip?.(agent, item)
    }));

    open(`${ITEMS[item].label} — hand it to`, options);
  }

  root.querySelector('.scrim').addEventListener('pointerdown', close);
  root.querySelector('#wield-close').addEventListener('click', close);

  window.addEventListener('keydown', (event) => {
    if (blocked?.() || !isOpen() || event.key !== 'Escape') return;
    // Swallowed here so the same press does not also open the pause menu.
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, true);

  close();
  // Any other small either-or out on the isle - what to fill at a water
  // catcher - is the same panel with its own options.
  return { chooseTool, chooseAgent, choose: open, close, isOpen };
}
