import type { SefirahId } from "../types/letter";
import type { Grace, Verb } from "./abilities";
import type { HuskKind } from "./combat";
import type { Effect } from "./items";

/**
 * **What holds a Sefirah.**
 *
 * Kindling was an accounting exercise. A Sefirah cost light and nothing else,
 * so the whole ending of a climb — all ten lit — was arithmetic, and nothing
 * defended the thing being climbed to. Every Sefirah is now *held*, and the
 * light only buys the kindling once the thing holding it has been broken.
 *
 * The seven lower ones are held by the creatures (`BEASTS`), which a Scribe has
 * already met scattered on a rung before ever facing one alone in a room. The
 * three above the Abyss are held by the three from the fifth day — Bava Batra
 * 74b — and those three are the only bodies in this game that a mark cannot
 * open at all. Each of them answers to exactly one letter.
 *
 * **This is the game's own claim, finally made true of a fight.** Twenty-two
 * letters decide how a Scribe moves, and until now the fight read exactly two
 * of them: Zayin pierces, Shin burns. Both are modifiers — the fight went the
 * same way without them, only slower. Leviathan does not go slower without Vav.
 * It does not go at all.
 *
 * And it is not a soft-lock, because a Sefirah that cannot be kindled yet is a
 * Sefirah that can be kindled later: the map names what holds it and what
 * answers it, and the Tree has twenty-two ways round.
 */
export interface Guardian {
  sefirah: SefirahId;
  kind: HuskKind;
  /**
   * Why this creature stands here. One line, for the map — and the same
   * discipline the region pairings are written under: if it could be swapped
   * with another Sefirah's without anybody noticing, it has not earned it.
   */
  because: string;
  /**
   * The one letter that opens it. Only the three great ones have one; the
   * seven below are hard rather than locked.
   *
   * The `verb` or `grace` is what the letter actually grants, because that is
   * what `step.ts` and `markPowers` read — the letter id is here for the plate
   * and for the test that asks whether a route to this Sefirah can carry it.
   */
  opens?: { letter: string; verb?: Verb; grace?: Grace; how: string };
  /**
   * What breaking it is worth in **every climb after this one**, forever.
   *
   * An `Effect`, which is the vessels' own type, folded by the vessels' own
   * `fold` — which gives the two across-runs systems a clean division worth
   * stating: **the Seven Encounters change the world; the guardians change the
   * Scribe.** The Encounters own the motes, the klipot, the lamps, the veiling
   * and the guests. The guardians own the mark.
   */
  boon: Effect;
  /** What the boon is, in the voice of the thing that gave it. */
  boonLine: string;
}

export const GUARDIANS: Record<SefirahId, Guardian> = {
  malchut: {
    sefirah: "malchut",
    kind: "arbeh",
    because: "The kingdom is the many. What holds it is not one thing.",
    boon: { cooldown: 0.94 },
    boonLine: "You have written at a great many of them, and your hand is quicker for it.",
  },
  yesod: {
    sefirah: "yesod",
    kind: "nefilim",
    because: "The foundation is where a fall lands, and they are named for falling.",
    boon: { iframes: 1.15 },
    boonLine: "Something came down on you and you got up. The next thing takes longer to reach you.",
  },
  hod: {
    sefirah: "hod",
    kind: "saraf",
    because:
      "The fiery serpents were sent for ingratitude and the cure was to look up, which is the whole of what Hod is.",
    boon: { light: 1.1 },
    boonLine: "You looked up. What you gather is worth a little more than it was.",
  },
  netzach: {
    sefirah: "netzach",
    kind: "reem",
    because: "Endurance, met by the thing that will not turn.",
    boon: { speed: 1.12 },
    boonLine: "It went where it was pointed. So does what you throw now.",
  },
  tiferet: {
    sefirah: "tiferet",
    kind: "rahav",
    because: "Truth, held by pride — which is its exact inversion and grows on being opposed.",
    boon: { bite: 1.15 },
    boonLine: "It got bigger every time you struck it, and you struck it anyway.",
  },
  gevurah: {
    sefirah: "gevurah",
    kind: "og",
    because: "Judgment, and the last of the giants was destroyed at Edrei.",
    boon: { lamps: 1 },
    boonLine: "The ceiling came down on you often enough that you are made of one more light.",
  },
  chesed: {
    sefirah: "chesed",
    kind: "tannin",
    because: "Chesed is water, and the tanninim are the first made thing the account names.",
    boon: { reach: 6 },
    boonLine: "You learned to reach across water. What you write carries further.",
  },

  // ---------------------------------------------------------------------------
  // above the Abyss — the three from the fifth day
  // ---------------------------------------------------------------------------

  binah: {
    sefirah: "binah",
    kind: "livyatan",
    because: "Binah is called the sea, and the sea is Leviathan's.",
    opens: {
      letter: "vav",
      verb: "grapple",
      how: "Nothing touches it in the water. The Hook draws it out — a mark that draws takes no shell off it and pulls it landward, and on the land it can be written on.",
    },
    boon: { homing: true },
    boonLine: "Having once drawn something out with a hook, what you throw goes looking.",
  },
  chochmah: {
    sefirah: "chochmah",
    kind: "ziz",
    because: "Chochmah is the highest ground a Scribe stands on, and the Ziz never comes down.",
    opens: {
      letter: "lamed",
      grace: "high-jump",
      how: "It holds the roof. Whether you reach it is a question about how far you can throw, and the Staff is the only answer to that question.",
    },
    boon: { splits: true },
    boonLine: "What comes apart above you comes apart. So does what you throw.",
  },
  keter: {
    sefirah: "keter",
    kind: "behemot",
    because: "Only the one who made him can bring a blade near him, and the crown is where only the Maker acts.",
    opens: {
      letter: "bet",
      verb: "block",
      how: "Nothing stops it while it is moving, and the walls do not — it turns at those. A stone set in its way stops it, and stopped is the only time there is anything to write on.",
    },
    boon: { bounces: true },
    boonLine: "Nothing stopped it. Stone no longer stops what you throw either.",
  },
};

export const GUARDIAN_LIST: readonly Guardian[] = Object.values(GUARDIANS);

/** What holds this Sefirah — every one of them holds something. */
export function guardianOf(sefirah: SefirahId): Guardian {
  return GUARDIANS[sefirah];
}

/** Whether this Sefirah's guardian has been broken, ever, by this Scribe. */
export function isFreed(sefirah: SefirahId, broken: readonly SefirahId[]): boolean {
  return broken.includes(sefirah);
}

/** The boons a Scribe carries into every climb, from what they have broken. */
export function boonsFrom(broken: readonly SefirahId[]): Effect[] {
  return broken.map((s) => GUARDIANS[s]?.boon).filter((b): b is Effect => Boolean(b));
}
