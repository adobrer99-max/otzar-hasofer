import { lettersById } from "../../data/letters";

/**
 * Each Hebrew letter carries one cosmic association in Sefer Yetzirah — the
 * three Mothers an element, the seven Doubles a planet, the twelve Simples a
 * sign of the zodiac. This resolves a letter to that association so the Herald
 * can bear it as a small gold emblem, uniquely derived from the reading.
 */
export type Association =
  | { kind: "element"; key: "fire" | "water" | "air" | "earth" }
  | { kind: "planet"; key: PlanetKey }
  | { kind: "zodiac"; index: number }; // 0..11, Aries..Pisces

export type PlanetKey = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";

const PLANETS: { match: string; key: PlanetKey }[] = [
  { match: "Sun", key: "sun" },
  { match: "Moon", key: "moon" },
  { match: "Mercury", key: "mercury" },
  { match: "Venus", key: "venus" },
  { match: "Mars", key: "mars" },
  { match: "Jupiter", key: "jupiter" },
  { match: "Saturn", key: "saturn" },
];

const ZODIAC = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

/** The elemental cast each element lends the field — a hue the tinctures blend toward. */
export const ELEMENT_HUES: Record<"fire" | "water" | "air" | "earth", string> = {
  fire: "#c0392b",
  water: "#2e6f9e",
  air: "#8fa0b8",
  earth: "#5f7d3a",
};

/**
 * The reading's elemental cast — the first drawn Mother letter's element hue,
 * used to tint the whole field so a fire reading burns and a water reading
 * cools. Undefined when no element letter was drawn.
 */
export function dominantElementHue(letterIds: string[]): string | undefined {
  for (const id of letterIds) {
    const a = associationOf(id);
    if (a?.kind === "element") return ELEMENT_HUES[a.key];
  }
  return undefined;
}

/** A human-readable name for a letter's association ("Fire", "Sun", "Aries"), or undefined. */
export function associationLabel(letterId: string): string | undefined {
  const a = associationOf(letterId);
  if (!a) return undefined;
  if (a.kind === "element") return a.key.charAt(0).toUpperCase() + a.key.slice(1);
  if (a.kind === "planet") return a.key.charAt(0).toUpperCase() + a.key.slice(1);
  return ZODIAC[a.index];
}

/** Resolve a letter's cosmic association, or undefined if it can't be parsed. */
export function associationOf(letterId: string): Association | undefined {
  const letter = lettersById[letterId];
  if (!letter) return undefined;
  if (letter.element) {
    const e = letter.element.toLowerCase();
    if (e.includes("fire")) return { kind: "element", key: "fire" };
    if (e.includes("water")) return { kind: "element", key: "water" };
    if (e.includes("air")) return { kind: "element", key: "air" };
    if (e.includes("earth")) return { kind: "element", key: "earth" };
  }
  const astro = letter.astrological ?? "";
  const planet = PLANETS.find((p) => astro.includes(p.match));
  if (planet) return { kind: "planet", key: planet.key };
  const zi = ZODIAC.findIndex((z) => astro.includes(z));
  if (zi >= 0) return { kind: "zodiac", index: zi };
  return undefined;
}

/**
 * The reading's gematria, written in Hebrew numerals (no Latin) — the classical
 * additive letter-numerals, with the ט״ו / ט״ז convention for 15 and 16 so the
 * Name is never spelled. Hundreds are built by repeating ת (400).
 */
export function toHebrewNumeral(value: number): string {
  const n = Math.max(0, Math.round(value));
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  let out = "";
  let hundreds = Math.floor(n / 100);
  while (hundreds >= 4) {
    out += "ת";
    hundreds -= 4;
  }
  out += ["", "ק", "ר", "ש"][hundreds];
  const rem = n % 100;
  const t = Math.floor(rem / 10);
  const o = rem % 10;
  if (t === 1 && o === 5) out += "טו";
  else if (t === 1 && o === 6) out += "טז";
  else out += tens[t] + ones[o];
  return out;
}
