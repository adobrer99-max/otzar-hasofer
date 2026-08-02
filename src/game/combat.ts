import type { Grace, Verb } from "./abilities";
import { powersFrom } from "./items";

/**
 * The klipot, and what a scribe does about them.
 *
 * **The husks are not invented.** In Lurianic Kabbalah the *klipot* — קליפות,
 * shells — are what conceals and holds captive the sparks of divine light
 * scattered at the shattering of the vessels, and the work of *birur*, of
 * sorting, is the releasing of them. That is the best-sourced idea in this
 * whole design and it fits the game exactly as it already stood: **break a
 * husk and light comes out.** The motes the Scribe has always gathered stop
 * being scenery on the ground and become what was inside something.
 *
 * ## Why they have names now
 *
 * They used to be four shapes told apart by how they moved — a crawler, a
 * drifter, a spitter, a sentinel — and the comment above them said, with some
 * pride, that they were functional rather than a bestiary. That was the wrong
 * kind of restraint for this game. Everything else here is drawn from the
 * sources and is more interesting for it: the letters are the Sefer Yetzirah's,
 * the guests are the Ushpizin, the rungs are the Sefirot. The klipah was the
 * one system inventing itself out of nothing, and a shell with no name inside
 * it is exactly the thing the Kabbalah says a klipah is *not*: it is a husk
 * **around** something.
 *
 * So each is a failure that Tanach and the midrash already name, and each
 * moves the way its failure moves. Cain paces the same ground and never looks
 * up. Amalek will not come at you while you are looking at it. The Brothers
 * are timid alone and terrible together. The Calf does nothing at all until
 * you touch it. Nothing here is allegory laid on top of a monster — the
 * behaviour **is** the reading, and if you can tell which one it is by how it
 * comes at you, the writing has done its work.
 *
 * ## Roles
 *
 * The chunk library is authored once and drawn on by every rung, so a screen
 * cannot name a klipah — Athaliah has no business in Malchut. What a screen
 * writes is a **role**: something that paces here, something adrift there,
 * something rooted that throws. The rung supplies the klipah, from its own
 * pool, and the role only decides which of them fits the spot.
 *
 * This module is **pure**: shapes, numbers and rules. `world/step.ts` applies
 * them. Nothing in here reads a clock, a DOM or a random number.
 */

export type HuskKind =
  | "cain"
  | "brothers"
  | "calf"
  | "esav"
  | "amalek"
  | "korach"
  | "izevel"
  | "delilah"
  | "atalya"
  | "nachash";

/**
 * What a screen can ask for, as against what a rung supplies.
 *
 * Four, because that is what the authored screens already distinguish: a thing
 * on a ledge, a thing in the air, a thing rooted that reaches you at distance,
 * and a thing that waits and then commits.
 */
export type HuskRole = "pacer" | "floater" | "thrower" | "charger";

export interface HuskSpec {
  kind: HuskKind;
  /** As it is written on the plate. */
  name: string;
  hebrew: string;
  /** Where it is from, so the claim can be checked rather than believed. */
  source: string;
  /** What it is, in one line, for the guide and the HUD. */
  is: string;
  /** How its failure moves — the sentence the behaviour has to earn. */
  reading: string;
  role: HuskRole;
  /** Strikes to disperse it. */
  shells: number;
  /** Pixels per second it moves under its own power. */
  speed: number;
  /** How much light was trapped in it, released when it breaks. */
  light: number;
  /** Half-width and half-height of its body, in pixels. */
  size: { w: number; h: number };
  /**
   * How near the Scribe must come before it does anything. `Infinity` for the
   * ones that never noticed him in the first place.
   */
  notices: number;
  /** Ticks between one throw and the next, for the kinds that throw. */
  throws?: number;
  /** Whether stone means nothing to it. */
  flies?: boolean;
  /**
   * What contact costs. A lamp for almost all of them — that is what a husk
   * is — but Delilah takes what you have gathered instead, which is worse in a
   * way you do not feel until you count.
   */
  takes?: "lamp" | "light";
}

