import {
  hebrewDateFromGregorian,
  gregorianFromHebrewDate,
  monthsInOrder,
  daysInHebrewMonth,
  type HebrewDate,
  type JewishMonthName,
} from "../../data/hebrewCalendar";
import type { LunarPhase } from "../../types/sacredTime";
import { RING_MONTH_ORDER } from "./zones";

/**
 * The bridge between a turnable ring and the reading's effective date. The
 * rings are never independently settable into contradiction: every ring
 * re-derives from one `effectiveDate` (via `computeSacredTime`), and turning
 * a ring simply steps that date. All functions here are pure.
 */

/** AdarI / AdarII both fold to the base "Adar" the Mazalot ring is keyed on. */
function foldMonth(month: JewishMonthName): JewishMonthName {
  return month === "AdarI" || month === "AdarII" ? "Adar" : month;
}

/** Clamp a day to the target Hebrew month's length, then convert back to a Gregorian date. */
function fromHebrew(year: number, month: JewishMonthName, day: number): Date {
  const clamped = Math.min(day, daysInHebrewMonth(year, month));
  return gregorianFromHebrewDate({ year, month, day: clamped });
}

/** Step the effective date by whole Hebrew months (wrapping across the year), keeping the day-of-month where possible. */
export function stepMonth(date: Date, delta: number): Date {
  const hd = hebrewDateFromGregorian(date);
  let year = hd.year;
  let months = monthsInOrder(year);
  let index = months.indexOf(hd.month) + delta;
  while (index < 0) {
    year -= 1;
    months = monthsInOrder(year);
    index += months.length;
  }
  while (index >= months.length) {
    index -= months.length;
    year += 1;
    months = monthsInOrder(year);
  }
  return fromHebrew(year, months[index], hd.day);
}

/** Step the effective date by whole days (the moon ring's grain). */
export function stepDay(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

/** Set the effective date to a chosen Mazalot/Solar-month slice (0..11), same day-of-month, clamped. */
export function setMonthSlice(date: Date, sliceIndex: number): Date {
  const hd = hebrewDateFromGregorian(date);
  const targetBase = RING_MONTH_ORDER[((sliceIndex % 12) + 12) % 12];
  const months = monthsInOrder(hd.year);
  // Prefer the exact month; in a leap year the base "Adar" resolves to AdarII.
  const match =
    months.find((m) => foldMonth(m) === targetBase) ?? targetBase;
  return fromHebrew(hd.year, match, hd.day);
}

/** Which Mazalot/Solar slice (0..11) the given Hebrew date sits in. */
export function monthSliceIndex(hd: HebrewDate): number {
  return RING_MONTH_ORDER.indexOf(foldMonth(hd.month));
}

/** The eight lunar phases in ring order (new → waning crescent). */
export const LUNAR_PHASE_ORDER: LunarPhase[] = [
  "new",
  "waxingCrescent",
  "firstQuarter",
  "waxingGibbous",
  "full",
  "waningGibbous",
  "lastQuarter",
  "waningCrescent",
];

/** Which Moon slice (0..7) a phase sits in. */
export function moonSliceIndex(phase: LunarPhase): number {
  return LUNAR_PHASE_ORDER.indexOf(phase);
}
