/**
 * The soundtrack: a slow ambient loop, played by the Web Audio API itself.
 *
 * There is no audio file. A warm pad moves through eight chords in D, ten
 * seconds each, over a soft sub drone, and a few glassy bells ring out over
 * it through a long echo and a generated reverb. The bells are rolled off a
 * fixed seed, so every pass of the 80 second loop is the same piece rather
 * than a random wander - a loop, as asked, and one quiet enough to sit under
 * an afternoon of chopping trees.
 *
 * A browser will not make a sound before the page has had a click or a key,
 * so the context is resumed on the first of those, the same way full screen
 * is asked for (fullscreen.js). The desktop shell lets it start on launch
 * (`autoplayPolicy` in electron/main.cjs).
 *
 * Notes are scheduled a little ahead of the audio clock off a timer, never
 * the frame loop: the frame delta is capped and stalls, and a note that
 * waits on a frame arrives late.
 */

const CHORD_SECONDS = 10;
const LOOKAHEAD = 2.5;               // seconds of music queued ahead of the clock
const TICK_MS = 250;
const BASE_GAIN = 0.32;              // what volume 1 comes out as

// MIDI note numbers. Low to high, the root in the bass line beside it.
const CHORDS = [
  { bass: 38, pad: [50, 57, 61, 64, 66] },   // Dmaj9
  { bass: 35, pad: [47, 54, 57, 61, 62] },   // Bm9
  { bass: 31, pad: [43, 50, 54, 59, 61] },   // Gmaj7#11
  { bass: 33, pad: [45, 52, 59, 61, 64] },   // Asus2
  { bass: 30, pad: [42, 50, 57, 61, 64] },   // Dmaj7/F#
  { bass: 28, pad: [40, 47, 55, 62, 66] },   // Em9
  { bass: 31, pad: [43, 50, 57, 59, 66] },   // Gmaj9
  { bass: 33, pad: [45, 52, 54, 59, 62] }    // A6sus
];

// The bells only ever play D major pentatonic, so nothing they land on
// can clash with the pad underneath.
const BELL_NOTES = [74, 76, 78, 81, 83, 86, 88, 90];

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two to four bells per chord, at fixed moments inside it.
const BELLS = (() => {
  const rand = seeded(0xe57e2);
  return CHORDS.map(() => {
    const count = 2 + Math.floor(rand() * 3);
    const hits = [];
    for (let i = 0; i < count; i++) {
      hits.push({
        at: 0.8 + rand() * (CHORD_SECONDS - 2),
        note: BELL_NOTES[Math.floor(rand() * BELL_NOTES.length)],
        level: 0.35 + rand() * 0.4
      });
    }
    return hits.sort((a, b) => a.at - b.at);
  });
})();

export function createMusic({ volume = 0.5 } = {}) {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return { setVolume() {}, toggleMute() { return false; }, muted: () => true };

  const ctx = new Context();

  // --- the mix --------------------------------------------------------------
  const master = ctx.createGain();
  master.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 4;
  master.connect(limiter).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 6, 2.6);
  const reverbLevel = ctx.createGain();
  reverbLevel.gain.value = 0.9;
  reverb.connect(reverbLevel).connect(master);

  // The pad's own filter breathes open and shut once every twenty seconds.
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 900;
  padFilter.Q.value = 0.6;
  const breath = ctx.createOscillator();
  breath.frequency.value = 0.05;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 350;
  breath.connect(breathDepth).connect(padFilter.frequency);
  breath.start();

  const padBus = ctx.createGain();
  padBus.gain.value = 0.55;
  padFilter.connect(padBus);
  padBus.connect(master);
  padBus.connect(reverb);

  // The bells go through a dotted echo before the reverb.
  const bellBus = ctx.createGain();
  bellBus.gain.value = 0.5;
  const echo = ctx.createDelay(2);
  echo.delayTime.value = 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 2600;
  bellBus.connect(master);
  bellBus.connect(reverb);
  bellBus.connect(echo);
  echo.connect(echoTone).connect(feedback).connect(echo);
  echoTone.connect(reverb);
  echoTone.connect(master);

  // --- voices ---------------------------------------------------------------
  function padNote(midi, start, length, level) {
    const f = hz(midi);
    const env = ctx.createGain();
    const attack = 3;
    const release = 4;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(level, start + attack);
    env.gain.setValueAtTime(level, start + length);
    env.gain.linearRampToValueAtTime(0, start + length + release);
    env.connect(padFilter);

    // A triangle and two faintly detuned saws, for a slow chorus.
    for (const [type, cents, mix] of [['triangle', 0, 1], ['sawtooth', -7, 0.22], ['sawtooth', 7, 0.22]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f;
      osc.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = mix;
      osc.connect(g).connect(env);
      osc.start(start);
      osc.stop(start + length + release + 0.1);
    }
  }

  function bassNote(midi, start, length) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.22, start + 2.5);
    env.gain.setValueAtTime(0.22, start + length);
    env.gain.linearRampToValueAtTime(0, start + length + 3);
    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(start + length + 3.1);
  }

  function bell(midi, start, level) {
    const f = hz(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(level * 0.18, start + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 4.5);
    env.connect(bellBus);

    // A pure tone and a faint inharmonic partial - what makes it glass.
    for (const [ratio, mix, decay] of [[1, 1, 4.5], [2.76, 0.18, 1.4], [5.4, 0.06, 0.6]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(mix, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + decay);
      osc.connect(g).connect(env);
      osc.start(start);
      osc.stop(start + 4.6);
    }
  }

  // --- the sequencer --------------------------------------------------------
  let next = 0;          // audio time the next chord starts at
  let index = 0;         // which chord that is

  function schedule() {
    if (ctx.state !== 'running') return;
    // Fell behind - a stalled tab, a sleeping laptop. Pick up from now
    // rather than firing every missed chord at once.
    if (next < ctx.currentTime) next = ctx.currentTime + 0.1;
    while (next < ctx.currentTime + LOOKAHEAD) {
      const chord = CHORDS[index];
      chord.pad.forEach((midi, i) => padNote(midi, next, CHORD_SECONDS, i === 0 ? 0.09 : 0.06));
      bassNote(chord.bass, next, CHORD_SECONDS);
      for (const hit of BELLS[index]) bell(hit.note, next + hit.at, hit.level);
      next += CHORD_SECONDS;
      index = (index + 1) % CHORDS.length;
    }
  }

  setInterval(schedule, TICK_MS);

  // --- volume ---------------------------------------------------------------
  let level = volume;
  let muted = false;
  let started = false;

  function applyVolume(fade = 0.4) {
    const target = muted ? 0 : level * BASE_GAIN;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + fade);
  }

  function begin() {
    if (started || ctx.state !== 'running') return;
    started = true;
    window.removeEventListener('pointerdown', wake, true);
    window.removeEventListener('keydown', wake, true);
    applyVolume(5);            // swell in rather than start mid-chord at full
    schedule();
  }

  ctx.onstatechange = begin;
  function wake() {
    ctx.resume().then(begin, () => {});
  }
  window.addEventListener('pointerdown', wake, true);
  window.addEventListener('keydown', wake, true);
  wake();

  return {
    setVolume(v) {
      level = v;
      if (started) applyVolume();
    },
    /** Silence it or bring it back; returns whether it is now muted. */
    toggleMute() {
      muted = !muted;
      if (started) applyVolume(0.8);
      return muted;
    },
    muted: () => muted
  };
}

/** A reverb tail: stereo noise dying away over `seconds`. */
function impulse(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}
