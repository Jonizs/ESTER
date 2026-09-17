import * as THREE from 'three';
import { World, NODE_TYPES } from './world.js';
import { Pawn, DAY, colonistTint, buildSelectionRing } from './pawns.js';
import { Building } from './buildings.js';
import { BUILDINGS, RESEARCH, EVENTS, NAMES } from './defs.js';
import { rand } from '../noise.js';

const SAVE_KEY = 'ester.colony.v1';
const EVENT_EVERY = 7;             // days
const AUTOSAVE_EVERY = 20;         // real seconds

/**
 * The colony simulation. Owns the world, the pawns, the buildings and the
 * clock, and exposes a small surface for the UI and input layers.
 */
export class Game {
  constructor(scene, islandGroup) {
    this.scene = scene;
    this.world = new World(islandGroup, scene);
    this.world.populate();
    this.world.setBlocked([]);

    this.pawns = [];
    this.buildings = [];
    this.jobs = [];                 // player designations waiting for a worker
    this.listeners = new Set();

    this.state = {
      elapsed: DAY * 0.33,          // game-seconds since landing (start mid-morning)
      speed: 1,
      paused: false,
      resources: { wood: 30, stone: 10, food: 45, metal: 0 },
      research: { current: null, progress: 0, done: [] },
      nextEventDay: EVENT_EVERY,
      warned: false,
      activeEvent: null,
      outcome: null,                // 'won' | 'lost'
      log: []
    };

    this.selection = null;
    this.buildMode = null;
    this.ring = buildSelectionRing();
    scene.add(this.ring);

    this.pawnGroup = new THREE.Group();
    this.buildingGroup = new THREE.Group();
    scene.add(this.pawnGroup, this.buildingGroup);

    this._autosaveIn = AUTOSAVE_EVERY;
    this._nextArrivalDay = 5;
  }

  // --- lifecycle -----------------------------------------------------------

  startNewColony() {
    const site = this.world.landingSite();
    const picked = new Set();
    for (let i = 0; i < 3; i++) {
      let name;
      do { name = NAMES[Math.floor(rand(i * 17 + 3, 42) * NAMES.length)]; } while (picked.has(name));
      picked.add(name);

      const spot = this._freeCellNear(site.x, site.z, i + 1);
      const pawn = new Pawn({ name, x: spot.x, z: spot.z, tint: colonistTint(i) });
      this._addPawn(pawn);
    }
    this.log('Three survivors walk out of the wreck. The isle is quiet, for now.');
    this.log('Right-click trees and rocks to gather. Build a Study to start research.');
    this.emit();
  }

  _addPawn(pawn) {
    const y = this.world.standY(pawn.x, pawn.z) ?? 0;
    pawn.pos.set(pawn.x, y, pawn.z);
    this.pawns.push(pawn);
    this.pawnGroup.add(pawn.mesh);
    return pawn;
  }

