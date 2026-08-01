/**
 * The Ascent's randomness — deliberately *seeded*, not the CSPRNG the ritual
 * deck uses (`src/herald/deck/deck.ts`).
 *
 * A reading's draw must be a genuine chance event; an ascent must be the
 * opposite. The run is seeded from the Hebrew date, so every Scribe climbing
 * on the same day meets the same Tree — the same Dorot cards, the same order
 * of letters — and a run reloaded from IndexedDB replays identically from its
 * stored seed rather than re-rolling into a different game.
 */

/** A small, fast, well-distributed 32-bit PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of a string, so a seed can be written as words. */
export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A uniform integer in [0, maxExclusive) from a seeded generator. */
export function randomInt(rng: () => number, maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("maxExclusive must be a positive integer");
  }
  return Math.min(maxExclusive - 1, Math.floor(rng() * maxExclusive));
}

/** A seeded Fisher–Yates shuffle (returns a new array; input untouched). */
export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Picks `count` distinct items, in shuffled order (fewer if the pool is small). */
export function sample<T>(rng: () => number, items: readonly T[], count: number): T[] {
  return shuffle(rng, items).slice(0, Math.max(0, count));
}