export const HUSKS: Record<HuskKind, HuskSpec> = {
  cain: {
    kind: "cain",
    name: "Cain",
    hebrew: "קַיִן",
    source: "Bereshit 4 — נָע וָנָד, a restless wanderer upon the earth",
    is: "It walks its ground and turns at the edge. It has never once looked up.",
    reading: "The first murder, and the sentence for it: to go back and forth over the same earth forever.",
    role: "pacer",
    shells: 2,
    speed: 42,
    light: 2,
    size: { w: 16, h: 18 },
    notices: Infinity,
  },
  brothers: {
    kind: "brothers",
    name: "The Brothers",
    hebrew: "הָאַחִים",
    source: "Bereshit 37 — the pit, and the sale to the caravan",
    is: "Alone it hangs back. It is braver for every other one of them still standing.",
    reading: "Not one of them would have done it by himself, and that is the whole of what they are.",
    role: "pacer",
    shells: 1,
    speed: 30,
    light: 2,
    size: { w: 16, h: 18 },
    // Close range on purpose. They close on what comes to them and go back to
    // their ground after — a klipah that dogs a Scribe's heels the length of a
    // rung is slower than he is, never gets in front to be written at, and just
    // gnaws: measured, it stalled every run in Yesod and broke one shell in
    // eight. Joseph came to them. They did not go looking.
    notices: 112,
  },
  calf: {
    kind: "calf",
    name: "The Golden Calf",
    hebrew: "הָעֵגֶל",
    source: "Shemot 32 — made in a day, out of what everyone gave",
    is: "It does nothing whatever until you strike it. Then it never stops.",
    reading: "An idol is harmless until you grant it your attention, and then it has all of it.",
    role: "charger",
    shells: 4,
    speed: 128,
    light: 5,
    size: { w: 22, h: 22 },
    notices: Infinity,
  },
  esav: {
    kind: "esav",
    name: "Esau",
    hebrew: "עֵשָׂו",
    source: "Bereshit 25 — a man of the field, who despised the birthright",
    is: "It runs you down over open ground, and gives up the moment you are above it.",
    reading: "He sold what was higher for what was in front of him, and he has not learned to look up since.",
    role: "charger",
    shells: 3,
    speed: 148,
    light: 4,
    size: { w: 20, h: 24 },
    notices: 165,
  },
  amalek: {
    kind: "amalek",
    name: "Amalek",
    hebrew: "עֲמָלֵק",
    source: "Devarim 25 — he met you on the way and cut off the stragglers behind you",
    is: "It comes at your back, and stands still as stone while you face it.",
    reading: "The attack that will not be met — it waits for the moment your attention is elsewhere.",
    role: "pacer",
    shells: 2,
    speed: 92,
    light: 3,
    size: { w: 16, h: 20 },
    notices: 240,
  },
  korach: {
    kind: "korach",
    name: "Korach",
    hebrew: "קֹרַח",
    source: "Bamidbar 16 — the earth opened her mouth and swallowed them",
    is: "It travels inside the ground, and comes up under you.",
    reading: "The dispute that is not for the sake of heaven: it goes down out of sight and surfaces where you stand.",
    role: "floater",
    shells: 3,
    speed: 72,
    light: 4,
    size: { w: 18, h: 20 },
    notices: 300,
    throws: 345,
    flies: true,
  },
  izevel: {
    kind: "izevel",
    name: "Jezebel",
    hebrew: "אִיזֶבֶל",
    source: "Melachim I 18–21 — she cut off the prophets, and watched from her window",
    is: "Rooted where she stands. What she sends is slow, and it lingers after her.",
    reading: "She never went anywhere. Everything she did, she did at a distance and by other hands.",
    role: "thrower",
    shells: 2,
    speed: 0,
    light: 3,
    size: { w: 18, h: 22 },
    notices: 260,
    throws: 165,
  },
  delilah: {
    kind: "delilah",
    name: "Delilah",
    hebrew: "דְּלִילָה",
    source: "Shofetim 16 — and she pressed him daily with her words",
    is: "It costs you no lamp at all. It costs you what you had gathered.",
    reading: "Nothing is taken by force. It is coaxed out, a little at a time, and the loss is only visible later.",
    role: "floater",
    shells: 1,
    speed: 46,
    light: 2,
    size: { w: 18, h: 18 },
    notices: 260,
    flies: true,
    takes: "light",
  },
  atalya: {
    kind: "atalya",
    name: "Athaliah",
    hebrew: "עֲתַלְיָה",
    source: "Melachim II 11 — she destroyed all the seed royal",
    is: "It goes for the loose light before you can, and puts it out.",
    reading: "She did not want the throne so much as she wanted no one else to have it.",
    role: "pacer",
    shells: 2,
    speed: 96,
    light: 3,
    size: { w: 18, h: 20 },
    notices: Infinity,
  },
  nachash: {
    kind: "nachash",
    name: "The Serpent",
    hebrew: "נָחָשׁ",
    source: "Bereshit 3 — subtler than any beast of the field",
    is: "Slow, and it does not stop, and stone is nothing to it.",
    reading: "The first of them and the shape of all the rest: it never hurries, because it has never needed to.",
    role: "floater",
    shells: 4,
    speed: 46,
    light: 5,
    size: { w: 20, h: 20 },
    notices: Infinity,
    flies: true,
  },
};

/**
 * The character each **role** is authored as in the chunk library.
 *
 * Not the kind: a screen is drawn on by every rung and cannot know which
 * klipah belongs there. The letters are the ones the four old kinds used, so
 * every authored screen still says what it always said.
 */
export const HUSK_CHARS: Record<string, HuskRole> = {
  k: "pacer",
  j: "floater",
  q: "thrower",
  n: "charger",
};

/**
 * Which of a rung's klipot fills a spot a screen authored for a role.
 *
 * Falls back to whatever the rung does have, because a screen asking for
 * something rooted is not a reason to stand a klipah that does not belong on
 * this rung — better a Cain in a thrower's alcove than Athaliah in Malchut.
 */
