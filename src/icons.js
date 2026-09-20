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

/**
 * The materials, painted rather than drawn.
 *
 * The tabs and the empty-page marks above are line art stroked in
 * `currentColor`, which is right for a *mark*; a material is a thing, and a
 * hollow outline of one reads as a sticker with the middle missing. These
 * carry their own colours and their own shading - a lit face, a shaded face,
 * a dark edge - so a log looks like wood and a rock looks like rock at the
 * size the tiles draw them. Same 24x24 grid, so they sit with the rest.
 *
 * They are the reason `itemIcon` exists rather than `icon` being used for
 * everything: the wrapper for these must not force `fill: none` and
 * `stroke: currentColor` over the top.
 */
export const MATERIAL_ART = {
  // A felled log, cut face turned to the viewer, with a snapped branch
  // sticking out of the top.
  wood:
      // the branch, behind the log so the log's edge cuts across its base
      '<path d="M10.6 8.4c-.6-2-.2-3.6 1-4.7l2.5 1.3c-.9.8-1.1 2-.7 3.4z"'
    + ' fill="#7a4d26" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<ellipse cx="12.8" cy="3.9" rx="1.6" ry="0.95" fill="#c99359" stroke="#2c1a0e" stroke-width="1.2"/>'
      // the log itself
    + '<path d="M6.2 7.5h10.8a4.5 4.5 0 010 9H6.2z"'
    + ' fill="#a86f3d" stroke="#2c1a0e" stroke-width="1.4" stroke-linejoin="round"/>'
      // the lit strip along the top of the barrel
    + '<path d="M8.4 9.1h8.2a3.4 3.4 0 012.5 1.5H8.4z" fill="#bd8349"/>'
      // bark, running the length of it
    + '<path d="M9.4 12.4c1.8-.5 3.6-.4 5.4.2M9 14.7c2.2-.6 4.3-.5 6.5.3M16.5 12.9c.9.1 1.7.4 2.4.8"'
    + ' fill="none" stroke="#6d4322" stroke-width="1.05" stroke-linecap="round"/>'
      // the sawn end, drawn last so it sits over the barrel
    + '<ellipse cx="6.2" cy="12" rx="3" ry="4.5" fill="#d7a068" stroke="#2c1a0e" stroke-width="1.4"/>'
    + '<ellipse cx="6.2" cy="12" rx="1.75" ry="2.7" fill="none" stroke="#a56c39" stroke-width="1.1"/>'
    + '<ellipse cx="6.2" cy="12" rx="0.65" ry="1.15" fill="#a56c39"/>',

  // A boulder broken into three flat faces: the top catches the light, the
  // right falls away from it, the front sits between the two. Cool greys, so
  // it belongs to the same sky as the rest of the UI.
  stone:
      '<path d="M3.6 18.6L5.5 12.3 9.7 7.4 15.5 6.2 19.9 11.1 20.4 18.6z" fill="#b9c4d9"/>'
    + '<path d="M5.5 12.3L9.7 7.4 15.5 6.2 13 11.6z" fill="#e1e8f6"/>'
    + '<path d="M15.5 6.2L19.9 11.1 20.4 18.6 14.2 18.6 13 11.6z" fill="#95a3c0"/>'
    + '<path d="M3.6 18.6L5.5 12.3 9.7 7.4 15.5 6.2 19.9 11.1 20.4 18.6z"'
    + ' fill="none" stroke="#28304a" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M5.5 12.3L13 11.6 15.5 6.2M13 11.6L14.2 18.6"'
    + ' fill="none" stroke="#28304a" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/>',

  // A shoot in a mound of soil. The mound goes on last so the stem runs down
  // behind it rather than sitting on top of it.
  sapling:
      '<path d="M12 19.6V9.4" fill="none" stroke="#3f7a41" stroke-width="1.9" stroke-linecap="round"/>'
    + '<path d="M11.6 13.6c-3.3.2-5.3-1.7-5.5-4.6 3.1-.4 5.3 1.5 5.5 4.6z"'
    + ' fill="#57a55e" stroke="#1f3f22" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M12.4 11.7c.2-3.3 2.3-5.2 5.5-5-.2 3.1-2.4 5-5.5 5z"'
    + ' fill="#74c47c" stroke="#1f3f22" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M5.7 19.9a6.3 6.3 0 0112.6 0z" fill="#7a5331" stroke="#2a1a0f" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M8.4 18.4c1-.7 2.1-1 3.3-1" fill="none" stroke="#9a6d43" stroke-width="1.05" stroke-linecap="round"/>',

  // Three of them in a pile, faceted and lit the same way the boulder is -
  // they are the same rock, so they are the same greys. What tells them
  // apart at tile size is the count and the arrangement, not the colour: one
  // big shape is stone, three small ones are pebbles. Drawn back to front,
  // small one first, so the pile reads as a pile rather than as three
  // shapes side by side.
  pebble:
      // the small one, resting on top
      '<path d="M9.9 10.2L10.6 6.6 13.4 4.9 16.4 6.2 16.8 9.2 13.6 11z" fill="#b9c4d9"/>'
    + '<path d="M10.6 6.6L13.4 4.9 16.4 6.2 13.3 7.9z" fill="#e1e8f6"/>'
    + '<path d="M16.4 6.2L16.8 9.2 13.6 11 13.3 7.9z" fill="#95a3c0"/>'
    + '<path d="M9.9 10.2L10.6 6.6 13.4 4.9 16.4 6.2 16.8 9.2 13.6 11z"'
    + ' fill="none" stroke="#28304a" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M10.6 6.6L13.3 7.9 16.4 6.2M13.3 7.9L13.6 11"'
    + ' fill="none" stroke="#28304a" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>'
      // the middle one, to the right
    + '<path d="M13.6 18.2L14.4 14.8 17.2 13.2 20.2 14.6 20.6 17.6 17.4 19.7z" fill="#b9c4d9"/>'
    + '<path d="M14.4 14.8L17.2 13.2 20.2 14.6 17 16.1z" fill="#e1e8f6"/>'
    + '<path d="M20.2 14.6L20.6 17.6 17.4 19.7 17 16.1z" fill="#95a3c0"/>'
    + '<path d="M13.6 18.2L14.4 14.8 17.2 13.2 20.2 14.6 20.6 17.6 17.4 19.7z"'
    + ' fill="none" stroke="#28304a" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M14.4 14.8L17 16.1 20.2 14.6M17 16.1L17.4 19.7"'
    + ' fill="none" stroke="#28304a" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>'
      // the big one, in front of both
    + '<path d="M3.4 17.9L4.6 12.9 8.4 10.4 12.4 12.2 13.3 16.6 9 19.6z" fill="#b9c4d9"/>'
    + '<path d="M4.6 12.9L8.4 10.4 12.4 12.2 8.3 14.6z" fill="#e1e8f6"/>'
    + '<path d="M12.4 12.2L13.3 16.6 9 19.6 8.3 14.6z" fill="#95a3c0"/>'
    + '<path d="M3.4 17.9L4.6 12.9 8.4 10.4 12.4 12.2 13.3 16.6 9 19.6z"'
    + ' fill="none" stroke="#28304a" stroke-width="1.35" stroke-linejoin="round"/>'
    + '<path d="M4.6 12.9L8.3 14.6 12.4 12.2M8.3 14.6L9 19.6"'
    + ' fill="none" stroke="#28304a" stroke-width="1.15" stroke-linejoin="round" stroke-linecap="round"/>',

  // Gravel: the same rock again, broken smaller. Six chips in a low heap -
  // what separates it from pebbles at tile size is that it is a *heap*,
  // spread wide and flat, rather than three shapes you can count.
  gravel:
      '<path d="M2.6 17.4l1.7-2.6 3 .5.4 2.6z" fill="#b9c4d9" stroke="#28304a" stroke-width="1.05" stroke-linejoin="round"/>'
    + '<path d="M8.2 15.1l2.3-2.2 2.7 1.1-.6 2.5z" fill="#cdd6e8" stroke="#28304a" stroke-width="1.05" stroke-linejoin="round"/>'
    + '<path d="M14.1 16.3l1.9-2.4 3.1.9-.5 2.5z" fill="#a7b3cc" stroke="#28304a" stroke-width="1.05" stroke-linejoin="round"/>'
    + '<path d="M5.1 20.6l2-2.1 2.9.6-.3 2.2z" fill="#95a3c0" stroke="#28304a" stroke-width="1.05" stroke-linejoin="round"/>'
    + '<path d="M11.2 20.9l1.8-2.2 3 .7-.4 2.2z" fill="#b9c4d9" stroke="#28304a" stroke-width="1.05" stroke-linejoin="round"/>'
    + '<path d="M9.4 9.6l1.9-2.3 2.6 1-.5 2.4z" fill="#e1e8f6" stroke="#28304a" stroke-width="1.05" stroke-linejoin="round"/>',

  // Flint: one knapped stone, darker and colder than the rest of the rock,
  // with a struck edge down the right and a conchoidal flake scar on the
  // face. The point at the bottom is what says "this is the sharp one".
  flint:
      '<path d="M7.3 3.9l7.9 2.1 4.1 7.2-6.5 7.6-7.7-4.2-1.5-8.2z" fill="#5a6478"/>'
    + '<path d="M7.3 3.9l7.9 2.1 1.1 5.6-6.9-1.3z" fill="#8794ad"/>'
    + '<path d="M15.2 6l4.1 7.2-6.5 7.6-3.4-9.5z" fill="#3c4457"/>'
    + '<path d="M7.3 3.9l7.9 2.1 4.1 7.2-6.5 7.6-7.7-4.2-1.5-8.2z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M7.3 3.9l2.1 6 6.9 1.3M9.4 9.9l3.4 9.5"'
    + ' fill="none" stroke="#151a27" stroke-width="1.15" stroke-linejoin="round"/>'
      // the struck edge, catching the light
    + '<path d="M15.6 7.4l3 5.4" fill="none" stroke="#c3ccdd" stroke-width="1.1" stroke-linecap="round"/>',

  // Fibre: a handful of stripped stalks, bound in the middle. Loose ends at
  // both ends and a tie across the waist, which is what stops it reading as
  // a paintbrush or a sheaf of wheat.
  fibre:
      '<path d="M5.9 3.6c1.8 3.6 2.3 7.1 1.6 10.5M10.2 2.9c.7 3.8.7 7.5 0 11.2'
    + 'M14.4 3.3c-.6 3.7-.4 7.3.6 10.8M18 4.6c-1.7 3.3-2.4 6.6-2.2 9.9"'
    + ' fill="none" stroke="#b8a85e" stroke-width="1.5" stroke-linecap="round"/>'
    + '<path d="M7.4 14.6c-1.3 2.6-2.5 4.4-3.6 5.5M10.3 15c-.2 2.6-.6 4.6-1.3 6.1'
    + 'M13.6 14.8c.7 2.5 1.5 4.4 2.5 5.8M16.4 13.9c1.4 2.2 2.7 3.8 3.9 4.9"'
    + ' fill="none" stroke="#8a7c3e" stroke-width="1.35" stroke-linecap="round"/>'
      // the tie
    + '<path d="M5.7 13.3h12.6a1.5 1.5 0 010 3H5.7a1.5 1.5 0 010-3z"'
    + ' fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.25" stroke-linejoin="round"/>'
    + '<path d="M7 14.2h9.8" fill="none" stroke="#f0e7b4" stroke-width="0.9" stroke-linecap="round"/>',

  // Fibre rope: a coil, seen from the side, with the lay of the strands
  // running across it. Three turns rather than a spiral - a spiral at this
  // size reads as a snail.
  rope:
      '<path d="M4.2 7.1h15.6a2.3 2.3 0 010 4.6H4.2a2.3 2.3 0 010-4.6z"'
    + ' fill="#c9a85c" stroke="#3d2c10" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M4.2 12.1h15.6a2.3 2.3 0 010 4.6H4.2a2.3 2.3 0 010-4.6z"'
    + ' fill="#e0c27f" stroke="#3d2c10" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M4.2 17.1h15.6a2.3 2.3 0 010 4.6H4.2a2.3 2.3 0 010-4.6z"'
    + ' fill="#b3924a" stroke="#3d2c10" stroke-width="1.3" stroke-linejoin="round"/>'
      // the lay of the strands
    + '<path d="M6.5 8.1l1.4 2.6M10.1 8.1l1.4 2.6M13.7 8.1l1.4 2.6'
    + 'M6.5 13.1l1.4 2.6M10.1 13.1l1.4 2.6M13.7 13.1l1.4 2.6'
    + 'M6.5 18.1l1.4 2.6M10.1 18.1l1.4 2.6M13.7 18.1l1.4 2.6"'
    + ' fill="none" stroke="#7d6329" stroke-width="0.95" stroke-linecap="round"/>'
      // the free end, tucked under the top turn
    + '<path d="M19.4 4.2c1.6 1 1.8 2 .6 2.9" fill="none" stroke="#b3924a"'
    + ' stroke-width="1.6" stroke-linecap="round"/>',

  // A stick: one shaved length of wood with the stub of a side branch, laid
  // on the diagonal so it fills a square tile. Drawn as strokes rather than
  // as an outlined shape - a stick is a line, and at 24px an outlined one is
  // two lines close together, which reads as a tube.
  stick:
      // the dark edge, laid down first and left showing as a rim
      '<path d="M5.6 18.6L17.4 6.8" fill="none" stroke="#2c1a0e" stroke-width="4.8" stroke-linecap="round"/>'
    + '<path d="M11.4 12.9L15.6 8.4" fill="none" stroke="#2c1a0e" stroke-width="3.6" stroke-linecap="round"/>'
      // the wood
    + '<path d="M5.6 18.6L17.4 6.8" fill="none" stroke="#a86f3d" stroke-width="3.1" stroke-linecap="round"/>'
    + '<path d="M11.4 12.9L15.6 8.4" fill="none" stroke="#a86f3d" stroke-width="2" stroke-linecap="round"/>'
      // the lit side, along the upper edge
    + '<path d="M5.9 17.5L16.3 7.1" fill="none" stroke="#d7a068" stroke-width="1.05" stroke-linecap="round"/>',

  // Flint knife: a flint blade bound onto a short grip with fibre. The blade
  // is the same cold stone as the flint, the binding the same straw as the
  // rope, so what it is made of is readable at a glance.
  flintKnife:
      // the grip
      '<path d="M4.2 19.8l4.6-4.6 2.6 2.6-4.6 4.6a1.85 1.85 0 01-2.6-2.6z"'
    + ' fill="#8a5c30" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
      // the binding
    + '<path d="M8.5 15.5l2.6 2.6-1.5 1.5-2.6-2.6z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M8.9 17.4l1.3 1.3" fill="none" stroke="#8a7c3e" stroke-width="0.9" stroke-linecap="round"/>'
      // the blade
    + '<path d="M10.6 14.3l6.1-6.7 3.3-2.2-1.8 3.6-5.1 7z" fill="#5a6478"/>'
    + '<path d="M16.7 7.6l3.3-2.2-1.8 3.6-2.6 1.3z" fill="#8794ad"/>'
    + '<path d="M10.6 14.3l6.1-6.7 3.3-2.2-1.8 3.6-5.1 7z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.35" stroke-linejoin="round"/>'
      // the ground edge
    + '<path d="M12.5 12.9l5-6.8" fill="none" stroke="#c3ccdd" stroke-width="1" stroke-linecap="round"/>',

  // Flint axe: the same flint, bigger and hafted - a bound head on a stick.
  // Drawn head-up so it is not mistaken for the knife at a glance.
  flintAxe:
      // the haft
      '<path d="M8.3 21.2l7.3-13.6 2.4 1.3-7.3 13.6z"'
    + ' fill="#a86f3d" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M9.9 20.2l6.3-11.8" fill="none" stroke="#c99359" stroke-width="0.9" stroke-linecap="round"/>'
      // the head
    + '<path d="M4.6 9.3l7.9-5.9 6.6 3.6-2.7 7.6-8.6-.8z" fill="#5a6478"/>'
    + '<path d="M4.6 9.3l7.9-5.9 6.6 3.6-7.4 1.5z" fill="#8794ad"/>'
    + '<path d="M19.1 7l-2.7 7.6-4.7-.4 1-5.7z" fill="#3c4457"/>'
    + '<path d="M4.6 9.3l7.9-5.9 6.6 3.6-2.7 7.6-8.6-.8z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M4.6 9.3l7.1 1.3 7.4-3.6M11.7 10.6l-.1 3.5"'
    + ' fill="none" stroke="#151a27" stroke-width="1.15" stroke-linejoin="round"/>'
      // the bit, catching the light
    + '<path d="M5.5 10.3l1.9 3.5" fill="none" stroke="#c3ccdd" stroke-width="1.1" stroke-linecap="round"/>'
      // the binding, over where head meets haft
    + '<path d="M11 12.6l4.3.4-.5 2.6-4.5-.5z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.2" stroke-linejoin="round"/>'
};

/** An `<svg>` holding one of the glyphs above. */
export function icon(name, size = 20) {
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ''}</svg>`;
}

/**
 * The picture for an item.
 *
 * Painted art if the material has any, and the line-art glyph otherwise -
 * which is also why this never comes back empty: anything with neither gets
 * the crate. A tile with nothing drawn on it reads as a bug, and an item is
 * the one thing here that can arrive without the icon set having been
 * touched. The materials nothing drops yet are still line art; they get
 * painted when something actually hands them out.
 */
export function itemIcon(item, size = 20) {
  const art = MATERIAL_ART[item];
  // No fill or stroke on the wrapper: the art sets its own, and forcing
  // `currentColor` over the top is what would make it hollow again.
  if (art) return `<svg class="icon art" viewBox="0 0 24 24" width="${size}" height="${size}">${art}</svg>`;
  return icon(ICONS[item] ? item : 'material', size);
}
