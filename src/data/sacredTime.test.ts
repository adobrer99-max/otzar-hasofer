import { describe, expect, it } from "vitest";
import { computeSacredTime, computeLunarPhase } from "./sacredTime";
import { omerLine } from "./omer";

describe("computeSacredTime", () => {
  it("computes the correct Omer day (2 Iyyar 5786 = Omer day 17)", () => {
    const snapshot = computeSacredTime(new Date(2026, 3, 19), "land");
    expect(snapshot.hebrewDate).toEqual({ year: 5786, month: "Iyyar", day: 2 });
    expect(snapshot.omer).toEqual({ day: 17 });
  });

  it("has no Omer day outside the counting period", () => {
    const snapshot = computeSacredTime(new Date(2026, 9, 1), "land"); // Cheshvan-ish, well outside
    expect(snapshot.omer).toBeUndefined();
  });

  it("detects a two-day Rosh Chodesh (30 Kislev / 1 Tevet 5786)", () => {
    const day30 = computeSacredTime(new Date(2025, 11, 20), "land");
    expect(day30.hebrewDate).toEqual({ year: 5786, month: "Kislev", day: 30 });
    expect(day30.roshChodesh).toEqual({ days: 2 });

    const day1 = computeSacredTime(new Date(2025, 11, 21), "land");
    expect(day1.hebrewDate).toEqual({ year: 5786, month: "Tevet", day: 1 });
    expect(day1.roshChodesh).toEqual({ days: 2 });
  });

  it("does not treat 1 Tishrei (Rosh Hashanah) as Rosh Chodesh", () => {
    const snapshot = computeSacredTime(new Date(2025, 8, 23), "land");
    // Not asserting the exact Hebrew date here — just the Tishrei-exclusion rule.
    if (snapshot.hebrewDate.month === "Tishri" && snapshot.hebrewDate.day === 1) {
      expect(snapshot.roshChodesh).toBeUndefined();
    }
  });

  it("resolves Pesach's Land-vs-Galut length difference (day 8 = Galut only)", () => {
    const day8 = new Date(2026, 3, 9); // 22 Nisan 5786
    expect(computeSacredTime(day8, "land").activeFestivalIds).not.toContain("pesach");
    expect(computeSacredTime(day8, "galut").activeFestivalIds).toContain("pesach");

    const dayAfter = new Date(2026, 3, 10); // 23 Nisan 5786 — ordinary in both
    expect(computeSacredTime(dayAfter, "land").activeFestivalIds).toHaveLength(0);
    expect(computeSacredTime(dayAfter, "galut").activeFestivalIds).toHaveLength(0);
  });

  /**
   * **Which day of the festival it is, and not merely that it is one.**
   *
   * `matchesDateRule` always computed the offset into a range and threw it
   * away, so nothing downstream could tell Sukkot's first night from its
   * seventh — the fact the seven Ushpizin need. These pin the 1-based count
   * against real dates, in both geographies, because the galut day 8 is the
   * kind of edge the offset must survive.
   */
  it("counts the nights of a range festival, 1-based, in both geographies", () => {
    // 15 Tishri 5786 = 7 Oct 2025 begins Sukkot.
    for (let night = 1; night <= 7; night += 1) {
      const date = new Date(2025, 9, 6 + night);
      expect(computeSacredTime(date, "land").festivalDays?.sukkot, `land night ${night}`).toBe(night);
      expect(computeSacredTime(date, "galut").festivalDays?.sukkot, `galut night ${night}`).toBe(night);
    }
    // Pesach's galut-only day 8: the count keeps going where the rule does.
    const day8 = new Date(2026, 3, 9); // 22 Nisan 5786
    expect(computeSacredTime(day8, "galut").festivalDays?.pesach).toBe(8);
    expect(computeSacredTime(day8, "land").festivalDays?.pesach).toBeUndefined();
  });

  it("reports single-day rules as day 1, and counts the umbrella beside the day", () => {
    // Yom Kippur, 10 Tishri 5786 — a fixed rule inside the ten-day range.
    const yomKippur = computeSacredTime(new Date(2025, 9, 2), "land");
    expect(yomKippur.festivalDays?.["yom-kippur"]).toBe(1);
    expect(yomKippur.festivalDays?.["high-holy-days"]).toBe(10);
    // And a weekly rule is likewise its own day 1.
    const shabbat = computeSacredTime(new Date(2026, 0, 10), "land");
    expect(shabbat.festivalDays?.shabbat).toBe(1);
  });

  it("orders simultaneous matches most-specific first (Yom Kippur within the High Holy Days)", () => {
    const yomKippur = computeSacredTime(new Date(2025, 9, 2), "land");
    expect(yomKippur.activeFestivalIds[0]).toBe("yom-kippur");
    expect(yomKippur.activeFestivalIds).toContain("high-holy-days");

    const middleOfTenDays = computeSacredTime(new Date(2025, 8, 29), "land"); // 7 Tishri, a Monday
    expect(middleOfTenDays.activeFestivalIds).toEqual(["high-holy-days"]);
  });

  it("detects Shabbat by weekday", () => {
    const saturday = computeSacredTime(new Date(2026, 6, 4), "land");
    expect(saturday.dayOfWeek).toBe("saturday");
    expect(saturday.activeFestivalIds).toContain("shabbat");
  });

  it("is deterministic for the same input", () => {
    const date = new Date(2026, 3, 19);
    expect(computeSacredTime(date, "land")).toEqual(computeSacredTime(date, "land"));
  });
});

describe("computeLunarPhase", () => {
  it("covers all eight phases across the boundaries of a 30-day month", () => {
    expect(computeLunarPhase(1)).toBe("new");
    expect(computeLunarPhase(2)).toBe("new");
    expect(computeLunarPhase(3)).toBe("waxingCrescent");
    expect(computeLunarPhase(5)).toBe("waxingCrescent");
    expect(computeLunarPhase(6)).toBe("firstQuarter");
    expect(computeLunarPhase(9)).toBe("firstQuarter");
    expect(computeLunarPhase(10)).toBe("waxingGibbous");
    expect(computeLunarPhase(13)).toBe("waxingGibbous");
    expect(computeLunarPhase(14)).toBe("full");
    expect(computeLunarPhase(16)).toBe("full");
    expect(computeLunarPhase(17)).toBe("waningGibbous");
    expect(computeLunarPhase(20)).toBe("waningGibbous");
    expect(computeLunarPhase(21)).toBe("lastQuarter");
    expect(computeLunarPhase(24)).toBe("lastQuarter");
    expect(computeLunarPhase(25)).toBe("waningCrescent");
    expect(computeLunarPhase(30)).toBe("waningCrescent");
  });
});

describe("the Omer, counted in its own words", () => {
  it("gives each of the forty-nine days a distinct line, on the 7×7 grid", () => {
    const lines = Array.from({ length: 49 }, (_, i) => omerLine(i + 1));
    expect(new Set(lines).size).toBe(49);
    expect(lines[0]).toContain("Chesed within Chesed");
    expect(lines[9]).toContain("Tiferet within Gevurah"); // day 10 — tiferet she-b'gevurah
    expect(lines[16]).toContain("Tiferet within Tiferet"); // day 17
    expect(lines[48]).toContain("Malchut within Malchut");
    for (const line of lines) expect(line).toMatch(/^Day \d+ of the Omer/);
  });
});

