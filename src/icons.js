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

  // Fibre: a fan of blades bound near the foot, the way a handful of pulled
  // weeds actually sits in the hand - splayed out from one tie rather than
  // held parallel. Each blade is a lens: one curve out to the tip and one
  // back, bowed either side of the line from the binding.
  //
  // The straight-stalk version this replaced read as a paintbrush, because
  // parallel lines under a band is what a brush is. The fan is what makes it
  // plant matter.
  fibre:
      // the blades, back to front so the near ones overlap the far ones
      '<path d="M7.5 18.5Q15.9 13.3 20.5 4.5Q12.1 9.7 7.5 18.5z" fill="#6f9e34"/>'
    + '<path d="M7.5 18.5Q14.3 12 17 3Q10.2 9.5 7.5 18.5z" fill="#8ab844"/>'
    + '<path d="M7.5 18.5Q11.9 11.5 12 3.2Q7.6 10.2 7.5 18.5z" fill="#a3cc57"/>'
    + '<path d="M7.5 18.5Q9.5 11.5 7.5 4.5Q5.5 11.5 7.5 18.5z" fill="#7aa93a"/>'
    + '<path d="M7.5 18.5Q15.4 16.4 21 10.5Q13.1 12.6 7.5 18.5z" fill="#96c24c"/>'
      // one outline over the whole fan, so it reads as one bundle
    + '<path d="M7.5 18.5Q15.9 13.3 20.5 4.5Q12.1 9.7 7.5 18.5z'
    + 'M7.5 18.5Q14.3 12 17 3Q10.2 9.5 7.5 18.5z'
    + 'M7.5 18.5Q11.9 11.5 12 3.2Q7.6 10.2 7.5 18.5z'
    + 'M7.5 18.5Q9.5 11.5 7.5 4.5Q5.5 11.5 7.5 18.5z'
    + 'M7.5 18.5Q15.4 16.4 21 10.5Q13.1 12.6 7.5 18.5z"'
    + ' fill="none" stroke="#2c3d12" stroke-width="1.1" stroke-linejoin="round"/>'
      // the cut ends, poking out below the tie
    + '<path d="M6.1 18.2l-1.3 3.4M8 18.6l-.5 3.4M9.6 17.9l.8 3.2"'
    + ' fill="none" stroke="#5c7d2a" stroke-width="1.3" stroke-linecap="round"/>'
      // the tie, across the foot of the fan
    + '<path d="M4.4 17.5l7.2-3.3" fill="none" stroke="#2c3d12" stroke-width="4.5" stroke-linecap="round"/>'
    + '<path d="M4.4 17.5l7.2-3.3" fill="none" stroke="#c9a94e" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M5.2 16.6l5.6-2.6" fill="none" stroke="#e6cd84" stroke-width="0.95" stroke-linecap="round"/>',

  // Fibre rope: a hank - two loops of the same rope, bound in the middle by
  // a few turns. That is how rope is actually stowed for carrying, and it
  // is a far better silhouette than a coil: the figure of eight is unlike
  // anything else in the set, where a coil kept closing up into a barrel.
  //
  // Each loop is one stroked ellipse over a darker, wider one, so the ring
  // gets its own outline for free; the lay is short ticks laid across the
  // band, worked out round the ellipse rather than placed by hand.
  rope:
      '<ellipse cx="6.5" cy="12" rx="4.5" ry="5" fill="none" stroke="#6b4320" stroke-width="4.6"/>'
    + '<ellipse cx="17.5" cy="12" rx="4.5" ry="5" fill="none" stroke="#6b4320" stroke-width="4.6"/>'
    + '<ellipse cx="6.5" cy="12" rx="4.5" ry="5" fill="none" stroke="#e0b87a" stroke-width="3"/>'
    + '<ellipse cx="17.5" cy="12" rx="4.5" ry="5" fill="none" stroke="#e0b87a" stroke-width="3"/>'
    + '<path d="M9.8 13.4L10.5 16.2 M8.2 15.5L7.1 18 M5.9 15.9L3.4 17 M3.8 14.6L1.2 13.6 M3 12L1.5 9.6 M3.8 9.4L4.1 6.6 M5.9 8.1L7.8 6.2 M8.2 8.5L11 8.5 M9.8 10.6L12 12.4" fill="none" stroke="#a06f36" stroke-width="0.85" stroke-linecap="round"/>'
    + '<path d="M20.8 13.4L21.5 16.2 M19.2 15.5L18.1 18 M16.9 15.9L14.4 17 M14.8 14.6L12.2 13.6 M14 12L12.5 9.6 M14.8 9.4L15.1 6.6 M16.9 8.1L18.8 6.2 M19.2 8.5L22 8.5 M20.8 10.6L23 12.4" fill="none" stroke="#a06f36" stroke-width="0.85" stroke-linecap="round"/>'
    + '<path d="M10.1 6.3v11.4M12 6.1v11.8M13.9 6.3v11.4" fill="none" stroke="#6b4320" stroke-width="3.9" stroke-linecap="round"/>'
    + '<path d="M10.1 6.3v11.4M12 6.1v11.8M13.9 6.3v11.4" fill="none" stroke="#e0b87a" stroke-width="2.4" stroke-linecap="round"/>'
    + '<path d="M9.2 9.3l1.8-1.7M9.2 12.3l1.8-1.7M9.2 15.3l1.8-1.7M11.1 9.5l1.8-1.7M11.1 12.5l1.8-1.7M11.1 15.5l1.8-1.7M13 9.3l1.8-1.7M13 12.3l1.8-1.7M13 15.3l1.8-1.7"'
    + ' fill="none" stroke="#a06f36" stroke-width="0.85" stroke-linecap="round"/>',

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
    + '<path d="M11 12.6l4.3.4-.5 2.6-4.5-.5z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.2" stroke-linejoin="round"/>',

  // Planks: sawn boards stacked in three-quarter view, so each one shows
  // its lit top face with the grain running along it, its long side, and
  // its sawn end. Drawn flat on, boards are three rectangles and read as a
  // stack of anything; it is the top face that says wood.
  //
  // The geometry is one board swept three times - top, long side, end, then
  // the grain, then one outline over all three faces - so the stack can be
  // retuned by moving the three vectors rather than by nudging points.
  plank:
      '<path d="M8.8 17.5L20.2 11.8L20.2 14.5L8.8 20.2z" fill="#a8763f"/>'
    + '<path d="M4.9 15.5L8.8 17.5L8.8 20.2L4.9 18.2z" fill="#8a5c30"/>'
    + '<path d="M4.9 15.5L16.3 9.8L20.2 11.8L8.8 17.5z" fill="#e0b070"/>'
    + '<path d="M6.7 15.6L16.5 10.7 M7.5 16L17.3 11.1 M8.2 16.4L18 11.5 M8.9 16.8L18.7 11.9" fill="none" stroke="#b8854c" stroke-width="0.75" stroke-linecap="round"/>'
    + '<path d="M4.9 15.5L16.3 9.8L20.2 11.8L8.8 17.5zM8.8 17.5L20.2 11.8L20.2 14.5L8.8 20.2zM4.9 15.5L8.8 17.5L8.8 20.2L4.9 18.2z" fill="none" stroke="#3d2411" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M8.2 14.5L19.6 8.8L19.6 11.5L8.2 17.2z" fill="#a8763f"/>'
    + '<path d="M4.4 12.5L8.2 14.5L8.2 17.2L4.4 15.2z" fill="#8a5c30"/>'
    + '<path d="M4.4 12.5L15.8 6.8L19.6 8.8L8.2 14.5z" fill="#e0b070"/>'
    + '<path d="M6.2 12.6L16 7.7 M6.9 13L16.7 8.1 M7.6 13.4L17.4 8.5 M8.4 13.8L18.2 8.9" fill="none" stroke="#b8854c" stroke-width="0.75" stroke-linecap="round"/>'
    + '<path d="M4.4 12.5L15.8 6.8L19.6 8.8L8.2 14.5zM8.2 14.5L19.6 8.8L19.6 11.5L8.2 17.2zM4.4 12.5L8.2 14.5L8.2 17.2L4.4 15.2z" fill="none" stroke="#3d2411" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M7.7 11.5L19.1 5.8L19.1 8.5L7.7 14.2z" fill="#a8763f"/>'
    + '<path d="M3.8 9.5L7.7 11.5L7.7 14.2L3.8 12.2z" fill="#8a5c30"/>'
    + '<path d="M3.8 9.5L15.2 3.8L19.1 5.8L7.7 11.5z" fill="#e0b070"/>'
    + '<path d="M5.6 9.6L15.4 4.7 M6.4 10L16.2 5.1 M7.1 10.4L16.9 5.5 M7.8 10.8L17.6 5.9" fill="none" stroke="#b8854c" stroke-width="0.75" stroke-linecap="round"/>'
    + '<path d="M3.8 9.5L15.2 3.8L19.1 5.8L7.7 11.5zM7.7 11.5L19.1 5.8L19.1 8.5L7.7 14.2zM3.8 9.5L7.7 11.5L7.7 14.2L3.8 12.2z" fill="none" stroke="#3d2411" stroke-width="1.15" stroke-linejoin="round"/>',

  // Dirt: a turned clod with the grass still on its top face, seen the same
  // three-quarter way the planks are. A plain brown lump is a rock in the
  // wrong colour; the green cap is what says it came out of the ground.
  dirt:
      // the two faces of the clod
      '<path d="M3.4 9.6L12 5.2 20.6 9.6 20.6 16.4 12 20.8 3.4 16.4z" fill="#8a6038"/>'
    + '<path d="M12 9.9L20.6 9.6 20.6 16.4 12 20.8z" fill="#6b4728"/>'
      // the sod on top
    + '<path d="M3.4 9.6L12 5.2 20.6 9.6 12 13.4z" fill="#4fae78"/>'
    + '<path d="M3.4 9.6L12 5.2 12 7.1 6.5 9.6z" fill="#67c48e"/>'
      // crumbs falling off the near corners
    + '<path d="M3.4 9.6L12 13.4 12 20.8 3.4 16.4z" fill="#a8763f"/>'
    + '<path d="M3.4 9.6L12 5.2 20.6 9.6 20.6 16.4 12 20.8 3.4 16.4z'
    + 'M3.4 9.6L12 13.4 20.6 9.6M12 13.4v7.4"'
    + ' fill="none" stroke="#3a2412" stroke-width="1.3" stroke-linejoin="round"/>'
      // the loose grain in the soil
    + '<path d="M6.2 13.6l1.1.5M9.1 15.6l1 .5M6.4 16.6l1 .5M15.2 13.4l1.2-.5M17.6 14.6l1.2-.6"'
    + ' fill="none" stroke="#5a3a1d" stroke-width="0.95" stroke-linecap="round"/>',

  // A lump knocked out of a rock: the same isometric block the clod is drawn
  // as, so the two read as the same *kind* of thing - something to stand on
  // the isle - but in the stone's greys with the corners chipped off rather
  // than a green sod on top.
  brokenStone:
      '<path d="M3.4 9.6L12 5.2 20.6 9.6 20.6 16.4 12 20.8 3.4 16.4z" fill="#8b929c"/>'
    + '<path d="M12 13.4L20.6 9.6 20.6 16.4 12 20.8z" fill="#6f767f"/>'
    + '<path d="M3.4 9.6L12 5.2 20.6 9.6 12 13.4z" fill="#aab1bd"/>'
      // chips off the top corners, drawn as lighter facets
    + '<path d="M6.9 8.1L12 5.2 14.6 6.5 9.2 9.2z" fill="#c3c9d4"/>'
    + '<path d="M16.4 11.2L20.6 9.6 20.6 12.6 16.9 14.2z" fill="#828992"/>'
    + '<path d="M3.4 9.6L12 5.2 20.6 9.6 20.6 16.4 12 20.8 3.4 16.4z'
    + 'M3.4 9.6L12 13.4 20.6 9.6M12 13.4v7.4"'
    + ' fill="none" stroke="#2b313c" stroke-width="1.3" stroke-linejoin="round"/>'
      // the grain of the break
    + '<path d="M6.3 12.2l1.4 1M6.6 15.4l1.5 1M14.8 15.9l1.6-.8M15.4 18.4l1.7-.8"'
    + ' fill="none" stroke="#4a515c" stroke-width="0.95" stroke-linecap="round"/>',

  // Flint pickaxe: the head swept across the top of the haft with a point at
  // each end, which is the one silhouette nothing else in the set has - the
  // axe is a wedge on one side, the hoe a blade hung down.
  flintPickaxe:
      // the haft
      '<path d="M9.4 21.6L11.3 7.8l2.8.4-1.9 13.8z"'
    + ' fill="#a86f3d" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M10.8 20.8l1.6-12" fill="none" stroke="#c99359" stroke-width="0.9" stroke-linecap="round"/>'
      // the head: a shallow arc with a point at both ends
    + '<path d="M2.4 9.6C6.6 4.4 17.4 3.6 21.8 8.2l-1.9 2.6c-3.4-3.2-11.6-2.6-15.2 1.4z" fill="#5a6478"/>'
    + '<path d="M2.4 9.6C6.6 4.4 17.4 3.6 21.8 8.2l-.9 1.2C16.9 5.6 6.9 6.4 3.3 10.6z" fill="#8794ad"/>'
    + '<path d="M19.9 10.8c-1.3-1.2-3.2-2-5.3-2.4l.4-2.6c2.6.4 5 1.4 6.8 2.4z" fill="#3c4457"/>'
    + '<path d="M2.4 9.6C6.6 4.4 17.4 3.6 21.8 8.2l-1.9 2.6c-3.4-3.2-11.6-2.6-15.2 1.4z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M15 6.1l-.4 2.3" fill="none" stroke="#151a27" stroke-width="1.1"/>'
      // the two points, catching the light
    + '<path d="M3.2 10.4L4.6 8.8M20.6 9.9l-1.3-1.4" fill="none" stroke="#c3ccdd"'
    + ' stroke-width="1.05" stroke-linecap="round"/>'
      // the binding at the joint
    + '<path d="M9.9 8.4l4.3.6-.4 2.6-4.3-.6z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.2" stroke-linejoin="round"/>',

  // Wheat: one ear on its stalk, the grains stepped up both sides in pairs
  // with an awn off each. A solid teardrop reads as a leaf, and it is the
  // stepping that makes it a cereal.
  wheat:
      '<path d="M12 21.4V9.6" fill="none" stroke="#b8923c" stroke-width="1.6" stroke-linecap="round"/>'
    + '<path d="M8.6 17.4c-1.6-1-2.4-2.3-2.4-3.9 1.8.2 3 1 3.6 2.5M15.4 15.6c1.6-1 2.4-2.3 2.4-3.9-1.8.2-3 1-3.6 2.5"'
    + ' fill="none" stroke="#c9a94e" stroke-width="1.25" stroke-linecap="round"/>'
      // the grains, in pairs up the ear
    + '<path d="M11.2 14.6c-1.5-.3-2.4-1.3-2.5-2.9 1.6-.2 2.6.7 2.9 2.5z'
    + 'M12.8 12.9c1.5-.3 2.4-1.3 2.5-2.9-1.6-.2-2.6.7-2.9 2.5z'
    + 'M11.2 10.9c-1.5-.3-2.4-1.3-2.5-2.9 1.6-.2 2.6.7 2.9 2.5z'
    + 'M12.8 9.2c1.5-.3 2.4-1.3 2.5-2.9-1.6-.2-2.6.7-2.9 2.5z'
    + 'M12 7.4c-.9-1.3-.9-2.7 0-4.2.9 1.5.9 2.9 0 4.2z"'
    + ' fill="#f0d07a" stroke="#6b5116" stroke-width="1.15" stroke-linejoin="round"/>'
      // the awns
    + '<path d="M9.1 11.1L6.6 9.2M10.7 7.4L8.2 5.5M14.9 9.4l2.5-1.9M13.3 5.7l2.5-1.9"'
    + ' fill="none" stroke="#d8b962" stroke-width="1" stroke-linecap="round"/>',

  // Wheat seeds: a small heap of grains, each a pointed oval with a crease
  // down it. Drawn loose rather than in a pouch - a pouch is a container,
  // and what is held is the seed.
  seeds:
      '<path d="M6.6 17.4c-2 0-3.2-1-3.4-2.8 2-.6 3.4.2 4 2.2z" fill="#cfe08a" stroke="#3f4a18" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M11.4 19.4c-1.9.6-3.3 0-4-1.7 1.7-1.2 3.3-.8 4.4.9z" fill="#b9cd6e" stroke="#3f4a18" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M17.6 17c-1.2 1.6-2.7 1.9-4.3 1 .8-1.9 2.3-2.5 4.1-1.6z" fill="#cfe08a" stroke="#3f4a18" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M10.2 13.4c-1.9.6-3.3 0-4-1.7 1.7-1.2 3.3-.8 4.4.9z" fill="#dcea9e" stroke="#3f4a18" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M18.8 11.9c-.6 1.9-1.9 2.7-3.7 2.3.2-2 1.4-2.9 3.4-2.6z" fill="#b9cd6e" stroke="#3f4a18" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M14.4 7.9c.6 1.9 0 3.3-1.7 4-1.2-1.7-.8-3.3.9-4.4z" fill="#dcea9e" stroke="#3f4a18" stroke-width="1.15" stroke-linejoin="round"/>'
      // the crease down each one
    + '<path d="M4.4 15.2l2 1.2M8.4 18.2l2.2.6M14.6 17.2l2.2-.8M7.2 12.2l2.2.6M16.4 13.4l1.6-1.4M13.5 11.2l.5-2.2"'
    + ' fill="none" stroke="#7d8c3a" stroke-width="0.95" stroke-linecap="round"/>',

  // Flint shovel: a broad flint blade hafted on a stick. Wide and square
  // ended where the axe is wedge shaped, so the two are not the same
  // silhouette at tile size.
  flintShovel:
      '<path d="M10.2 3.6l3 .2-1.5 11.4-2.6-.4z" fill="#a86f3d" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M10.9 4.6l1.1.1-1.3 9.8-1-.2z" fill="#c99359"/>'
      // the binding
    + '<path d="M9.2 12.1l4.1.5-.4 2.5-4.1-.5z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.2" stroke-linejoin="round"/>'
      // the blade
    + '<path d="M7.4 14.9l8.4 1-1.5 6.1-6.7-.8z" fill="#5a6478"/>'
    + '<path d="M7.4 14.9l8.4 1-.5 2-7.5-.9z" fill="#8794ad"/>'
    + '<path d="M15.8 15.9l-1.5 6.1-3.3-.4.9-5.3z" fill="#3c4457"/>'
    + '<path d="M7.4 14.9l8.4 1-1.5 6.1-6.7-.8z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M7.8 17l7.5.9M11.9 16.2l-.9 5.3"'
    + ' fill="none" stroke="#151a27" stroke-width="1.1" stroke-linejoin="round"/>'
      // the ground edge along the bottom
    + '<path d="M8.4 20.6l5.6.7" fill="none" stroke="#c3ccdd" stroke-width="1.05" stroke-linecap="round"/>',

  // Flint hoe: the blade set across the end of the haft rather than along
  // it, which is the whole difference between a hoe and an axe.
  flintHoe:
      // the haft, running corner to corner
      '<path d="M4.6 20.8L15.4 6.4l2.3 1.7L7 22.5z"'
    + ' fill="#a86f3d" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M6.2 20.3L15.8 7.5" fill="none" stroke="#c99359" stroke-width="0.9" stroke-linecap="round"/>'
      // the blade, hung across the top of it
    + '<path d="M9.9 5.2l9.8-1.8 1.1 4.3-8.9 2.6z" fill="#5a6478"/>'
    + '<path d="M9.9 5.2l9.8-1.8.4 1.7-9.6 2z" fill="#8794ad"/>'
    + '<path d="M19.7 3.4l1.1 4.3-3.4 1-.6-4.7z" fill="#3c4457"/>'
    + '<path d="M9.9 5.2l9.8-1.8 1.1 4.3-8.9 2.6z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M10.1 7.1l9.6-2M16.8 4.1l.6 4.7"'
    + ' fill="none" stroke="#151a27" stroke-width="1.1" stroke-linejoin="round"/>'
    + '<path d="M10.7 8.8l7.4-2.1" fill="none" stroke="#c3ccdd" stroke-width="1.05" stroke-linecap="round"/>'
      // the binding at the joint
    + '<path d="M12.4 6.2l2.6 1.9-1.9 2.5-2.6-1.9z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.2" stroke-linejoin="round"/>',

  // A wooden bucket: staves down the sides, a hoop round the middle and a
  // rope over the top. Tapered, or it is a barrel.
  bucket:
      '<path d="M5.2 6.4h13.6l-1.9 14.4a1.2 1.2 0 01-1.2 1H8.3a1.2 1.2 0 01-1.2-1z" fill="#c99359"/>'
      // the staves
    + '<path d="M9.4 6.6l-.7 15M12 6.6v15M14.6 6.6l.7 15"'
    + ' fill="none" stroke="#8a5c30" stroke-width="1" stroke-linecap="round"/>'
      // the inside of the rim, so it reads as open
    + '<ellipse cx="12" cy="6.4" rx="6.8" ry="1.9" fill="#6b451f" stroke="#2c1a0e" stroke-width="1.3"/>'
    + '<ellipse cx="12" cy="6.6" rx="4.9" ry="1.15" fill="#3d2712"/>'
    + '<path d="M5.2 6.4h13.6l-1.9 14.4a1.2 1.2 0 01-1.2 1H8.3a1.2 1.2 0 01-1.2-1z"'
    + ' fill="none" stroke="#2c1a0e" stroke-width="1.4" stroke-linejoin="round"/>'
      // the hoop
    + '<path d="M6.3 14.3h11.4" fill="none" stroke="#2c1a0e" stroke-width="2.4"/>'
    + '<path d="M6.3 14.3h11.4" fill="none" stroke="#a8763f" stroke-width="1.3"/>'
      // the rope handle
    + '<path d="M5.6 7.6c1.4-4.3 4-6.4 7.8-6.4 2.6 0 4.4.9 5.4 2.7"'
    + ' fill="none" stroke="#3d2c10" stroke-width="2.6" stroke-linecap="round"/>'
    + '<path d="M5.6 7.6c1.4-4.3 4-6.4 7.8-6.4 2.6 0 4.4.9 5.4 2.7"'
    + ' fill="none" stroke="#d3b167" stroke-width="1.4" stroke-linecap="round"/>',

  // A water catcher: the open tub of planks it is, with the water it has
  // caught sitting in it. The water is what says what it is for.
  waterCatcher:
      '<path d="M3.6 8.2h16.8l-1.6 12.2a1.4 1.4 0 01-1.4 1.2H6.6a1.4 1.4 0 01-1.4-1.2z" fill="#c99359"/>'
      // the water inside, drawn before the near wall so it sits in the tub
    + '<path d="M5.1 11.4h13.8l-1 8.9a1.1 1.1 0 01-1.1.9H7.2a1.1 1.1 0 01-1.1-.9z" fill="#3f9fd8"/>'
    + '<path d="M5.1 11.4h13.8l-.3 2.4H5.4z" fill="#6fc4ee"/>'
      // the staves
    + '<path d="M8 8.4l-.5 13M12 8.4v13M16 8.4l.5 13"'
    + ' fill="none" stroke="#8a5c30" stroke-width="1" stroke-linecap="round" opacity="0.55"/>'
    + '<path d="M3.6 8.2h16.8l-1.6 12.2a1.4 1.4 0 01-1.4 1.2H6.6a1.4 1.4 0 01-1.4-1.2z"'
    + ' fill="none" stroke="#2c1a0e" stroke-width="1.4" stroke-linejoin="round"/>'
      // the rim, open to the sky
    + '<ellipse cx="12" cy="8.2" rx="8.4" ry="2.2" fill="#6b451f" stroke="#2c1a0e" stroke-width="1.35"/>'
    + '<ellipse cx="12" cy="8.4" rx="6.4" ry="1.4" fill="#3f9fd8"/>'
      // a drop falling into it
    + '<path d="M12 1.2c1.5 1.8 2.2 3.1 2.2 4a2.2 2.2 0 01-4.4 0c0-.9.7-2.2 2.2-4z"'
    + ' fill="#6fc4ee" stroke="#15496e" stroke-width="1.2" stroke-linejoin="round"/>'
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
