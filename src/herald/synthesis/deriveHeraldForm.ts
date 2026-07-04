import type { HeraldLayer, LetterDraw, GeographyMode } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { festivalsById } from "../../data/festivals";
import { getEncounterForReadingIndex } from "../../data/encounters";
import { dominant } from "./dominant";

/** The number of readings that compose a revealed Herald — the Seven Encounters of Bereshit. */
export const HERALD_READINGS = 7;

/**
 * The deterministic synthesis of a participant's first seven readings that
 * the Herald is rendered from. Recomputed on demand from the stored layer
 * snapshots (never itself persisted), so renderer improvements retroactively
 * apply and the form stays "fixed as canon" simply because it only ever
 * reads the first seven layers.
 */
export interface HeraldForm {
  /** How many readings feed this form — min(layerCount, 7). Drives "forming (k of 7)" vs "revealed". */
  readingCount: number;
  revealed: boolean;
  /**
   * The dominant letters, as a synthetic three-draw triple fed straight into
   * `computeDivisions` so the shield/glyph layout is shared with a single
   * reading. Top-three distinct letters by frequency across all draws (ties
   * broken by first occurrence), padded by repeating the most dominant if
   * fewer than three distinct letters have been drawn.
   */
  charges: [LetterDraw, LetterDraw, LetterDraw];
  /** The Sefirah of each reading's Encounter (Chesed…Malchut); after seven readings, the whole lower Tree. */
  litSefirot: SefirahId[];
  /** The most frequent dominant middah across the readings — the brightest Tree node. */
  dominantMiddah: SefirahId;
  /** Majority geography across the readings (ties resolve to Land). */
  geography: GeographyMode;
  /** Distinct festival accent motifs encountered, first-occurrence order, capped. */
  festivalMotifs: string[];
  /** The dominant encountered festival's accent color, or gold when none. */
  accentColor: string;
  /** Ornament density — denser as the Herald completes. */
  ornamentDensity: number;
}

const MAX_FESTIVAL_MOTIFS = 3;
const DEFAULT_ACCENT = "var(--color-gold)";

/** Ranks distinct values by frequency; ties broken by first occurrence in the sequence. */
function rankedByFrequency<T extends string>(sequence: T[]): T[] {
  const count = new Map<T, number>();
  const firstSeen = new Map<T, number>();
  sequence.forEach((v, i) => {
    count.set(v, (count.get(v) ?? 0) + 1);
    if (!firstSeen.has(v)) firstSeen.set(v, i);
  });
  return Array.from(count.keys()).sort((a, b) => {
    const byCount = (count.get(b) ?? 0) - (count.get(a) ?? 0);
    return byCount !== 0 ? byCount : (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0);
  });
}

export function deriveHeraldForm(layers: HeraldLayer[]): HeraldForm {
  if (layers.length === 0) {
    throw new Error("deriveHeraldForm needs at least one reading.");
  }
  const readings = [...layers]
    .sort((a, b) => a.layerIndex - b.layerIndex)
    .slice(0, HERALD_READINGS);
  const readingCount = readings.length;

  // Charges — the dominant letters across every open draw.
  const allDraws = readings.flatMap((l) => l.input.drawnLetters);
  const orientationOf = new Map<string, LetterDraw["orientation"]>();
  for (const d of allDraws) {
    if (!orientationOf.has(d.letterId)) orientationOf.set(d.letterId, d.orientation);
  }
  const ranked = rankedByFrequency(allDraws.map((d) => d.letterId));
  const topThree: string[] = [];
  for (let i = 0; i < 3; i++) {
    topThree.push(ranked[i] ?? ranked[0]); // pad by repeating the most dominant
  }
  const charges = topThree.map((letterId) => ({
    letterId,
    orientation: orientationOf.get(letterId) ?? "upright",
  })) as [LetterDraw, LetterDraw, LetterDraw];

  // The completing Tree — one Sefirah per reading, by Encounter position.
  const litSefirot = readings
    .map((l) => getEncounterForReadingIndex(l.layerIndex)?.sefirah)
    .filter((s): s is SefirahId => s !== undefined);

  const dominantMiddah = dominant(readings.map((l) => l.input.middah));

  // Geography — majority, ties to Land.
  const galut = readings.filter((l) => l.input.geography.mode === "galut").length;
  const geography: GeographyMode = galut > readingCount / 2 ? "galut" : "land";

  // Accreted festival accents.
  const festivals = readings
    .map((l) => festivalsById[l.input.festivalId])
    .filter((f) => f && f.id !== "ordinary");
  const festivalMotifs: string[] = [];
  for (const f of festivals) {
    const motif = f?.heraldAccent?.motif;
    if (motif && !festivalMotifs.includes(motif)) festivalMotifs.push(motif);
    if (festivalMotifs.length >= MAX_FESTIVAL_MOTIFS) break;
  }
  const dominantFestivalId = festivals.length
    ? dominant(festivals.map((f) => f!.id))
    : undefined;
  const accentColor =
    (dominantFestivalId && festivalsById[dominantFestivalId]?.heraldAccent?.accentColor) ||
    DEFAULT_ACCENT;

  return {
    readingCount,
    revealed: readingCount >= HERALD_READINGS,
    charges,
    litSefirot,
    dominantMiddah,
    geography,
    festivalMotifs,
    accentColor,
    ornamentDensity: Math.min(10 + readingCount * 3, 40),
  };
}
