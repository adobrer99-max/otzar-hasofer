import type { GeographyMode } from "../types/herald";
import {
  gregorianFromHebrewDate,
  hebrewDateFromGregorian,
  daysBetween,
  toLocalMidnight,
} from "./hebrewCalendar";
import { PARSHIYOT, parshiyotByOrder, DOUBLING_PAIRS, type Parsha } from "./parshiyot";

/**
 * The weekly Torah portion (parsha), computed from first principles — this
 * project's own implementation over the `hebrewCalendar.ts` conversion
 * primitive. (The complete calendar library, @hebcal/core, is GPL-2.0 and
 * is deliberately not used or consulted; see hebrewCalendar.ts.)
 *
 * How the annual cycle is scheduled:
 * 1. The cycle anchors at Shabbat Bereshit — the first Shabbat after
 *    Simchat Torah (22 Tishri in the Land, 23 in Galut) — and runs to the
 *    next Simchat Torah, where Vezot Haberachah is read.
 * 2. Every Shabbat that falls on a Torah festival (Rosh Hashanah, Yom
 *    Kippur, Sukkot/Shmini Atzeret/Simchat Torah, Pesach, Shavuot — with
 *    the Galut second days where they apply) carries the festival reading
 *    instead of a weekly portion. This is where the Land and the Galut
 *    schedules diverge in some years.
 * 3. The 53 Shabbat-read portions fill the remaining Shabbatot in order,
 *    combining ("doubling") pairs as the counts require:
 *    - The firm anchor: Devarim is read on the Shabbat on or before 9 Av
 *      (Shabbat Chazon). From there to Rosh Hashanah is always exactly
 *      seven Shabbatot (Va'etchanan through Nitzavim).
 *    - Early doublings (Vayakhel–Pekudei, Tazria–Metzora,
 *      Acharei–Kedoshim, Behar–Bechukotai, in that order of preference)
 *      bring Bemidbar in before Shavuot; late doublings (Matot–Masei
 *      first, then Chukat–Balak) close the remaining gap to the Devarim
 *      anchor.
 *    - Nitzavim–Vayeilech combine when only one open Shabbat remains
 *      between Rosh Hashanah and Sukkot; with two, Vayeilech is read on
 *      Shabbat Shuva and Ha'azinu the week after.
 *
 * Known v1 simplifications, stated plainly: the doubling selection follows
 * the count-driven constraints above rather than a transcribed year-type
 * (keviah) table. The test suite pins full-cycle integrity invariants
 * across 5780–5790 for both geographies plus dated fixtures — but before
 * relying on this for real ritual use, cross-check the current year
 * against a published luach (the same posture as the rest of Sacred Time).
 */

export interface ParshaWeek {
  /** One portion, or a doubled pair. */
  parshiyot: Parsha[];
  /** ISO date (local) of the Shabbat this is read on. */
  shabbat: string;
  /** "Vayakhel–Pekudei" / "Bereshit" — display label. */
  label: string;
}

const EARLY_PAIR_PRIORITY = [
  DOUBLING_PAIRS.vayakhelPekudei,
  DOUBLING_PAIRS.tazriaMetzora,
  DOUBLING_PAIRS.achareiKedoshim,
  DOUBLING_PAIRS.beharBechukotai,
];
const LATE_PAIR_PRIORITY = [DOUBLING_PAIRS.matotMasei, DOUBLING_PAIRS.chukatBalak];

