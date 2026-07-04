import { describe, expect, it } from "vitest";
import { getEncounterForReadingIndex } from "./encounters";

describe("getEncounterForReadingIndex", () => {
  it("maps readingIndex 0 to Encounter 1 (First)", () => {
    expect(getEncounterForReadingIndex(0)?.number).toBe(1);
    expect(getEncounterForReadingIndex(0)?.name).toBe("First");
  });

  it("maps readingIndex 6 to Encounter 7 (Seventh)", () => {
    expect(getEncounterForReadingIndex(6)?.number).toBe(7);
    expect(getEncounterForReadingIndex(6)?.name).toBe("Seventh");
  });

  it("maps every readingIndex 0-6 to a distinct encounter in order", () => {
    const numbers = Array.from({ length: 7 }, (_, i) => getEncounterForReadingIndex(i)?.number);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("returns undefined beyond the Seven Encounters (readingIndex 7+)", () => {
    expect(getEncounterForReadingIndex(7)).toBeUndefined();
    expect(getEncounterForReadingIndex(20)).toBeUndefined();
  });
});
