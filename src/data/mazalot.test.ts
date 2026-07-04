import { describe, it, expect } from "vitest";
import { mazalotRing, mazalotByMonth } from "./mazalot";
import { lettersById } from "./letters";

describe("mazalotRing", () => {
  it("has exactly 12 entries, one per Simple letter", () => {
    expect(mazalotRing).toHaveLength(12);
  });

  it("is ordered Nisan through Adar", () => {
    expect(mazalotRing.map((e) => e.month)).toEqual([
      "Nisan",
      "Iyyar",
      "Sivan",
      "Tammuz",
      "Av",
      "Elul",
      "Tishri",
      "Cheshvan",
      "Kislev",
      "Tevet",
      "Shevat",
      "Adar",
    ]);
  });

  it("resolves every entry to a real letter with a non-empty zodiac name", () => {
    for (const entry of mazalotRing) {
      expect(lettersById[entry.letterId]).toBeDefined();
      expect(entry.zodiacName.length).toBeGreaterThan(0);
      expect(entry.zodiacHebrew.length).toBeGreaterThan(0);
    }
  });

  it("indexes every month exactly once in mazalotByMonth", () => {
    expect(Object.keys(mazalotByMonth)).toHaveLength(12);
    expect(mazalotByMonth.Nisan?.letterId).toBe(mazalotRing[0].letterId);
  });
});
