import type { Encounter } from "../types/encounter";

/**
 * The Seven Encounters of Bereshit — the Herald is not formed by
 * accumulating information, but through a participant's gradual
 * participation in the unfolding order of Creation. Each of a
 * participant's first seven readings corresponds to one Day of Creation,
 * shaping both the question asked and the symbols emphasized.
 *
 * Editorial note: `aspect` and `themes` are transcribed directly from the
 * planning doc's table. `question` is quoted from the doc where given
 * (First, Third, Sixth); for Second, Fourth, Fifth, and Seventh the doc
 * gives only themes/aspect with no quoted question, so these are
 * editorial content (tightened in P10-6) authored in the same voice — treat as a
 * starting point to rewrite, same posture as the 22 letters' content.
 *
 * `sefirah` follows the established kabbalistic correspondence of the seven
 * days of Creation to the seven lower Sefirot in order (Chesed through
 * Malchut) — the newer doc says each Encounter "carries a primary Sefirotic
 * emphasis" through which the Derekh Ha'Dorot Houses gradually open.
 */
export const encounters: Encounter[] = [
  {
    number: 1,
    sefirah: "chesed",
    name: "First",
    aspect: "Light",
    themes: "Awareness, beginnings, what seeks illumination.",
    question: "What is waiting to be brought into the light?",
  },
  {
    number: 2,
    sefirah: "gevurah",
    name: "Second",
    aspect: "Separation — the waters above, the waters below",
    themes: "Boundaries, distinctions, sacred order, competing obligations.",
    question:
      "What must be kept separate in your life, and what is fighting to share its space?",
  },
  {
    number: 3,
    sefirah: "tiferet",
    name: "Third",
    aspect: "Dry Land",
    themes: "Roots, growth, fruitfulness.",
    question: "Where have you taken root? What is beginning to bear fruit? What are you sowing?",
  },
  {
    number: 4,
    sefirah: "netzach",
    name: "Fourth",
    aspect: "Luminaries / Sacred Time",
    themes: "Rhythm, calling, seasons, vocation, recurring patterns.",
    question: "By what lights do you tell your seasons — and which one governs you now?",
  },
  {
    number: 5,
    sefirah: "hod",
    name: "Fifth",
    aspect: "Living Creatures",
    themes: "Relationships, movement, abundance, community.",
    question: "What in your life is truly multiplying, and what merely swarms?",
  },
  {
    number: 6,
    sefirah: "yesod",
    name: "Sixth",
    aspect: "Humanity",
    themes: "Btzelem Elohim, responsibility, stewardship.",
    question: "What has been entrusted to me?",
  },
  {
    number: 7,
    sefirah: "malchut",
    name: "Seventh",
    aspect: "Shabbat",
    themes: "Creation is complete. Nothing new is made. Only lived.",
    question: "What would it cost you to stop, and to call what you have made good?",
  },
];

export const encountersByNumber: Record<number, Encounter> = Object.fromEntries(
  encounters.map((e) => [e.number, e]),
);

/**
 * `readingIndex` is the participant's past-reading count (0 for their very
 * first reading). Returns undefined at 7+ ("beyond the Seven Encounters") —
 * the doc doesn't describe this phase, so no label is shown for it.
 */
export function getEncounterForReadingIndex(readingIndex: number): Encounter | undefined {
  const number = readingIndex + 1;
  return number >= 1 && number <= 7 ? encountersByNumber[number] : undefined;
}