function iso(date: Date): string {
  const d = toLocalMidnight(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function saturdayOnOrAfter(date: Date): Date {
  const d = toLocalMidnight(date);
  const add = (6 - d.getDay() + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + add);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Simchat Torah — the day the cycle turns: 22 Tishri in the Land (Shmini Atzeret), 23 in the Galut. */
function simchatTorahDate(hebrewYear: number, geography: GeographyMode): Date {
  return gregorianFromHebrewDate({
    year: hebrewYear,
    month: "Tishri",
    day: geography === "land" ? 22 : 23,
  });
}

/**
 * Saturdays displaced by festival readings within cycle year Y (which runs
 * from Tishri of Y to Tishri of Y+1).
 */
function displacedSaturdays(cycleYear: number, geography: GeographyMode): Set<string> {
  const galut = geography === "galut";
  const days: { year: number; month: "Tishri" | "Nisan" | "Sivan"; days: number[] }[] = [
    // Pesach + chol hamoed (Nisan of the cycle year).
    { year: cycleYear, month: "Nisan", days: galut ? [15, 16, 17, 18, 19, 20, 21, 22] : [15, 16, 17, 18, 19, 20, 21] },
    // Shavuot.
    { year: cycleYear, month: "Sivan", days: galut ? [6, 7] : [6] },
    // The following Tishri: Rosh Hashanah, Yom Kippur, Sukkot through Simchat Torah.
    {
      year: cycleYear + 1,
      month: "Tishri",
      days: galut ? [1, 2, 10, 15, 16, 17, 18, 19, 20, 21, 22, 23] : [1, 2, 10, 15, 16, 17, 18, 19, 20, 21, 22],
    },
  ];
  const out = new Set<string>();
  for (const group of days) {
    for (const day of group.days) {
      const date = gregorianFromHebrewDate({ year: group.year, month: group.month, day });
      if (date.getDay() === 6) out.add(iso(date));
    }
  }
  return out;
}

/** The full Shabbat-by-Shabbat schedule for one cycle year. */
function buildCycleSchedule(cycleYear: number, geography: GeographyMode): Map<string, Parsha[]> {
  const start = saturdayOnOrAfter(addDays(simchatTorahDate(cycleYear, geography), 1));
  const nextSimchatTorah = simchatTorahDate(cycleYear + 1, geography);
  const displaced = displacedSaturdays(cycleYear, geography);

  // Every open Shabbat of the cycle, in order.
  const slots: Date[] = [];
  for (let d = start; d < nextSimchatTorah; d = addDays(d, 7)) {
    if (!displaced.has(iso(d))) slots.push(d);
  }

  const shavuot = gregorianFromHebrewDate({ year: cycleYear, month: "Sivan", day: 6 });
  const nineAv = gregorianFromHebrewDate({ year: cycleYear, month: "Av", day: 9 });
  const roshHashanah = gregorianFromHebrewDate({ year: cycleYear + 1, month: "Tishri", day: 1 });

  const preShavuot = slots.filter((s) => s < shavuot).length;
  const through9Av = slots.filter((s) => daysBetween(s, nineAv) >= 0).length;
  const postRoshHashanah = slots.filter((s) => s > roshHashanah).length;

  // Doublings needed so Devarim lands on the Shabbat on or before 9 Av.
  const totalDoublings = 44 - through9Av;
  // Early doublings bring Bemidbar (34) in before Shavuot where feasible.
  const earlyCount = Math.min(
    EARLY_PAIR_PRIORITY.length,
    Math.max(0, 34 - preShavuot, totalDoublings - LATE_PAIR_PRIORITY.length),
    Math.max(0, totalDoublings),
  );
  const lateCount = Math.max(0, totalDoublings - earlyCount);

  const doubledFirsts = new Set<number>([
    ...EARLY_PAIR_PRIORITY.slice(0, earlyCount),
    ...LATE_PAIR_PRIORITY.slice(0, lateCount),
  ]);
  // Nitzavim–Vayeilech combine when a single open Shabbat remains after
  // Rosh Hashanah (it takes Ha'azinu); with two, Vayeilech gets its own.
  if (postRoshHashanah === 1) doubledFirsts.add(DOUBLING_PAIRS.nitzavimVayelech);

  const schedule = new Map<string, Parsha[]>();
  let order = 1;
  for (const slot of slots) {
    if (order > 53) break;
    const portions = doubledFirsts.has(order)
      ? [parshiyotByOrder[order], parshiyotByOrder[order + 1]]
      : [parshiyotByOrder[order]];
    schedule.set(iso(slot), portions);
    order += portions.length;
  }
  return schedule;
}

const scheduleCache = new Map<string, Map<string, Parsha[]>>();

function cycleSchedule(cycleYear: number, geography: GeographyMode): Map<string, Parsha[]> {
  const key = `${cycleYear}-${geography}`;
  let cached = scheduleCache.get(key);
  if (!cached) {
    cached = buildCycleSchedule(cycleYear, geography);
    scheduleCache.set(key, cached);
  }
  return cached;
}

/**
 * The parsha of the week containing `date` — the portion read on that
 * week's Shabbat (the date itself when it is a Saturday). Returns
 * undefined when that Shabbat carries a festival reading instead, or
 * during the festival turn of the year between Simchat Torah's approach
 * and Shabbat Bereshit.
 */
export function computeParsha(date: Date, geography: GeographyMode): ParshaWeek | undefined {
  const shabbat = saturdayOnOrAfter(date);
  const hebrewYear = hebrewDateFromGregorian(shabbat).year;
  // Between 1 Tishri and Simchat Torah the finishing cycle is last year's.
  const cycleYear =
    shabbat < simchatTorahDate(hebrewYear, geography) ? hebrewYear - 1 : hebrewYear;
  const portions = cycleSchedule(cycleYear, geography).get(iso(shabbat));
  if (!portions) return undefined;
  return {
    parshiyot: portions,
    shabbat: iso(shabbat),
    label: portions.map((p) => p.name).join("–"),
  };
}

/** Exposed for the integrity test suite. */
export function cycleScheduleForTest(cycleYear: number, geography: GeographyMode) {
  return buildCycleSchedule(cycleYear, geography);
}

export { PARSHIYOT };
