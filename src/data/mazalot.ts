import { letters } from "./letters";
import type { JewishMonthName } from "./hebrewCalendar";

export interface MazalotEntry {
  letterId: string;
  /** English zodiac name, e.g. "Aries". */
  zodiacName: string;
  /** Hebrew zodiac name (transliterated), e.g. "Tleh". */
  zodiacHebrew: string;
  month: JewishMonthName;
}

/**
 * `letters.ts`'s `astrological` field uses colloquial month spellings in its
 * prose ("Iyar", "Tishrei") rather than the Hebrew-calendar engine's exact
 * `JewishMonthType` transliterations ("Iyyar", "Tishri") — this maps the
 * former onto the latter without touching that file's editorial text.
 */
const MONTH_ALIASES: Record<string, JewishMonthName> = {
  Iyar: "Iyyar",
  Tishrei: "Tishri",
};

function normalizeMonth(raw: string): JewishMonthName {
  return (MONTH_ALIASES[raw] ?? raw) as JewishMonthName;
}

const ASTROLOGICAL_PATTERN = /^(.+?) \(([^)]+)\) \/ (\w+)$/;

/**
 * The Ring of the Mazalot — derived from the 12 "Simple" letters'
 * `astrological` field (each already pairs a zodiac sign with its Hebrew
 * month), rather than a hand-duplicated second table. Ordered Nisan through
 * Adar — the traditional festival-calendar year, matching the order these
 * letters already appear in `letters.ts`.
 */
export const mazalotRing: MazalotEntry[] = letters
  .filter((letter) => letter.classification === "Simple")
  .map((letter) => {
    const match = letter.astrological?.match(ASTROLOGICAL_PATTERN);
    if (!match) {
      throw new Error(`Letter "${letter.id}" is classified Simple but has no parsable astrological field`);
    }
    const [, zodiacName, zodiacHebrew, rawMonth] = match;
    return {
      letterId: letter.id,
      zodiacName,
      zodiacHebrew,
      month: normalizeMonth(rawMonth),
    };
  });

export const mazalotByMonth: Partial<Record<JewishMonthName, MazalotEntry>> = Object.fromEntries(
  mazalotRing.map((entry) => [entry.month, entry]),
);
