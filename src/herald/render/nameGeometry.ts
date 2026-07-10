import { letters } from "../../data/letters";
import { hashString } from "./heraldHash";

/**
 * The hidden Hebrew-name encoding — the doc's idea that a participant's
 * Hebrew name can be woven into the Herald's geometry without ever being
 * displayed. The name's letters are summed by gematria (final forms map to
 * their base values) and folded with a plain string hash into a small
 * deterministic seed; the border renderer turns that seed into a subtle
 * per-flourish rotation phase. The name is present as ornament, never as
 * data: two participants with different names get stably different
 * borders, and no name yields output byte-identical to before this
 * feature existed.
 */

const FINAL_FORMS: Record<string, string> = {
  "ך": "כ",
  "ם": "מ",
  "ן": "נ",
  "ף": "פ",
  "ץ": "צ",
};

const GEMATRIA_BY_GLYPH: Record<string, number> = Object.fromEntries(
  letters.map((l) => [l.glyph, l.gematria]),
);

/** Gematria sum of a Hebrew string; non-letter characters contribute nothing. */
export function nameGematria(name: string): number {
  let sum = 0;
  for (const ch of name) {
    const base = FINAL_FORMS[ch] ?? ch;
    sum += GEMATRIA_BY_GLYPH[base] ?? 0;
  }
  return sum;
}

/**
 * A small deterministic seed derived from the name, or undefined when
 * there is no name (so the render path stays exactly as it always was).
 */
export function nameSeedOf(hebrewName: string | undefined): number | undefined {
  if (!hebrewName || nameGematria(hebrewName) === 0) return undefined;
  return (nameGematria(hebrewName) + hashString(hebrewName)) % 360;
}

/** The rotation (degrees) the seed gives flourish `index` — subtle, ±4°. */
export function flourishRotation(seed: number, index: number): number {
  return ((seed * (index + 1)) % 9) - 4;
}
