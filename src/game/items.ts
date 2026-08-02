/**
 * The vessels — what the Scribe finds and carries, as against what he *is*.
 *
 * Twenty-two letters are the progression, and they are the alphabet: each one
 * grants a verb or a grace, each one is a way of moving through the world, and
 * between them they are the whole of what a body can do. A **keli** is not
 * that. It is an object picked up off a pedestal in a room off the main way,
 * and it changes the *numbers* — how far a mark carries, how hard it bites,
 * how many lamps you are made of, what a broken shell gives up.
 *
 * **No vessel grants a verb**, and `items.test.ts` asserts it. An object that
 * handed out a thirteenth verb would be competing with the alphabet, and the
 * alphabet is the game.
 *
 * The effects are **data rather than functions**, which is what lets every
 * pair of them be enumerated and checked. That matters more than it sounds:
 * the whole reason to have more than one object is that they combine, and a
 * synergy declared as a closure is a synergy nobody can audit.
 */

/** Everything a vessel is allowed to touch. Multiplied, or added, never set. */
export interface Effect {
  /** The mark's damage, multiplied. */
  bite?: number;
  /** How long a mark lives, in ticks — its reach. */
  reach?: number;
  /** Ticks between marks. Below one is faster. */
  cooldown?: number;
  /** How fast a mark flies. */
  speed?: number;
  /** Lamps added to the three the Scribe is made of. */
  lamps?: number;
  /** Ticks of grace after a hit, multiplied. */
  iframes?: number;
  /** What a mote is worth, multiplied. */
  light?: number;
  /** A mark passes through what it breaks. */
  pierces?: boolean;
}

export interface Keli {
  id: string;
  name: string;
  hebrew: string;
  /** What it is, in the voice of the thing itself. */
  found: string;
  effect: Effect;
  /**
   * What it becomes when held alongside another. Declared rather than
   * computed, so `items.test.ts` can walk every pair and assert that none of
   * them is a no-op wearing a name.
   */
  synergy?: { with: string; effect: Effect; line: string };
}

/**
 * Seven, one for each rung that keeps a House — the vessel room is the other
 * thing a rung can hold, and seven is what the Tree has room for below the
 * Abyss. Each is an object a scribe would actually own.
 */
export const KELIM: Keli[] = [
  {
    id: "kulmus",
    name: "The Reed",
    hebrew: "קֻלְמוֹס",
    found: "A cut reed, split and trimmed. It was somebody's for years — the nib is worn to their hand, not yours, and it writes harder than you do.",
    effect: { bite: 1.5 },
    synergy: {
      with: "deyo",
      effect: { pierces: true },
      line: "Reed and ink together: the letter goes through the shell and out the other side.",
    },
  },
  {
    id: "deyo",
    name: "The Ink",
    hebrew: "דְּיוֹ",
    found: "Lampblack and gall, thickened. Marks made with it carry further before they dry in the air.",
    effect: { reach: 14 },
  },
  {
    id: "sargel",
    name: "The Ruler",
    hebrew: "סַרְגֵּל",
    found: "The scribe's straightedge, for the lines a letter hangs from. What is written along it goes where it was aimed, and goes there quickly.",
    effect: { speed: 1.35 },
    synergy: {
      with: "deyo",
      effect: { reach: 10 },
      line: "Ruled and inked: the line runs the length of the room before it fades.",
    },
  },
  {
    id: "izmel",
    name: "The Knife",
    hebrew: "אִזְמֵל",
    found: "For scraping an error off the skin without tearing it. A scribe corrects more often than he writes, and faster.",
    effect: { cooldown: 0.7 },
    synergy: {
      with: "kulmus",
      effect: { bite: 1.2 },
      line: "Knife and reed: cut, and cut again, and the second cut is deeper.",
    },
  },
  {
    id: "ner",
    name: "The Lamp",
    hebrew: "נֵר",
    found: "A small clay lamp, the kind left burning in a window. One more light between you and the dark.",
    effect: { lamps: 1 },
  },
  {
    id: "keset",
    name: "The Inkhorn",
    hebrew: "קֶסֶת",
    found: "Worn at the belt, by the man in the vision who was told to mark the foreheads of those who sigh. What it gathers, it gathers doubled.",
    effect: { light: 1.6 },
    synergy: {
      with: "ner",
      effect: { light: 1.3 },
      line: "Inkhorn by lamplight: you see the light lying about you that you would have walked past.",
    },
  },
  {
    id: "mappah",
    name: "The Wrapper",
    hebrew: "מַפָּה",
    found: "The cloth a scroll is bound in when it is not being read. Wrapped, a thing takes longer to come to harm.",
    effect: { iframes: 1.6 },
  },
];

export const keliById: Record<string, Keli> = Object.fromEntries(
  KELIM.map((k) => [k.id, k]),
);

/** Everything the vessels come to, given what is held. */
export interface Powers {
  bite: number;
  reach: number;
  cooldown: number;
  speed: number;
  lamps: number;
  iframes: number;
  light: number;
  pierces: boolean;
}

const NOTHING: Powers = {
  bite: 1,
  reach: 0,
  cooldown: 1,
  speed: 1,
  lamps: 0,
  iframes: 1,
  light: 1,
  pierces: false,
};

function fold(into: Powers, effect: Effect): Powers {
  return {
    bite: into.bite * (effect.bite ?? 1),
    // Reach and lamps *add*, because they are quantities of a thing; the rest
    // multiply, because they are rates. Mixing the two is how a second copy of
    // an object ends up worth nothing.
    reach: into.reach + (effect.reach ?? 0),
    cooldown: into.cooldown * (effect.cooldown ?? 1),
    speed: into.speed * (effect.speed ?? 1),
    lamps: into.lamps + (effect.lamps ?? 0),
    iframes: into.iframes * (effect.iframes ?? 1),
    light: into.light * (effect.light ?? 1),
    pierces: into.pierces || Boolean(effect.pierces),
  };
}

/**
 * What a set of vessels amounts to — their own effects, and then whichever
 * synergies both halves of are actually held.
 */
export function powersFrom(held: readonly string[]): Powers {
  let powers = NOTHING;
  for (const id of held) {
    const keli = keliById[id];
    if (!keli) continue;
    powers = fold(powers, keli.effect);
  }
  for (const id of held) {
    const keli = keliById[id];
    if (keli?.synergy && held.includes(keli.synergy.with)) {
      powers = fold(powers, keli.synergy.effect);
    }
  }
  return powers;
}

/** The synergies alight in a given hand, for the plate to name them. */
export function synergiesIn(held: readonly string[]): { keli: Keli; line: string }[] {
  return held
    .map((id) => keliById[id])
    .filter((k): k is Keli => Boolean(k?.synergy))
    .filter((k) => held.includes(k.synergy!.with))
    .map((k) => ({ keli: k, line: k.synergy!.line }));
}

/**
 * Which vessel a rung holds, if any. Fixed by rung rather than by seed: an
 * object that might or might not be there is a reason to re-roll a climb
 * rather than to make one.
 */
export function keliFor(regionIndex: number): Keli | undefined {
  return KELIM[regionIndex - 2];
}
