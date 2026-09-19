/**
 * The line-art glyphs the UI draws, on a 24x24 grid and stroked in the
 * current colour so each one picks up whatever state its tab, tile or button
 * is in.
 *
 * They live here rather than in one screen's module because the panels and
 * the crafting screen both draw from the same set.
 *
 * The materials are drawn as little emblems of the thing itself - stacked
 * logs, a quarried block, a sheaf - the way a board game marks its
 * resources, rather than as abstract marks. They are still one weight of
 * line on one grid, so they sit together on a row of tiles.
 */
export const ICONS = {
  // --- the screens --------------------------------------------------------
  overview: '<path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z"/>',
  crafting: '<path d="M3 15l7-7M8 6l4-3 5 5-3 4zM9.5 12.5l3 3-5 5-3-3z"/>',
  quests: '<path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2zM5 16h13M9 8h6"/>',
  stages: '<path d="M6 21V4M6 4h11l-2.5 3.5L17 11H6"/>',
  // A crate, seen straight on: lid line across the top, a band down the
  // middle, which reads at both tab and empty-page size.
  inventory: '<path d="M4 8h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1zM3 4.5h18V8H3zM10 12h4"/>',
  agent: '<path d="M12 4a3.2 3.2 0 110 6.4A3.2 3.2 0 0112 4zM5 20a7 7 0 0114 0"/>',

  // --- the materials on the isle -----------------------------------------
  // A cut log stood on its end, growth rings turned to the viewer.
  //
  // Logs drawn lying down - end-on circles, a side view, a crossed pair -
  // were all tried and all read as something else at tile size: a row of
  // buttons, a battery, a bowtie. The rings are what carry it: nothing else
  // in the set is a set of nested ellipses, so it is timber at a glance and
  // at any size.
  wood: '<ellipse cx="12" cy="8.6" rx="7.3" ry="3.5"/>'
      + '<ellipse cx="12" cy="8.6" rx="4" ry="1.9"/>'
      + '<ellipse cx="12" cy="8.6" rx="1.3" ry="0.6"/>'
      + '<path d="M4.7 8.6v5.3a7.3 3.5 0 0014.6 0V8.6"/>'
      + '<path d="M8.3 12.6v3.9M15.7 12.6v3.9"/>',

  // A broken boulder with a chip knocked off it. An outline with one crease
  // reads as an empty bag, so the face is split by a crease running the
  // width of it and two spurs down from it, and the chip in front says
  // stone-the-material rather than one rock.
  stone: '<path d="M8.6 18.6l-1.4-5 3.2-4.1 5.3-.6 4.1 4.2-1.2 5.5z"/>'
       + '<path d="M7.2 13.6l3.6 1.3 4.7-2.2 4.2 1.8"/>'
       + '<path d="M10.8 14.9l-.4 3.7M15.5 12.7l1.3 5.9"/>'
       + '<path d="M12.6 16.8h1.6"/>'
       + '<path d="M2.4 18.6l.5-3 2.6-1.1 1.9 2.2-.4 1.9z"/>',

  // A shoot with two leaves, well under the tree's own bulk so the two never
  // read as the same thing at tile size.
  sapling: '<path d="M12 20v-9"/>'
         + '<path d="M12 14c-3 0-4.8-1.9-4.8-4.6C10.2 9.4 12 11.3 12 14z"/>'
         + '<path d="M12 12.5c0-3 1.9-5.2 4.8-5.2C16.8 10.3 15 12.5 12 12.5z"/>'
         + '<path d="M7.5 20h9"/>',

  // --- materials with nothing dropping them yet ---------------------------
  // Drawn now so that adding the item is all there is to it later. Nothing
  // in the game hands these out; `ITEMS` in inventory.js is what decides
  // what actually exists.
  plank: '<path d="M3 7h18v4.5H3zM3 12.5h18V17H3z"/><path d="M7 9.2h6M10 14.7h6"/>',
  grain: '<path d="M12 21v-6.2"/>'
       + '<path d="M12 8.6C9.8 8.2 8.5 6.5 8.7 4.3c2.2.5 3.3 2.2 3.3 4.3z"/>'
       + '<path d="M12 8.6c2.2-.4 3.5-2.1 3.3-4.3-2.2.5-3.3 2.2-3.3 4.3z"/>'
       + '<path d="M12 11.9c-2.2-.4-3.5-2.1-3.3-4.3 2.2.5 3.3 2.2 3.3 4.3z"/>'
       + '<path d="M12 11.9c2.2-.4 3.5-2.1 3.3-4.3-2.2.5-3.3 2.2-3.3 4.3z"/>'
       + '<path d="M12 15.2c-2.2-.4-3.5-2.1-3.3-4.3 2.2.5 3.3 2.2 3.3 4.3z"/>'
       + '<path d="M12 15.2c2.2-.4 3.5-2.1 3.3-4.3-2.2.5-3.3 2.2-3.3 4.3z"/>',
  fibre: '<path d="M6.8 16.2a3.3 3.3 0 01.3-6.4 4.1 4.1 0 017.5-2.1 3.5 3.5 0 014.9 3.2 3.5 3.5 0 01-2.2 3.2z"/>'
       + '<path d="M9.4 12.4c1-.9 2.2-1 3.2-.2M14.4 12.6c.9-1 2-1.2 3.1-.5"/>',
  clay: '<path d="M3.5 13h17v5.5h-17zM6 7.5h12.5V13H6z"/><path d="M9.6 13v5.5M15 13v5.5M12 7.5V13"/>',
  ore: '<path d="M4 15.2l3.1-6.4 5.1-2 6 5-1.4 6.4H5.5z"/>'
     + '<path d="M11.9 9.4l2 3.3-2 2.9-2-2.9z"/>',
  metal: '<path d="M5 13.5h14l2 4.5H3zM7.5 8.5h9l1.6 5h-12.2z"/>',
  coal: '<path d="M3.8 16.8l2-4.4 4.3-1.2 2.7 3.3-1 4.4H5.4z"/>'
      + '<path d="M13 12.4l2.4-3.1 3.7 1.4.4 4.1-3.3 1.7z"/>',
  crystal: '<path d="M12 3l6 5.6-6 12.4-6-12.4z"/><path d="M6 8.6h12M12 3v18"/>',

  // What a material without a glyph of its own falls back to: a crate,
  // rather than an empty square.
  material: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'
};

/** An `<svg>` holding one of the glyphs above. */
export function icon(name, size = 20) {
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ''}</svg>`;
}

/**
 * The glyph for an item.
 *
 * Unlike `icon`, this never comes back empty: a material with no glyph of
 * its own gets the crate. A tile with nothing drawn on it reads as a bug,
 * and an item is the one thing here that can arrive without the icon set
 * having been touched.
 */
export function itemIcon(item, size = 20) {
  return icon(ICONS[item] ? item : 'material', size);
}
