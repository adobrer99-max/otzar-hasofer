import { describe, expect, it } from "vitest";
import { findLayersOnRecurringHebrewDate } from "./recurringDates";
import type { HeraldLayer } from "../../types/herald";

function layerAt(createdAt: string): HeraldLayer {
  return {
    id: createdAt,
    participantId: "p1",
    layerIndex: 0,
    createdAt,
    isOrigin: false,
    input: {
      path: "brit",
      isFirstTime: false,
      drawnLetters: [
        { letterId: "aleph", orientation: "upright" },
        { letterId: "bet", orientation: "upright" },
        { letterId: "gimel", orientation: "upright" },
      ],
      veiledLetter: { letterId: "shin", orientation: "upright" },
      middah: "tiferet",
      geography: { mode: "land" },
      festivalId: "ordinary",
    },
  };
}

describe("findLayersOnRecurringHebrewDate", () => {
  it("finds past layers on the same recurring Hebrew month/day, across different years", () => {
    // 15 Nisan 5786 = 2026-04-02; 15 Nisan 5785 = 2025-04-13 (a year earlier, different Gregorian date).
    const layers = [layerAt("2026-04-02T12:00:00.000Z"), layerAt("2025-04-13T12:00:00.000Z"), layerAt("2026-01-01T12:00:00.000Z")];
    const matches = findLayersOnRecurringHebrewDate(layers, { month: "Nisan", day: 15 });
    expect(matches).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    const layers = [layerAt("2026-01-01T12:00:00.000Z")];
    expect(findLayersOnRecurringHebrewDate(layers, { month: "Nisan", day: 15 })).toEqual([]);
  });
});
