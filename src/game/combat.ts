import type { Grace, Verb } from "./abilities";

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
 * The four kinds are functional rather than fanciful — they are told apart by
 * how they move and what answers them, not by a bestiary. Nothing here chases
 * forever; a Scribe who would rather run past may, and on most screens that is
 * the faster road.
 *
 * This module is **pure**: shapes, numbers and rules. `world/step.ts` applies
 * them. Nothing in here reads a clock, a DOM or a random number.
 */

export type HuskKind = "crawler" | "drifter" | "spitter" | "sentinel";

export interface HuskSpec {
  kind: HuskKind;
  hebrew: string;
  /** What it is, in one line, for the guide and the HUD. */
  is: string;
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
}

export const HUSKS: Record<HuskKind, HuskSpec> = {
  crawler: {
    kind: "crawler",
    hebrew: "זוֹחֵל",
    is: "It walks its ledge and turns at the edge. It has never once looked up.",
    shells: 2,
    speed: 42,
    light: 2,
    size: { w: 16, h: 18 },
    notices: Infinity,
  },
  drifter: {
    kind: "drifter",
    hebrew: "נוֹדֵד",
    is: "It floats a slow arc and the ground means nothing to it.",
    shells: 1,
    speed: 34,
    light: 2,
    size: { w: 18, h: 18 },
    notices: Infinity,
  },
  spitter: {
    kind: "spitter",
    hebrew: "יוֹרֶה",
    is: "Rooted where it stands, and it throws the dark it is made of.",
    shells: 2,
    speed: 0,
    light: 3,
    size: { w: 18, h: 22 },
    notices: 260,
    throws: 96,
  },
  sentinel: {
    kind: "sentinel",
    hebrew: "שׁוֹמֵר",
    is: "Still, until you are near enough. Then once, hard, and it must gather itself again.",
    shells: 3,
    speed: 190,
    light: 4,
    size: { w: 20, h: 24 },
    notices: 150,
    throws: 130,
  },
};

/** The character each husk is authored as in the chunk library. */
export const HUSK_CHARS: Record<string, HuskKind> = {
  k: "crawler",
  j: "drifter",
  q: "spitter",
  n: "sentinel",
};

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
}

export function markPowers(verbs: readonly Verb[], graces: readonly Grace[]): MarkPowers {
  return {
    pierces: verbs.includes("cut"),
    burns: verbs.includes("flame"),
    draws: verbs.includes("grapple"),
    reach: graces.includes("high-jump") ? MARK_LIFE + 16 : MARK_LIFE,
  };
}

/** How many shells one mark takes off, given what the Scribe carries. */
export function markBite(powers: MarkPowers): number {
  return powers.burns ? 2 : 1;
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
export function takeHit(lamps: number, iframes: number): Hit {
  if (iframes > 0 || lamps <= 0) return { lamps, iframes, out: lamps <= 0 };
  const left = lamps - 1;
  return { lamps: left, iframes: IFRAME_TICKS, out: left <= 0 };
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
