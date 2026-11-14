import type { SefirahId } from "../types/letter";
import type { AscentRecord } from "../storage/ascentRepo";
import { LAMPS } from "./combat";
import { CROWN, sealKindOf } from "./sealing";
import { nodeOf, otherEnd, type TreePath } from "./tree";

/**
 * **The descent — Chapter II, Part One — as rules a test can see.**
 *
 * The design is `docs/chapter-ii.md`. In one sentence: the Scribe begins at
 * the crown holding the letters a sealed climb carried there, and every road
 * walked *downward* takes back the letter that road pays on the way up.
 *
 * These are the rules and nothing else — no React, no storage, no world — in
 * the idiom of `sealing.ts` and `fall.ts`, and for their reason: a rule that
 * lives in a callback is a rule no test can see. Nothing on screen reads this
 * file yet. It exists first so the one question the design cannot survive
 * getting wrong — *can a hand that only shrinks be stranded?* — can be asked
 * of the real builder before a single surface is made (`route.test.ts`).
 */

/** How a road runs for a Scribe stepping onto it at `from`. */
export type Direction = "down" | "up" | "across";

/**
 * By the Tree's own rows, which is the only notion of height it has. A
 * horizontal joins two Sefirot on one row and is neither.
 */
export function directionOf(path: TreePath, from: SefirahId): Direction {
  const here = nodeOf[from].row;
  const there = nodeOf[otherEnd(path, from)].row;
  return there < here ? "down" : there > here ? "up" : "across";
}

export function isDownward(path: TreePath, from: SefirahId): boolean {
  return directionOf(path, from) === "down";
}

/**
 * **The hand after a road.** Walked downward, the road takes its own letter —
 * if the Scribe still has it to give. Walked upward or across it takes
 * nothing, and it gives nothing back: a letter is not picked up twice.
 *
 * A horizontal lays nothing down. It is not a descent, and letting three
 * roads be walked for free in both directions is what keeps the choice of
 * route a choice.
 */
export function layDown(
  held: readonly string[],
  path: TreePath,
  from: SefirahId,
): string[] {
  if (!isDownward(path, from)) return [...held];
  return held.filter((letter) => letter !== path.letter);
}

/** The letter a road would take from this hand, walked this way — if any. */
export function wouldLayDown(
  held: readonly string[],
  path: TreePath,
  from: SefirahId,
): string | undefined {
  return isDownward(path, from) && held.includes(path.letter) ? path.letter : undefined;
}

/**
 * **Which pages of the Book a descent may begin from**: a climb sealed at the
 * crown or with the whole Tree kindled. Not a first ascent gone out in peace
 * (it never stood at the crown), not a climb still open or put down, and not
 * a descent.
 */
export function descendable(
  record: Pick<AscentRecord, "sealedAt" | "sefirotLit" | "firstAscent" | "at" | "chapter">,
): boolean {
  if (!record.sealedAt || record.chapter === 2) return false;
  return sealKindOf(record) !== "peace";
}

/** What a descent begins as. A plain value: nothing here touches storage. */
export interface DescentStart {
  chapter: 2;
  descendedFrom: string;
  at: SefirahId;
  lettersHeld: string[];
  lamps: number;
  or: number;
}

/**
 * The start of a descent from a page: at the crown, with exactly the letters
 * that climb sealed with, a whole hand of lamps and no light. `undefined` for
 * a record a descent cannot begin from.
 */
export function beginDescentFrom(
  record: Pick<
    AscentRecord,
    "id" | "sealedAt" | "sefirotLit" | "firstAscent" | "at" | "chapter" | "lettersHeld"
  >,
): DescentStart | undefined {
  if (!descendable(record)) return undefined;
  return {
    chapter: 2,
    descendedFrom: record.id,
    at: CROWN,
    lettersHeld: [...record.lettersHeld],
    lamps: LAMPS,
    or: 0,
  };
}

/** How a descent is named at the kingdom, by how many lights were brought down. */
export type DescentEnding = "empty" | "some" | "lit" | "whole";

export function descentEnding(lightsDown: number): DescentEnding {
  if (lightsDown <= 0) return "empty";
  if (lightsDown >= 10) return "whole";
  return lightsDown >= 7 ? "lit" : "some";
}

export const DESCENT_NAMED: Record<DescentEnding, string> = {
  empty: "You came down empty",
  some: "Some of it reached the kingdom",
  lit: "The kingdom is lit from above",
  whole: "The whole Tree is brought down",
};
