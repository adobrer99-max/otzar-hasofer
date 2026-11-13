/**
 * **What a key does to a plate — one table, exhaustive by type.**
 *
 * This used to be a chain of `if`s inside a `useEffect`, and it has shipped the
 * same bug twice: a plate whose buttons are an *answer* left in the list of
 * plates the keyboard simply dismisses. The Abyss was the first (Enter fell
 * through to a road that sealed the climb); the House, the Word-Gate and the
 * seal were the second — Enter on a focused "Accept" closed the plate with
 * nothing accepted and the guest spent, Enter on a palette letter shut the
 * gate, and Escape on the seal plate sealed the climb for good.
 *
 * So the rule has a home and a type. Every plate kind names what it is:
 *
 * - `dismiss` — nothing is being asked. Enter, Space and Escape all put it down.
 * - `answer`  — its buttons are a decision. Enter and Space are **left alone**
 *   so they press whichever button is focused; Escape does `escape`, which is
 *   either the harmless way out or nothing at all.
 * - anything else is that plate's one named continuation.
 *
 * A plate kind missing from the table is a compile error, which is the point.
 */
export type PlateKind =
  | "prologue"
  | "first-sight"
  | "path-done"
  | "guardian-done"
  | "letter"
  | "fragment"
  | "scroll-whole"
  | "vessel"
  | "relic"
  | "house"
  | "word-gate"
  | "word-result"
  | "abyss"
  | "out"
  | "sealed";

export type PlateKeyAction =
  | "none"
  | "close"
  | "turn"
  | "skip"
  | "pass-first-sight"
  | "fall"
  | "tree";

type Manner =
  | { is: "dismiss" }
  /** `escape` is what Escape does; Enter and Space belong to the buttons. */
  | { is: "answer"; escape: "close" | "none" }
  | { is: "continue"; enter: PlateKeyAction; escape: PlateKeyAction };

export const PLATE_MANNERS: Record<PlateKind, Manner> = {
  // Enter means *more*, and only Escape puts the telling down.
  prologue: { is: "continue", enter: "turn", escape: "skip" },
  "first-sight": { is: "continue", enter: "pass-first-sight", escape: "pass-first-sight" },
  "path-done": { is: "continue", enter: "tree", escape: "tree" },
  "guardian-done": { is: "continue", enter: "tree", escape: "tree" },
  // Never a way of getting on for free: the last lamp out is a fall, always.
  out: { is: "continue", enter: "fall", escape: "fall" },
  letter: { is: "dismiss" },
  fragment: { is: "dismiss" },
  "scroll-whole": { is: "dismiss" },
  "word-result": { is: "dismiss" },
  // Leaving a pedestal, a niche or the gulf's edge is "not yet", and safe.
  vessel: { is: "answer", escape: "close" },
  relic: { is: "answer", escape: "close" },
  abyss: { is: "answer", escape: "close" },
  // A gate refused can be walked back into; stepping away costs nothing.
  "word-gate": { is: "answer", escape: "close" },
  // "Not yet" — the seal is irreversible, so Escape is the way *out* of it.
  sealed: { is: "answer", escape: "close" },
  // The guest is spent on contact, so there is no harmless way to leave
  // unanswered: the Scribe accepts or declines, with a button.
  house: { is: "answer", escape: "none" },
};

/** What `key` does to a plate of `kind`. `key` is "Enter", "Escape" or "Space". */
export function plateKeyAction(kind: PlateKind, key: "Enter" | "Escape" | "Space"): PlateKeyAction {
  const manner = PLATE_MANNERS[kind];
  if (manner.is === "dismiss") return "close";
  if (manner.is === "answer") return key === "Escape" ? manner.escape : "none";
  return key === "Escape" ? manner.escape : manner.enter;
}

/**
 * What a screen reader is told a plate *is*. A dialog with no name announces
 * as "dialog" and nothing else, fifteen times over.
 */
export const PLATE_NAMES: Record<PlateKind, string> = {
  prologue: "The telling",
  "first-sight": "A new rung",
  "path-done": "The way out",
  "guardian-done": "A guardian broken",
  letter: "A letter",
  fragment: "A piece of the scroll",
  "scroll-whole": "The scroll made whole",
  vessel: "A vessel",
  relic: "A hidden thing",
  house: "A House of the Dorot",
  "word-gate": "A word-gate",
  "word-result": "The gate answers",
  abyss: "The Abyss",
  out: "The lamps are spent",
  sealed: "Seal the ascent",
};
