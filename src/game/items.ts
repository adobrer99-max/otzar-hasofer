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
 * That is the hard line, and it is narrower than it first reads. A vessel *may*
 * change how a mark behaves — bounce it off stone, bend it after a shell, break
 * it into shards, weigh it down so it falls. Twenty objects that only scale
 * four numbers are twenty profiles; twenty objects that each carry an idea are
 * twenty reasons to walk a different path. The rule is about the verb list,
 * which is the progression, and not about arithmetic.
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
  /** Stone turns a mark rather than stopping it — twice, and then it is spent. */
  bounces?: boolean;
  /** A mark bends after the nearest shell, once, early in its flight. */
  homing?: boolean;
  /** Breaking a shell throws two shards out of it, which do not break again. */
  splits?: boolean;
  /** The mark has weight, and falls as it flies. */
  arcs?: boolean;
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
 * The pool a climb draws from — twenty objects a scribe or a Temple would
 * actually own, of which one Scribe sees perhaps half.
 *
 * **It was seven, one per rung, always the same seven in the same places**, and
 * the note explaining that said: *an object that might or might not be there is
 * a reason to re-roll a climb rather than to make one.* That was right about a
 * line and it is wrong about the Tree, for a reason worth stating rather than
 * quietly reversing:
 *
 * **The seed is the Hebrew date.** Every Scribe who begins today climbs the
 * same Tree, and `buildPath` seeds a rung by the day and the path together — so
 * which vessel lies on Netzach–Tiferet is fixed until midnight and nobody can
 * roll it again. What a Scribe *can* do is choose which paths to walk, which
 * turns a pool from a slot machine into a shopping list. That is the whole
 * argument: the old objection was about re-rolling, and re-rolling is not
 * available.
 *
 * What the pool buys is the thing the climb did not have. Twenty-two letters
 * are gathered by everyone who reaches the crown, so two finished climbs used
 * to differ only in which bargains were struck and what the day lent. Now they
 * differ in what the Scribe is made of.
 *
 * **About a third of them cost something**, and each pays in a currency other
 * than the one it gives: the Crowns break what they land on and no shard weighs
 * what the letter did; the Measuring Line goes to what it was stretched toward
 * and takes its time; the Plumb Line falls. That is only possible because a
 * pedestal can now be walked past — a cost you cannot decline is not a bargain,
 * and while walking into a vessel took it, every object in here had to be an
 * improvement, which is another way of saying none of them was a decision.
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
    found: "The scribe's straightedge, for the lines a letter hangs from. What is written along it goes where it was aimed — and runs to the margin and back, because a ruled line stops nowhere else. Ruling takes longer than writing.",
    effect: { speed: 1.35, bounces: true, cooldown: 1.2 },
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
    synergy: {
      with: "nartik",
      effect: { iframes: 1.4 },
      line: "Wrapped and cased: two thicknesses between you and the world.",
    },
  },
  {
    id: "klaf",
    name: "The Parchment",
    hebrew: "קְלָף",
    found: "Skin split, limed and scraped to the grain that takes ink. Only the outer layer is written on; the rest is what stops the pen going through.",
    effect: { iframes: 1.3, lamps: 1 },
  },
  {
    id: "gevil",
    name: "The Hide",
    hebrew: "גְּוִיל",
    found: "The whole skin, unsplit — heavier, coarser, and what the oldest scrolls are written on. It outlasts the parchment and it is harder to write on.",
    effect: { lamps: 1, cooldown: 1.2, iframes: 1.5 },
    synergy: {
      with: "kulmus",
      effect: { cooldown: 0.75 },
      line: "A worn nib on rough hide: it bites, and it stops catching.",
    },
  },
  {
    id: "sirtut",
    name: "The Scoring",
    hebrew: "שִׂרְטוּט",
    found: "The blind lines a scribe rules before he writes, pressed into the skin with a point. Nothing is written above them; every letter hangs from one.",
    effect: { reach: 10, speed: 1.15 },
    synergy: {
      with: "sargel",
      effect: { speed: 1.2, reach: 6 },
      line: "Ruled, then scored: the line was decided before the letter was thrown.",
    },
  },
  {
    id: "tagin",
    name: "The Crowns",
    hebrew: "תָּגִין",
    found: "Three strokes set on the head of a letter, on seven letters and no others. Nobody agrees what they are for. They are not decoration — what they land on comes apart, and the three go on separately. They are drawn after the letter, and a crowned letter is not a quick one.",
    effect: { splits: true, cooldown: 1.25 },
    synergy: {
      with: "kulmus",
      effect: { cooldown: 0.7 },
      line: "Crowned by a worn reed: a hand that has done this ten thousand times does not slow down to do it again.",
    },
  },
  {
    id: "yad",
    name: "The Pointer",
    hebrew: "יָד",
    found: "A small silver hand on a shaft, for following the reading without touching the letters. It keeps a distance, which is the point of it — and it is held, and set down, and taken up again between one line and the next.",
    effect: { reach: 20, cooldown: 1.25 },
    synergy: {
      with: "sirtut",
      effect: { reach: 8 },
      line: "Pointer along the scoring: the line is followed all the way to the far margin.",
    },
  },
  {
    id: "chotam",
    name: "The Signet",
    hebrew: "חוֹתָם",
    found: "Cut in reverse so that it reads true in the clay. Set me as a seal upon thine heart — a thing pressed through, and leaving a mark on the far side.",
    effect: { pierces: true, speed: 0.9 },
  },
  {
    id: "mazref",
    name: "The Crucible",
    hebrew: "מַצְרֵף",
    found: "For silver, and the fire tries the heart. What comes out of it is less than went in and worth more.",
    effect: { light: 1.8, lamps: -1 },
    synergy: {
      with: "keset",
      effect: { light: 1.4 },
      line: "Refined into the inkhorn: nothing gathered is carried unassayed.",
    },
  },
  {
    id: "nartik",
    name: "The Case",
    hebrew: "נַרְתִּיק",
    found: "A cylinder of wood and leather that a scroll stands upright in. Nothing in it is read often, and nothing in it is lost.",
    effect: { iframes: 1.35, light: 1.15 },
  },
  {
    id: "kav",
    name: "The Measuring Line",
    hebrew: "קָו",
    found: "Stretched over a thing to find out what it is. Line upon line, precept upon precept, here a little and there a little — it goes to what it was stretched toward, and it takes its time getting there.",
    effect: { homing: true, speed: 0.8, reach: 6 },
  },
  {
    id: "mishkolet",
    name: "The Plumb Line",
    hebrew: "מִשְׁקֹלֶת",
    found: "A weight on a cord, and the one tool that cannot be argued with. It does not say what is straight; it says what is not — and it says it by falling, which is the only thing a weight knows how to do.",
    effect: { bite: 1.6, arcs: true },
    synergy: {
      with: "kav",
      effect: { speed: 1.4, cooldown: 0.85 },
      line: "Line and plumb: measured across and measured down. Each of them was slow alone, and together they are not.",
    },
  },
  {
    id: "menorah",
    name: "The Lampstand",
    hebrew: "מְנוֹרָה",
    found: "Beaten from a single talent, branch and cup and knop and flower, and not assembled from parts. Seven lights, and the middle one is the one that is never let go out.",
    effect: { lamps: 2, light: 0.8 },
    synergy: {
      with: "ner",
      effect: { light: 1.5 },
      line: "The small lamp set among the seven: what was one light is the light of a house.",
    },
  },
  {
    id: "kiyor",
    name: "The Laver",
    hebrew: "כִּיּוֹר",
    found: "Cast from the mirrors the women gave, and set between the tent and the altar. Nobody approaches the work with the dust still on them.",
    effect: { light: 1.35, iframes: 1.2 },
  },
  {
    id: "tzintzenet",
    name: "The Jar",
    hebrew: "צִנְצֶנֶת",
    found: "An omer of it, kept for the generations, so that they may see the bread wherewith I fed you. It has not spoiled and it is not enough for a meal.",
    effect: { light: 1.5, cooldown: 0.85 },
    synergy: {
      with: "mazref",
      effect: { light: 1.35 },
      line: "The jar out of the crucible: kept, and assayed, and kept again.",
    },
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
  bounces: boolean;
  homing: boolean;
  splits: boolean;
  arcs: boolean;
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
  bounces: false,
  homing: false,
  splits: false,
  arcs: false,
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
    // The behaviours are had or not had, so they fold with `or`. A second
    // vessel that bounces adds nothing, which is correct: the mark already
    // does the thing.
    pierces: into.pierces || Boolean(effect.pierces),
    bounces: into.bounces || Boolean(effect.bounces),
    homing: into.homing || Boolean(effect.homing),
    splits: into.splits || Boolean(effect.splits),
    arcs: into.arcs || Boolean(effect.arcs),
  };
}

