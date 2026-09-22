/**
 * Settings the pause menu edits: how fast the camera turns, and which key
 * does what.
 *
 * Nothing here is written to disk - the game keeps no state between launches,
 * so these last as long as the window does.
 */

// The order is the order the keybind list shows them in.
export const ACTIONS = [
  // One action each, whichever mode the camera is in: they orbit the isle
  // normally and fly the free camera when it is on.
  { id: 'orbitLeft', label: 'Orbit / move left', key: 'ArrowLeft' },
  { id: 'orbitRight', label: 'Orbit / move right', key: 'ArrowRight' },
  { id: 'orbitUp', label: 'Orbit up / move forward', key: 'ArrowUp' },
  { id: 'orbitDown', label: 'Orbit down / move back', key: 'ArrowDown' },
  { id: 'zoomIn', label: 'Zoom in', key: '+' },
  { id: 'zoomOut', label: 'Zoom out', key: '-' },
  { id: 'resetView', label: 'Reset view', key: 'r' },
  { id: 'freeCamera', label: 'Toggle free camera', key: 'f' },
  { id: 'moveStation', label: 'Move station', key: 'a' },
  { id: 'wieldTool', label: 'Wield a tool', key: 's' },
  { id: 'toggleCutaway', label: 'See-through camera', key: 'g' },
  // One slot per agent, in the order the overview lists them. There is only
  // one agent so far; the rest are here so a second one needs no new wiring.
  { id: 'selectAgent1', label: 'Select agent 1', key: '1' },
  { id: 'selectAgent2', label: 'Select agent 2', key: '2' },
  { id: 'selectAgent3', label: 'Select agent 3', key: '3' },
  { id: 'selectAgent4', label: 'Select agent 4', key: '4' },
  { id: 'selectAgent5', label: 'Select agent 5', key: '5' },
  { id: 'panelOverview', label: 'Overview', key: 'Tab' },
  { id: 'panelInventory', label: 'Inventory', key: 'q' },
  { id: 'panelQuests', label: 'Quest book', key: 'w' },
  { id: 'panelStages', label: 'Stages', key: 'e' }
];

export const CAMERA_SPEED = { min: 0.25, max: 3, step: 0.05, default: 1 };

export function createSettings() {
  const bindings = {};
  for (const action of ACTIONS) bindings[action.id] = action.key;

  return {
    cameraSpeed: CAMERA_SPEED.default,
    bindings,

    /** The action a pressed key is bound to, or null. Letters ignore case. */
    actionFor(key) {
      const pressed = key.length === 1 ? key.toLowerCase() : key;
      for (const [id, bound] of Object.entries(bindings)) {
        const b = bound.length === 1 ? bound.toLowerCase() : bound;
        if (b === pressed) return id;
      }
      return null;
    },

    /** Bind a key, clearing it off whatever else was holding it. */
    bind(id, key) {
      for (const other of Object.keys(bindings)) {
        if (other !== id && bindings[other] === key) bindings[other] = null;
      }
      bindings[id] = key;
    },

    reset() {
      for (const action of ACTIONS) bindings[action.id] = action.key;
      this.cameraSpeed = CAMERA_SPEED.default;
    }
  };
}

/** How a key reads in the UI. */
export function keyLabel(key) {
  if (!key) return '—';
  const names = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    ' ': 'Space', Escape: 'Esc', Control: 'Ctrl'
  };
  if (names[key]) return names[key];
  return key.length === 1 ? key.toUpperCase() : key;
}
