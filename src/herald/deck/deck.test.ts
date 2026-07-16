import { describe, it, expect } from "vitest";
import { DECK, drawLetters, drawOne, secureRandomInt, secureShuffle } from "./deck";
import { lettersById } from "../../data/letters";

describe("deck", () => {
  it("has the 22 letters, all valid ids", () => {
    expect(DECK).toHaveLength(22);
    for (const id of DECK) expect(lettersById[id]).toBeDefined();
  });

  it("draws the requested count of distinct letters without replacement", () => {
    for (let trial = 0; trial < 200; trial++) {
      const draw = drawLetters(4);
      expect(draw).toHaveLength(4);
      const ids = draw.map((d) => d.letterId);
      expect(new Set(ids).size).toBe(4); // distinct
      for (const d of draw) {
        expect(lettersById[d.letterId]).toBeDefined();
        expect(d.orientation === "upright" || d.orientation === "reversed").toBe(true);
      }
    }
  });

  it("can draw the whole deck, and rejects over-draws", () => {
    expect(new Set(drawLetters(22).map((d) => d.letterId)).size).toBe(22);
    expect(() => drawLetters(23)).toThrow();
  });

  it("produces both orientations over many single draws", () => {
    const orientations = new Set(Array.from({ length: 100 }, () => drawLetters(1)[0].orientation));
    expect(orientations).toEqual(new Set(["upright", "reversed"]));
  });

  it("drawOne respects the exclusion set", () => {
    const exclude = DECK.slice(0, 20); // only two letters remain drawable
    for (let i = 0; i < 200; i++) {
      const card = drawOne(exclude);
      expect(exclude).not.toContain(card.letterId);
      expect(lettersById[card.letterId]).toBeDefined();
    }
  });

  it("drawOne chained builds a distinct spread (without replacement)", () => {
    for (let trial = 0; trial < 200; trial++) {
      const placed: string[] = [];
      for (let k = 0; k < 5; k++) {
        placed.push(drawOne(placed).letterId);
      }
      expect(new Set(placed).size).toBe(5); // all distinct
    }
  });

  it("drawOne throws when every letter is excluded", () => {
    expect(() => drawOne(DECK)).toThrow();
  });

  it("drawOne produces both orientations over many draws", () => {
    const orientations = new Set(Array.from({ length: 100 }, () => drawOne().orientation));
    expect(orientations).toEqual(new Set(["upright", "reversed"]));
  });

  it("secureRandomInt stays in range and validates its argument", () => {
    for (let i = 0; i < 1000; i++) {
      const n = secureRandomInt(22);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(22);
    }
    expect(() => secureRandomInt(0)).toThrow();
    expect(() => secureRandomInt(-1)).toThrow();
  });

  it("shuffle is a permutation (no loss, no duplication)", () => {
    const shuffled = secureShuffle(DECK);
    expect(shuffled).toHaveLength(DECK.length);
    expect(new Set(shuffled)).toEqual(new Set(DECK));
  });

  it("is roughly uniform over the deck (no starved or dominant letter)", () => {
    const counts = new Map<string, number>();
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const id = drawLetters(1)[0].letterId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const expected = trials / 22; // ~182
    for (const id of DECK) {
      const c = counts.get(id) ?? 0;
      // Generous tolerance — this guards against a broken RNG, not a tight fit.
      expect(c).toBeGreaterThan(expected * 0.5);
      expect(c).toBeLessThan(expected * 1.5);
    }
  });
});