/**
 * What a set of vessels amounts to — their own effects, and then whichever
 * synergies both halves of are actually held.
 */
export function powersFrom(held: readonly string[], boons: readonly Effect[] = []): Powers {
  let powers = NOTHING;
  // **The boons fold first**, and they are the same shape as a vessel's effect
  // on purpose: a guardian broken in some earlier climb is a thing the Scribe
  // *is* rather than a thing they are carrying, so it is the floor everything
  // else multiplies up from. See `guardians.ts` — the Encounters change the
  // world, and these change the Scribe.
  for (const boon of boons) powers = fold(powers, boon);
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

/**
 * What a vessel does, in a phrase, **derived from its numbers rather than
 * written beside them**.
 *
 * Needed because a vessel can now be declined, and declining is only a decision
 * if the Scribe knows what they are declining — on the map, before walking the
 * path, and on the plate, before saying yes. An authored line would drift from
 * the effect the first time a number was retuned, and a plate that promises a
 * heavier mark on a vessel that no longer gives one is worse than a plate that
 * promises nothing.
 *
 * Gains first, then costs, so a trade reads as a trade.
 */
export function describeEffect(effect: Effect): string {
  const gains: string[] = [];
  const costs: string[] = [];
  /** `good` is the direction that helps, so one table decides both lists. */
  const say = (had: number | undefined, at: number, good: 1 | -1, up: string, down: string) => {
    if (had === undefined || had === at) return;
    (Math.sign(had - at) === good ? gains : costs).push(had > at ? up : down);
  };
  say(effect.bite, 1, 1, "strikes harder", "strikes softer");
  say(effect.reach, 0, 1, "carries further", "carries less far");
  say(effect.cooldown, 1, -1, "thrown slower", "thrown faster");
  say(effect.speed, 1, 1, "flies faster", "flies slower");
  say(effect.iframes, 1, 1, "longer grace after a hit", "shorter grace after a hit");
  say(effect.light, 1, 1, "light is worth more", "light is worth less");
  say(effect.lamps, 0, 1, `+${effect.lamps} lamp`, `${effect.lamps} lamp`);
  if (effect.pierces) gains.push("passes through what it breaks");
  if (effect.bounces) gains.push("stone turns it");
  if (effect.homing) gains.push("bends after a shell");
  if (effect.splits) gains.push("a break throws shards");
  // Weight is the one behaviour that is a price rather than a gift.
  if (effect.arcs) costs.push("it falls as it flies");
  const said = gains.join(" · ");
  return costs.length === 0 ? said : said ? `${said} — but ${costs.join(", ")}` : costs.join(", ");
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
 * Which vessel a rung holds, if any — drawn from what the Scribe does not
 * already carry, by the rung's own generator.
 *
 * The caller's `rng` is seeded from the day and the path together, so this is
 * **fixed until midnight and different on every path**: the Reed lies where it
 * lies today, and a Scribe who wants it walks the path it is on. That is the
 * decision the pool exists to create, and it is not a slot machine, because
 * there is nothing to pull.
 *
 * Excluding what is held is what stops the back half of a climb being pedestals
 * with nothing on them. It also means the pool *narrows* as a climb goes on,
 * which is the right shape: the last vessels a Scribe finds are the ones they
 * went out of their way for.
 *
 * **The draw indexes the whole pool and then walks forward past what is held**,
 * rather than indexing a filtered one. The difference is invisible while every
 * pedestal is taken on sight and fatal the moment one can be left: a filtered
 * list re-orders itself every time *any* vessel is picked up anywhere, so
 * declining the Reed on one path and taking the Awl on another would silently
 * put something else where the Reed was. Walking forward keeps a path's vessel
 * fixed by the day and the path until that vessel is taken — which is what
 * makes the map a shopping list rather than a rumour.
 */
export function drawKeli(rng: () => number, held: readonly string[]): Keli | undefined {
  if (KELIM.every((k) => held.includes(k.id))) return undefined;
  let at = Math.floor(rng() * KELIM.length) % KELIM.length;
  while (held.includes(KELIM[at].id)) at = (at + 1) % KELIM.length;
  return KELIM[at];
}

/**
 * The old fixture, kept for the linear climb behind the Tree — `buildRegion`
 * has no path to seed from and no notion of what is carried, and a rung of the
 * old road should hold what it always held.
 */
export function keliFor(regionIndex: number): Keli | undefined {
  return KELIM[regionIndex - 2];
}
