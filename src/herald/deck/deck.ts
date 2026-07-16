import type { LetterDraw, Orientation } from "../../types/herald";
import { letters } from "../../data/letters";

/**
 * The Derekh Eretz deck — the twenty-two Hebrew letters — and a truly random
 * draw from it.
 *
 * Unlike the Herald's rendering (which is deterministically hashed from the
 * reading so it never changes), the *draw itself* is a genuine chance event:
 * it uses the platform CSPRNG (`crypto.getRandomValues`) with rejection
 * sampling to avoid modulo bias, never `Math.random`. The draw's result is
 * what gets recorded on the reading, so the Herald stays deterministic from
 * that stored outcome.
 *
 * A draw is *without replacement* — a physical deck, so the letters are
 * distinct — and each card lands with a randomly chosen orientation (a card
 * can fall upright or reversed).
 */

/** The deck: the 22 letter ids, in canonical order. */
export const DECK: string[] = letters.map((l) => l.id);

function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("A secure random source (crypto.getRandomValues) is required for the draw.");
  }
  return c;
}

/** A uniform integer in [0, maxExclusive) from the CSPRNG, free of modulo bias. */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("maxExclusive must be a positive integer");
  }
  const c = getCrypto();
  const range = 0x1_0000_0000; // 2^32, the space of a Uint32
  // Reject the top, non-uniform slice so every value in range is equally likely.
  const limit = range - (range % maxExclusive);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    c.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % maxExclusive;
}

/** A CSPRNG Fisher–Yates shuffle (returns a new array; input untouched). */
export function secureShuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomOrientation(): Orientation {
  return secureRandomInt(2) === 0 ? "upright" : "reversed";
}

/**
 * Draws `count` distinct letters from the deck (without replacement), each with
 * a randomly chosen orientation. Throws if more cards are requested than the
 * deck holds.
 */
export function drawLetters(count: number): LetterDraw[] {
  if (count < 0 || count > DECK.length) {
    throw new Error(`Cannot draw ${count} of ${DECK.length} cards`);
  }
  return secureShuffle(DECK)
    .slice(0, count)
    .map((letterId) => ({ letterId, orientation: randomOrientation() }));
}

/**
 * Draws a single letter from the deck, uniformly at random, excluding any letter
 * ids in `exclude` (so drawing card-by-card stays without replacement across a
 * spread). Each card lands with a randomly chosen orientation. Throws if every
 * letter is already excluded.
 */
export function drawOne(exclude: readonly string[] = []): LetterDraw {
  const excluded = new Set(exclude);
  const pool = DECK.filter((id) => !excluded.has(id));
  if (pool.length === 0) {
    throw new Error("No letters remain in the deck to draw");
  }
  return { letterId: pool[secureRandomInt(pool.length)], orientation: randomOrientation() };
}
