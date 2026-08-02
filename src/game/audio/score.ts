import { lettersById } from "../../data/letters";
import type { SefirahId } from "../../types/letter";
import { misparKatan } from "../values";
import { modeFor, pitchOf, RUNG_VOICES, type Mode } from "./modes";
import { FESTIVAL_NIGUNIM, nigunimById, type Nigun } from "./nigunim";

/**
 * What the climb sounds like — decided here, and rendered elsewhere.
 *
 * This module is **pure**. It never touches an `AudioContext`, the DOM, a
 * timer or the clock; given the same climb it returns the same description
 * every time. That is the same division the game already keeps between
 * `world/step.ts` (a pure simulation) and `GameCanvas` (the one impure loop),
 * and it is what lets the music be unit-tested rather than listened to
 * hopefully.
 *
 * ## The idea
 *
 * The score is not laid over the game; it is played *by* it.
 *
 * - The **Sefirah** picks the prayer mode and the register, so the ascent
 *   rises in pitch and changes character as it climbs.
 * - The **letters you hold** decide which scale degrees are allowed to sound.
 *   Each letter opens the degree of its own `misparKatan` — the traditional
 *   reduction of its gematria to a single digit, which lands conveniently in
 *   1–9. Carrying nothing, only the tonic drones; the melody fills in as the
 *   alphabet does. Progression you can hear.
 * - The **day** may name the nigun, through the same Sacred Time the rest of
 *   the game already runs on.
 * - The **moment** bends the texture: a veiling collapses everything to a
 *   drone, an opened gate rings a cadence.
 */

/** Everything the score needs to know about the climb right now. */
export interface ScoreContext {
  sefirah: SefirahId;
  /** Letter ids the Scribe carries. */
  lettersHeld: readonly string[];
  /** Active festival ids, most-specific first (from the Sacred Time snapshot). */
  festivalIds?: readonly string[];
  /** True while the Scribe is veiled — everything drops away. */
  veiled?: boolean;
  /** True in the region this climb's Encounter illuminates. */
  illumined?: boolean;
}

/** One note the engine should sound, already resolved to a pitch. */
export interface ScoreNote {
  /** Hz, or 0 for a rest. */
  hz: number;
  /** 0–1, before the master gain. */
  gain: number;
}

/** A complete description of what should be sounding. */
export interface Score {
  mode: Mode;
  nigun: Nigun;
  /** Hz of the drone under everything. */
  droneHz: number;
  /** The melody, already in the mode and register. Rests are `hz: 0`. */
  notes: ScoreNote[];
  /** Which scale degrees the held letters have opened, ascending. */
  openDegrees: number[];
  /** Seconds per note — slower up the Tree, so the crown is nearly still. */
  secondsPerNote: number;
  /** 0–1 overall level; a veiling ducks this to near nothing. */
  level: number;
}

/**
 * The scale degree a letter opens. `misparKatan` reduces any gematria to
 * 1–9 — aleph 1, yod 10 → 1, kuf 100 → 1 — so the three letters the
 * tradition already treats as one number open one degree between them.
 */
export function degreeForLetter(letterId: string): number | undefined {
  const letter = lettersById[letterId];
  if (!letter) return undefined;
  return misparKatan(letter.gematria);
}

/** Every degree the held letters have opened, ascending and deduplicated. */
export function openDegrees(lettersHeld: readonly string[]): number[] {
  const degrees = new Set<number>();
  for (const id of lettersHeld) {
    const degree = degreeForLetter(id);
    if (degree !== undefined) degrees.add(degree);
  }
  return [...degrees].sort((a, b) => a - b);
}

/**
 * Bends a phrase onto the degrees actually available.
 *
 * A note whose degree is closed does not simply vanish — it falls back to the
 * nearest open one, so an early climb sounds sparse and modal rather than
 * full of holes. The tonic is always open, so there is always somewhere to
 * fall back to.
 */
export function bendToOpen(degree: number, open: readonly number[]): number {
  if (degree === 0) return 0;
  if (open.includes(degree)) return degree;
  let best = 1;
  let bestDistance = Infinity;
  for (const candidate of open) {
    const distance = Math.abs(candidate - degree);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * The upper three, above the Abyss. They are quieter and slower than the
 * seven below not because they are higher — Chesed shares their register —
 * but because of what they are, so this is asked as its own question rather
 * than inferred from the octave.
 */
export function isSupernal(sefirah: SefirahId): boolean {
  return sefirah === "binah" || sefirah === "chochmah" || sefirah === "keter";
}

/** Which nigun this moment calls for — the day's, else the rung's. */
export function nigunFor(ctx: ScoreContext): Nigun {
  for (const id of ctx.festivalIds ?? []) {
    const named = FESTIVAL_NIGUNIM[id];
    if (named && nigunimById[named]) return nigunimById[named];
  }
  return nigunimById[isSupernal(ctx.sefirah) ? "supernal-phrase" : "ascent-phrase"];
}

/**
 * The whole description. Deterministic: same climb in, same score out.
 */
export function scoreFor(ctx: ScoreContext): Score {
  const mode = modeFor(ctx.sefirah);
  const octave = RUNG_VOICES[ctx.sefirah]?.octave ?? 0;
  const nigun = nigunFor(ctx);

  // The tonic is always available, so a Scribe carrying nothing still has a
  // drone to climb over rather than silence.
  const open = openDegrees(ctx.lettersHeld);
  if (!open.includes(1)) open.unshift(1);

  const notes: ScoreNote[] = nigun.phrase.map((degree) => {
    if (degree === 0) return { hz: 0, gain: 0 };
    const sounded = bendToOpen(degree, open);
    return {
      hz: pitchOf(mode, sounded, octave),
      // A bent note is quieter than one the Scribe has actually earned.
      gain: sounded === degree ? 0.16 : 0.09,
    };
  });

  // Slower the higher you climb, and slower again above the Abyss: Malchut
  // walks, Keter barely moves.
  const secondsPerNote = 0.42 + octave * 0.16 + (isSupernal(ctx.sefirah) ? 0.35 : 0);

  return {
    mode,
    nigun,
    droneHz: pitchOf(mode, 1, Math.max(0, octave - 1)),
    notes,
    openDegrees: open,
    secondsPerNote,
    // A veiling is not silence — the drone remains, and everything else goes.
    level: ctx.veiled ? 0.12 : ctx.illumined ? 1 : 0.82,
  };
}
