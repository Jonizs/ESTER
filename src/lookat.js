import { itemIcon } from './icons.js';
import { PROP_KINDS } from './props.js';

/**
 * What the cursor is over, named at the top of the screen.
 *
 * The same idea as the WTHIT mod: a small bar that says what is under the
 * pointer and anything worth knowing about it right now - how full the water
 * catcher is, how far along a crop has got. It is the one HUD piece that
 * *tells* the player something, which the no-toasts rule allows: it is a
 * readout of what is under the cursor, not a notice that appears and goes.
 *
 * What it names is decided by the caller. This module only draws.
 */
export function createLookAt() {
  const root = document.getElementById('lookat');
  const iconEl = root.querySelector('.lookat-icon');
  const nameEl = root.querySelector('.lookat-name');
  const noteEl = root.querySelector('.lookat-note');
  const barEl = root.querySelector('.lookat-bar');
  const fillEl = barEl.querySelector('i');

  // Redrawn only when what it says changes: this runs off the hover, which
  // fires on every pointer move, and rewriting the SVG each time would throw
  // the icon away several times a second for no reason.
  let key = null;

  /**
   * Show something, or nothing at all.
   *
   * `{ name, item, note, bar: { value, max, colour } }` - `item` is the
   * picture to draw beside the name, `note` a line under it, and `bar` a
   * meter for anything that fills up.
   */
  function show(what) {
    if (!what) {
      if (key !== null) { key = null; root.hidden = true; }
      return;
    }

    const { name, item = null, note = '', bar = null } = what;
    const next = `${name}|${item}|${note}|${bar ? `${Math.round(bar.value)}/${bar.max}|${bar.colour ?? ''}` : ''}`;
    if (next === key) return;
    key = next;

    root.hidden = false;
    iconEl.innerHTML = item ? itemIcon(item, 30) : '';
    iconEl.hidden = !item;
    nameEl.textContent = name;
    noteEl.textContent = note;
    noteEl.hidden = !note;

    barEl.hidden = !bar;
    if (bar) {
      const f = Math.max(0, Math.min(1, bar.value / bar.max));
      fillEl.style.width = `${f * 100}%`;
      if (bar.colour) fillEl.style.background = bar.colour;
    }
  }

  return { show, hide: () => show(null) };
}

/** A prop's name as the player should read it, capitals and all. */
export function propName(prop) {
  const kind = PROP_KINDS[prop.kind];
  const label = kind?.title ?? kind?.label ?? prop.kind;
  // A station that has still to be repaired is wreckage, and says so.
  const broken = kind?.cost && !prop.repaired;
  return (broken ? `Broken ${label}` : label).replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