  _freeCellNear(x, z, radius = 2) {
    for (let r = 0; r <= radius + 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const nx = x + dx;
          const nz = z + dz;
          if (this.world.height(nx, nz) === null) continue;
          if (this.world.blockedBy(nx, nz)) continue;
          if (this.buildingAt(nx, nz)) continue;
          if (this.pawns.some((p) => p.alive && p.atCell(nx, nz))) continue;
          return { x: nx, z: nz };
        }
      }
    }
    return { x, z };
  }

  // --- clock ---------------------------------------------------------------

  get day() { return Math.floor(this.state.elapsed / DAY) + 1; }
  get timeOfDay() { return (this.state.elapsed % DAY) / DAY; }
  get isNight() { return this.timeOfDay > 0.78 || this.timeOfDay < 0.22; }

  clockString() {
    const minutes = Math.floor(this.timeOfDay * 24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  /** Real seconds until the next event day, at the current speed. */
  realSecondsToEvent() {
    const target = (this.state.nextEventDay - 1) * DAY;
    return Math.max(0, (target - this.state.elapsed) / Math.max(0.0001, this.state.speed));
  }

  // --- main tick -----------------------------------------------------------

  update(realDelta) {
    this._autosaveIn -= realDelta;
    if (this._autosaveIn <= 0) { this.save(); this._autosaveIn = AUTOSAVE_EVERY; }

    if (this.state.paused || this.state.outcome) return;

    const dt = realDelta * this.state.speed;
    const dayBefore = this.day;
    this.state.elapsed += dt;

    this.world.update(dt);
    this._updateBuildings(dt);
    this._updatePawns(dt);
    this._updateCombat(dt);
    this._updateResearch(dt);

    if (this.day !== dayBefore) this._onNewDay();
    this._checkEventSchedule();
    this._checkOutcome();
  }

  _onNewDay() {
    this.log(`Day ${this.day} begins.`);
    if (this.day >= this._nextArrivalDay) {
      this._maybeNewArrival();
      this._nextArrivalDay = this.day + 5;
    }
    this.emit();
  }

  _maybeNewArrival() {
    const colonists = this.colonists;
    if (colonists.length === 0 || colonists.length >= 8) return;
    const avgMood = colonists.reduce((n, p) => n + p.mood, 0) / colonists.length;
    const needed = this.hasResearch('society') ? 58 : 68;
    if (avgMood < needed || this.state.resources.food < 25) return;

    const site = this.world.landingSite();
    const spot = this._freeCellNear(site.x, site.z, 3);
    const name = NAMES[Math.floor(rand(this.day * 91, 7) * NAMES.length)];
    const pawn = new Pawn({ name, x: spot.x, z: spot.z, tint: colonistTint(colonists.length) });
    this._addPawn(pawn);
    this.log(`${name} found the colony and asked to stay. Word of the isle is spreading.`);
  }

  // --- pawns ---------------------------------------------------------------

  get colonists() { return this.pawns.filter((p) => p.faction === 'colony' && p.alive); }
  get hostiles() { return this.pawns.filter((p) => p.faction === 'raider' && p.alive); }

  _updatePawns(dt) {
    const moodScale = this.hasResearch('society') ? 0.6 : 1;

    for (const pawn of this.pawns) {
      if (!pawn.alive) continue;

      if (pawn.sayFor > 0) pawn.sayFor -= dt;
      if (pawn.chatCooldown > 0) pawn.chatCooldown -= dt;

      if (pawn.faction === 'colony') {
        pawn.comfort = this._comfortAt(pawn);
        pawn.decayNeeds(dt, moodScale);
        if (!pawn.alive) { this.log(`${pawn.name} has died.`); this.emit(); continue; }
        // Healing is per in-game day, not per second: a wound should take
        // days to close, and Medicine should roughly quadruple that rate.
        if (pawn.hp < 100 && pawn.needs.food > 20) {
          const perDay = this.hasResearch('medicine') ? 55 : 14;
          pawn.hp = Math.min(100, pawn.hp + (perDay / DAY) * dt);
        }
        this._runColonist(pawn, dt);
      } else {
        this._runRaider(pawn, dt);
      }

      pawn.syncMesh(this.world);
    }
  }

  _comfortAt(pawn) {
    let comfort = 0;
    for (const b of this.buildings) {
      if (!b.built) continue;
      const d = Math.abs(b.x - pawn.x) + Math.abs(b.z - pawn.z);
      if (b.type === 'campfire' && d <= 6) comfort += 10;
      if (b.type === 'beacon' && d <= 10) comfort += 6;
    }
    return Math.min(22, comfort);
  }

  _runColonist(pawn, dt) {
    // Anything hostile nearby interrupts whatever they were doing. Without
    // this, colonists carried on sleeping or building while being cut down.
    if (pawn.job && pawn.job.type !== 'attack') {
      const nearThreat = this.hostiles.some((h) => pawn.distanceTo(h.x, h.z) <= 16);
      if (nearThreat) {
        if (pawn.job.type === 'sleep' && pawn.job.targetId) {
          const bed = this.buildings.find((b) => b.id === pawn.job.targetId);
          if (bed) bed.occupant = null;
        }
        this._abandonJob(pawn);
      }
    }

    // Long jobs (research above all, which runs until a whole project ends)
    // must yield when the colonist is starving or dead on their feet.
    if (pawn.job && !['eat', 'sleep', 'attack'].includes(pawn.job.type)) {
      const starving = pawn.needs.food < 26 && this.state.resources.food >= 5;
      const exhausted = pawn.needs.rest < 16;
      if (starving || exhausted) this._abandonJob(pawn);
    }

    if (!pawn.job) this._assignJob(pawn);
    if (!pawn.job) {
      this._idle(pawn, dt);
      return;
    }

    const job = pawn.job;

    // Walk to the job before working it.
    if (job.cell && !(pawn.distanceTo(job.cell.x, job.cell.z) <= (job.adjacent ? 1 : 0))) {
      if (pawn.path.length === 0) {
        const ok = pawn.moveTo(this.world, job.cell, job.adjacent);
        if (!ok) { this._abandonJob(pawn, true); return; }
      }
      pawn.stepAlongPath(this.world, dt);
      pawn.activity = 'walk';
      return;
    }

    pawn.path.length = 0;
    this._workJob(pawn, job, dt);
  }

  _workJob(pawn, job, dt) {
    switch (job.type) {
      case 'harvest': {
        const node = this.world.nodes.get(job.targetId);
        if (!node || node.depleted) { this._abandonJob(pawn); return; }
        const spec = NODE_TYPES[node.type];
        pawn.activity = node.type === 'tree' ? 'chop' : node.type === 'bush' ? 'forage' : 'mine';
        job.progress += pawn.workRate(this.harvestMultiplier) * dt;
        if (job.progress >= spec.work) {
          this.addResource(spec.yields, spec.amount);
          this.world.depleteNode(node);
          if (pawn.gainXp('labor', 24)) this.log(`${pawn.name} is getting good at this (labor ${pawn.skills.labor}).`);
          pawn.speak(`+${spec.amount} ${spec.yields}`);
          this._finishJob(pawn);
        }
        break;
      }
      case 'build': {
        const b = this.buildings.find((x) => x.id === job.targetId);
        if (!b || b.built) { this._abandonJob(pawn); return; }
        pawn.activity = 'build';
        b.work += pawn.workRate(1) * dt;
        if (b.work >= b.workNeeded) {
          b.finish();
          this.world.setBlocked(this.solidBuildingCells());
          this.log(`${b.label} finished.`);
          pawn.gainXp('labor', 30);
          this._finishJob(pawn);
          if (b.type === 'beacon') this._win();
        }
        break;
      }
      case 'research': {
        const b = this.buildings.find((x) => x.id === job.targetId);
        const current = this.state.research.current;
        if (!b || !b.built || !current) { this._abandonJob(pawn); return; }
        pawn.activity = 'study';
        const rate = (1 + (pawn.skills.science - 1) * 0.12) * (this.hasResearch('letters') ? 1.4 : 1);
        this.state.research.progress += rate * dt * 0.2;
        if (pawn.gainXp('science', 0.5 * dt)) this.log(`${pawn.name} is sharper now (science ${pawn.skills.science}).`);
        if (this.state.research.progress >= RESEARCH[current].cost) this._completeResearch();
        break;
      }
      case 'gather-farm': {
        const b = this.buildings.find((x) => x.id === job.targetId);
        if (!b || b.stock < 1) { this._abandonJob(pawn); return; }
        pawn.activity = 'farm';
        job.progress += pawn.workRate(1) * dt;
        if (job.progress >= 30) {
          b.stock = 0;
          this.addResource('food', 34);
          pawn.speak('+28 food');
          pawn.gainXp('labor', 18);
          this._finishJob(pawn);
        }
        break;
      }
      case 'smelt': {
        const b = this.buildings.find((x) => x.id === job.targetId);
        if (!b || !b.built || this.state.resources.stone < 5) { this._abandonJob(pawn); return; }
        pawn.activity = 'smelt';
        job.progress += pawn.workRate(1) * dt;
        if (job.progress >= 130) {
          this.state.resources.stone -= 5;
          this.addResource('metal', 3);
          pawn.speak('+3 metal');
          this._finishJob(pawn);
        }
        break;
      }
      case 'quarry': {
        const b = this.buildings.find((x) => x.id === job.targetId);
        if (!b || !b.built) { this._abandonJob(pawn); return; }
        pawn.activity = 'quarry';
        job.progress += pawn.workRate(this.harvestMultiplier) * dt;
        if (job.progress >= 150) {
          this.addResource('stone', 14);
          pawn.speak('+14 stone');
          pawn.gainXp('labor', 20);
          this._finishJob(pawn);
        }
        break;
      }
      case 'eat': {
        if (this.state.resources.food < 5) { this._abandonJob(pawn); return; }
        pawn.activity = 'eat';
        job.progress += dt;
        if (job.progress >= 18) {
          this.state.resources.food -= 5;
          pawn.needs.food = Math.min(100, pawn.needs.food + 62);
          pawn.speak('That helps.');
          this._finishJob(pawn);
        }
        break;
      }
      case 'sleep': {
        pawn.activity = 'sleep';
        const inBed = !!job.targetId;
        pawn.needs.rest = Math.min(100, pawn.needs.rest + (inBed ? 100 / (DAY * 0.22) : 100 / (DAY * 0.4)) * dt);
        if (pawn.needs.rest >= 96) {
          const bed = this.buildings.find((x) => x.id === job.targetId);
          if (bed) bed.occupant = null;
          this._finishJob(pawn);
        }
        break;
      }
      case 'attack': {
        const target = this.pawns.find((p) => p.id === job.targetId);
        if (!target || !target.alive) { this._abandonJob(pawn); return; }
        pawn.activity = 'fight';
        if (pawn.distanceTo(target.x, target.z) > 1) {
          job.cell = { x: target.x, z: target.z };
          job.adjacent = true;
          if (pawn.path.length === 0) pawn.moveTo(this.world, job.cell, true);
          pawn.stepAlongPath(this.world, dt);
          return;
        }
        pawn.attackCooldown -= dt;
        if (pawn.attackCooldown <= 0) {
          pawn.attackCooldown = 1.4;
          target.hp -= 5 + pawn.skills.combat * 1.8;
          if (target.hp <= 0) {
            target.dead = true;
            this.log(`${pawn.name} put down a raider.`);
            pawn.gainXp('combat', 40);
            this._finishJob(pawn);
            this.emit();
          }
        }
        break;
      }
      default:
        this._finishJob(pawn);
    }
  }

  _idle(pawn, dt) {
    pawn.activity = 'idle';

    // Colonists standing near each other talk, which lifts both their moods.
    if (pawn.chatCooldown <= 0) {
      const friend = this.colonists.find((o) => o !== pawn && o.activity === 'idle' && pawn.distanceTo(o.x, o.z) <= 2);
      if (friend) {
        pawn.mood = Math.min(100, pawn.mood + 3);
        friend.mood = Math.min(100, friend.mood + 3);
        pawn.chatCooldown = 90;
        friend.chatCooldown = 90;
        pawn.speak('...');
        return;
      }
    }

    // Otherwise drift a little so the colony does not look frozen.
    if (pawn.path.length === 0 && Math.random() < dt * 0.25) {
      const opts = this.world.neighbours(pawn.x, pawn.z);
      if (opts.length) {
        const [nx, nz] = opts[Math.floor(Math.random() * opts.length)];
        pawn.moveTo(this.world, { x: nx, z: nz });
      }
    }
    pawn.stepAlongPath(this.world, dt);
  }

  _assignJob(pawn) {
    // 1. Fight anything hostile that is close.
    const threat = this.hostiles
      .map((h) => ({ h, d: pawn.distanceTo(h.x, h.z) }))
      .filter((t) => t.d <= 16)
      .sort((a, b) => a.d - b.d)[0];
    if (threat) {
      pawn.job = { type: 'attack', targetId: threat.h.id, cell: { x: threat.h.x, z: threat.h.z }, adjacent: true, progress: 0 };
      return;
    }

    // 2. Eat when hungry and there is food in the stores.
    if (pawn.needs.food < 32 && this.state.resources.food >= 5) {
      const fire = this._nearestBuilding(pawn, 'campfire');
      pawn.job = { type: 'eat', cell: fire ? { x: fire.x, z: fire.z } : null, adjacent: true, progress: 0 };
      return;
    }

    // 3. Sleep at night, or whenever exhausted.
    if (pawn.needs.rest < 22 || (this.isNight && pawn.needs.rest < 65)) {
      const bed = this.buildings.find((b) => b.type === 'bedroll' && b.built && !b.occupant);
      if (bed) bed.occupant = pawn.id;
      pawn.job = {
        type: 'sleep',
        targetId: bed?.id ?? null,
        cell: bed ? { x: bed.x, z: bed.z } : null,
        adjacent: false,
        progress: 0
      };
      return;
    }

    // 4. Keep the study staffed. Without this, a full gather queue (or any
    //    endless busywork like the quarry) would starve research forever.
    const lab = this.buildings.find((b) => b.type === 'lab' && b.built);
    if (lab && this.state.research.current) {
      const wanted = this.colonists.length >= 5 ? 2 : 1;
      const researching = this.colonists.filter((p) => p.job?.type === 'research');
      if (researching.length < wanted && !researching.includes(pawn)) {
        // The best scientists take the desk, so the choice is stable.
        const ranked = [...this.colonists].sort((a, b) => b.skills.science - a.skills.science);
        if (ranked.slice(0, wanted).includes(pawn)) {
          pawn.job = { type: 'research', targetId: lab.id, cell: { x: lab.x, z: lab.z }, adjacent: true, progress: 0 };
          return;
        }
      }
    }

    // 5. Player designations, nearest first.
    const claimable = this.jobs.filter((j) => !j.reserved);
    if (claimable.length) {
      claimable.sort((a, b) => pawn.distanceTo(a.cell.x, a.cell.z) - pawn.distanceTo(b.cell.x, b.cell.z));
      const job = claimable[0];
      job.reserved = pawn.id;
      pawn.job = job;
      return;
    }

    // 6. Standing work: pick ready farms first, then top up short supplies.
    const farm = this.buildings.find((b) => b.type === 'farm' && b.built && b.stock >= 1);
    if (farm) {
      pawn.job = { type: 'gather-farm', targetId: farm.id, cell: { x: farm.x, z: farm.z }, adjacent: true, progress: 0 };
      return;
    }

    const smelter = this.buildings.find((b) => b.type === 'smelter' && b.built);
    if (smelter && this.state.resources.stone >= 90 && this.state.resources.metal < 400) {
      pawn.job = { type: 'smelt', targetId: smelter.id, cell: { x: smelter.x, z: smelter.z }, adjacent: true, progress: 0 };
      return;
    }

    // Quarrying is the last resort, and only while stone is actually short -
    // otherwise idle colonists would pile up thousands of tonnes of it.
    const quarry = this.buildings.find((b) => b.type === 'quarry' && b.built);
    if (quarry && this.state.resources.stone < 500) {
      pawn.job = { type: 'quarry', targetId: quarry.id, cell: { x: quarry.x, z: quarry.z }, adjacent: true, progress: 0 };
      return;
    }
  }

  _nearestBuilding(pawn, type) {
    let best = null;
    for (const b of this.buildings) {
      if (b.type !== type || !b.built) continue;
      const d = pawn.distanceTo(b.x, b.z);
      if (!best || d < best.d) best = { b, d };
    }
    return best?.b ?? null;
  }

  _finishJob(pawn) {
    if (pawn.job && this.jobs.includes(pawn.job)) {
      this.jobs = this.jobs.filter((j) => j !== pawn.job);
    }
    pawn.job = null;
    pawn.activity = 'idle';
    this.emit();
  }

  _abandonJob(pawn, unreachable = false) {
    const job = pawn.job;
    if (job && this.jobs.includes(job)) {
      if (unreachable) this.jobs = this.jobs.filter((j) => j !== job);
      else job.reserved = null;
    }
    pawn.job = null;
    pawn.path.length = 0;
  }

  // --- raiders & combat ----------------------------------------------------

  _runRaider(raider, dt) {
    const targets = this.colonists;
    let target = null;
    let best = Infinity;
    for (const c of targets) {
      const d = raider.distanceTo(c.x, c.z);
      if (d < best) { best = d; target = c; }
    }

    if (!target) {
      const b = this.buildings.find((x) => x.built);
      if (!b) return;
      if (raider.distanceTo(b.x, b.z) > 1) {
        if (raider.path.length === 0) raider.moveTo(this.world, { x: b.x, z: b.z }, true);
        raider.stepAlongPath(this.world, dt);
      } else {
        raider.attackCooldown -= dt;
        if (raider.attackCooldown <= 0) { raider.attackCooldown = 2; b.hp -= 12; }
      }
      return;
    }

    if (best > 1) {
      raider._repathIn = (raider._repathIn ?? 0) - dt;
      if (raider.path.length === 0 || raider._repathIn <= 0) {
        raider._repathIn = 2;
        const goal = { x: target.x, z: target.z };
        // Walled in? Route through the walls and break whatever is in the way.
        if (!raider.moveTo(this.world, goal, true)) raider.moveTo(this.world, goal, true, true);
      }

      // If the next step is a solid building, attack it instead of walking.
      const next = raider.path[0];
      const blocker = next ? this.buildingAt(next[0], next[1]) : null;
      if (blocker && blocker.spec.blocks && blocker.built) {
        raider.attackCooldown -= dt;
        if (raider.attackCooldown <= 0) {
          raider.attackCooldown = 1.8;
          blocker.hp -= 14;
          if (blocker.hp <= 0) raider.path.length = 0;
        }
        return;
      }

      raider.stepAlongPath(this.world, dt);
      return;
    }

    raider.attackCooldown -= dt;
    if (raider.attackCooldown <= 0) {
      raider.attackCooldown = 1.6;
      target.hp -= 5;
      target.mood = Math.max(0, target.mood - 4);
      if (target.hp <= 0) {
        target.dead = true;
        this.log(`${target.name} was killed by raiders.`);
        this.emit();
      }
    }
  }

  _updateCombat(dt) {
    const hostiles = this.hostiles;
    if (hostiles.length === 0) {
      if (this.state.activeEvent?.kind === 'combat') {
        this.log('The last raider falls. The colony holds.');
        for (const c of this.colonists) c.mood = Math.min(100, c.mood + 8);
        this.state.activeEvent = null;
        this.emit();
      }
      return;
    }

    for (const b of this.buildings) {
      if (b.type !== 'turret' || !b.built) continue;
      b.timer -= dt;
      if (b.timer > 0) continue;
      b.timer = 1.1;

      let target = null;
      let best = 9;
      for (const h of hostiles) {
        const d = Math.hypot(h.x - b.x, h.z - b.z);
        if (d < best) { best = d; target = h; }
      }
      if (!target) continue;

      const head = b.mesh.getObjectByName('turretHead');
      if (head) head.rotation.y = Math.atan2(target.x - b.x, target.z - b.z);
      target.hp -= 11;
      if (target.hp <= 0) { target.dead = true; this.log('A turret cut a raider down.'); }
    }
  }

  // --- buildings -----------------------------------------------------------

  _updateBuildings(dt) {
    for (const b of this.buildings) {
      if (!b.built) continue;

      if (b.type === 'farm') {
        b.stock = Math.min(1, b.stock + dt / (DAY * 0.6));
        b.mesh.traverse((o) => { if (o.name === 'crop') o.scale.y = 0.2 + b.stock * 0.8; });
      }
      if (b.type === 'campfire') {
        const flame = b.mesh.getObjectByName('flame');
        if (flame) flame.scale.setScalar(0.85 + Math.sin(performance.now() * 0.006) * 0.15);
      }
      if (b.type === 'beacon') {
        const lamp = b.mesh.getObjectByName('lamp');
        if (lamp) lamp.rotation.y += dt * 0.6;
      }
      if (b.hp <= 0) {
        this.log(`${b.label} was destroyed.`);
        this.removeBuilding(b);
      }
    }
  }

  solidBuildingCells() {
    return this.buildings.filter((b) => b.spec.blocks && b.built).map((b) => `${b.x},${b.z}`);
  }

  buildingAt(x, z) {
    return this.buildings.find((b) => b.x === x && b.z === z) ?? null;
  }

  canAfford(type) {
    const cost = BUILDINGS[type].cost;
    return Object.entries(cost).every(([res, n]) => this.state.resources[res] >= n);
  }

  isUnlocked(type) {
    const tech = BUILDINGS[type].tech;
    return !tech || this.hasResearch(tech);
  }

  /** Place a blueprint and queue the build job. */
  placeBuilding(type, x, z) {
    if (!this.isUnlocked(type)) return { ok: false, why: 'Not researched yet.' };
    if (this.world.height(x, z) === null) return { ok: false, why: 'That is off the island.' };
    if (this.buildingAt(x, z)) return { ok: false, why: 'Something is already there.' };
    if (this.world.nodeAt(x, z)) return { ok: false, why: 'Clear the trees or rocks there first.' };
    if (!this.canAfford(type)) return { ok: false, why: 'Not enough materials.' };

    for (const [res, n] of Object.entries(BUILDINGS[type].cost)) this.state.resources[res] -= n;

    const b = new Building(type, x, z);
    b.place(this.world);
    this.buildings.push(b);
    this.buildingGroup.add(b.mesh);

    this.jobs.push({ type: 'build', targetId: b.id, cell: { x, z }, adjacent: true, progress: 0 });
    this.emit();
    return { ok: true, building: b };
  }

  removeBuilding(b) {
    this.buildings = this.buildings.filter((x) => x !== b);
    this.buildingGroup.remove(b.mesh);
    this.jobs = this.jobs.filter((j) => j.targetId !== b.id);
    for (const p of this.pawns) if (p.job?.targetId === b.id) { p.job = null; p.path.length = 0; }
    this.world.setBlocked(this.solidBuildingCells());
    this.emit();
  }

  /** Queue a harvest on a resource node. */
  designateHarvest(node) {
    if (!node || node.depleted) return false;
    if (this.jobs.some((j) => j.targetId === node.id)) return false;
    this.jobs.push({ type: 'harvest', targetId: node.id, cell: { x: node.x, z: node.z }, adjacent: true, progress: 0 });
    this.emit();
    return true;
  }

  cancelJobsAt(x, z) {
    const before = this.jobs.length;
    this.jobs = this.jobs.filter((j) => !(j.cell && j.cell.x === x && j.cell.z === z));
    for (const p of this.pawns) {
      if (p.job?.cell && p.job.cell.x === x && p.job.cell.z === z) { p.job = null; p.path.length = 0; }
    }
    if (this.jobs.length !== before) this.emit();
  }

  // --- resources & research ------------------------------------------------

  addResource(kind, amount) {
    this.state.resources[kind] = Math.max(0, (this.state.resources[kind] ?? 0) + amount);
    this.emit();
  }

  get harvestMultiplier() {
    let m = 1;
    if (this.hasResearch('toolmaking')) m *= 1.25;
    if (this.buildings.some((b) => b.type === 'workbench' && b.built)) m *= 1.15;
    return m;
  }

  hasResearch(id) { return this.state.research.done.includes(id); }

  canResearch(id) {
    if (this.hasResearch(id)) return false;
    return RESEARCH[id].needs.every((n) => this.hasResearch(n));
  }

  setResearch(id) {
    if (!this.canResearch(id)) return false;
    this.state.research.current = id;
    this.state.research.progress = 0;
    for (const p of this.colonists) if (p.job?.type === 'research') { p.job = null; }
    this.log(`Research set to ${RESEARCH[id].label}.`);
    this.emit();
    return true;
  }

  _updateResearch() {
    if (!this.state.research.current) return;
    if (!this.buildings.some((b) => b.type === 'lab' && b.built)) return;
  }

  _completeResearch() {
    const id = this.state.research.current;
    this.state.research.done.push(id);
    this.state.research.current = null;
    this.state.research.progress = 0;
    this.log(`Research complete: ${RESEARCH[id].label}.`);
    for (const p of this.colonists) if (p.job?.type === 'research') p.job = null;
    this.emit();
  }

  /** The three progression tracks shown in the HUD. */
  tracks() {
    const done = this.state.research.done;
    const tech = done.filter((id) => RESEARCH[id].track === 'tech').length * 14
      + new Set(this.buildings.filter((b) => b.built).map((b) => b.type)).size * 6;
    const academic = done.filter((id) => RESEARCH[id].track === 'academic').length * 20
      + this.colonists.reduce((n, p) => n + p.skills.labor + p.skills.science, 0) * 3;
    const colonists = this.colonists;
    const avgMood = colonists.length ? colonists.reduce((n, p) => n + p.mood, 0) / colonists.length : 0;
    const social = avgMood * 0.5 + colonists.length * 7
      + done.filter((id) => RESEARCH[id].track === 'social').length * 18;

    return {
      tech: Math.min(100, Math.round(tech)),
      academic: Math.min(100, Math.round(academic)),
      social: Math.min(100, Math.round(social))
    };
  }

  // --- events --------------------------------------------------------------

  _checkEventSchedule() {
    const warnDay = this.state.nextEventDay - 1;
    if (!this.state.warned && this.day >= warnDay) {
      this.state.warned = true;
      const event = this._eventForDay(this.state.nextEventDay);
      this.log(`WARNING - ${event.title} expected on day ${this.state.nextEventDay}. ${event.warn}`);
      this.emit();
    }

    const eventAt = (this.state.nextEventDay - 1) * DAY + DAY * 0.33;
    if (this.state.elapsed >= eventAt) {
      const event = this._eventForDay(this.state.nextEventDay);
      this._fireEvent(event);
      this.state.nextEventDay += EVENT_EVERY;
      this.state.warned = false;
    }
  }

  _eventForDay(day) {
    const week = Math.max(1, Math.round(day / EVENT_EVERY));
    return { ...EVENTS[(week - 1) % EVENTS.length], week };
  }

  _fireEvent(event) {
    this.state.activeEvent = event;
    this.log(`=== ${event.title} (week ${event.week}) ===`);

    if (event.kind === 'combat') {
      const count = Math.min(8, Math.ceil(event.week * 1.2));
      this._spawnRaiders(count);
      this.log(`${count} raiders are on the island.`);
    } else if (event.kind === 'storm') {
      for (const p of this.colonists) {
        p.hp = Math.max(6, p.hp - 14);
        p.needs.rest = Math.max(0, p.needs.rest - 30);
        p.mood = Math.max(0, p.mood - 12);
      }
      for (const b of this.buildings) b.hp -= 18;
      this.log('The storm tears through the colony. Everyone is battered.');
      this.state.activeEvent = null;
    } else if (event.kind === 'blight') {
      const lost = Math.round(this.state.resources.food * 0.4);
      this.state.resources.food -= lost;
      for (const b of this.buildings) if (b.type === 'farm') b.stock = 0;
      this.log(`Blight destroys ${lost} food and everything in the farm plots.`);
      this.state.activeEvent = null;
    } else if (event.kind === 'refugees') {
      const site = this.world.landingSite();
      const spot = this._freeCellNear(site.x, site.z, 3);
      const name = NAMES[Math.floor(rand(this.day * 13, 3) * NAMES.length)];
      this._addPawn(new Pawn({ name, x: spot.x, z: spot.z, tint: colonistTint(this.colonists.length) }));
      this.log(`${name} crawls out of the escape pod, alive.`);
      this.state.activeEvent = null;
    }
    this.emit();
  }

  _spawnRaiders(count) {
    const cells = [...this.world.surface.keys()]
      .map((k) => k.split(',').map(Number))
      .filter(([x, z]) => Math.hypot(x, z) > 11 && this.world.isWalkable(x, z));
    if (cells.length === 0) return;

    for (let i = 0; i < count; i++) {
      const [x, z] = cells[Math.floor(rand(this.day * 71 + i * 13, 11) * cells.length)];
      const raider = new Pawn({ name: 'Raider', faction: 'raider', x, z, hp: 42 + this.day * 1.2 });
      this._addPawn(raider);
    }
    this.emit();
  }

  _checkOutcome() {
    if (this.state.outcome) return;
    if (this.colonists.length === 0) {
      this.state.outcome = 'lost';
      this.log('The last colonist is gone. The isle is quiet again.');
      this.emit();
    }
  }

  _win() {
    this.state.outcome = 'won';
    this.log('The beacon lights up the void. Something out there answers. You made it.');
    this.emit();
  }

  // --- selection, ui plumbing ---------------------------------------------

  select(entity) {
    this.selection = entity;
    this.emit();
  }

  setSpeed(n) {
    this.state.speed = n;
    this.state.paused = n === 0;
    this.emit();
  }

  log(message) {
    this.state.log.unshift({ day: this.day, time: this.clockString(), message });
    if (this.state.log.length > 60) this.state.log.pop();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }

  // --- persistence ---------------------------------------------------------

  save() {
    try {
      const data = {
        v: 1,
        state: { ...this.state, activeEvent: this.state.activeEvent },
        pawns: this.pawns.filter((p) => p.alive).map((p) => p.toJSON()),
        buildings: this.buildings.map((b) => b.toJSON()),
        depleted: [...this.world.nodes.values()].filter((n) => n.depleted).map((n) => n.id),
        removed: this._removedNodeIds ?? []
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;      // private windows and full storage both land here
    }
  }

  static hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  static clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to do */ }
  }

  load() {
    let data;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      data = JSON.parse(raw);
    } catch { return false; }
    if (!data || data.v !== 1) return false;

    this.state = { ...this.state, ...data.state };

    for (const p of this.pawns) this.pawnGroup.remove(p.mesh);
    this.pawns = [];
    data.pawns.forEach((raw, i) => {
      const pawn = new Pawn({ ...raw, tint: colonistTint(i) });
      this._addPawn(pawn);
    });

    for (const b of this.buildings) this.buildingGroup.remove(b.mesh);
    this.buildings = [];
    for (const raw of data.buildings) {
      const b = new Building(raw.type, raw.x, raw.z, { id: raw.id, built: raw.built, work: raw.work });
      b.hp = raw.hp;
      b.stock = raw.stock ?? 0;
      b.place(this.world);
      this.buildings.push(b);
      this.buildingGroup.add(b.mesh);
      if (!b.built) this.jobs.push({ type: 'build', targetId: b.id, cell: { x: b.x, z: b.z }, adjacent: true, progress: 0 });
    }

    for (const id of data.depleted ?? []) {
      const node = this.world.nodes.get(id);
      if (node) this.world.depleteNode(node);
    }

    this.world.setBlocked(this.solidBuildingCells());
    this.log('Colony restored from your last session.');
    this.emit();
    return true;
  }
}
