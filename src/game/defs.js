/**
 * Static content: what can be built, what can be researched, and the events
 * that arrive every seventh day. Kept as plain data so the systems that use
 * it stay small.
 */

export const RESOURCES = ['wood', 'stone', 'food', 'metal'];

export const BUILDINGS = {
  campfire: {
    label: 'Campfire',
    cost: { wood: 55 },
    work: 110,
    size: 1,
    blocks: false,
    desc: 'Warmth and company. Lifts mood for anyone nearby.',
    tech: null
  },
  bedroll: {
    label: 'Bedroll',
    cost: { wood: 70 },
    work: 100,
    size: 1,
    blocks: false,
    desc: 'Somewhere to sleep. Rest recovers far faster than on bare rock.',
    tech: null
  },
  farm: {
    label: 'Farm plot',
    cost: { wood: 85 },
    work: 150,
    size: 1,
    blocks: false,
    desc: 'Grows food on its own once tended. The way off a berry diet.',
    tech: 'agriculture'
  },
  workbench: {
    label: 'Workbench',
    cost: { wood: 110, stone: 45 },
    work: 190,
    size: 1,
    blocks: true,
    desc: 'Better tools. Speeds up every harvest job on the island.',
    tech: 'toolmaking'
  },
  lab: {
    label: 'Study',
    cost: { wood: 130, stone: 80 },
    work: 240,
    size: 1,
    blocks: true,
    desc: 'Where colonists think. Required for any research at all.',
    tech: null
  },
  wall: {
    label: 'Wall',
    cost: { stone: 22 },
    work: 55,
    size: 1,
    blocks: true,
    desc: 'Raiders have to walk around it. Cheap, and it adds up.',
    tech: 'masonry'
  },
  turret: {
    label: 'Turret',
    cost: { metal: 70, stone: 55 },
    work: 280,
    size: 1,
    blocks: true,
    desc: 'Fires on hostiles within eight cells. Does not need a colonist.',
    tech: 'defence'
  },
  quarry: {
    label: 'Quarry',
    cost: { wood: 60 },
    work: 170,
    size: 1,
    blocks: true,
    desc: 'Cuts stone straight out of the isle. Slow, but it never runs dry.',
    tech: 'masonry'
  },
  smelter: {
    label: 'Smelter',
    cost: { stone: 110, wood: 65 },
    work: 240,
    size: 1,
    blocks: true,
    desc: 'Turns raw ore into usable metal over time.',
    tech: 'metallurgy'
  },
  beacon: {
    label: 'Void Beacon',
    cost: { metal: 240, stone: 180, wood: 140 },
    work: 1400,
    size: 1,
    blocks: true,
    desc: 'A signal loud enough to be heard off-world. Finish it to win.',
    tech: 'beacon'
  }
};

export const RESEARCH = {
  toolmaking: {
    label: 'Toolmaking',
    cost: 1200,
    needs: [],
    track: 'tech',
    desc: 'Sharpened tools. +25% harvest speed, unlocks the workbench.'
  },
  agriculture: {
    label: 'Agriculture',
    cost: 1500,
    needs: [],
    track: 'tech',
    desc: 'Sow what you forage. Unlocks farm plots.'
  },
  masonry: {
    label: 'Masonry',
    cost: 1800,
    needs: ['toolmaking'],
    track: 'tech',
    desc: 'Dressed stone. Unlocks walls.'
  },
  letters: {
    label: 'Letters',
    cost: 2000,
    needs: [],
    track: 'academic',
    desc: 'Writing things down. Colonists learn skills 40% faster.'
  },
  medicine: {
    label: 'Medicine',
    cost: 2400,
    needs: ['letters'],
    track: 'academic',
    desc: 'Wounds close. Colonists recover health steadily.'
  },
  metallurgy: {
    label: 'Metallurgy',
    cost: 3000,
    needs: ['masonry'],
    track: 'tech',
    desc: 'Ore into metal. Unlocks the smelter.'
  },
  defence: {
    label: 'Defence Grid',
    cost: 3400,
    needs: ['metallurgy'],
    track: 'tech',
    desc: 'Automated fire. Unlocks turrets.'
  },
  society: {
    label: 'Society',
    cost: 2800,
    needs: ['letters'],
    track: 'social',
    desc: 'Rules worth keeping. Mood decays more slowly, survivors arrive more often.'
  },
  beacon: {
    label: 'Void Beacon',
    cost: 6200,
    needs: ['defence', 'society'],
    track: 'tech',
    desc: 'The way home. Unlocks the beacon - build it to win.'
  }
};

/**
 * Event on every seventh day. The list cycles, and severity scales with how
 * many weeks have passed.
 */
export const EVENTS = [
  {
    id: 'raid',
    title: 'Raiders inbound',
    warn: 'Scanners pick up a hostile drop heading for the isle.',
    kind: 'combat'
  },
  {
    id: 'storm',
    title: 'Ion storm',
    warn: 'An ion front is building. It will batter anyone caught outside.',
    kind: 'storm'
  },
  {
    id: 'blight',
    title: 'Blight',
    warn: 'Something is spreading through the crops and the berry bushes.',
    kind: 'blight'
  },
  {
    id: 'raid',
    title: 'Raiders inbound',
    warn: 'A larger hostile party has locked onto the colony.',
    kind: 'combat'
  },
  {
    id: 'refugees',
    title: 'Escape pod',
    warn: 'A damaged pod is falling towards the isle. Someone may be alive inside.',
    kind: 'refugees'
  }
];

export const NAMES = [
  'Vera', 'Tam', 'Odell', 'Juno', 'Rhys', 'Mira', 'Cass', 'Bex',
  'Iri', 'Soren', 'Wend', 'Halle', 'Nox', 'Pell', 'Ash', 'Kiro'
];
