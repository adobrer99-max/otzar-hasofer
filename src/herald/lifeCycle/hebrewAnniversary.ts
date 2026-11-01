import {
  daysInHebrewMonth,
  gregorianFromHebrewDate,
  isLeapYear,
  monthsInOrder,
  type HebrewDate,
  type JewishMonthName,
} from "../../data/hebrewCalendar";

/** Which Adar a common-year Adar date is kept in during a leap year. */
export type LeapAdar = "adarI" | "adarII";

/**
 * Where a Hebrew anniversary (a birthday, a Yahrzeit, any life-cycle date)
 * falls in a given Hebrew year. The month and day don't always exist as
 * written, so two rules apply:
 *
 * - **Adar.** In a leap year, a date from a common year's Adar is kept in
 *   Adar II by default (the month that carries Purim — the custom for
 *   birthdays and the Mechaber's for a Yahrzeit), or in Adar I when the
 *   Scribe chose it (the Rema's custom for a Yahrzeit). A date already in
 *   Adar I or Adar II keeps its own. In a common year, either Adar folds
 *   into the one Adar.
 * - **The 30th.** Cheshvan and Kislev have 29 days in some years, and Adar I
 *   folds into a 29-day Adar. The 30th of a month is the first day of the
 *   next month's Rosh Chodesh, so when it is missing the anniversary falls on
 *   the 1st of the following month — the ruling given for a bar mitzvah born
 *   on 30 Cheshvan (Mishnah Berurah 55:45).
 */
export function anniversaryInYear(birth: HebrewDate, hebrewYear: number, leapAdar: LeapAdar = "adarII"): HebrewDate {
  const leap = isLeapYear(hebrewYear);
  let month: JewishMonthName = birth.month;
  if (leap && month === "Adar") month = leapAdar === "adarI" ? "AdarI" : "AdarII";
  if (!leap && (month === "AdarI" || month === "AdarII")) month = "Adar";

  if (birth.day <= daysInHebrewMonth(hebrewYear, month)) {
    return { year: hebrewYear, month, day: birth.day };
  }
  // 30 Adar I in a common year: its Rosh Chodesh is Adar's.
  if (birth.month === "AdarI" && !leap) return { year: hebrewYear, month: "Adar", day: 1 };
  const order = monthsInOrder(hebrewYear);
  const next = order[order.indexOf(month) + 1];
  // Every month that can lack a 30th has a successor within the year.
  return { year: hebrewYear, month: next ?? month, day: next ? 1 : daysInHebrewMonth(hebrewYear, month) };
}

/** The local-midnight Gregorian date of the anniversary in that Hebrew year. */
export function anniversaryGregorian(birth: HebrewDate, hebrewYear: number, leapAdar: LeapAdar = "adarII"): Date {
  return gregorianFromHebrewDate(anniversaryInYear(birth, hebrewYear, leapAdar));
}

/** Whether `today` is the anniversary of `date` (Adar- and 30th-aware). */
export function isAnniversary(date: HebrewDate, today: HebrewDate, leapAdar: LeapAdar = "adarII"): boolean {
  const due = anniversaryInYear(date, today.year, leapAdar);
  return due.month === today.month && due.day === today.day;
}
