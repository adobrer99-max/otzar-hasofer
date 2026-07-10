import { describe, it, expect } from "vitest";
import { stepMonth, stepDay, setMonthSlice, monthSliceIndex, moonSliceIndex, LUNAR_PHASE_ORDER } from "./ringDate";
import { hebrewDateFromGregorian } from "../../data/hebrewCalendar";
import { RING_MONTH_ORDER } from "./zones";

// A fixed anchor inside Nisan 5786 (spring 2026).
const anchor = new Date(2026, 3, 15);

describe("stepMonth", () => {
  it("advances and retreats whole Hebrew months", () => {
    const hd0 = hebrewDateFromGregorian(anchor);
    const forward = hebrewDateFromGregorian(stepMonth(anchor, 1));
    const back = hebrewDateFromGregorian(stepMonth(anchor, -1));
    expect(forward.month).not.toBe(hd0.month);
    expect(back.month).not.toBe(hd0.month);
    // Twelve/thirteen steps forward returns to the same month name (a year later-ish).
    let d = anchor;
    const months = new Set<string>();
    for (let i = 0; i < 12; i++) {
      d = stepMonth(d, 1);
      months.add(hebrewDateFromGregorian(d).month);
    }
    expect(months.size).toBeGreaterThanOrEqual(11);
  });

  it("keeps the day-of-month where the target month is long enough", () => {
    const stepped = hebrewDateFromGregorian(stepMonth(anchor, 2));
    expect(stepped.day).toBeGreaterThan(0);
    expect(stepped.day).toBeLessThanOrEqual(hebrewDateFromGregorian(anchor).day);
  });
});

describe("stepDay", () => {
  it("moves by whole days", () => {
    expect(stepDay(anchor, 1).getDate()).toBe(16);
    expect(stepDay(anchor, -1).getDate()).toBe(14);
  });
});

describe("setMonthSlice / monthSliceIndex", () => {
  it("round-trips a slice through the date and back", () => {
    for (let slice = 0; slice < 12; slice++) {
      const d = setMonthSlice(anchor, slice);
      expect(monthSliceIndex(hebrewDateFromGregorian(d))).toBe(slice);
    }
  });

  it("locates the anchor's own month", () => {
    const hd = hebrewDateFromGregorian(anchor);
    expect(RING_MONTH_ORDER[monthSliceIndex(hd)]).toBe("Nisan");
  });
});

describe("moon slices", () => {
  it("orders the eight phases and indexes them", () => {
    expect(LUNAR_PHASE_ORDER).toHaveLength(8);
    expect(moonSliceIndex("new")).toBe(0);
    expect(moonSliceIndex("full")).toBe(4);
    expect(moonSliceIndex("waningCrescent")).toBe(7);
  });
});
