import { ACTIONS, CAMERA_SPEED, keyLabel } from './settings.js';

/**
 * The pause menu, opened with Esc.
 *
 * Two pages: the menu itself, and the keybind list behind the KEYBINDS
 * button. Esc closes the menu, backs out of the keybind page, and cancels a
 * key that is waiting to be bound - so it is never a way to get stuck.
 */
export function createMenu({ settings, controls, onLeave, onDevReset, onSwarm, onChange }) {
  const root = document.getElementById('menu');
  const pages = {
    main: root.querySelector('[data-page="main"]'),
    keybinds: root.querySelector('[data-page="keybinds"]')
  };

  const speedInput = root.querySelector('#camera-speed');
  const speedValue = root.querySelector('#camera-speed-value');
  const bindList = root.querySelector('#keybind-list');

  let page = 'main';
  let listening = null;              // the action waiting for a key

  speedInput.min = CAMERA_SPEED.min;
  speedInput.max = CAMERA_SPEED.max;
  speedInput.step = CAMERA_SPEED.step;
  speedInput.value = settings.cameraSpeed;

  function showSpeed() {
    speedValue.textContent = `${Number(settings.cameraSpeed).toFixed(2)}x`;
    speedInput.value = settings.cameraSpeed;
  }

  speedInput.addEventListener('input', () => {
    settings.cameraSpeed = Number(speedInput.value);
    controls.setCameraSpeed(settings.cameraSpeed);
    showSpeed();
  });

  // --- keybind rows, built from the action list ---------------------------
  const rows = new Map();
  for (const action of ACTIONS) {
    const row = document.createElement('div');
    row.className = 'keybind';

    const name = document.createElement('span');
    name.textContent = action.label;

    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'key';
    key.addEventListener('click', () => listenFor(action.id));

    row.append(name, key);
    bindList.append(row);
    rows.set(action.id, key);
  }

  function showBindings() {
    for (const [id, button] of rows) {
      button.textContent = listening === id ? 'press a key' : keyLabel(settings.bindings[id]);
      button.classList.toggle('listening', listening === id);
    }
  }

  function listenFor(id) {
    listening = id;
    showBindings();
  }

  // --- pages --------------------------------------------------------------
  function show(next) {
    page = next;
    listening = null;
    for (const [name, element] of Object.entries(pages)) element.hidden = name !== page;
    showBindings();
    showSpeed();
  }

  function open() {
    root.hidden = false;
    show('main');
  }

  function close() {
    root.hidden = true;
    listening = null;
    onChange?.();
  }

  const isOpen = () => !root.hidden;

  root.querySelector('#menu-keybinds').addEventListener('click', () => show('keybinds'));
  root.querySelector('#menu-back').addEventListener('click', () => show('main'));
  root.querySelector('#menu-resume').addEventListener('click', close);
  root.querySelector('#menu-defaults').addEventListener('click', () => {
    settings.reset();
    controls.setCameraSpeed(settings.cameraSpeed);
    show(page);
  });
  // DEV RESET puts the run back to 0; the menu closes itself on the way, so
  // the isle is visible again the moment it happens.
  root.querySelector('#menu-devreset').addEventListener('click', () => onDevReset?.());
  // AGENT SWARM: two more agents on the isle for half a minute, and then
  // they are gone again. Like DEV RESET it closes the menu on the way, so
  // they can be seen arriving.
  root.querySelector('#menu-swarm').addEventListener('click', () => onSwarm?.());
  root.querySelector('#menu-leave').addEventListener('click', () => onLeave?.());

  // --- keyboard -----------------------------------------------------------
  // Capture phase, so a key being bound never reaches the camera as well.
  window.addEventListener('keydown', (event) => {
    if (listening) {
      event.preventDefault();
      if (event.key !== 'Escape') settings.bind(listening, event.key);
      listening = null;
      showBindings();
      return;
    }

    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (!isOpen()) open();
    else if (page === 'keybinds') show('main');
    else close();
  }, true);

  close();
  return { open, close, isOpen };
}
