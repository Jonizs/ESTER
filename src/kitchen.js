/**
 * What can be mixed and what can be cooked - the mixing bowl's and the
 * cooking stone's recipes, kept apart from the bench's `RECIPES` because
 * nothing here is crafted on a grid: things go INTO a station and something
 * else comes out of it once it has been worked.
 *
 * Both screens list these read-only, as "put this in, get that out" - you
 * cannot craft from the list, it is there so the player knows what to feed
 * the thing.
 *
 * `water` in a mix is millilitres, not an item: it comes out of a cup, one
 * pour at a time, and the cup stays behind empty.
 */

export const MIX_RECIPES = [
  {
    id: 'breadDough',
    in: { flour: 5, water: 100 },
    out: { item: 'breadDough', count: 1 },
    // Seconds of cranking to work one batch together.
    seconds: 4
  }
];

export const COOK_RECIPES = [
  {
    id: 'bread',
    from: 'breadDough',
    out: { item: 'bread', count: 3 },
    // At 250C, the least a stone has to be to cook at all. Every degree over
    // takes a share off, up to half at 480C - see `cookSeconds`.
    seconds: 60
  }
];

/**
 * The cooking stone's temperatures. It starts cold, heats while the fire
 * under it burns and cools once the fire is out.
 */
export const STONE = {
  cold: 20,
  cooks: 250,           // below this nothing cooks
  max: 480,
  heatPerSecond: 5,
  coolPerSecond: 2,
  // The most a hot stone can take off a recipe's time, reached at `max`.
  bestCut: 0.5
};

/**
 * How long a recipe takes at this temperature, or Infinity below 250C.
 *
 * The half off is spread evenly over 250C..480C: at 250 it is the recipe's
 * full time, at 365 three quarters, at 480 half.
 */
export function cookSeconds(recipe, temp) {
  if (temp < STONE.cooks) return Infinity;
  const over = Math.min(1, (temp - STONE.cooks) / (STONE.max - STONE.cooks));
  return recipe.seconds * (1 - STONE.bestCut * over);
}

/** The mix whose every input the bowl holds at least enough of, or null. */
export function mixFor(contents) {
  return MIX_RECIPES.find((r) => Object.entries(r.in)
    .every(([item, n]) => (contents?.[item] ?? 0) >= n)) ?? null;
}

/** What a cooking stone does with this ingredient, or null. */
export const cookFor = (item) => COOK_RECIPES.find((r) => r.from === item) ?? null;

/** Everything that may go into a bowl at all. */
export const MIX_INPUTS = new Set(MIX_RECIPES.flatMap((r) => Object.keys(r.in)));
