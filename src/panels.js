import { keyLabel } from './settings.js';

/**
 * The four information panels, opened with their own keys: the overview
 * (Tab), crafting (Q), the quest book (W) and stages (E).
 *
 * They are one panel with a tab strip rather than four overlays, so the same
 * key both opens its tab and closes the panel again, and any of the four
 * switches straight to its own tab while the panel is already open. Esc
 * closes it; the pause menu takes precedence, so none of these keys do
 * anything while it is up.
 *
 * Nothing here decides anything - it only reads the agents, the inventory and
 * the progression and writes what it finds into the DOM.
 */

// Tab id -> the action in settings.js whose key opens it.
const TABS = [
  { id: 'overview', label: 'Overview', action: 'panelOverview' },
  { id: 'crafting', label: 'Crafting', action: 'panelCrafting' },
  { id: 'quests', label: 'Quest book', action: 'panelQuests' },
  { id: 'stages', label: 'Stages', action: 'panelStages' }
];

function meterColour(value) {
  if (value > 60) return '#7ad7ff';
  if (value > 25) return '#f0c04a';
  return '#e8646a';
}

export function createPanels({ settings, agents, inventory, progression, blocked, onSelect }) {
  const root = document.getElementById('panels');
  const pages = new Map();
  const tabButtons = new Map();
  const strip = root.querySelector('.tabstrip');

  for (const tab of TABS) {
    const button = document.createElement('button');
    button.type = 'button';
    // The name over the key that opens it, rather than one wrapped line.
    button.innerHTML = '<span class="tab-label"></span><span class="tab-key"></span>';
    button.addEventListener('click', () => show(tab.id));
    strip.append(button);
    tabButtons.set(tab.id, button);
    pages.set(tab.id, root.querySelector(`[data-tab="${tab.id}"]`));
  }

  const inventoryList = root.querySelector('#panel-inventory');
  const agentList = root.querySelector('#panel-agents');
  const questFill = root.querySelector('#panel-quest .fill');
  const questValue = root.querySelector('#panel-quest .value');
  const stageValue = root.querySelector('#panel-stage .value');

  let tab = 'overview';

  // --- the tab strip ------------------------------------------------------
  function showTabs() {
    for (const entry of TABS) {
      const button = tabButtons.get(entry.id);
      button.querySelector('.tab-label').textContent = entry.label;
      button.querySelector('.tab-key').textContent = keyLabel(settings.bindings[entry.action]);
      button.classList.toggle('active', entry.id === tab);
    }
    for (const [id, page] of pages) page.hidden = id !== tab;
  }

  // --- the overview -------------------------------------------------------
  // The rows are rebuilt only when what they list changes; their numbers are
  // written straight onto the existing nodes every frame the panel is open.
  let inventoryKey = '';
  let agentKey = '';
  const agentRows = new Map();

  function updateInventory() {
    const entries = inventory.entries();
    const key = entries.map((e) => e.item).join(',');
    if (key !== inventoryKey) {
      inventoryKey = key;
      inventoryList.textContent = '';
      if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'Nothing gathered yet.';
        inventoryList.append(empty);
      }
      for (const entry of entries) {
        const row = document.createElement('div');
        row.className = 'item';
        row.dataset.item = entry.item;
        const name = document.createElement('span');
        name.textContent = entry.label;
        const count = document.createElement('span');
        count.className = 'count';
        row.append(name, count);
        inventoryList.append(row);
      }
    }

    for (const entry of entries) {
      inventoryList.querySelector(`[data-item="${entry.item}"] .count`).textContent = entry.count;
    }
  }

  function buildAgentRow(agent) {
    const row = document.createElement('div');
    row.className = 'agent';

    const head = document.createElement('div');
    head.className = 'agent-head';
    const name = document.createElement('span');
    name.className = 'agent-name';
    name.textContent = agent.name;
    const doing = document.createElement('span');
    doing.className = 'agent-doing';
    head.append(name, doing);

    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('span');
    fill.className = 'fill';
    bar.append(fill);

    const meters = document.createElement('div');
    meters.className = 'agent-meters';
    const stats = {};
    for (const stat of ['health', 'food', 'water', 'happiness']) {
      const meter = document.createElement('div');
      meter.className = 'agent-meter';
      const label = document.createElement('label');
      label.textContent = stat[0].toUpperCase() + stat.slice(1);
      const track = document.createElement('div');
      track.className = 'bar';
      const statFill = document.createElement('span');
      statFill.className = 'fill';
      track.append(statFill);
      const value = document.createElement('span');
      value.className = 'value';
      meter.append(label, track, value);
      meters.append(meter);
      stats[stat] = { fill: statFill, value };
    }

    row.append(head, bar, meters);
    // Clicking a row selects that agent, the same as clicking them on the isle.
    row.addEventListener('click', () => onSelect?.(agent));
    return { row, doing, fill, stats };
  }

  function updateAgents() {
    const key = agents.map((a) => a.name).join(',');
    if (key !== agentKey) {
      agentKey = key;
      agentList.textContent = '';
      agentRows.clear();
      for (const agent of agents) {
        const row = buildAgentRow(agent);
        agentRows.set(agent, row);
        agentList.append(row.row);
      }
    }

    for (const agent of agents) {
      const row = agentRows.get(agent);
      const activity = agent.activity;
      row.row.classList.toggle('selected', agent.selected);
      row.doing.textContent = activity ? activity.action : (agent.path.length > 0 ? 'Walking' : 'Idle');
      row.fill.style.width = `${(activity?.progress ?? 0) * 100}%`;
      for (const [stat, node] of Object.entries(row.stats)) {
        const value = agent.stats[stat];
        node.fill.style.width = `${value}%`;
        node.fill.style.background = meterColour(value);
        node.value.textContent = Math.round(value);
      }
    }
  }

  function update() {
    if (!isOpen()) return;
    updateInventory();
    updateAgents();
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

  /** The key for a tab opens it, switches to it, or closes the panel. */
  function toggle(next) {
    if (isOpen() && tab === next) close();
    else show(next);
  }

  root.querySelector('#panels-close').addEventListener('click', close);

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
