import type { HebrewDate, DayOfWeek } from "../data/hebrewCalendar";

export type LunarPhase = "new" | "waxing" | "full" | "waning";

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
