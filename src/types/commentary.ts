import type { HebrewDate } from "../data/hebrewCalendar";

/**
 * What a commentary is attached to. Kinds are additive — future subjects
 * (readings, participants, festivals...) extend the union without touching
 * stored records.
 */
export type CommentarySubject =
  | { kind: "letter"; letterId: string }
  | { kind: "dorot-card"; cardId: string }
  | { kind: "root"; rootKey: string }
  | { kind: "balagan"; category: BalaganCategory };

/**
 * The sections of Balagan HaOtzar (גניזת האוצר) — the scribe's genizah, per
 * the doc: marginal notes, unresolved questions, branching traditions,
 * corrections, discarded hypotheses, and respectful disagreements.
 */
export type BalaganCategory =
  | "marginal-notes"
  | "unresolved-questions"
  | "variant-traditions"
  | "corrections"
  | "discarded-hypotheses"
  | "respectful-disagreements";

/** The canonical key for a root subject: three letter ids in root (as-drawn) order. */
export function rootKeyFor(letterIds: [string, string, string]): string {
  return letterIds.join("-");
}

/** Flat key used for display grouping and as the IDB index value. */
export function subjectKeyFor(subject: CommentarySubject): string {
  switch (subject.kind) {
    case "letter":
      return `letter:${subject.letterId}`;
    case "dorot-card":
      return `dorot-card:${subject.cardId}`;
    case "root":
      return `root:${subject.rootKey}`;
    case "balagan":
      return `balagan:${subject.category}`;
  }
}

/**
 * One entry in the Treasury's Drash tier — "the received and ongoing
 * commentaries." Stored locally like everything else; the doc's own
 * Commentary of Aleph Yud ships as read-only seed content in code, not in
 * the store.
 */
export interface CommentaryRecord {
  id: string;
  subject: CommentarySubject;
  /** Denormalized `subjectKeyFor(subject)` — the `by-subject` IDB index reads this. */
  subjectKey: string;
  title?: string;
  /** The commenting Scribe's name or pen name, e.g. "Aleph Yud". */
  author: string;
  /** The Hebrew date of authorship, recorded at creation. */
  hebrewDate: HebrewDate;
  createdAt: string;
  updatedAt?: string;
  /** Plain text; blank lines separate paragraphs. */
  body: string;
}
