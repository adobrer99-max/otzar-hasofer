import type { HebrewDate, DayOfWeek } from "../data/hebrewCalendar";

/**
 * The traditional eight-phase lunar cycle (New → Waxing Crescent → First
 * Quarter → Waxing Gibbous → Full → Waning Gibbous → Last Quarter → Waning
 * Crescent) — thematic, derived from day-of-month buckets only, not
 * ephemeris-accurate (see `computeLunarPhase` in `sacredTime.ts`).
 */
export type LunarPhase =
  | "new"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "full"
  | "waningGibbous"
  | "lastQuarter"
  | "waningCrescent";

export interface SacredTimeSnapshot {
  /** ISO date (no time) this snapshot was computed for. */
  gregorianDate: string;
  hebrewDate: HebrewDate;
  dayOfWeek: DayOfWeek;
  /** Thematic, derived from day-of-month only — not ephemeris-accurate. */
  lunarPhase: LunarPhase;
  roshChodesh?: { days: 1 | 2 };
  /** Day 1-49 of the Omer count; present only 16 Nisan through 5 Sivan. */
  omer?: { day: number };
  /** FestivalOverride ids active on this date, most-specific first. */
  activeFestivalIds: string[];
}
