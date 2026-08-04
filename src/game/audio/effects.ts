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

// ---------------------------------------------------------------------------
// the fight
// ---------------------------------------------------------------------------

/**
 * **The fight was silent.** Everything above is the Scribe's body and the
 * things they pick up — and the loop they actually spend a climb inside made
 * no sound at all: a mark thrown, a shell struck, a klipah broken, a lamp gone
 * out. Five events of about twenty-five were wired, and none of the five was
 * combat, so the most kinetic part of the game read as a diagram.
 *
 * These stay inside the rung's mode like the rest, but they sit **below** the
 * melody rather than in it: a fight should be felt as percussion under the
 * nigun, not as a second tune arguing with it. So the tonics are low, the
 * plucks are short, and the only bright thing in here is a shell giving way —
 * which is the one moment the light actually comes out.
 */

/** A mark written and thrown: the pen leaving the page. Dry, and very short. */
export function strike(score: Score): void {
  const at = now();
  breath(at, 0.04, 0.045, 2200);
  pluck(pitchOf(score.mode, 5, 0), at, 0.09, 0.05, "square");
}

/**
 * A mark meeting a shell and not breaking it — a knock, deliberately dull.
 * This is the commonest sound in the game after a footfall, so it has to be
 * something a player can hear a hundred times without noticing it.
 */
export function hit(score: Score): void {
  const at = now();
  breath(at, 0.05, 0.03, 900);
  pluck(pitchOf(score.mode, 2, 0), at, 0.08, 0.035, "triangle");
}

/**
 * A shell given up: the noise of the break, and then the light that was shut
 * inside it. The bright part is the point — it is the same tick a mote makes,
 * because it is the same light.
 */
export function broken(score: Score): void {
  const at = now();
  breath(at, 0.1, 0.06, 1500);
  pluck(pitchOf(score.mode, 8, 1), at + 0.03, 0.35, 0.08, "triangle");
  pluck(pitchOf(score.mode, 5, 1), at + 0.09, 0.5, 0.05, "sine");
}

/**
 * One lamp gone. A step *down* the mode rather than a sting: what the Scribe
 * is made of is smaller than it was, and there is still some of it left.
 */
export function lampLost(score: Score): void {
  const at = now();
  pluck(pitchOf(score.mode, 4, 0), at, 0.5, 0.11, "sine");
  pluck(pitchOf(score.mode, 2, 0), at + 0.1, 0.8, 0.09, "sine");
}

/**
 * The last of them. The drone's own note, an octave under, left to fall away
 * — the kingdom coming up to meet the Scribe rather than a failure buzzer.
 * There is no losing in this game; there is waking up further down.
 */
export function goingOut(score: Score): void {
  const at = now();
  pluck(score.droneHz / 2, at, 2.6, 0.14, "sine");
  pluck(score.droneHz / 4, at + 0.18, 3.2, 0.1, "sine");
  breath(at + 0.05, 0.9, 0.03, 300);
}

/**
 * Light poured into a Sefirah, which is the only thing light is for. Rising
 * where `cadence` falls: a kindling is not an arrival, it is a place lit that
 * will still be lit after the Scribe has gone out.
 */
export function kindled(score: Score): void {
  const at = now();
  [1, 3, 5, 8].forEach((degree, i) => {
    pluck(pitchOf(score.mode, degree, 1), at + i * 0.11, 1.2, 0.11, "triangle");
  });
  pluck(pitchOf(score.mode, 1, 2), at + 0.44, 2.4, 0.07, "sine");
}

/** A vessel lifted off its pedestal: an object, so a knock rather than a note. */
export function vessel(score: Score): void {
  const at = now();
  breath(at, 0.08, 0.045, 1200);
  pluck(pitchOf(score.mode, 3, 0), at + 0.04, 0.6, 0.08, "triangle");
  pluck(pitchOf(score.mode, 6, 0), at + 0.14, 0.5, 0.05, "sine");
}
