import { keyLabel } from './settings.js';
import { ITEMS } from './inventory.js';
import { PROP_KINDS } from './props.js';
import { icon, itemIcon } from './icons.js';

/**
 * The information panels, opened with their own keys: the overview (Tab), the
 * inventory (Q), the quest book (W) and stages (E). Crafting is not among
 * them - it lives on the workbench out on the isle (src/crafting.js).
 *
 * They are one screen with a rail of tabs rather than separate overlays, so
 * the same key both opens its tab and closes the screen again, and any of them
 * switches straight to its own tab while it is already up. Esc closes it, as
 * does a click on the backdrop; the pause menu takes precedence, so none of
 * these keys do anything while it is open.
 *
 * Nothing here decides anything - it only reads the agents, the inventory and
 * the progression and writes what it finds into the DOM.
 */

// Each tab: what it is called, which action's key opens it, and the line of
// text under its heading.
const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    action: 'panelOverview',
    title: 'Overview',
    blurb: 'Everyone on the isle, and how far along the run is.'
  },
  {
    id: 'inventory',
    label: 'Inventory',
    action: 'panelInventory',
    title: 'Inventory',
    blurb: 'Everything the agents have gathered and carried back.'
  },
  {
    id: 'quests',
    label: 'Quest book',
    action: 'panelQuests',
    title: 'Quest book',
    blurb: 'The jobs the isle asks of you, and how far through each one is.'
  },
  {
    id: 'stages',
    label: 'Stages',
    action: 'panelStages',
    title: 'Stages',
    blurb: 'The run from its first stage to its last.'
  }
];

const STATS = ['health', 'food', 'water', 'happiness'];
const TRAITS = ['education', 'tool', 'mastery'];

function meterColour(value) {
  if (value > 60) return '#7ad7ff';
  if (value > 25) return '#f0c04a';
  return '#e8646a';
}

const title = (word) => word[0].toUpperCase() + word.slice(1);

