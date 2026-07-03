export interface GematriaCoincidence {
  sum: number;
  label: string;
  meaning: string;
}

/**
 * A small, deliberately limited table of gematria coincidences — checked as
 * one Tier III ("Related Correspondence") signal in the Shoresh hierarchy,
 * never on its own definitive. Kept small on purpose: a thin, arbitrary
 * numerology table would cheapen the two well-sourced tiers above it in
 * `resolveShoresh.ts`. Always surfaced in the UI as "for contemplation only."
 */
export const gematriaCoincidences: GematriaCoincidence[] = [
  { sum: 13, label: "אחד / אהבה (Echad / Ahavah)", meaning: "One; Love — unity and love share this number." },
  { sum: 18, label: "חי (Chai)", meaning: "Life." },
  { sum: 26, label: "יהוה (the Tetragrammaton)", meaning: "The four-letter Divine Name." },
  { sum: 32, label: "לב (Lev)", meaning: "Heart — also the 32 mystical Paths of Wisdom." },
  { sum: 36, label: "ל״ו (Lamed-Vav)", meaning: "The 36 hidden righteous ones (Lamed Vav Tzadikim) said to sustain the world." },
  { sum: 70, label: "70 Faces of the Torah", meaning: "The traditional number of interpretive faces of the text — also the 70 nations and 70 elders." },
  { sum: 86, label: "אלהים (Elohim)", meaning: "God as Judge/Creator." },
  { sum: 358, label: "משיח (Mashiach)", meaning: "The Messiah." },
];

export const gematriaCoincidencesBySum: Record<number, GematriaCoincidence> = Object.fromEntries(
  gematriaCoincidences.map((entry) => [entry.sum, entry]),
);

export function findGematriaCoincidence(sum: number): GematriaCoincidence | undefined {
  return gematriaCoincidencesBySum[sum];
}
