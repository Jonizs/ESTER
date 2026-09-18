/**
 * Settings the pause menu edits: how fast the camera turns, and which key
 * does what.
 *
 * Nothing here is written to disk - the game keeps no state between launches,
 * so these last as long as the window does.
 */

// The order is the order the keybind list shows them in.
export const ACTIONS = [
  { id: 'orbitLeft', label: 'Orbit left', key: 'ArrowLeft' },
  { id: 'orbitRight', label: 'Orbit right', key: 'ArrowRight' },
  { id: 'orbitUp', label: 'Orbit up', key: 'ArrowUp' },
  { id: 'orbitDown', label: 'Orbit down', key: 'ArrowDown' },
  { id: 'zoomIn', label: 'Zoom in', key: '+' },
  { id: 'zoomOut', label: 'Zoom out', key: '-' },
  { id: 'resetView', label: 'Reset view', key: 'r' },
  { id: 'autoSpin', label: 'Toggle auto-spin', key: 'f' }
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
