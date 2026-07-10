import { describe, it, expect } from "vitest";
import { computeParsha, cycleScheduleForTest } from "./parsha";
import { DOUBLING_PAIRS } from "./parshiyot";
import { gregorianFromHebrewDate } from "./hebrewCalendar";
import type { GeographyMode } from "../types/herald";

/**
 * Fixture note (v1 posture, same as the rest of Sacred Time): the dated
 * fixtures below were hand-derived and should be cross-checked against a
 * published luach before the parsha display is relied on for real ritual
 * use. The integrity suite beneath them pins the algorithm's structure
 * across eleven years and both geographies.
 */

const GEOS: GeographyMode[] = ["land", "galut"];

describe("computeParsha — dated fixtures", () => {
  it("reads Bereshit on the first Shabbat after Simchat Torah (Oct 18 2025, both geographies)", () => {
    for (const geo of GEOS) {
      expect(computeParsha(new Date(2025, 9, 18), geo)?.label).toBe("Bereshit");
    }
  });

  it("resolves mid-week dates to the coming Shabbat's portion", () => {
    // Wednesday Oct 15 2025 belongs to the week whose Shabbat (Oct 18) reads Bereshit.
    expect(computeParsha(new Date(2025, 9, 15), "galut")?.label).toBe("Bereshit");
  });

  it("reads Miketz in Hanukkah week 5786 (Dec 20 2025)", () => {
    for (const geo of GEOS) {
      expect(computeParsha(new Date(2025, 11, 20), geo)?.label).toBe("Miketz");
    }
  });

  it("reads Beshalach — Shabbat Shira — on Jan 31 2026", () => {
    for (const geo of GEOS) {
      expect(computeParsha(new Date(2026, 0, 31), geo)?.label).toBe("Beshalach");
    }
  });

  it("yields no weekly portion on a Shabbat inside Pesach", () => {
    // Find the Shabbat within 15–21 Nisan 5786 and expect a festival reading (undefined).
    for (let day = 15; day <= 21; day++) {
      const date = gregorianFromHebrewDate({ year: 5786, month: "Nisan", day });
      if (date.getDay() === 6) {
        expect(computeParsha(date, "land")).toBeUndefined();
        expect(computeParsha(date, "galut")).toBeUndefined();
        return;
      }
    }
    throw new Error("no Shabbat found inside Pesach 5786 — impossible");
  });
});

describe("computeParsha — cycle integrity invariants (5780–5790, both geographies)", () => {
  const LEGAL_PAIR_FIRSTS = new Set<number>(Object.values(DOUBLING_PAIRS));

  for (let year = 5780; year <= 5790; year++) {
    for (const geo of GEOS) {
      it(`cycle ${year} (${geo}) reads portions 1–53 exactly once, in order, with only legal doublings`, () => {
        const schedule = cycleScheduleForTest(year, geo);
        const weeks = Array.from(schedule.entries()).sort(([a], [b]) => a.localeCompare(b));

        const orders = weeks.flatMap(([, portions]) => portions.map((p) => p.order));
        expect(orders).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));

        for (const [, portions] of weeks) {
          expect(portions.length).toBeLessThanOrEqual(2);
          if (portions.length === 2) {
            expect(LEGAL_PAIR_FIRSTS.has(portions[0].order)).toBe(true);
            expect(portions[1].order).toBe(portions[0].order + 1);
          }
        }
      });

      it(`cycle ${year} (${geo}) anchors Devarim on the Shabbat on or before 9 Av`, () => {
        const schedule = cycleScheduleForTest(year, geo);
        const nineAv = gregorianFromHebrewDate({ year, month: "Av", day: 9 });
        const devarimWeek = Array.from(schedule.entries()).find(([, p]) =>
          p.some((x) => x.id === "devarim"),
        );
        expect(devarimWeek).toBeDefined();
        const shabbat = new Date(devarimWeek![0]);
        const gap = (nineAv.getTime() - shabbat.getTime()) / 86400000;
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThan(7);
      });

      it(`cycle ${year} (${geo}) reads Nitzavim on the last Shabbat before Rosh Hashanah`, () => {
        const schedule = cycleScheduleForTest(year, geo);
        const rh = gregorianFromHebrewDate({ year: year + 1, month: "Tishri", day: 1 });
        const nitzavimWeek = Array.from(schedule.entries()).find(([, p]) =>
          p.some((x) => x.id === "nitzavim"),
        );
        expect(nitzavimWeek).toBeDefined();
        const shabbat = new Date(nitzavimWeek![0]);
        const gap = (rh.getTime() - shabbat.getTime()) / 86400000;
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThanOrEqual(7);
      });
    }

    it(`cycle ${year}: Land and Galut agree from Devarim onward (divergence resolves by summer)`, () => {
      const land = cycleScheduleForTest(year, "land");
      const galut = cycleScheduleForTest(year, "galut");
      const devarimDateLand = Array.from(land.entries()).find(([, p]) =>
        p.some((x) => x.id === "devarim"),
      )![0];
      const devarimDateGalut = Array.from(galut.entries()).find(([, p]) =>
        p.some((x) => x.id === "devarim"),
      )![0];
      expect(devarimDateLand).toBe(devarimDateGalut);
      for (const [date, portions] of land.entries()) {
        if (date >= devarimDateLand) {
          expect(galut.get(date)?.map((p) => p.id)).toEqual(portions.map((p) => p.id));
        }
      }
    });
  }
});
