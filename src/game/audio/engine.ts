import type { Score } from "./score";

/**
 * The one impure part of the sound: an `AudioContext`, a master gain, and a
 * few oscillators.
 *
 * Every constraint here is inherited from `src/herald/deck/dealFeedback.ts`,
 * which solved the same problems for the ceremonial deal:
 *
 * - **Synthesis only.** Not one audio file. The PWA precaches
 *   `js,css,html,svg,woff2` and the CSP is `default-src 'self'` with no
 *   `media-src` — a sampled instrument would mean touching the service
 *   worker and the security headers for something oscillators can do.
 * - **Silent until asked.** The preference defaults to off and lives in
 *   `localStorage` under the `theme.ts` pattern.
 * - **The context is only ever created inside a user gesture**, which is what
 *   browser autoplay policy requires and what keeps the page silent on load.
 *
 * It is also, deliberately, not a synthesiser. It plays a drone, a melody
 * line and short one-shots; anything more belongs in `score.ts`, where it can
 * be tested.
 */

const PREF_KEY = "otzar-game-sound";

export function isGameSoundOn(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

export function setGameSoundOn(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice still holds for this session.
  }
}

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let droneOsc: OscillatorNode | undefined;
let droneGain: GainNode | undefined;

/** Create/resume the shared context and master gain. Call from a gesture. */
export function ensureGameAudio(): boolean {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** Stop everything and drop the context — used when the sound is turned off. */
export function stopGameAudio(): void {
  try {
    stopDrone();
    if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  } catch {
    // Nothing to stop.
  }
}

function running(): boolean {
  return Boolean(ctx && master && ctx.state === "running");
}

/** The overall level, eased rather than jumped so a veiling ducks smoothly. */
export function setLevel(level: number): void {
  if (!running() || !ctx || !master) return;
  master.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.5, ctx.currentTime, 0.12);
}

// ---------------------------------------------------------------------------
// the drone
// ---------------------------------------------------------------------------

/**
 * A single low tone under everything, at the tonic of the rung. It is what
 * makes an empty-handed climb sound like a place rather than like silence.
 */
export function setDrone(hz: number): void {
  if (!running() || !ctx || !master) return;
  if (!droneOsc) {
    droneOsc = ctx.createOscillator();
    droneGain = ctx.createGain();
    droneOsc.type = "sine";
    droneGain.gain.value = 0;
    droneOsc.connect(droneGain);
    droneGain.connect(master);
    droneOsc.start();
    droneGain.gain.setTargetAtTime(0.09, ctx.currentTime, 1.4);
  }
  droneOsc.frequency.setTargetAtTime(hz, ctx.currentTime, 0.6);
}

function stopDrone(): void {
  if (!ctx || !droneOsc || !droneGain) return;
  droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  const osc = droneOsc;
  window.setTimeout(() => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // Already gone.
    }
  }, 600);
  droneOsc = undefined;
  droneGain = undefined;
}

// ---------------------------------------------------------------------------
// voices
// ---------------------------------------------------------------------------

/**
 * One plucked tone. Everything audible in the game is this function with
 * different numbers — the nigun's notes, the letter bells, the footfalls.
 */
export function pluck(
  hz: number,
  when: number,
  seconds: number,
  gain: number,
  type: OscillatorType = "triangle",
): void {
  if (!running() || !ctx || !master || hz <= 0 || gain <= 0) return;
  const at = Math.max(ctx.currentTime, when);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, at);
  // A quick attack and a long-ish exponential tail reads as struck rather
  // than switched on, which is the whole difference between a note and a beep.
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(env);
  env.connect(master);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
  };
}

/** A short burst of filtered noise — paper, cloth, a footfall on stone. */
export function breath(when: number, seconds: number, gain: number, hz: number): void {
  if (!running() || !ctx || !master) return;
  const at = Math.max(ctx.currentTime, when);
  const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    // Fades across the buffer so it never clicks at either end.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = hz;
  filter.Q.value = 0.8;
  const env = ctx.createGain();
  env.gain.value = gain;
  source.connect(filter);
  filter.connect(env);
  env.connect(master);
  source.start(at);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    env.disconnect();
  };
}

// ---------------------------------------------------------------------------
// the nigun
// ---------------------------------------------------------------------------

let phraseTimer: number | undefined;

/**
 * Plays the score's phrase, once, scheduled on the **audio clock** rather
 * than with a timer per note. `dealFeedback.ts` uses `setTimeout` per card,
 * which is fine for eight ticks half a second apart and audibly wrong for a
 * pulse — `setTimeout` drifts, and the ear hears drift long before the eye
 * sees a dropped frame.
 */
export function playPhrase(score: Score): void {
  if (!running() || !ctx) return;
  const start = ctx.currentTime + 0.05;
  score.notes.forEach((note, i) => {
    if (note.hz <= 0) return;
    pluck(note.hz, start + i * score.secondsPerNote, score.secondsPerNote * 1.6, note.gain);
  });
}

/** Repeats the phrase for as long as the sound is on. */
export function startNigun(getScore: () => Score | undefined): void {
  stopNigun();
  const tick = () => {
    const score = getScore();
    if (!score || !running()) return;
    playPhrase(score);
    setDrone(score.droneHz);
    setLevel(score.level);
    // Re-arm from the phrase we just scheduled, plus a breath between
    // repetitions so it does not run as a loop with no seam.
    const cycle = (score.notes.length + 2) * score.secondsPerNote * 1000;
    phraseTimer = window.setTimeout(tick, cycle);
  };
  tick();
}

export function stopNigun(): void {
  if (phraseTimer !== undefined) {
    window.clearTimeout(phraseTimer);
    phraseTimer = undefined;
  }
}

/** The audio clock, for scheduling one-shots relative to now. */
export function now(): number {
  return ctx?.currentTime ?? 0;
}

/** Test seam: whether a context has been constructed at all. */
export function hasContext(): boolean {
  return ctx !== undefined;
}
