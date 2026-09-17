import * as THREE from 'three';
import { BUILDINGS } from './defs.js';

/**
 * Mouse handling on top of the orbit camera: click to select, right-click to
 * designate work, and a ghost preview while placing a building.
 *
 * The orbit camera owns dragging, so a "click" here means a press and release
 * in roughly the same place.
 */
export class Input {
  constructor({ game, camera, controls, renderer, scene }) {
    this.game = game;
    this.camera = camera;
    this.controls = controls;
    this.dom = renderer.domElement;
    this.scene = scene;

    this.buildMode = null;
    this.hoverCell = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.ghost = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.12, 1),
      new THREE.MeshBasicMaterial({ color: 0x7ad7ff, transparent: true, opacity: 0.5 })
    );
    this.ghost.visible = false;
    scene.add(this.ghost);

    this._press = null;
    this._bind();
  }

  setBuildMode(type) {
    this.buildMode = type;
    this.ghost.visible = !!type;
    if (type) this.game.select(null);
  }

  focusOn(entity) {
    const pos = entity.pos ?? entity.mesh?.position;
    if (pos && this.controls.focus) this.controls.focus(pos);
  }

  _bind() {
    this.dom.addEventListener('pointerdown', (e) => {
      this._press = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button };
    });

    this.dom.addEventListener('pointerup', (e) => {
      const press = this._press;
      this._press = null;
      if (!press || press.button !== e.button) return;

      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      const held = performance.now() - press.t;
      if (moved > 6 || held > 500) return;     // that was a camera drag

      if (e.button === 0) this._leftClick(e);
      if (e.button === 2) this._rightClick(e);
    });

    this.dom.addEventListener('pointermove', (e) => {
      if (!this.buildMode) return;
      const cell = this._cellUnder(e);
      this.hoverCell = cell;
      if (!cell) { this.ghost.visible = false; return; }

      const y = this.game.world.standY(cell.x, cell.z) ?? 0;
      this.ghost.position.set(cell.x, y + 0.06, cell.z);
      this.ghost.visible = true;
      const ok = this._canPlaceHere(cell);
      this.ghost.material.color.setHex(ok ? 0x7ad7ff : 0xff6b7d);
    });
  }

  _canPlaceHere(cell) {
    const g = this.game;
    if (!this.buildMode) return false;
    if (g.world.height(cell.x, cell.z) === null) return false;
    if (g.buildingAt(cell.x, cell.z)) return false;
    if (g.world.nodeAt(cell.x, cell.z)) return false;
    return g.canAfford(this.buildMode);
  }

  _updatePointer(event) {
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  /** The grid cell under the cursor, from wherever the ray hits the island. */
  _cellUnder(event) {
    this._updatePointer(event);
    const hits = this.raycaster.intersectObject(this.scene, true);
    for (const hit of hits) {
      if (hit.object === this.ghost) continue;
      const p = hit.point;
      const x = Math.round(p.x);
      const z = Math.round(p.z);
      if (this.game.world.height(x, z) !== null) return { x, z };
    }
    return null;
  }

  /** The topmost pawn, building or node under the cursor. */
  _entityUnder(event) {
    this._updatePointer(event);
    const hits = this.raycaster.intersectObject(this.scene, true);

    for (const hit of hits) {
      if (hit.object === this.ghost) continue;
      let obj = hit.object;
      while (obj) {
        if (obj.userData.pawnId) {
          const pawn = this.game.pawns.find((p) => p.id === obj.userData.pawnId);
          if (pawn?.alive) return { kind: 'pawn', entity: pawn };
        }
        if (obj.userData.buildingId) {
          const b = this.game.buildings.find((x) => x.id === obj.userData.buildingId);
          if (b) return { kind: 'building', entity: b };
        }
        if (obj.userData.nodeId) {
          const node = this.game.world.nodes.get(obj.userData.nodeId);
          if (node && !node.depleted) return { kind: 'node', entity: node };
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  _leftClick(event) {
    if (this.buildMode) {
      const cell = this._cellUnder(event);
      if (!cell) return;
      const result = this.game.placeBuilding(this.buildMode, cell.x, cell.z);
      if (!result.ok) {
        this.game.log(result.why);
        this.game.emit();
        return;
      }
      // Shift keeps the build tool active for placing a row of walls.
      if (!event.shiftKey) this.setBuildMode(null);
      return;
    }

    const found = this._entityUnder(event);
    this.game.select(found ? found.entity : null);
  }

  _rightClick(event) {
    if (this.buildMode) { this.setBuildMode(null); return; }

    const found = this._entityUnder(event);
    if (!found) return;

    if (found.kind === 'node') {
      const queued = this.game.designateHarvest(found.entity);
      if (queued) this.game.log(`Queued: gather ${found.entity.type}.`);
      this.game.emit();
      return;
    }

    if (found.kind === 'building') {
      this.game.cancelJobsAt(found.entity.x, found.entity.z);
      if (!found.entity.built) {
        for (const [res, n] of Object.entries(BUILDINGS[found.entity.type].cost)) {
          this.game.addResource(res, Math.floor(n * 0.75));
        }
        this.game.removeBuilding(found.entity);
        this.game.log('Blueprint cancelled, most materials recovered.');
      }
    }
  }

  /** Called each frame so the selection ring tracks what is selected. */
  update() {
    const sel = this.game.selection;
    const ring = this.game.ring;
    if (!sel) { ring.visible = false; return; }

    const pos = sel.pos ?? sel.mesh?.position;
    if (!pos) { ring.visible = false; return; }
    ring.position.set(pos.x, pos.y + 0.08, pos.z);
    ring.visible = true;
  }
}
