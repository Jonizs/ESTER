/**
 * The cosmic dust drifting behind every UI surface.
 *
 * The star layer used to be one repeating CSS tile creeping diagonally, which
 * meant every star moved as one and none of them ever changed. It is now a
 * field of individual motes: each one rises slowly, and fades in and out on a
 * cycle of its own, so no two are ever doing the same thing at the same time.
 *
 * Both are pure CSS animations once they are placed - nothing here runs per
 * frame, so an open panel costs the render loop nothing. Positions come from
 * `Math.random()` on purpose: this is dressing, not world generation, and the
 * determinism rule in CLAUDE.md is about the isle.
 */

const COUNT = 46;

// Seconds. The rise is slow enough to read as drift rather than motion, and
// the fade is slower still than a glance at the panel.
const RISE = { min: 44, max: 108 };
const FADE = { min: 7, max: 19 };

const rand = (min, max) => min + Math.random() * (max - min);

/** One mote, already positioned and given its own timings. */
function buildStar() {
  const star = document.createElement('span');
  star.className = 'star';

  const size = rand(1, 2.4);
  star.style.width = `${size.toFixed(2)}px`;
  star.style.height = `${size.toFixed(2)}px`;
  star.style.left = `${rand(0, 100).toFixed(2)}%`;

  const rise = rand(RISE.min, RISE.max);
  const fade = rand(FADE.min, FADE.max);
  star.style.setProperty('--rise', `${rise.toFixed(1)}s`);
  star.style.setProperty('--fade', `${fade.toFixed(1)}s`);
  // Negative delays start each mote part-way through its own cycle, so the
  // field is already scattered and mid-fade the moment a panel opens rather
  // than every star setting off together from the bottom.
  star.style.setProperty('--rise-delay', `${-rand(0, rise).toFixed(1)}s`);
  star.style.setProperty('--fade-delay', `${-rand(0, fade).toFixed(1)}s`);
  star.style.setProperty('--lit', rand(0.35, 0.85).toFixed(2));

  return star;
}

/** Fill one `.starfield` surface, once. */
function fill(surface) {
  if (surface.querySelector(':scope > .stars')) return;

  const layer = document.createElement('div');
  layer.className = 'stars';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < COUNT; i++) layer.append(buildStar());

  // First child, so it sits under everything the surface holds - the panes
  // give their own contents `z-index: 1` for exactly this reason.
  surface.prepend(layer);
}

/** Every `.starfield` surface in the document: the panels, crafting, the menu. */
export function createStarfields(root = document) {
  for (const surface of root.querySelectorAll('.starfield')) fill(surface);
}
