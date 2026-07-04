import type { BalaganCategory } from "../types/commentary";

/**
 * Balagan HaOtzar (גניזת האוצר) — "the genizah of the Treasury." Per the doc,
 * a space where each Scribe keeps marginal notes, unresolved questions,
 * branching traditions, corrections, discarded hypotheses, and respectful
 * disagreements. These are the sections of that book, in the doc's order.
 */
export interface BalaganSection {
  category: BalaganCategory;
  label: string;
  hebrew: string;
  blurb: string;
}

export const balaganSections: BalaganSection[] = [
  {
    category: "marginal-notes",
    label: "Marginal Notes",
    hebrew: "הגהות",
    blurb: "Passing glosses set in the margin — a thought kept beside the text rather than woven into it.",
  },
  {
    category: "unresolved-questions",
    label: "Unresolved Questions",
    hebrew: "צריך עיון",
    blurb: "Questions left open (tzarikh iyun) — held honestly rather than answered prematurely.",
  },
  {
    category: "variant-traditions",
    label: "Variant Traditions",
    hebrew: "נוסחאות",
    blurb: "Branching traditions and alternate readings preserved side by side, none erased.",
  },
  {
    category: "corrections",
    label: "Corrections",
    hebrew: "הגהה",
    blurb: "Emendations and second thoughts — the record of the Treasury correcting itself over time.",
  },
  {
    category: "discarded-hypotheses",
    label: "Discarded Hypotheses",
    hebrew: "השערות שנדחו",
    blurb: "Ideas tried and set aside, kept so the path not taken is not forgotten.",
  },
  {
    category: "respectful-disagreements",
    label: "Respectful Disagreements",
    hebrew: "מחלוקת לשם שמים",
    blurb: "Disagreement for the sake of Heaven (machloket l'shem shamayim) — differing Scribes' views held together.",
  },
];

export const balaganSectionByCategory: Record<BalaganCategory, BalaganSection> = Object.fromEntries(
  balaganSections.map((s) => [s.category, s]),
) as Record<BalaganCategory, BalaganSection>;
