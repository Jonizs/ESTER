/**
 * The line-art glyphs the UI draws, on a 24x24 grid and stroked in the current
 * colour so each one picks up whatever state its tab, tile or button is in.
 *
 * They live here rather than in one screen's module because the panels and the
 * crafting screen both draw from the same set.
 */
export const ICONS = {
  overview: '<path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z"/>',
  crafting: '<path d="M3 15l7-7M8 6l4-3 5 5-3 4zM9.5 12.5l3 3-5 5-3-3z"/>',
  // A crate, seen straight on: lid line across the top, a band down the
  // middle, which reads at both tab and empty-page size.
  inventory: '<path d="M4 8h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1zM3 4.5h18V8H3zM10 12h4"/>',
  quests: '<path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2zM5 16h13M9 8h6"/>',
  stages: '<path d="M6 21V4M6 4h11l-2.5 3.5L17 11H6"/>',
  // Three logs stacked end-on, which reads better at tile size than one log.
  wood: '<circle cx="8.2" cy="15.4" r="3.6"/><circle cx="15.8" cy="15.4" r="3.6"/><circle cx="12" cy="8.4" r="3.6"/>',
  stone: '<path d="M4 14l4-7 5-2 6 6-2 7H6z"/><path d="M8 7l2.8 5.2 5.4-1.2M10.8 12.2L9.3 18"/>',
  agent: '<path d="M12 4a3.2 3.2 0 110 6.4A3.2 3.2 0 0112 4zM5 20a7 7 0 0114 0"/>'
};

/** An `<svg>` holding one of the glyphs above. */
export function icon(name, size = 20) {
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ''}</svg>`;
}
