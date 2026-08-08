import { TOTAL_REGIONS } from "./regions";
import type { SefirahId } from "../types/letter";

/**
 * **When a climb may be ended, and which ending it is.**
 *
 * `sealedAt`'s own doc has said since the fall was fixed that a climb is
 * carried to its ending by "the crown, **or** all ten kindled". Only the
 * second of those was ever reachable. `SealedPlate` has carried a complete
 * `byKindling: false` branch — "The crown is reached" — with nothing anywhere
 * in the game able to raise it: the map offered sealing only once every
 * Sefirah was lit, so the crown half of the sentence was a promise the code
 * did not keep.
 *
 * This is that half, and it is a real ending rather than a shortcut, because
 * of what a *freed* Keter costs. Keter is not adjacent to the kingdom.
 * Measured over the graph, the shortest way up is three paths —
 * `malchut-yesod → yesod-tiferet → tiferet-keter` — and the last of those
 * crosses the Abyss, which has no shrine, so it must be walked unveiled and
 * answered at a Word-Gate. Then Behemot has to be broken, and Behemot is
 * letter-locked. It is a first session's arc. What it is *not* is the three
 * hundred light of the full tour, and the measured economy guarantees a dash
 * cannot buy that: the two endings stay genuinely different climbs.
 *
 * Both write the same `sealedAt`, so **both advance the Seven Encounters.**
 * That is a decision rather than an oversight: the seven are meant to be the
 * beginning of the arc rather than the whole of it, and a Scribe who reaches
 * the crown seven times has plainly finished seven climbs. The alternative
 * lever — advancing only on a kindled seal — needs no schema change if it is
 * ever wanted, since which ending a record holds is derivable from
 * `sefirotLit` and nothing else.
 */
export type SealKind =
  /** Every Sefirah on the Tree is burning. The consummation. */
  | "kindled"
  /** Standing on a crown nothing is holding, with a case to make. */
  | "crown";

export interface Standing {
  /** Where the Scribe is on the Tree. */
  at: SefirahId;
  sefirotLit: readonly SefirahId[];
  guardiansBroken: readonly SefirahId[];
}

/** The crown itself — the one Sefirah the second ending is offered at. */
export const CROWN: SefirahId = "keter";

/**
 * Which ending is on offer where the Scribe is standing, if either.
 *
 * The kindled ending wins when both hold, and it is offered **wherever the
 * Scribe stands**: a lit Tree is a fact about the Tree, not about the ground
 * underfoot, and walking back to the crown to be told so would be a toll on
 * an ending already paid for ten times over.
 */
export function sealOffered(
  standing: Standing,
  /**
   * **The tablets refuse the crown.** *"Only all ten kindled will end this
   * climb."* The one relic whose price is not a number but an ending taken off
   * the table — a Scribe who carries the broken tablets up the Tree has
   * committed to the consummation before setting out, and `climb.test.ts`
   * asserts that the dash fails holding them, so the price is proved to bite
   * rather than assumed to.
   *
   * Note it removes only the *crown* ending. A climb can still go out, and a
   * lit Tree still seals — this forbids the shortcut, not the climb.
   */
  keeps: { kindledOnly?: boolean } = {},
): SealKind | undefined {
  if (new Set(standing.sefirotLit).size >= TOTAL_REGIONS) return "kindled";
  if (keeps.kindledOnly) return undefined;
  if (standing.at === CROWN && standing.guardiansBroken.includes(CROWN)) return "crown";
  return undefined;
}

/**
 * Which ending a *sealed* record holds — the same question asked backwards, of
 * history rather than of a standing Scribe. Every record ever written can be
 * read this way, including the ones sealed before the crown ending existed,
 * because it reads nothing but `sefirotLit`.
 */
export function sealKindOf(record: { sefirotLit?: readonly SefirahId[] }): SealKind {
  return new Set(record.sefirotLit ?? []).size >= TOTAL_REGIONS ? "kindled" : "crown";
}