export function kindForRole(
  pool: readonly HuskKind[],
  role: HuskRole,
  pick = 0,
): HuskKind | undefined {
  if (pool.length === 0) return undefined;
  const fitting = pool.filter((k) => HUSKS[k].role === role);
  const from = fitting.length > 0 ? fitting : pool;
  return from[pick % from.length];
}

// ---------------------------------------------------------------------------
// the Scribe's own mark
// ---------------------------------------------------------------------------

/**
 * He is a scribe. He writes, and the letter flies.
 *
 * The mark is thrown in the direction faced and angled by holding up or down —
 * which is why it needed a key of its own rather than a seventh job on the act
 * key. Act already resolves six things by silent precedence; a seventh that
 * fired whenever something was in reach would make the one contextual key
 * ambiguous exactly where ambiguity costs the most.
 */
export const MARK_SPEED = 430;
export const MARK_LIFE = 34;
export const MARK_COOLDOWN = 15;
export const MARK_SIZE = 10;

/** What the letters do to the mark. The beginning of the synergies. */
export interface MarkPowers {
  /** Zayin, the Edge: it passes through the first husk and carries on. */
  pierces: boolean;
  /** Shin, the Flame: it burns, so it is worth two shells. */
  burns: boolean;
  /** Vav, the Hook: struck husks are drawn toward the Scribe, not pushed. */
  draws: boolean;
  /** Lamed, the Staff: it is thrown further. */
  reach: number;
  /** And what the vessels come to — multipliers rather than powers. */
  bite?: number;
  speed?: number;
  cooldown?: number;
}

export function markPowers(
  verbs: readonly Verb[],
  graces: readonly Grace[],
  items: readonly string[] = [],
): MarkPowers {
  // The letters decide what a mark *is*; the vessels decide how much of it
  // there is. Which is the whole distinction the two systems are built on.
  const carried = powersFrom(items);
  return {
    pierces: verbs.includes("cut") || carried.pierces,
    burns: verbs.includes("flame"),
    draws: verbs.includes("grapple"),
    reach: (graces.includes("high-jump") ? MARK_LIFE + 16 : MARK_LIFE) + carried.reach,
    bite: carried.bite,
    speed: carried.speed,
    cooldown: carried.cooldown,
  };
}

/** How many shells one mark takes off, given what the Scribe carries. */
export function markBite(powers: MarkPowers): number {
  return Math.max(1, Math.round((powers.burns ? 2 : 1) * (powers.bite ?? 1)));
}

/**
 * Whether a husk can be struck at all.
 *
 * A husk standing in veiled stone is no more visible than the stone is — the
 * Eye is what makes it a thing rather than a suspicion. This is the one place
 * a letter decides whether a fight is possible rather than how it goes.
 */
export function canBeStruck(hidden: boolean, verbs: readonly Verb[]): boolean {
  return !hidden || verbs.includes("reveal");
}

// ---------------------------------------------------------------------------
// light, and going out
// ---------------------------------------------------------------------------

/**
 * The Scribe is made of light, so light is what he loses.
 *
 * Deliberately **not** `or`. That is gathered light — the currency the
 * Sefirot are kindled with — and spending it on being hit would make every
 * mistake cost progress twice. These are separate: `lamps` is what he is,
 * `or` is what he is carrying.
 */
export const LAMPS = 3;
/** Ticks of grace after a hit, in which nothing can touch him again. */
export const IFRAME_TICKS = 54;
/** How hard a hit throws him, which is also what gets him clear. */
export const KNOCKBACK_X = 190;
export const KNOCKBACK_Y = 240;

export interface Hit {
  lamps: number;
  iframes: number;
  out: boolean;
}

/**
 * One contact with a husk.
 *
 * Returns the state after, rather than mutating: the rule is testable on its
 * own and `step.ts` decides when to ask. During i-frames nothing happens at
 * all — not a reduced hit, no hit — which is what makes a crowded screen
 * survivable rather than a shredder.
 */
export function takeHit(lamps: number, iframes: number, grace = 1): Hit {
  if (iframes > 0 || lamps <= 0) return { lamps, iframes, out: lamps <= 0 };
  const left = lamps - 1;
  // `grace` is what the vessels come to — the Wrapper lengthens the moment
  // after a hit rather than softening the hit itself, which is the difference
  // between an object and a letter.
  return { lamps: left, iframes: Math.round(IFRAME_TICKS * grace), out: left <= 0 };
}

/**
 * Going out is the fall happening a second time.
 *
 * This game was built with no failure state, and combat retires that. What
 * replaces it is not a death screen but the premise: an angel made of light,
 * whose light goes out, is cast back down to the kingdom — which is exactly
 * what already happened to him once, before the first rung. The run ends, the
 * record keeps every letter he found, and Malchut is where he wakes.
 */
export const GOING_OUT = "The light goes out of you, and the kingdom comes up to meet you.";
