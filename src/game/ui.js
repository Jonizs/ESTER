import { BUILDINGS, RESEARCH } from './defs.js';

/**
 * The HUD. Plain DOM over the canvas: resource bar, colonist list, build and
 * research panels, event log and the end-of-game overlay.
 */
export class UI {
  constructor(game, input) {
    this.game = game;
    this.input = input;
    this.tab = 'build';
    this.root = document.createElement('div');
    this.root.id = 'ui';
    document.body.appendChild(this.root);
    this.root.innerHTML = TEMPLATE;

    this.el = {
      resources: this.root.querySelector('#res'),
      clock: this.root.querySelector('#clock'),
      day: this.root.querySelector('#day'),
      speeds: this.root.querySelector('#speeds'),
      countdown: this.root.querySelector('#countdown'),
      tracks: this.root.querySelector('#tracks'),
      colonists: this.root.querySelector('#colonists'),
      panel: this.root.querySelector('#panel'),
      tabs: this.root.querySelector('#tabs'),
      log: this.root.querySelector('#log'),
      selected: this.root.querySelector('#selected'),
      banner: this.root.querySelector('#banner'),
      modal: this.root.querySelector('#modal')
    };

    this._bind();
    game.on(() => this.render());
    this.render();
  }

  _bind() {
    this.el.speeds.addEventListener('click', (e) => {
      const speed = e.target.dataset.speed;
      if (speed === undefined) return;
      this.game.setSpeed(Number(speed));
    });

    this.el.tabs.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      if (!tab) return;
      this.tab = tab;
      this.render();
    });

    this.el.panel.addEventListener('click', (e) => {
      const build = e.target.closest('[data-build]');
      if (build) {
        this.input.setBuildMode(build.dataset.build);
        this.render();
        return;
      }
      const research = e.target.closest('[data-research]');
      if (research) {
        this.game.setResearch(research.dataset.research);
      }
    });

    this.el.colonists.addEventListener('click', (e) => {
      const card = e.target.closest('[data-pawn]');
      if (!card) return;
      const pawn = this.game.pawns.find((p) => p.id === card.dataset.pawn);
      if (pawn) {
        this.game.select(pawn);
        this.input.focusOn(pawn);
      }
    });

    this.el.modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'restart') {
        this.game.constructor.clearSave();
        location.reload();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ') { e.preventDefault(); this.game.setSpeed(this.game.state.paused ? 1 : 0); }
      if (e.key === '1') this.game.setSpeed(1);
      if (e.key === '2') this.game.setSpeed(3);
      if (e.key === '3') this.game.setSpeed(10);
      if (e.key === '4') this.game.setSpeed(60);
      if (e.key === 'Escape') { this.input.setBuildMode(null); this.game.select(null); this.render(); }
    });
  }

  render() {
    const g = this.game;
    const s = g.state;

    this.el.resources.innerHTML = ['wood', 'stone', 'food', 'metal']
      .map((r) => `<span class="chip ${r}"><b>${Math.floor(s.resources[r] ?? 0)}</b> ${r}</span>`)
      .join('');

    this.el.day.textContent = `Day ${g.day}`;
    this.el.clock.textContent = `${g.clockString()} ${g.isNight ? 'night' : 'day'}`;

    for (const btn of this.el.speeds.querySelectorAll('button')) {
      btn.classList.toggle('on', Number(btn.dataset.speed) === s.speed);
    }

    const secs = Math.round(g.realSecondsToEvent());
    const mins = Math.floor(secs / 60);
    this.el.countdown.innerHTML = s.outcome
      ? ''
      : `next event <b>day ${s.nextEventDay}</b> &middot; ~${mins > 0 ? `${mins}m` : `${secs}s`} real`;

    const t = g.tracks();
    this.el.tracks.innerHTML = [
      ['Tech', t.tech, '#7ad7ff'],
      ['Academic', t.academic, '#c2a8ff'],
      ['Social', t.social, '#7fe0a8']
    ].map(([label, value, color]) => `
      <div class="track" title="${label}: ${value}/100">
        <span>${label}</span>
        <div class="bar"><i style="width:${value}%;background:${color}"></i></div>
      </div>`).join('');

    this.el.colonists.innerHTML = g.colonists.map((p) => `
      <div class="pawn-card ${g.selection === p ? 'sel' : ''}" data-pawn="${p.id}">
        <div class="pawn-head">
          <b>${p.name}</b><span class="act">${p.activity}</span>
        </div>
        <div class="meters">
          ${meter('food', p.needs.food, '#ffd27f')}
          ${meter('rest', p.needs.rest, '#7fd4ff')}
          ${meter('mood', p.mood, '#7fe0a8')}
          ${meter('hp', p.hp, '#ff8f9c')}
        </div>
        <div class="skills">lab ${p.skills.labor} &middot; sci ${p.skills.science} &middot; cbt ${p.skills.combat}</div>
      </div>`).join('') || '<div class="empty">No colonists left.</div>';

    for (const btn of this.el.tabs.querySelectorAll('button')) {
      btn.classList.toggle('on', btn.dataset.tab === this.tab);
    }
    this.el.panel.innerHTML = this.tab === 'build' ? this._buildPanel() : this._researchPanel();

    this.el.selected.innerHTML = this._selectedPanel();

    this.el.log.innerHTML = s.log.slice(0, 9)
      .map((entry) => `<div class="line"><span>d${entry.day} ${entry.time}</span> ${entry.message}</div>`)
      .join('');

    const warnActive = s.warned && !s.outcome;
    this.el.banner.classList.toggle('show', warnActive || !!s.activeEvent);
    if (s.activeEvent) {
      this.el.banner.innerHTML = `<b>${s.activeEvent.title}</b> &mdash; hostiles on the island: ${g.hostiles.length}`;
      this.el.banner.classList.add('danger');
    } else if (warnActive) {
      this.el.banner.innerHTML = `<b>Incoming:</b> ${g._eventForDay(s.nextEventDay).title} on day ${s.nextEventDay}`;
      this.el.banner.classList.remove('danger');
    }

    if (s.outcome) {
      this.el.modal.classList.add('show');
      this.el.modal.innerHTML = `
        <div class="card">
          <h2>${s.outcome === 'won' ? 'Rescued' : 'Colony lost'}</h2>
          <p>${s.outcome === 'won'
            ? `The beacon fired on day ${g.day}. Whatever was listening is coming for you.`
            : `The colony died on day ${g.day}. The isle keeps drifting.`}</p>
          <button data-action="restart">Start a new colony</button>
        </div>`;
    } else {
      this.el.modal.classList.remove('show');
    }
  }

  _buildPanel() {
    const g = this.game;
    return Object.entries(BUILDINGS).map(([id, spec]) => {
      const locked = !g.isUnlocked(id);
      const poor = !g.canAfford(id);
      const cost = Object.entries(spec.cost).map(([r, n]) => `${n} ${r}`).join(', ');
      const active = this.input.buildMode === id;
      return `
        <button class="item ${locked ? 'locked' : ''} ${poor && !locked ? 'poor' : ''} ${active ? 'active' : ''}"
                data-build="${id}" ${locked ? 'disabled' : ''}>
          <div class="item-top"><b>${spec.label}</b><span>${cost}</span></div>
          <div class="item-desc">${locked ? `Needs research: ${RESEARCH[spec.tech].label}` : spec.desc}</div>
        </button>`;
    }).join('');
  }

  _researchPanel() {
    const g = this.game;
    const hasLab = g.buildings.some((b) => b.type === 'lab' && b.built);
    const head = hasLab ? '' : '<div class="note">Build a Study before anyone can research.</div>';

    return head + Object.entries(RESEARCH).map(([id, spec]) => {
      const done = g.hasResearch(id);
      const current = g.state.research.current === id;
      const blocked = !done && !g.canResearch(id);
      const pct = current ? Math.round((g.state.research.progress / spec.cost) * 100) : 0;
      return `
        <button class="item ${done ? 'done' : ''} ${blocked ? 'locked' : ''} ${current ? 'active' : ''}"
                data-research="${id}" ${done || blocked ? 'disabled' : ''}>
          <div class="item-top">
            <b>${spec.label}</b>
            <span>${done ? 'done' : current ? `${pct}%` : `${spec.cost} pts`}</span>
          </div>
          <div class="item-desc">${blocked ? `Needs ${spec.needs.map((n) => RESEARCH[n].label).join(', ')}` : spec.desc}</div>
          ${current ? `<div class="bar thin"><i style="width:${pct}%"></i></div>` : ''}
        </button>`;
    }).join('');
  }

  _selectedPanel() {
    const sel = this.game.selection;
    if (!sel) {
      if (this.input.buildMode) {
        const spec = BUILDINGS[this.input.buildMode];
        return `<b>Placing ${spec.label}</b><div class="hint">Left-click a clear cell to place it. Esc to cancel.</div>`;
      }
      return '<div class="hint">Left-click to select. Right-click a tree, rock, bush or ore to queue gathering.</div>';
    }

    if (sel.faction) {
      const job = sel.job ? sel.job.type : 'nothing';
      return `
        <b>${sel.name}</b> <span class="muted">${sel.faction === 'colony' ? 'colonist' : 'raider'}</span>
        <div class="hint">Currently: ${sel.activity} (${job})</div>
        <div class="hint">HP ${Math.round(sel.hp)} &middot; mood ${Math.round(sel.mood)} &middot; food ${Math.round(sel.needs.food)} &middot; rest ${Math.round(sel.needs.rest)}</div>`;
    }

    return `
      <b>${sel.label}</b>
      <div class="hint">${sel.built ? 'Operational' : `Under construction - ${Math.round(sel.progress * 100)}%`}</div>
      <div class="hint">HP ${Math.round(sel.hp)}</div>`;
  }
}

function meter(label, value, color) {
  const v = Math.max(0, Math.min(100, value));
  return `<div class="meter" title="${label} ${Math.round(v)}">
    <i style="width:${v}%;background:${color}"></i>
  </div>`;
}

const TEMPLATE = `
  <div id="topbar">
    <div id="title">ESTER</div>
    <div id="res"></div>
    <div id="clockbox"><b id="day"></b><span id="clock"></span></div>
    <div id="speeds">
      <button data-speed="0">II</button>
      <button data-speed="1">1x</button>
      <button data-speed="3">3x</button>
      <button data-speed="10">10x</button>
      <button data-speed="60">60x</button>
    </div>
    <div id="countdown"></div>
  </div>

  <div id="banner"></div>

  <div id="left">
    <div id="tracks"></div>
    <div id="colonists"></div>
  </div>

  <div id="right">
    <div id="tabs">
      <button data-tab="build" class="on">Build</button>
      <button data-tab="research">Research</button>
    </div>
    <div id="panel"></div>
  </div>

  <div id="bottom">
    <div id="selected"></div>
    <div id="log"></div>
  </div>

  <div id="modal"></div>
`;
