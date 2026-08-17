import type { HebrewDate, DayOfWeek } from "../data/hebrewCalendar";
import type { FestivalId } from "./festival";

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
  activeFestivalIds: FestivalId[];
  /**
   * **Which day of each active multi-day festival this is**, 1-based — Sukkot
   * night 3 is `{ sukkot: 3 }`. Weekly and fixed rules report day 1.
   *
   * `matchesDateRule` always knew this: it computed the offset into the range
   * to answer yes-or-no and then threw the number away, which is why the
   * seven Ushpizin could never be seated on their seven nights — the game
   * knew it was Sukkot and not *which* Sukkot. Kept now, additive, absent on
   * snapshots stored before the field existed.
   */
  festivalDays?: Partial<Record<FestivalId, number>>;
  /**
   * The week's Torah portion(s), read on this week's Shabbat. Absent when
   * that Shabbat carries a festival reading instead — and on snapshots
   * stored before this field existed (additive). Geography-dependent.
   */
  parsha?: { ids: string[]; label: string; shabbat: string; festival?: boolean };
}
