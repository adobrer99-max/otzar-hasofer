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
  /**
   * **What each *further* breaking is worth**, up to `TIERS`.
   *
   * The boons were ten booleans, and every one of them was reachable inside a
   * single thorough climb: after that, breaking a guardian again changed a
   * Scribe by exactly nothing, and there was no reason to walk that way twice.
   * The meta-progression ran out before the Seven Encounters did.
   *
   * Authored rather than exponentiated. Repeating `boon` would have worked for
   * the seven below — `fold` multiplies rates and adds quantities, so a second
   * copy compounds — and it does *nothing at all* for the three great ones,
   * whose gift is a behaviour that is had or not had. It would also have made
   * Gevurah's third breaking a sixth lamp, doubling the body, which nobody
   * chose. So every guardian says what its own return trip is worth, and
   * `guardians.test.ts` walks the table to prove none of them is a no-op.
   */
  deepens: Effect;
  /** What the deeper tiers are, in the same voice. */
  deepLine: string;
}

/** How many breakings a guardian's gift keeps growing for. */
export const TIERS = 3;

/**
 * The tier a Sefirah has reached, from the number of climbs it was broken in.
 * Zero is a guardian never faced; `TIERS` is the ceiling and is hard.
 */
export function tierOf(times: number): number {
  return Math.max(0, Math.min(TIERS, Math.floor(times)));
}

export const GUARDIANS: Record<SefirahId, Guardian> = {
  malchut: {
    sefirah: "malchut",
    kind: "arbeh",
    because: "The kingdom is the many. What holds it is not one thing.",
    boon: { cooldown: 0.94 },
    boonLine: "You have written at a great many of them, and your hand is quicker for it.",
    deepens: { cooldown: 0.96 },
    deepLine: "You have come back to the many more than once. The hand is quicker still.",
  },
  yesod: {
    sefirah: "yesod",
    kind: "nefilim",
    because: "The foundation is where a fall lands, and they are named for falling.",
    boon: { iframes: 1.15 },
    boonLine: "Something came down on you and you got up. The next thing takes longer to reach you.",
    deepens: { iframes: 1.08 },
    deepLine: "You have got up here before. What lands on you next has longer to wait.",
  },
  hod: {
    sefirah: "hod",
    kind: "saraf",
    because:
      "The fiery serpents were sent for ingratitude and the cure was to look up, which is the whole of what Hod is.",
    boon: { light: 1.1 },
    boonLine: "You looked up. What you gather is worth a little more than it was.",
    deepens: { light: 1.06 },
    deepLine: "You looked up again, knowing what was there. It is worth more again.",
  },
  netzach: {
    sefirah: "netzach",
    kind: "reem",
    because: "Endurance, met by the thing that will not turn.",
    boon: { speed: 1.12 },
    boonLine: "It went where it was pointed. So does what you throw now.",
    deepens: { speed: 1.06 },
    deepLine: "It did not turn the second time either, and neither does what you throw.",
  },
  tiferet: {
    sefirah: "tiferet",
    kind: "rahav",
    because: "Truth, held by pride — which is its exact inversion and grows on being opposed.",
    boon: { bite: 1.15 },
    boonLine: "It got bigger every time you struck it, and you struck it anyway.",
    deepens: { bite: 1.08 },
    deepLine: "You came back for it knowing it would grow. What you write lands harder.",
  },
  gevurah: {
    sefirah: "gevurah",
    kind: "og",
    because: "Judgment, and the last of the giants was destroyed at Edrei.",
    boon: { lamps: 1 },
    boonLine: "The ceiling came down on you often enough that you are made of one more light.",
    // Deliberately not another whole lamp: a third breaking would double the
    // body, which is a different game. Judgment is severe about what it gives.
    deepens: { iframes: 1.1 },
    deepLine: "You went back under the ceiling. It takes longer now for anything to reach you.",
  },
  chesed: {
    sefirah: "chesed",
    kind: "tannin",
    because: "Chesed is water, and the tanninim are the first made thing the account names.",
    boon: { reach: 6 },
    boonLine: "You learned to reach across water. What you write carries further.",
    deepens: { reach: 3 },
    deepLine: "You crossed the water again. It carries further still.",
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
    // A behaviour is had or not had, so the great ones deepen in a number
    // instead — and in the number their own fight is about. Leviathan is
    // reach: it cannot be come at without one.
    deepens: { reach: 4 },
    deepLine: "You went back into the sea for it. What you throw goes further out.",
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
    deepens: { speed: 1.08 },
    deepLine: "You reached the roof twice. What you throw gets there faster.",
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
    deepens: { bite: 1.1 },
    deepLine: "You stopped the unstoppable thing again. What you write lands like it.",
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

/**
 * The boons a Scribe carries into every climb, from what they have broken —
 * **and how often.**
 *
 * Takes counts rather than a set, which is the whole of the tiering: the first
 * breaking gives the guardian's `boon`, and each one after it gives `deepens`
 * again, to a hard ceiling of `TIERS`. One climb can reach tier one everywhere;
 * two and three are the reason to walk a way a second time, and there is no
 * fourth. A plain array is still accepted and reads as one breaking each,
 * because that is what an array of Sefirot means.
 *
 * The effects fold in `items.ts`, which multiplies rates and adds quantities —
 * so a repeated `deepens` compounds exactly as a second vessel would, and the
 * numbers were chosen knowing that.
 */
export function boonsFrom(freed: readonly SefirahId[] | Record<string, number>): Effect[] {
  const times: Record<string, number> = Array.isArray(freed)
    ? Object.fromEntries(freed.map((s) => [s, 1]))
    : (freed as Record<string, number>);
  const out: Effect[] = [];
  for (const [sefirah, count] of Object.entries(times)) {
    const guardian = GUARDIANS[sefirah as SefirahId];
    if (!guardian) continue;
    const tier = tierOf(count);
    if (tier < 1) continue;
    out.push(guardian.boon);
    for (let i = 1; i < tier; i += 1) out.push(guardian.deepens);
  }
  return out;
}
