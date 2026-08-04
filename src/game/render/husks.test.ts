import { describe, expect, it } from "vitest";
import { HUSKS, type HuskKind } from "../combat";
import { SILHOUETTES, SMOOTH } from "./husks";

/**
 * **A bestiary you can tell apart.**
 *
 * Twenty creatures shipped with their own behaviours, their own sources and
 * their own authored lines, drawn as four shapes chosen by `role` — so the
 * Locust and Leviathan were the same circle. This is a table rather than
 * twenty drawing functions precisely so that it can be checked, and what is
 * checked is the thing that was wrong: that no two of them are the same.
 */
describe("the silhouettes", () => {
  const kinds = Object.keys(HUSKS) as HuskKind[];

  it("gives every creature in the game one", () => {
    for (const kind of kinds) {
      expect(SILHOUETTES[kind], `${kind} has no shape`).toBeDefined();
    }
    // And draws nothing that is not a creature: a stray key is a shape that
    // can never appear, which is worse than a missing one because it looks
    // like coverage.
    for (const key of Object.keys(SILHOUETTES)) {
      expect(kinds.includes(key as HuskKind), `${key} is not a klipah`).toBe(true);
    }
  });

  /** **The one this exists for.** Four shapes for twenty names is the bug. */
  it("gives no two creatures the same shape", () => {
    const seen = new Map<string, HuskKind>();
    for (const kind of kinds) {
      const key = SILHOUETTES[kind].map(([x, y]) => `${x},${y}`).join(" ");
      const clash = seen.get(key);
      expect(clash, `${kind} and ${clash} are the same shape`).toBeUndefined();
      seen.set(key, kind);
    }
  });

  it("stays inside its own box, so nothing draws over the creature beside it", () => {
    for (const kind of kinds) {
      for (const [x, y] of SILHOUETTES[kind]) {
        expect(x, `${kind} runs off the side`).toBeGreaterThanOrEqual(0);
        expect(x, `${kind} runs off the side`).toBeLessThanOrEqual(1);
        expect(y, `${kind} runs off the top or bottom`).toBeGreaterThanOrEqual(0);
        expect(y, `${kind} runs off the top or bottom`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is a shape rather than a line", () => {
    for (const kind of kinds) {
      expect(SILHOUETTES[kind].length, `${kind} has too few points`).toBeGreaterThanOrEqual(5);
      // And not so many that it turns to mud at the size these are drawn.
      expect(SILHOUETTES[kind].length, `${kind} has too many`).toBeLessThanOrEqual(14);
    }
  });

  /**
   * A silhouette that used only a corner of its box would read as a smaller
   * creature than it is — and size is load-bearing here, since `HuskSpec.size`
   * is what the fight is balanced against.
   */
  it("fills the box it is given, in both directions", () => {
    for (const kind of kinds) {
      const xs = SILHOUETTES[kind].map(([x]) => x);
      const ys = SILHOUETTES[kind].map(([, y]) => y);
      expect(Math.max(...xs) - Math.min(...xs), `${kind} is narrow`).toBeGreaterThan(0.7);
      expect(Math.max(...ys) - Math.min(...ys), `${kind} is short`).toBeGreaterThan(0.55);
    }
  });

  it("smooths only creatures that exist", () => {
    for (const kind of SMOOTH) {
      expect(kinds.includes(kind), `${kind} is smoothed and is not a klipah`).toBe(true);
    }
    // Some are round and most are not: a set that held everything or nothing
    // would be a flag nobody needed.
    expect(SMOOTH.size).toBeGreaterThan(0);
    expect(SMOOTH.size).toBeLessThan(kinds.length);
  });
});
