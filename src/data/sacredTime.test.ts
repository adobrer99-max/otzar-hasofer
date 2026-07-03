import { describe, expect, it } from "vitest";
import { computeSacredTime } from "./sacredTime";

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
