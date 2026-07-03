import type { JewishMonthName, DayOfWeek } from "../data/hebrewCalendar";

export interface HeraldAccent {
  accentColor?: string;
  lockLetters?: boolean;
  forceMode?: "sefirot" | "standard";
  motif?: string;
}

/**
 * How a festival's date is located in the Hebrew calendar, so Sacred Time
 * can auto-detect "is today a festival" rather than relying only on manual
 * selection. `range` resolves its length via `GeographyMode` since some
 * festivals run a day longer outside Israel.
 */
export type FestivalDateRule =
  | { kind: "weekly"; dayOfWeek: DayOfWeek }
  | { kind: "fixed"; month: JewishMonthName; day: number }
  | { kind: "range"; month: JewishMonthName; startDay: number; lengthLand: number; lengthGalut: number };

export interface FestivalOverride {
  id: string;
  name: string;
  hebrewName?: string;
  description: string;
  ritualMechanic: string;
  heraldAccent?: HeraldAccent;
  /** Absent only for "ordinary". Known v1 limitation: minor-fast/Israeli-commemoration weekday-postponement rules aren't modeled — see festivals.ts header. */
  dateRule?: FestivalDateRule;
  /** The doc's Gesture/Verb/Theme, e.g. "Rest", "Illuminate", "Depart". */
  gesture?: string;
  /** Not every entry has one transcribed yet — a first-draft content gap, not a bug. See festivals.ts header. */
  contemplativeQuestion?: string;
}
