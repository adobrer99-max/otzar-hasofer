import { describe, expect, it } from "vitest";
import {
  hebrewDateFromGregorian,
  gregorianFromHebrewDate,
  isLeapYear,
  daysInHebrewMonth,
  dayOfWeek,
  daysBetween,
} from "./hebrewCalendar";

describe("hebrewCalendar", () => {
  it("round-trips Gregorian -> Hebrew -> Gregorian", () => {
    const original = new Date(2026, 6, 3); // 2026-07-03
    const hebrew = hebrewDateFromGregorian(original);
    const roundTripped = gregorianFromHebrewDate(hebrew);
    expect(roundTripped.getFullYear()).toBe(original.getFullYear());
    expect(roundTripped.getMonth()).toBe(original.getMonth());
    expect(roundTripped.getDate()).toBe(original.getDate());
  });

  it("matches a known Hebrew date (15 Nisan 5786 falls on 2026-04-02)", () => {
    const hebrew = hebrewDateFromGregorian(new Date(2026, 3, 2));
    expect(hebrew).toEqual({ year: 5786, month: "Nisan", day: 15 });
  });

  it("reports leap years correctly (5787/2027 is a Hebrew leap year)", () => {
    expect(isLeapYear(5787)).toBe(true);
    expect(isLeapYear(5786)).toBe(false);
  });

  it("gives a leap year 13 months and Adar I/II are both present", () => {
    expect(daysInHebrewMonth(5787, "AdarI")).toBeGreaterThan(0);
    expect(daysInHebrewMonth(5787, "AdarII")).toBeGreaterThan(0);
  });

  it("computes day of week consistently with Date.getDay()", () => {
    const date = new Date(2026, 6, 3); // a Friday
    expect(dayOfWeek(date)).toBe("friday");
  });

  it("computes days between two dates", () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 11))).toBe(10);
    expect(daysBetween(new Date(2026, 0, 11), new Date(2026, 0, 1))).toBe(-10);
  });
});
