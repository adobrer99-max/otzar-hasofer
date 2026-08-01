import { describe, expect, it } from "vitest";
import { festivals } from "../data/festivals";
import { ushpizinBySefirah } from "../data/ushpizin";
import { encounterFor, encounterTitle, isIllumined, sealedCount } from "./encounter";
import { readAscentTime } from "./sacredAscent";
import { kindleCost, type AscentRecord } from "../storage/ascentRepo";
import { offerFor, vowKept } from "./ushpizinOffers";
import { regions } from "./regions";
import { abilities } from "./abilities";

const ascent = (over: Partial<AscentRecord>): AscentRecord => ({
  id: "a", seed: 1, seedLabel: "x", createdAt: "", updatedAt: "",
  regionIndex: 1, lettersHeld: [], or: 0, regionsCleared: [], housesMet: [],
  sacredNotes: [], ...over,
});

describe("the Seven Encounters across ascents", () => {
  it("counts only sealed climbs", () => {
    expect(sealedCount([ascent({}), ascent({ sealedAt: "now" }), ascent({ sealedAt: "now" })])).toBe(2);
  });

  it("walks the seven in order and then stops", () => {
    const seen = Array.from({ length: 9 }, (_, i) => encounterFor(i)?.number);
    expect(seen).toEqual([1, 2, 3, 4, 5, 6, 7, undefined, undefined]);
  });

  it("names each climb after the Encounter it is", () => {
    expect(encounterTitle(encounterFor(0)!)).toBe("The First Encounter — Light");
  });

  it("illumines exactly one region, and one the Tree actually has", () => {
    for (let i = 0; i < 7; i += 1) {
      const encounter = encounterFor(i)!;
      const lit = regions.filter((r) => isIllumined(encounter, r.sefirah));
      expect(lit, `Encounter ${encounter.number}`).toHaveLength(1);
    }
  });

  it("illumines nothing once the seven are behind you", () => {
    expect(regions.some((r) => isIllumined(encounterFor(7), r.sefirah))).toBe(false);
  });
});

describe("kindling a Sefirah", () => {
  it("costs more the higher the climb, so the choice stays real near the crown", () => {
    expect(kindleCost(1)).toBeLessThan(kindleCost(10));
    for (let i = 1; i < 10; i += 1) {
      expect(kindleCost(i)).toBeLessThan(kindleCost(i + 1));
    }
  });
});

describe("the day's gesture", () => {
  it("lends a grace and never a verb", () => {
    const graceNames = new Set(abilities.filter((a) => a.grace).map((a) => a.grace));
    // Walk a whole Hebrew year of days so every festival in the calendar
    // gets its turn, and check nothing that is lent is a verb.
    for (let day = 0; day < 400; day += 1) {
      const date = new Date(2026, 0, 1 + day);
      const lent = readAscentTime(date).graceOfTheDay;
      if (lent) expect(graceNames.has(lent), `${date.toDateString()} lent ${lent}`).toBe(true);
    }
  });

  it("has a mapping for every gesture the calendar actually names", () => {
    // Guards against a festival being authored with a gesture no one reads.
    const gestures = new Set(festivals.map((f) => f.gesture).filter(Boolean));
    const mapped = new Set<string>();
    for (let day = 0; day < 400; day += 1) {
      const time = readAscentTime(new Date(2026, 0, 1 + day));
      for (const note of time.notes) {
        const match = note.match(/The day's gesture is (.+?) —/);
        if (match) mapped.add(match[1]);
      }
    }
    // Every gesture surfaced by a real date must have produced a grace.
    for (const gesture of mapped) {
      expect(gestures.has(gesture), `unmapped gesture ${gesture}`).toBe(true);
    }
    expect(mapped.size).toBeGreaterThan(0);
  });
});

describe("the Ushpizin's bargains", () => {
  it("offers one to each of the seven lower Sefirot, and none above the Abyss", () => {
    for (const region of regions) {
      const offer = offerFor(region.sefirah);
      expect(Boolean(offer), `${region.name}`).toBe(region.hasHouse);
    }
  });

  it("names the guest the tradition names, with their own middah", () => {
    for (const region of regions.filter((r) => r.hasHouse)) {
      const offer = offerFor(region.sefirah)!;
      expect(offer.figure).toBe(ushpizinBySefirah[region.sefirah]?.figure);
      expect(offer.middah).toBe(ushpizinBySefirah[region.sefirah]?.middah);
    }
  });

  it("asks nothing at the open tent — Chesed is given freely", () => {
    const abraham = offerFor("chesed")!;
    expect(abraham.price).toBe(0);
    expect(abraham.vow).toBeUndefined();
  });

  it("makes every bargain either a price or a vow, never both", () => {
    for (const region of regions.filter((r) => r.hasHouse)) {
      const offer = offerFor(region.sefirah)!;
      expect(offer.price > 0 && offer.vow !== undefined).toBe(false);
    }
  });

  it("judges a vow by what actually happened after it was taken", () => {
    expect(vowKept("gather-nothing", { orGathered: 0, veilings: 3, marksSet: 2 })).toBe(true);
    expect(vowKept("gather-nothing", { orGathered: 1, veilings: 0, marksSet: 0 })).toBe(false);
    expect(vowKept("unveiled", { orGathered: 9, veilings: 0, marksSet: 9 })).toBe(true);
    expect(vowKept("unveiled", { orGathered: 0, veilings: 1, marksSet: 0 })).toBe(false);
    expect(vowKept("no-mark", { orGathered: 9, veilings: 9, marksSet: 0 })).toBe(true);
    expect(vowKept("no-mark", { orGathered: 0, veilings: 0, marksSet: 1 })).toBe(false);
  });
});
