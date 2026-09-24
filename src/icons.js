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
// --- rope, worked out rather than placed by hand ----------------------------
// A coil of rope is three rings stacked one over another with the free end
// hanging down the front, and every ring is the same strand: a dark rim, a
// mid tone, and a light dash laid along it so the lay reads as the twisted
// bands a rope actually has. Drawing that by hand is dozens of points per
// ring, so it is computed once, here, from a handful of numbers.

const r2 = (n) => +n.toFixed(2);

/** An ellipse as a closed polyline, so it can be dashed like any strand. */
function ringPath(cx, cy, rx, ry, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(`${r2(cx + Math.cos(a) * rx)} ${r2(cy + Math.sin(a) * ry)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** One length of twisted rope along `d`: rim, body, and the lay over it. */
function ropeStrand(d, { w = 2.6, mid = '#b98347', light = '#ecc98c', offset = 0 } = {}) {
  return `<path d="${d}" fill="none" stroke="#4a2c12" stroke-width="${r2(w + 1.4)}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${mid}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${light}" stroke-width="${w}" stroke-dasharray="1.1 1" stroke-dashoffset="${offset}"/>`;
}

function ropeCoil({ rings = 3, cx = 11.4, top = 7.6, rx = 7.8, ry = 4.1, step = 2.3 } = {}) {
  let s = '';
  // The bottom ring first, so each ring above lies over the one below - and
  // the lower ones a shade darker, in the shadow of the rest of the coil.
  // Each ring's lay is offset from the next, or the bands line up into
  // stripes running down the whole coil and it reads as a barrel again.
  for (let k = rings - 1; k >= 0; k--) {
    const shade = k === 0 ? {} : { mid: '#9c6a34', light: '#d6ad6c' };
    s += ropeStrand(ringPath(cx, top + k * step, rx, ry), { offset: k * 0.55, ...shade });
  }
  // The free end, off the front of the top ring and hanging down over the
  // rest - which is what says "rope" rather than "a stack of rings".
  const fx = cx + rx * 0.62;
  const fy = top + ry * 0.78;
  const ex = fx + 0.5;
  const ey = fy + 8.3;
  s += ropeStrand(`M${r2(fx)} ${r2(fy)}C${r2(fx + 1.6)} ${r2(fy + 2.4)} ${r2(fx + 1.2)} ${r2(fy + 5.2)} ${r2(ex)} ${r2(ey)}`);
  // A whipping just above the end, and the fibres fraying out below it.
  s += `<path d="M${r2(ex - 1.7)} ${r2(ey - 1.9)}l3.3.5" fill="none" stroke="#4a2c12" stroke-width="2" stroke-linecap="round"/>`
    + `<path d="M${r2(ex - 1.5)} ${r2(ey - 1.9)}l2.9.44" fill="none" stroke="#e7dca2" stroke-width="0.9" stroke-linecap="round"/>`
    + `<path d="M${r2(ex - 0.7)} ${r2(ey + 0.3)}l-.8 1.5M${r2(ex)} ${r2(ey + 0.5)}v1.7M${r2(ex + 0.7)} ${r2(ey + 0.3)}l.8 1.5"`
    + ' fill="none" stroke="#ecc98c" stroke-width="0.95" stroke-linecap="round"/>';
  return s;
}

/**
 * A cog wheel's outline: `teeth` square teeth round a rim, as one closed
 * path. Worked out rather than drawn, for the same reason the rope is - it
 * is dozens of points, and the cog, the crank and the sprinkler all carry
 * one at a different size.
 */
function gearPath(cx, cy, outer, inner, teeth = 8) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    // Each tooth is a quarter of a step either side of its middle, and the
    // gap between two is the rim.
    for (const [da, r] of [[-0.5, inner], [-0.26, inner], [-0.2, outer], [0.2, outer], [0.26, inner]]) {
      pts.push([cx + Math.cos(a + da * step) * r, cy + Math.sin(a + da * step) * r]);
    }
  }
  return `M${pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L')}z`;
}

/** A painted wooden cog: rim and teeth, a lit face, and the axle hole. */
function cogArt(cx, cy, outer, inner, { teeth = 8, line = 1.2 } = {}) {
  return `<path d="${gearPath(cx, cy, outer, inner, teeth)}" fill="#c99359"`
    + ` stroke="#3d2411" stroke-width="${line}" stroke-linejoin="round"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r2(inner * 0.72)}" fill="#e0b070"/>`
    + `<path d="M${r2(cx - inner * 0.5)} ${r2(cy - inner * 0.3)}a${r2(inner * 0.6)} ${r2(inner * 0.6)} 0 0 1 ${r2(inner * 0.8)} -${r2(inner * 0.25)}"`
    + ` fill="none" stroke="#f3cf92" stroke-width="${r2(line * 0.8)}" stroke-linecap="round"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r2(inner * 0.3)}" fill="#3d2411"/>`;
}

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
  //
  // Drawn at four fifths of the tile. At full size it was as big as the
  // whole rock it is knapped out of, which is backwards - and the lines are
  // thickened to match, so they come out the weight of the rest of the set.
  flint:
      '<g transform="translate(12 12.4) scale(0.8) translate(-12 -12.4)">'
    + '<path d="M7.3 3.9l7.9 2.1 4.1 7.2-6.5 7.6-7.7-4.2-1.5-8.2z" fill="#5a6478"/>'
    + '<path d="M7.3 3.9l7.9 2.1 1.1 5.6-6.9-1.3z" fill="#8794ad"/>'
    + '<path d="M15.2 6l4.1 7.2-6.5 7.6-3.4-9.5z" fill="#3c4457"/>'
    + '<path d="M7.3 3.9l7.9 2.1 4.1 7.2-6.5 7.6-7.7-4.2-1.5-8.2z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.7" stroke-linejoin="round"/>'
    + '<path d="M7.3 3.9l2.1 6 6.9 1.3M9.4 9.9l3.4 9.5"'
    + ' fill="none" stroke="#151a27" stroke-width="1.4" stroke-linejoin="round"/>'
      // the struck edge, catching the light
    + '<path d="M15.6 7.4l3 5.4" fill="none" stroke="#c3ccdd" stroke-width="1.35" stroke-linecap="round"/>'
    + '</g>',

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

  // Fibre rope: a coil of it, three rings stacked with the end hanging down
  // the front. Built by `ropeCoil` above.
  //
  // Two earlier tries are worth not repeating. A flat coil ruled with lines
  // closed up into a striped barrel. A figure-of-eight hank was drawn after
  // it, from a reference, and read as a pretzel - two stiff rings with dark
  // eyes and ticks across them that looked like scratches rather than lay.
  // What makes this one rope is the twist: the light dash laid along every
  // strand, offset ring to ring, and the loose end with its whipping.
  rope: ropeCoil(),

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

  // Flint knife: a flint blade bound onto a short grip with fibre.
  //
  // The blade is two facets either side of a spine - a lit one and a shaded
  // one - in the paler greys of a freshly struck face. It used to be a thin
  // sliver in the flint's own dark grey inside a heavy outline, which at
  // tile size was nearly all outline: the middle of the knife read as a
  // black slot, a hole where the blade should be.
  flintKnife:
      // the grip
      '<path d="M4.2 19.8l4.6-4.6 2.6 2.6-4.6 4.6a1.85 1.85 0 01-2.6-2.6z"'
    + ' fill="#8a5c30" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M5.2 19.9l3.4-3.4" fill="none" stroke="#b07a45" stroke-width="0.9" stroke-linecap="round"/>'
      // the blade: the lit facet, the shaded facet, then one outline over both
    + '<path d="M8.8 14.6l6.6-7.2 5.2-4-10.5 12.5z" fill="#b3bfd4"/>'
    + '<path d="M10.1 15.9l10.5-12.5-2 5-7.2 8.8z" fill="#7d8aa4"/>'
    + '<path d="M8.8 14.6l6.6-7.2 5.2-4-2 5-7.2 8.8z"'
    + ' fill="none" stroke="#1f2636" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M10.1 15.9l10.5-12.5" fill="none" stroke="#5a6682" stroke-width="0.8" stroke-linecap="round"/>'
      // the ground edge, catching the light
    + '<path d="M10 13.9l5.9-6.3 3.3-2.6" fill="none" stroke="#eef2f9" stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round"/>'
      // the binding, last, so it sits over where the blade goes into the grip
    + '<path d="M8.3 15.3l2.9 2.9-1.6 1.6-2.9-2.9z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M8.5 17.6l1.4 1.4M9.4 16.5l1.4 1.4" fill="none" stroke="#8a7c3e" stroke-width="0.85" stroke-linecap="round"/>',

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
  //
  // Everything is rooted ON the stalk and every awn starts at the tip of its
  // grain. The leaves used to be open curls that began a few pixels out from
  // the stem, and the awns hung loose beside the grains, so the plant came
  // apart into pieces floating round a stick.
  wheat:
      // the leaves, closed shapes whose base is on the stalk
      '<path d="M12 20.6C9.6 20.2 7.4 18.8 6.5 16.1 9.1 16.5 10.9 17.8 12 19.2z"'
    + ' fill="#c9a94e" stroke="#6b5116" stroke-width="1.1" stroke-linejoin="round"/>'
    + '<path d="M12 18.9C14.4 18.5 16.6 17.1 17.5 14.4 14.9 14.8 13.1 16.1 12 17.5z"'
    + ' fill="#d8b85a" stroke="#6b5116" stroke-width="1.1" stroke-linejoin="round"/>'
      // the stalk, over the leaves' roots and on up under the ear
    + '<path d="M12 21.4V6.8" fill="none" stroke="#6b5116" stroke-width="2.5" stroke-linecap="round"/>'
    + '<path d="M12 21.4V6.8" fill="none" stroke="#b8923c" stroke-width="1.2" stroke-linecap="round"/>'
      // the awns, each out of the tip of the grain it belongs to
    + '<path d="M9 12.2L6.8 10.4M15 10.5l2.2-1.8M9 8.5L6.8 6.7M15 6.8l2.2-1.8M12 3.8V1.6"'
    + ' fill="none" stroke="#d8b962" stroke-width="1" stroke-linecap="round"/>'
      // the grains, in pairs up the ear, each rooted on the stalk
    + '<path d="M11.7 15.2c-1.6-.3-2.6-1.4-2.7-3 1.7-.2 2.8.8 3.1 2.6z'
    + 'M12.3 13.5c1.6-.3 2.6-1.4 2.7-3-1.7-.2-2.8.8-3.1 2.6z'
    + 'M11.7 11.5c-1.6-.3-2.6-1.4-2.7-3 1.7-.2 2.8.8 3.1 2.6z'
    + 'M12.3 9.8c1.6-.3 2.6-1.4 2.7-3-1.7-.2-2.8.8-3.1 2.6z'
    + 'M12 8.1c-.9-1.3-.9-2.8 0-4.3.9 1.5.9 3 0 4.3z"'
    + ' fill="#f0d07a" stroke="#6b5116" stroke-width="1.15" stroke-linejoin="round"/>',

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
  //
  // The handle is one symmetric arc from ear to ear, tied on at both. It
  // used to start at the left rim and curl off to the right, stopping short
  // of the other side in mid-air - a rope that was not holding anything up.
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
      // the rope handle, ear to ear over the top
    + '<path d="M5.1 8C5.1 3 8.2 1.4 12 1.4S18.9 3 18.9 8"'
    + ' fill="none" stroke="#3d2c10" stroke-width="2.6" stroke-linecap="round"/>'
    + '<path d="M5.1 8C5.1 3 8.2 1.4 12 1.4S18.9 3 18.9 8"'
    + ' fill="none" stroke="#d3b167" stroke-width="1.4" stroke-linecap="round"/>'
      // the ears it is tied through, one each side just under the rim
    + '<rect x="3.7" y="7" width="2.8" height="3" rx="0.9" fill="#8a5c30" stroke="#2c1a0e" stroke-width="1.1"/>'
    + '<rect x="17.5" y="7" width="2.8" height="3" rx="0.9" fill="#8a5c30" stroke="#2c1a0e" stroke-width="1.1"/>'
    + '<path d="M3.9 8.5h2.4M17.7 8.5h2.4" fill="none" stroke="#d3b167" stroke-width="0.9" stroke-linecap="round"/>',

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
    + ' fill="#6fc4ee" stroke="#15496e" stroke-width="1.2" stroke-linejoin="round"/>',

  // A wooden pipe: two lengths of square duct joined by a band, seen the
  // three-quarter way the planks are, with the open end turned to the
  // viewer. The dark hole in the end is what says it carries something.
  pipe:
      // the long front face, then the lit top - long and slim, because a
      // short fat one reads as a crate at tile size
      '<path d="M1.4 12.6h15.8v5H1.4z" fill="#a8763f"/>'
    + '<path d="M1.4 12.6l3-3h15.8l-3 3z" fill="#e0b070"/>'
    + '<path d="M3.2 11.6l1.8-1.8M13.6 11.6l1.8-1.8" fill="none" stroke="#c99359" stroke-width="0.8" stroke-linecap="round"/>'
      // the open end, and the dark bore inside it
    + '<path d="M17.2 12.6l3-3v5l-3 3z" fill="#8a5c30"/>'
    + '<path d="M17.9 13.4l1.6-1.6v3l-1.6 1.6z" fill="#2a170a"/>'
      // the band where two lengths meet
    + '<path d="M8 12.6h2.2v5H8z" fill="#7a4f28"/>'
    + '<path d="M8 12.6l3-3h2.2l-3 3z" fill="#9c6a3a"/>'
    + '<path d="M1.4 12.6h15.8v5H1.4zM1.4 12.6l3-3h15.8l-3 3M17.2 17.6l3-3V9.6"'
    + ' fill="none" stroke="#3d2411" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M8 12.6v5M10.2 12.6v5" fill="none" stroke="#3d2411" stroke-width="0.9"/>'
      // a drop falling from the mouth of it
    + '<path d="M20.4 17.4c1 1.2 1.5 2.1 1.5 2.8a1.5 1.5 0 01-3 0c0-.7.5-1.6 1.5-2.8z"'
    + ' fill="#6fc4ee" stroke="#15496e" stroke-width="1" stroke-linejoin="round"/>',

  // A wooden cog, face on: the one silhouette everything with a cog in it
  // shares, so the crank and the sprinkler read as made of one.
  cog: cogArt(12, 12, 9.4, 6.8, { teeth: 8, line: 1.3 }),

  // A crank handle: the cog it turns on, an arm of plank out from its middle
  // and a rope-bound grip standing up off the far end.
  crankHandle:
      cogArt(7.2, 16.4, 5.6, 4, { teeth: 7, line: 1.1 })
      // the arm, running up and out from the axle
    + '<path d="M6.3 15.2l10.4-9 1.8 2.1-10.4 9z" fill="#b07a45" stroke="#3d2411" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M7.6 15.4l9.6-8.3" fill="none" stroke="#e0b070" stroke-width="0.8" stroke-linecap="round"/>'
      // the grip, bound in rope
    + '<path d="M16 7.6V2.2h3.2v5.4z" fill="#d3b167" stroke="#3d2c10" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M16 3.6h3.2M16 5h3.2M16 6.4h3.2" fill="none" stroke="#8a6a2a" stroke-width="0.8"/>'
    + '<circle cx="7.2" cy="16.4" r="1.3" fill="#3d2411"/>',

  // A flint wrench: an open jaw knapped out of flint on a stick handle. The
  // gap in the jaw is the whole of what says wrench rather than hammer.
  flintWrench:
      // the handle, corner to corner
      '<path d="M9.6 12l2-2 10 10.2-2 2z" fill="#a86f3d" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M11.4 11.6l9 9.2" fill="none" stroke="#c99359" stroke-width="0.9" stroke-linecap="round"/>'
      // the head, with its jaw open to the top right
    + '<path d="M2.2 8.6L4.8 3l4.6-1.2-.4 3.6-2.2 1.3.4 2.3 2.4.7 3.4-1.8-.2 4.4-5.6 2.2z" fill="#5a6478"/>'
    + '<path d="M2.2 8.6L4.8 3l4.6-1.2-.4 3.6-2.2 1.3-4.2 2.4z" fill="#8794ad"/>'
    + '<path d="M9.6 9.7l3.4-1.8-.2 4.4-5.6 2.2 1.4-3.6z" fill="#3c4457"/>'
    + '<path d="M2.2 8.6L4.8 3l4.6-1.2-.4 3.6-2.2 1.3.4 2.3 2.4.7 3.4-1.8-.2 4.4-5.6 2.2z"'
    + ' fill="none" stroke="#151a27" stroke-width="1.35" stroke-linejoin="round"/>'
    + '<path d="M4 7.4l1.2-3" fill="none" stroke="#c3ccdd" stroke-width="1" stroke-linecap="round"/>'
      // the binding where the handle goes into the head
    + '<path d="M8.4 11.4l2.4-2.3 2 2-2.4 2.3z" fill="#d9cd8a" stroke="#2f2a12" stroke-width="1.15" stroke-linejoin="round"/>',

  // A basic sprinkler: the wooden box, water in the top, a cog on its side
  // and the spout throwing an arc of drops out of the front.
  sprinkler:
      // the box, three-quarter view
      '<path d="M3 11.4h11.4v9.2H3z" fill="#a8763f"/>'
    + '<path d="M14.4 11.4l4.2-3.6v9.2l-4.2 3.6z" fill="#8a5c30"/>'
    + '<path d="M3 11.4l4.2-3.6h11.4l-4.2 3.6z" fill="#e0b070"/>'
      // the water sitting in its open top
    + '<path d="M5.2 10.8l2.7-2.3h8.3l-2.7 2.3z" fill="#3f9fd8"/>'
    + '<path d="M3 11.4h11.4v9.2H3zM3 11.4l4.2-3.6h11.4l-4.2 3.6M14.4 20.6l4.2-3.6V7.8"'
    + ' fill="none" stroke="#3d2411" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M6.8 11.6v8.8M10.6 11.6v8.8" fill="none" stroke="#8a5c30" stroke-width="0.8" opacity="0.7"/>'
      // the cog on its side
    + `<path d="${gearPath(16.5, 14.2, 2.6, 1.9, 6)}" fill="#c99359" stroke="#3d2411" stroke-width="0.9" stroke-linejoin="round"/>`
    + '<circle cx="16.5" cy="14.2" r="0.7" fill="#3d2411"/>'
      // the spout out of the front, tipped up
    + '<path d="M4.4 14.2L1.6 11.8l1.4-1.6 2.8 2.4z" fill="#b07a45" stroke="#3d2411" stroke-width="1" stroke-linejoin="round"/>'
      // the spray it throws
    + '<path d="M2.2 9.6c1.2-3.2 4.2-5.6 8-6.4" fill="none" stroke="#6fc4ee" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="0.1 2.2"/>'
    + '<path d="M1.6 5.2c.8 1 1.2 1.7 1.2 2.2a1.2 1.2 0 01-2.4 0c0-.5.4-1.2 1.2-2.2z'
    + 'M6.2 1.2c.8 1 1.2 1.7 1.2 2.2a1.2 1.2 0 01-2.4 0c0-.5.4-1.2 1.2-2.2z"'
    + ' fill="#6fc4ee" stroke="#15496e" stroke-width="0.9" stroke-linejoin="round"/>',

  // A wooden chest in three-quarter view: the lid a shade lighter than the
  // body, two dark bands over both, and the rope-bound clasp in front.
  chest:
      '<path d="M2.8 11.6h14v8.8h-14z" fill="#a8763f"/>'
    + '<path d="M16.8 11.6l4.4-3.4v8.8l-4.4 3.4z" fill="#8a5c30"/>'
      // the lid, a slab over the top
    + '<path d="M2.2 8.4h15.2v3.6H2.2z" fill="#c99359"/>'
    + '<path d="M2.2 8.4l4.6-3.6h15l-4.4 3.6z" fill="#e0b070"/>'
    + '<path d="M17.4 8.4l4.4-3.6v3.6l-4.4 3.6z" fill="#a8763f"/>'
      // the bands, over lid and body both
    + '<path d="M5.6 8.4h1.8v12H5.6zM12.2 8.4H14v12h-1.8z" fill="#6b451f"/>'
    + '<path d="M6.5 8.4l4.5-3.6M13.1 8.4l4.5-3.6" fill="none" stroke="#6b451f" stroke-width="1.8"/>'
    + '<path d="M2.8 11.6h14v8.8h-14zM16.8 20.4l4.4-3.4V8.2M2.2 8.4h15.2v3.6H2.2zM2.2 8.4l4.6-3.6h15l-4.4 3.6M17.4 12l4.4-3.6V4.8"'
    + ' fill="none" stroke="#3d2411" stroke-width="1.2" stroke-linejoin="round"/>'
      // the clasp
    + '<rect x="8.5" y="10.6" width="2.6" height="3" rx="0.6" fill="#d3b167" stroke="#3d2c10" stroke-width="1"/>',

  // A mill: a wooden housing with two grey millstones stacked on it and a
  // hopper of wheat on top, the cog on its side where the crank goes.
  mill:
      // the housing
      '<path d="M3.4 14.2h12.4v7H3.4z" fill="#a8763f"/>'
    + '<path d="M15.8 14.2l3.6-2.8v7l-3.6 2.8z" fill="#8a5c30"/>'
    + '<path d="M3.4 14.2h12.4v7H3.4zM15.8 21.2l3.6-2.8v-7"'
    + ' fill="none" stroke="#3d2411" stroke-width="1.2" stroke-linejoin="round"/>'
      // the two stones
    + '<ellipse cx="11.2" cy="13.2" rx="8.4" ry="2.9" fill="#6f767f" stroke="#2b313c" stroke-width="1.15"/>'
    + '<ellipse cx="11.2" cy="11.8" rx="8.4" ry="2.9" fill="#8b929c" stroke="#2b313c" stroke-width="1.15"/>'
    + '<ellipse cx="11.2" cy="9.4" rx="7.2" ry="2.5" fill="#8b929c" stroke="#2b313c" stroke-width="1.15"/>'
    + '<ellipse cx="11.2" cy="8.2" rx="7.2" ry="2.5" fill="#aab1bd" stroke="#2b313c" stroke-width="1.15"/>'
      // the hopper, with the wheat in it
    + '<path d="M8 2.6h6.4l-1.6 4.8h-3.2z" fill="#c99359" stroke="#3d2411" stroke-width="1.1" stroke-linejoin="round"/>'
    + '<path d="M8.4 3.2h5.6" fill="none" stroke="#f0d07a" stroke-width="1.3" stroke-linecap="round"/>'
      // the cog on its side
    + `<path d="${gearPath(19.6, 16.4, 2.5, 1.8, 6)}" fill="#c99359" stroke="#3d2411" stroke-width="0.9" stroke-linejoin="round"/>`
    + '<circle cx="19.6" cy="16.4" r="0.65" fill="#3d2411"/>',

  // Flour: a sack of it, cloth pale and tied at the neck, with a little
  // spilled at its foot - the white is what says flour and not grain.
  flour:
      '<path d="M7.4 7.6c-2.6 2-4 5.4-4 8.4 0 3.2 2 5.2 4.6 5.4h8c2.6-.2 4.6-2.2 4.6-5.4 0-3-1.4-6.4-4-8.4z"'
    + ' fill="#e8dfcc" stroke="#5a4a2e" stroke-width="1.25" stroke-linejoin="round"/>'
    + '<path d="M14.6 9c1.6 1.8 2.6 4.4 2.6 6.8 0 2-.8 3.6-2.2 4.4" fill="none" stroke="#c9bb9c" stroke-width="1.4" stroke-linecap="round"/>'
      // the neck, gathered and tied
    + '<path d="M8.2 7.6L7 3.2h10l-1.2 4.4z" fill="#f4eee0" stroke="#5a4a2e" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M7.4 7.4h9.2" fill="none" stroke="#b98347" stroke-width="1.8" stroke-linecap="round"/>'
      // a mark of wheat on the front
    + '<path d="M12 18.4v-6M12 13.4l-1.4-1.2M12 13.4l1.4-1.2M12 15.6l-1.4-1.2M12 15.6l1.4-1.2"'
    + ' fill="none" stroke="#c9a94e" stroke-width="1" stroke-linecap="round"/>'
      // a little spilled at its foot
    + '<ellipse cx="20.2" cy="21" rx="2.4" ry="0.9" fill="#f4eee0" stroke="#5a4a2e" stroke-width="0.9"/>',

  // A campfire: two logs crossed at the foot, a ring of stones either side,
  // and the flame standing up out of the middle - the flame is what says
  // fire rather than a pile of wood.
  campfire:
      // the flame, drawn first so the logs cross in front of its foot
      '<path d="M12 2.2c2.8 3 4.6 5.6 4.6 8.6a4.6 4.6 0 01-9.2 0c0-1.6.6-3 1.6-4.2.2 1.4.8 2.4 1.8 2.8-.4-2.6.2-5 1.2-7.2z"'
    + ' fill="#ff7a1a" stroke="#7a2a06" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M12 7.6c1.4 1.4 2.2 2.8 2.2 4.2a2.2 2.2 0 01-4.4 0c0-1.4.8-2.8 2.2-4.2z" fill="#ffd660"/>'
      // the logs, crossed
    + '<path d="M3.6 18.8l15.2-5 1 2.8-15.2 5z" fill="#8a5c30" stroke="#2c1a0e" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<path d="M20.4 18.8L5.2 13.8l-1 2.8 15.2 5z" fill="#a8763f" stroke="#2c1a0e" stroke-width="1.15" stroke-linejoin="round"/>'
    + '<ellipse cx="19.9" cy="20.2" rx="0.9" ry="1.3" fill="#e0b070" stroke="#2c1a0e" stroke-width="0.9"/>'
      // stones at the ends
    + '<path d="M1.2 21.6l.4-2.2 2-.6 1.2 1.6-.6 1.4z" fill="#9aa0ad" stroke="#2b313c" stroke-width="0.9" stroke-linejoin="round"/>'
    + '<path d="M19.6 13.4l.6-1.8 1.8-.2.8 1.6-1 1.2z" fill="#8b929c" stroke="#2b313c" stroke-width="0.9" stroke-linejoin="round"/>',

  // A flint striker: a knapped flint and the stone it is struck on, with
  // sparks flying between them.
  flintStriker:
      // the stone, low and to the right
      '<path d="M10.4 20.6l-.8-4.2 3-3.4 5.4-.4 3.4 3.8-1.2 4.2z" fill="#8b929c" stroke="#2b313c" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M12.6 13l5.4-.4 3.4 3.8-5 .6z" fill="#aab1bd"/>'
    + '<path d="M10.4 20.6l-.8-4.2 3-3.4 5.4-.4 3.4 3.8-1.2 4.2z" fill="none" stroke="#2b313c" stroke-width="1.2" stroke-linejoin="round"/>'
      // the flint, up and to the left, angled down at it
    + '<path d="M2.6 8.2l4.4-5.4 4.6 2.4-1.2 5.8-5.2 1z" fill="#5a6478"/>'
    + '<path d="M2.6 8.2l4.4-5.4 4.6 2.4-5.6 2.8z" fill="#8794ad"/>'
    + '<path d="M2.6 8.2l4.4-5.4 4.6 2.4-1.2 5.8-5.2 1z" fill="none" stroke="#151a27" stroke-width="1.3" stroke-linejoin="round"/>'
    + '<path d="M4 8.6l1.4-3" fill="none" stroke="#c3ccdd" stroke-width="1" stroke-linecap="round"/>'
      // the sparks
    + '<path d="M11.8 11.2l1.6-1.4M13.2 12.4l2.2-.6M10.6 12.6l.4 1.2M14.6 9.6l1-.8" fill="none" stroke="#ffc36e" stroke-width="1.3" stroke-linecap="round"/>'
    + '<circle cx="16.4" cy="8.4" r="0.8" fill="#ffd660"/>',

  // A cup: a short wooden beaker bound round with rope, water at the brim.
  cup:
      '<path d="M5.6 6.4h12.8l-1.4 13.2a1.6 1.6 0 01-1.6 1.4H8.6A1.6 1.6 0 017 19.6z" fill="#b07a45"/>'
    + '<path d="M9.4 6.8l-.4 13.6M12 6.8v13.6M14.6 6.8l.4 13.6" fill="none" stroke="#8a5c30" stroke-width="0.9"/>'
    + '<path d="M5.6 6.4h12.8l-1.4 13.2a1.6 1.6 0 01-1.6 1.4H8.6A1.6 1.6 0 017 19.6z" fill="none" stroke="#2c1a0e" stroke-width="1.35" stroke-linejoin="round"/>'
      // the rope binding round the middle
    + '<path d="M6.5 13.4h11" fill="none" stroke="#3d2c10" stroke-width="2.6"/>'
    + '<path d="M6.5 13.4h11" fill="none" stroke="#d3b167" stroke-width="1.4"/>'
      // the rim, and the water in it
    + '<ellipse cx="12" cy="6.4" rx="6.4" ry="1.9" fill="#6b451f" stroke="#2c1a0e" stroke-width="1.2"/>'
    + '<ellipse cx="12" cy="6.6" rx="4.9" ry="1.15" fill="#3f9fd8"/>'
    + '<path d="M9.6 6.4c.8-.4 2-.5 3-.3" fill="none" stroke="#9fdcff" stroke-width="0.8" stroke-linecap="round"/>',

  // A mixing bowl: a wide wooden bowl, dough in it, a paddle standing up out
  // of it - the paddle is what says "mix" rather than "eat from".
  mixingBowl:
      // the paddle, behind the near rim
      '<path d="M14.6 2.4l1.8.6-2.8 9.4-1.8-.6z" fill="#e0b070" stroke="#3d2411" stroke-width="1" stroke-linejoin="round"/>'
    + '<path d="M2.8 11.2h18.4c-.4 5.2-4.2 8.8-9.2 8.8s-8.8-3.6-9.2-8.8z" fill="#a8763f"/>'
    + '<path d="M4.8 14.4c1.6 2.8 4 4.2 7.2 4.2" fill="none" stroke="#c99359" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M2.8 11.2h18.4c-.4 5.2-4.2 8.8-9.2 8.8s-8.8-3.6-9.2-8.8z" fill="none" stroke="#2c1a0e" stroke-width="1.3" stroke-linejoin="round"/>'
      // the rim and the dough in it
    + '<ellipse cx="12" cy="11.2" rx="9.2" ry="2.4" fill="#6b451f" stroke="#2c1a0e" stroke-width="1.2"/>'
    + '<ellipse cx="12" cy="11.4" rx="7.2" ry="1.5" fill="#f0dfb4"/>'
      // a foot under it
    + '<path d="M8.4 20.4h7.2l.6 1.6H7.8z" fill="#8a5c30" stroke="#2c1a0e" stroke-width="1" stroke-linejoin="round"/>',

  // A cooking stone: a flat grey slab seen three-quarter on, its top glowing
  // hot at the centre - a stone, but one that has been on a fire.
  cookingStone:
      '<path d="M2.6 12.2L12 7.4l9.4 4.8v3.2L12 20.2l-9.4-4.8z" fill="#6f767f"/>'
    + '<path d="M12 17v3.2l9.4-4.8v-3.2z" fill="#5a606b"/>'
    + '<path d="M2.6 12.2L12 7.4l9.4 4.8L12 17z" fill="#9aa0ad"/>'
    + '<path d="M7.4 12.2L12 9.9l4.6 2.3L12 14.5z" fill="#e8814a" opacity="0.85"/>'
    + '<path d="M9.6 12.2L12 11l2.4 1.2L12 13.4z" fill="#ffd660"/>'
    + '<path d="M2.6 12.2L12 7.4l9.4 4.8v3.2L12 20.2l-9.4-4.8zM2.6 12.2L12 17l9.4-4.8M12 17v3.2"'
    + ' fill="none" stroke="#2b313c" stroke-width="1.25" stroke-linejoin="round"/>'
      // a wisp of heat off it
    + '<path d="M10.4 6c-.8-1 .8-1.8 0-3M13.8 6c-.8-1 .8-1.8 0-3" fill="none" stroke="#ffb070" stroke-width="1" stroke-linecap="round"/>',

  // Plain bread dough: a pale round ball, floured, with a fold in it.
  breadDough:
      '<path d="M3.4 16.2c0-4.8 3.8-8.4 8.6-8.4s8.6 3.6 8.6 8.4c0 2.4-3.8 3.8-8.6 3.8s-8.6-1.4-8.6-3.8z"'
    + ' fill="#f0dfb4" stroke="#6b5116" stroke-width="1.25" stroke-linejoin="round"/>'
    + '<path d="M6.4 12.6c1.8-2 3.8-2.8 6.4-2.6" fill="none" stroke="#fff6de" stroke-width="1.6" stroke-linecap="round"/>'
    + '<path d="M8.6 16.4c2 .8 4.8.8 7-.4" fill="none" stroke="#c9ad6e" stroke-width="1.1" stroke-linecap="round"/>'
      // a dusting of flour
    + '<circle cx="15.6" cy="11.8" r="0.6" fill="#ffffff"/><circle cx="10.2" cy="14" r="0.5" fill="#ffffff"/>'
    + '<circle cx="17.2" cy="14.6" r="0.5" fill="#ffffff"/>',

  // A bread loaf: a golden-brown bake, domed, with the slashes across its top
  // - the slashes are what make it bread and not a stone.
  bread:
      '<path d="M2.6 16.4c0-5 4.2-8.8 9.4-8.8s9.4 3.8 9.4 8.8v1.4c0 1.2-1 2.2-2.2 2.2H4.8c-1.2 0-2.2-1-2.2-2.2z" fill="#c98a3c"/>'
    + '<path d="M4.4 13.4c1.4-3 4.2-4.6 7.6-4.6 2.6 0 4.8 1 6.4 2.6" fill="none" stroke="#e8b060" stroke-width="2" stroke-linecap="round"/>'
    + '<path d="M2.6 16.4c0-5 4.2-8.8 9.4-8.8s9.4 3.8 9.4 8.8v1.4c0 1.2-1 2.2-2.2 2.2H4.8c-1.2 0-2.2-1-2.2-2.2z" fill="none" stroke="#5a3410" stroke-width="1.3" stroke-linejoin="round"/>'
      // the slashes, pale where the crust opened
    + '<path d="M7 12.6l2.2 2.4M11 11.2l2.2 2.4M15 11.6l2 2.2" fill="none" stroke="#f3d69a" stroke-width="1.4" stroke-linecap="round"/>'
    + '<path d="M3 17.6h18" fill="none" stroke="#8a5a22" stroke-width="1" />'
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
