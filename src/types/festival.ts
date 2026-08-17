import type { JewishMonthName, DayOfWeek } from "../data/hebrewCalendar";

/**
 * **Every named day there is, as a type** — the same discipline `SefirahId`
 * has had from the start, arriving here late and for a measured reason.
 *
 * `FestivalOverride.id` was a plain `string`, so every table keyed by a day —
 * `DAY_EFFECTS`, `GESTURE_GRACES`, `FESTIVAL_NIGUNIM` — was `Record<string, …>`:
 * the silent-default shape this repo has now been burned by three times
 * (`TILE_CHARS` without a character for the figured stone, `MARKER_CHARS`
 * without a case for `*`, `TILE_NAMES` reporting two real tiles as open air).
 * A typo'd id in one of those tables lends nothing, multiplies nothing, plays
 * nothing — and no compiler notices. Under this union it fails to build.
 *
 * The list mirrors `FESTIVALS` in `data/festivals.ts` one for one, and the
 * exhaustiveness runs both ways: an id added there without extending this
 * union will not compile, and a member added here without an entry there is
 * caught by `festivals.test.ts`.
 */
export type FestivalId =
  | "ordinary"
  | "shabbat"
  | "pesach"
  | "sukkot"
  | "high-holy-days"
  | "rosh-hashanah"
  | "yom-kippur"
  | "purim"
  | "shavuot"
  | "tishabav"
  | "tubishvat"
  | "tubav"
  | "hanukkah"
  | "simchat-torah"
  | "lag-baomer"
  | "fast-of-gedaliah"
  | "tenth-of-tevet"
  | "seventeenth-of-tammuz"
  | "fast-of-esther"
  | "yom-hashoah"
  | "yom-hazikaron"
  | "yom-haatzmaut"
  | "yom-yerushalayim";

/**
 * The seventeen gestures the festivals practice between them — the key
 * `GESTURE_GRACES` maps to a playable grace. Typed for the same reason as
 * `FestivalId`: a gesture authored on a festival that no table maps is a day
 * that silently lends nothing.
 */
export type Gesture =
  | "Rest"
  | "Depart"
  | "Dwell"
  | "Listen/Reflect"
  | "Return/Repent"
  | "Reveal/Unmask"
  | "Receive"
  | "Remember"
  | "Plant"
  | "Connect"
  | "Illuminate"
  | "Rejoice"
  | "Hone"
  | "Bear Witness"
  | "Honour"
  | "Build"
  | "Gather";

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
  id: FestivalId;
  name: string;
  hebrewName?: string;
  description: string;
  ritualMechanic: string;
  heraldAccent?: HeraldAccent;
  /** Absent only for "ordinary". Known v1 limitation: minor-fast/Israeli-commemoration weekday-postponement rules aren't modeled — see festivals.ts header. */
  dateRule?: FestivalDateRule;
  /** The doc's Gesture/Verb/Theme, e.g. "Rest", "Illuminate", "Depart". */
  gesture?: Gesture;
  /** Not every entry has one transcribed yet — a first-draft content gap, not a bug. See festivals.ts header. */
  contemplativeQuestion?: string;
}