export function createPanels({ settings, agents, inventory, progression, blocked, onSelect, onPlantItem, onEquipItem }) {
  const root = document.getElementById('panels');
  const pages = new Map();
  const tabButtons = new Map();
  const strip = root.querySelector('.tabstrip');
  const headTitle = root.querySelector('#panel-title');
  const headSub = root.querySelector('#panel-sub');

  for (const tab of TABS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab';
    button.innerHTML = `${icon(tab.id)}<span class="tab-label"></span><kbd></kbd>`;
    button.addEventListener('click', () => show(tab.id));
    strip.append(button);
    tabButtons.set(tab.id, button);
    pages.set(tab.id, root.querySelector(`[data-tab="${tab.id}"]`));
  }

  // The empty pages get the same glyph as their tab, drawn large.
  for (const mark of root.querySelectorAll('.blank-mark')) {
    mark.innerHTML = icon(mark.dataset.mark, 34);
  }

  const inventoryTiles = root.querySelector('#panel-inventory');
  const inventoryCount = root.querySelector('#inventory-count');
  const agentList = root.querySelector('#panel-agents');
  const agentCount = root.querySelector('#agent-count');
  const sumAgents = root.querySelector('#sum-agents');
  const sumItems = root.querySelector('#sum-items');
  const questFill = root.querySelector('#panel-quest .fill');
  const questValue = root.querySelector('#panel-quest .value');
  const stageValue = root.querySelector('#panel-stage .value');

  let tab = 'overview';

  // --- the rail -----------------------------------------------------------
  function showTabs() {
    for (const entry of TABS) {
      const button = tabButtons.get(entry.id);
      button.querySelector('.tab-label').textContent = entry.label;
      button.querySelector('kbd').textContent = keyLabel(settings.bindings[entry.action]);
      button.classList.toggle('active', entry.id === tab);
    }
    for (const [id, page] of pages) page.hidden = id !== tab;

    const current = TABS.find((t) => t.id === tab);
    headTitle.textContent = current.title;
    headSub.textContent = current.blurb;
  }

  // --- the overview and the inventory ------------------------------------
  // Rows and tiles are rebuilt only when what they list changes; their numbers
  // are written onto the existing nodes every frame the screen is open.
  // null rather than '', so the first pass builds even when both are empty.
  let inventoryKey = null;
  let agentKey = null;
  const agentCards = new Map();

  function updateInventory() {
    const entries = inventory.entries();
    const key = entries.map((e) => e.item).join(',');
    if (key !== inventoryKey) {
      inventoryKey = key;
      inventoryTiles.textContent = '';
      inventoryTiles.classList.toggle('is-empty', entries.length === 0);

      if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = 'Nothing gathered yet. Set an agent on a tree or a rock.';
        inventoryTiles.append(empty);
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

        // Anything that can be put on the isle carries its own little button
        // for doing so - the screen closes and the sapling goes onto the
        // cursor, positioned the same way a station is moved.
        if (ITEMS[entry.item].plants) {
          const plant = document.createElement('button');
          plant.type = 'button';
          plant.className = 'tile-action';
          // A sapling is planted; a station is put down. Same button, and
          // the kind is what says which word to use.
          plant.textContent = PROP_KINDS[ITEMS[entry.item].plants]?.placed ? 'Place' : 'Plant';
          plant.addEventListener('click', (event) => {
            event.stopPropagation();
            onPlantItem?.(entry.item);
          });
          tile.append(plant);
        }

        // A tool is something somebody carries, so its button asks who. The
        // picker is the same one the wield key opens, only entered from the
        // other end - the item is known and the agent is the question.
        if (ITEMS[entry.item].wields) {
          const equip = document.createElement('button');
          equip.type = 'button';
          equip.className = 'tile-action';
          equip.textContent = 'Equip';
          equip.addEventListener('click', (event) => {
            event.stopPropagation();
            onEquipItem?.(entry.item);
          });
          tile.append(equip);
        }
        inventoryTiles.append(tile);
      }
    }

    let total = 0;
    for (const entry of entries) {
      total += entry.count;
      inventoryTiles.querySelector(`[data-item="${entry.item}"] .tile-count`).textContent = entry.count;
    }
    inventoryCount.textContent = total;
  }

  function buildAgentCard(agent) {
    const card = document.createElement('article');
    card.className = 'card agent';
    card.innerHTML = `
      <div class="agent-head">
        <div class="agent-face">${icon('agent', 22)}</div>
        <div class="agent-id">
          <span class="agent-name"></span>
          <span class="agent-doing"></span>
        </div>
        <span class="pill"></span>
      </div>
      <div class="agent-work">
        <div class="bar"><span class="fill"></span></div>
        <span class="agent-time"></span>
      </div>
      <div class="agent-meters"></div>
      <div class="agent-traits"></div>`;

    card.querySelector('.agent-name').textContent = agent.name;

    const meters = card.querySelector('.agent-meters');
    const stats = {};
    for (const stat of STATS) {
      const meter = document.createElement('div');
      meter.className = 'meter';
      meter.innerHTML = `<label>${title(stat)}</label>
        <div class="bar"><span class="fill"></span></div>
        <span class="value"></span>`;
      meters.append(meter);
      stats[stat] = { fill: meter.querySelector('.fill'), value: meter.querySelector('.value') };
    }

    const traitRow = card.querySelector('.agent-traits');
    const traits = {};
    for (const trait of TRAITS) {
      const cell = document.createElement('div');
      cell.innerHTML = `<label>${title(trait)}</label><span class="value"></span>`;
      traitRow.append(cell);
      traits[trait] = cell.querySelector('.value');
    }

    // Clicking a card selects that agent, the same as clicking them on the isle.
    card.addEventListener('click', () => onSelect?.(agent));

    return {
      card,
      pill: card.querySelector('.pill'),
      doing: card.querySelector('.agent-doing'),
      fill: card.querySelector('.agent-work .fill'),
      time: card.querySelector('.agent-time'),
      stats,
      traits
    };
  }

  function updateAgents() {
    const key = agents.map((a) => a.name).join(',');
    if (key !== agentKey) {
      agentKey = key;
      agentList.textContent = '';
      agentCards.clear();
      for (const agent of agents) {
        const card = buildAgentCard(agent);
        agentCards.set(agent, card);
        agentList.append(card.card);
      }

      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.textContent = 'No one else on the isle yet.';
      agentList.append(slot);

      agentCount.textContent = agents.length;
    }

    for (const agent of agents) {
      const card = agentCards.get(agent);
      const activity = agent.activity;
      const walking = agent.path.length > 0;
      const state = activity ? 'working' : (walking ? 'walking' : 'idle');

      card.card.classList.toggle('selected', agent.selected);
      card.pill.textContent = title(state);
      card.pill.dataset.state = state;
      card.doing.textContent = activity ? activity.action : (walking ? 'On its way' : 'Waiting for orders');
      card.fill.style.width = `${(activity?.progress ?? 0) * 100}%`;
      card.time.textContent = activity ? `${activity.remaining.toFixed(1)}s left` : '';

      for (const stat of STATS) {
        const value = agent.stats[stat];
        const node = card.stats[stat];
        node.fill.style.width = `${value}%`;
        node.fill.style.background = meterColour(value);
        node.value.textContent = Math.round(value);
      }

      for (const trait of TRAITS) {
        card.traits[trait].textContent = agent.stats[trait] ?? 'None';
      }
    }
  }

  function update() {
    if (!isOpen()) return;

    // The inventory is a page of its own (Q); the overview no longer carries
    // a copy of it, only the count on its summary tile.
    if (tab === 'inventory') { updateInventory(); return; }
    if (tab !== 'overview') return;

    updateAgents();

    sumAgents.textContent = agents.length;
    sumItems.textContent = inventory.entries().reduce((n, e) => n + e.count, 0);
    questFill.style.width = `${progression.questPercent}%`;
    questValue.textContent = `${progression.questPercent}%`;
    stageValue.textContent = progression.stageLabel;
  }

  // --- opening and closing ------------------------------------------------
  const isOpen = () => !root.hidden;

  function show(next) {
    tab = next;
    root.hidden = false;
    showTabs();
    update();
  }

  function close() {
    root.hidden = true;
  }

  /** The key for a tab opens it, switches to it, or closes the screen. */
  function toggle(next) {
    if (isOpen() && tab === next) close();
    else show(next);
  }

  root.querySelector('#panels-close').addEventListener('click', close);
  root.querySelector('.scrim').addEventListener('pointerdown', close);

  window.addEventListener('keydown', (event) => {
    if (blocked?.()) return;

    if (event.key === 'Escape' && isOpen()) {
      // Swallowed here so the same press does not also open the pause menu.
      event.preventDefault();
      event.stopImmediatePropagation();   // the pause menu listens for Esc too
      close();
      return;
    }

    const action = settings.actionFor(event.key);
    const entry = TABS.find((t) => t.action === action);
    if (!entry) return;
    // Tab would otherwise walk the browser's focus ring off the canvas.
    event.preventDefault();
    toggle(entry.id);
  }, true);

  showTabs();
  close();
  return { open: show, close, toggle, isOpen, update, showTabs };
}
