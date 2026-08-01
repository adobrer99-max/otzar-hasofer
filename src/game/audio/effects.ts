import { pitchOf } from "./modes";
import { breath, now, pluck } from "./engine";
import type { Score } from "./score";
import { degreeForLetter } from "./score";

/**
 * The one-shots — everything the Scribe's own body and hands make.
 *
 * These are what actually change how the game feels, far more than the
 * melody does. A side-scroller where jumping is silent reads as a diagram;
 * the same game with a note under every leap reads as a place. All of them
 * are tuned **into the rung's current mode**, so the effects and the nigun
 * are never in different keys — a footfall is the tonic, a letter rings on
 * its own scale degree.
 */

/** A footfall: low, short, barely pitched. The tonic, felt more than heard. */
export function footfall(score: Score): void {
  breath(now(), 0.05, 0.05, score.droneHz * 2);
}

/** A leap: the tonic answered a fifth above. The second jump goes higher. */
export function leap(score: Score, second: boolean): void {
  const at = now();
  pluck(pitchOf(score.mode, second ? 5 : 3, 1), at, 0.18, 0.09, "sine");
  pluck(pitchOf(score.mode, second ? 8 : 5, 1), at + 0.05, 0.22, 0.07, "sine");
}

/** A mote of light gathered — the small bright tick, high and quick. */
export function mote(score: Score): void {
  pluck(pitchOf(score.mode, 8, 1), now(), 0.12, 0.06, "triangle");
}

/**
 * A letter taken, rung on **its own degree** — the one it has just opened in
 * the score. So the sound of finding Aleph is the sound Aleph will now make.
 */
export function letterFound(score: Score, letterId: string): void {
  const degree = degreeForLetter(letterId) ?? 1;
  const at = now();
  pluck(pitchOf(score.mode, degree, 1), at, 1.1, 0.15, "triangle");
  pluck(pitchOf(score.mode, degree, 2), at + 0.06, 0.9, 0.07, "sine");
}

/** A scroll fragment lifted from its niche: paper, not tone. */
export function fragment(): void {
  const at = now();
  breath(at, 0.16, 0.05, 2600);
  breath(at + 0.1, 0.12, 0.035, 3400);
}

/** The scroll made whole, or a Word-Gate opening: a cadence onto the tonic. */
export function cadence(score: Score): void {
  const at = now();
  // 5 → 4 → 3 → 1, the plainest way to say "arrived".
  [5, 4, 3, 1].forEach((degree, i) => {
    pluck(pitchOf(score.mode, degree, 1), at + i * 0.13, 0.7, 0.13, "triangle");
  });
  pluck(pitchOf(score.mode, 1, 0), at + 0.39, 1.6, 0.1, "sine");
}

/**
 * A veiling. Not a death sting — the Scribe is insubstantial for a moment and
 * then wakes at their mark, so this falls away rather than hitting.
 */
export function veiling(score: Score): void {
  const at = now();
  pluck(score.droneHz, at, 1.3, 0.12, "sine");
  pluck(score.droneHz / 2, at + 0.08, 1.8, 0.09, "sine");
}

/** A region's exit reached: the mode's tonic, rung and left to ring. */
export function arrival(score: Score): void {
  const at = now();
  pluck(pitchOf(score.mode, 1, 1), at, 2.2, 0.16, "triangle");
  pluck(pitchOf(score.mode, 5, 1), at + 0.12, 2.0, 0.1, "sine");
  pluck(pitchOf(score.mode, 8, 1), at + 0.24, 1.8, 0.07, "sine");
}
