import {
  toJewishDate,
  toGregorianDate,
  isLeapYear as jdIsLeapYear,
  calcDaysInMonth,
  getJewishMonthsInOrder,
  getIndexByJewishMonth,
  formatJewishDate,
  formatJewishDateInHebrew,
  type JewishMonthType,
} from "jewish-date";

/**
 * The only file in this app that imports `jewish-date` — everything else
 * uses the narrow surface below, so the library's own types never leak
 * elsewhere (mirrors how `shorashim.generated.ts` isolates its own
 * third-party source rather than letting it leak into the app).
 *
 * `jewish-date` (MIT) does Gregorian<->Hebrew conversion only — no
 * holidays/Omer/parsha. That's deliberate: `@hebcal/core`, the more
 * complete library, is GPL-2.0 licensed, and bundling GPL code into this
 * app's shipped client-side bundle risks forcing the whole app under
 * GPL-compatible terms. Holiday/Omer/Yahrzeit logic is built as this
 * project's own thin layer on top of this conversion primitive (see
 * `sacredTime.ts`), not sourced from a monolithic dependency.
 *
 * Known approximation: the Hebrew calendar day begins at sunset, not
 * Gregorian midnight. This wrapper (like the underlying library) uses
 * midnight-to-midnight Gregorian days throughout — acceptable for a
 * contemplative companion app, not for halachic precision.
 */

export type JewishMonthName = JewishMonthType;

export interface HebrewDate {
  year: number;
  month: JewishMonthName;
  day: number;
}

export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Normalizes to local midnight so date-only arithmetic doesn't drift across timezone boundaries. */
export function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function hebrewDateFromGregorian(date: Date): HebrewDate {
  const jd = toJewishDate(toLocalMidnight(date));
  return { year: jd.year, month: jd.monthName, day: jd.day };
}

export function gregorianFromHebrewDate(hd: HebrewDate): Date {
  return toGregorianDate({ year: hd.year, monthName: hd.month, day: hd.day });
}

export function isLeapYear(hebrewYear: number): boolean {
  return jdIsLeapYear(hebrewYear);
}

export function daysInHebrewMonth(hebrewYear: number, month: JewishMonthName): number {
  return calcDaysInMonth(hebrewYear, month);
}

/** The Hebrew months of a given year, in calendar order (Tishri first; Adar splits into AdarI/AdarII in leap years). */
export function monthsInOrder(hebrewYear: number): JewishMonthName[] {
  // jewish-date prefixes this list with a "None" sentinel (index 0) — drop it.
  return (getJewishMonthsInOrder(hebrewYear) as JewishMonthName[]).filter(
    (month) => month !== "None",
  );
}

/** The month immediately preceding `month` within `hebrewYear`, or undefined for Tishri (the year's first month). */
export function previousMonth(hebrewYear: number, month: JewishMonthName): JewishMonthName | undefined {
  const months = monthsInOrder(hebrewYear);
  const index = months.indexOf(month);
  return index > 0 ? months[index - 1] : undefined;
}

/**
 * Resolves a "bare" Adar reference to the correct month for the given year:
 * a leap year splits Adar into AdarI/AdarII, and Purim-family observances
 * fall in AdarII by standard practice. Non-Adar months pass through
 * unchanged.
 */
export function resolveAdar(hebrewYear: number, month: JewishMonthName): JewishMonthName {
  if (month === "Adar" && isLeapYear(hebrewYear)) return "AdarII";
  return month;
}

export function dayOfWeek(date: Date): DayOfWeek {
  return DAYS_OF_WEEK[toLocalMidnight(date).getDay()];
}

/** Days elapsed from `from` to `to` (both treated as local-midnight dates). Can be negative. */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toLocalMidnight(to).getTime() - toLocalMidnight(from).getTime()) / msPerDay);
}

/** e.g. "3 Tammuz 5786". */
export function formatHebrewDateEnglish(hd: HebrewDate): string {
  return formatJewishDate({
    year: hd.year,
    month: getIndexByJewishMonth(hd.month),
    monthName: hd.month,
    day: hd.day,
  });
}

/** e.g. "ג' תמוז תשפ"ו" (day/month/year in Hebrew gematria). */
export function formatHebrewDateHebrew(hd: HebrewDate): string {
  return formatJewishDateInHebrew({ year: hd.year, monthName: hd.month, day: hd.day });
}
