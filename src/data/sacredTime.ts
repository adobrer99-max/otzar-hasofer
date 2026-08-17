import type { SacredTimeSnapshot } from "../types/sacredTime";
import type { FestivalDateRule, FestivalId } from "../types/festival";
import type { GeographyMode } from "../types/herald";
import {
  hebrewDateFromGregorian,
  gregorianFromHebrewDate,
  dayOfWeek,
  daysBetween,
  daysInHebrewMonth,
  previousMonth,
  resolveAdar,
  toLocalMidnight,
  type HebrewDate,
} from "./hebrewCalendar";

/** Local (not UTC) ISO date string — avoids toISOString()'s UTC shift for local-midnight dates. */
function toLocalIsoDate(date: Date): string {
  const d = toLocalMidnight(date);
  const year = d.getFullYear().toString().padStart(4, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
import { festivals } from "./festivals";
import { computeParsha } from "./parsha";

const OMER_START = { month: "Nisan" as const, day: 16 };
const OMER_LENGTH = 49;

function computeOmer(hebrewDate: HebrewDate, gregorianDate: Date): { day: number } | undefined {
  const start = gregorianFromHebrewDate({ year: hebrewDate.year, ...OMER_START });
  const elapsed = daysBetween(start, gregorianDate) + 1;
  return elapsed >= 1 && elapsed <= OMER_LENGTH ? { day: elapsed } : undefined;
}

function computeRoshChodesh(hebrewDate: HebrewDate): { days: 1 | 2 } | undefined {
  // 1 Tishrei is Rosh Hashanah, not observed as "Rosh Chodesh" in the conventional sense.
  if (hebrewDate.month === "Tishri") return undefined;

  if (hebrewDate.day === 30) {
    return { days: 2 }; // first of a two-day observance; the 2nd day is 1 of next month
  }
  if (hebrewDate.day === 1) {
    const prev = previousMonth(hebrewDate.year, hebrewDate.month);
    const prevHadThirtyDays = prev ? daysInHebrewMonth(hebrewDate.year, prev) === 30 : false;
    return { days: prevHadThirtyDays ? 2 : 1 };
  }
  return undefined;
}

/** Thematic day-of-month buckets over a 29-30 day Hebrew month — not ephemeris-accurate. Exported for direct boundary testing. */
export function computeLunarPhase(day: number): SacredTimeSnapshot["lunarPhase"] {
  if (day <= 2) return "new";
  if (day <= 5) return "waxingCrescent";
  if (day <= 9) return "firstQuarter";
  if (day <= 13) return "waxingGibbous";
  if (day <= 16) return "full";
  if (day <= 20) return "waningGibbous";
  if (day <= 24) return "lastQuarter";
  return "waningCrescent";
}

/** Rank used only to order simultaneous festival matches, most-specific first. Lower sorts first. */
function specificity(rule: FestivalDateRule, geography: GeographyMode): number {
  if (rule.kind === "fixed") return 1;
  if (rule.kind === "range") return geography === "land" ? rule.lengthLand : rule.lengthGalut;
  return 8; // "weekly" (Shabbat) — sorts after any specific Yom Tov it might coincide with
}

/**
 * Which day of the rule this date is — **1-based, or undefined if the rule
 * does not match at all.**
 *
 * This function used to answer only yes-or-no, and to do it the `range`
 * branch computed the offset into the festival and then threw it away. That
 * discarded number is the difference between "it is Sukkot" and "it is the
 * third night of Sukkot" — the fact the seven Ushpizin need to be seated on
 * their seven nights, and the reason nothing downstream could ever say more
 * than the festival's name. Weekly and fixed rules are single days, so a
 * match is always day 1.
 */
function dayOfDateRule(rule: FestivalDateRule, hebrewDate: HebrewDate, gregorianDate: Date, geography: GeographyMode): number | undefined {
  if (rule.kind === "weekly") {
    return dayOfWeek(gregorianDate) === rule.dayOfWeek ? 1 : undefined;
  }
  if (rule.kind === "fixed") {
    const month = resolveAdar(hebrewDate.year, rule.month);
    return hebrewDate.month === month && hebrewDate.day === rule.day ? 1 : undefined;
  }
  // range
  const month = resolveAdar(hebrewDate.year, rule.month);
  const start = gregorianFromHebrewDate({ year: hebrewDate.year, month, day: rule.startDay });
  const length = geography === "land" ? rule.lengthLand : rule.lengthGalut;
  const offset = daysBetween(start, gregorianDate);
  return offset >= 0 && offset < length ? offset + 1 : undefined;
}

export function computeSacredTime(date: Date, geography: GeographyMode): SacredTimeSnapshot {
  const hebrewDate = hebrewDateFromGregorian(date);

  const active = festivals
    .map((f) => ({ f, day: f.dateRule && dayOfDateRule(f.dateRule, hebrewDate, date, geography) }))
    .filter((m): m is { f: (typeof festivals)[number]; day: number } => m.day !== undefined)
    .sort((a, b) => specificity(a.f.dateRule!, geography) - specificity(b.f.dateRule!, geography));
  const activeFestivalIds = active.map((m) => m.f.id);
  const festivalDays: Partial<Record<FestivalId, number>> = {};
  for (const m of active) festivalDays[m.f.id] = m.day;

  const parshaWeek = computeParsha(date, geography);

  return {
    gregorianDate: toLocalIsoDate(date),
    hebrewDate,
    dayOfWeek: dayOfWeek(date),
    lunarPhase: computeLunarPhase(hebrewDate.day),
    roshChodesh: computeRoshChodesh(hebrewDate),
    omer: computeOmer(hebrewDate, date),
    activeFestivalIds,
    festivalDays,
    parsha: parshaWeek
      ? {
          ids: parshaWeek.parshiyot.map((p) => p.id),
          label: parshaWeek.label,
          shabbat: parshaWeek.shabbat,
          festival: parshaWeek.festival,
        }
      : undefined,
  };
}
