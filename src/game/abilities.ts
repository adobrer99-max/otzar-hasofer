import { lettersById } from "../data/letters";
import type { LetterCard } from "../types/letter";

/**
 * The twenty-two letters, as the Scribe's twenty-two verbs.
 *
 * Nothing here is invented decoration. Each ability is read straight off the
 * letter's own pictographic origin — the same symbol language the Herald's
 * charges are drawn from (`herald/render/letterCharges.tsx`) and the same
 * `translationRoot` the guide chapters print. Vav is a hook, so Vav is the
 * grapple. Mem is water, so Mem is how you enter it. Chet is a fence, so Chet
 * is how you hold to a wall. Tav is a mark, so Tav is where you wake.
 *
 * The letters divide as they do in Sefer Yetzirah's own accounting, but for
 * play they divide differently: twelve are **verbs** — they change what the
 * body can do, and the world is locked and unlocked by them — and ten are
 * **graces**, which change how the world meets you without adding a motion to
 * learn. Every one of the twenty-two is found, and finding all of them is the
 * only completion the game recognises.
 */

/** The verbs the world's physics actually branches on. */
export type Verb =
  | "double-jump"
  | "wall-cling"
  | "dash"
  | "grapple"
  | "swim"
  | "cut"
  | "reveal"
  | "block"
  | "flame"
  | "climb"
  | "mark"
  | "open";

/** The graces — passive, tuned into the simulation rather than bound to a key. */
export type Grace =
  | "light"
  | "farsight"
  | "swift-water"
  | "slow-fall"
  | "high-jump"
  | "second-stone"
  | "draw-motes"
  | "crawl"
  | "speech"
  | "return";

export interface LetterAbility {
  letterId: string;
  /** "The Hook" — the ability's own name, not the letter's. */
  name: string;
  hebrew: string;
  kind: "verb" | "grace";
  verb?: Verb;
  grace?: Grace;
  /** How it is used, in one line, for the HUD and the acquisition plate. */
  use: string;
  /** Why this letter carries this power — the line that earns it. */
  derivation: string;
}

export const abilities: LetterAbility[] = [
  // ---- the twelve verbs --------------------------------------------------
  {
    letterId: "aleph",
    name: "The Breath",
    hebrew: "רוח",
    kind: "verb",
    verb: "double-jump",
    use: "Jump a second time in open air.",
    derivation: "The silent breath that precedes all speech — air itself, and so the only step that needs no ground.",
  },
  {
    letterId: "bet",
    name: "The House",
    hebrew: "בית",
    kind: "verb",
    verb: "block",
    use: "Set a standing stone beneath you — one at a time, until you take it back.",
    derivation: "Bet is the house: the first boundary, the container that makes a space able to hold something.",
  },
  {
    letterId: "gimel",
    name: "The Bridge",
    hebrew: "גשר",
    kind: "verb",
    verb: "dash",
    use: "Cross a gap in one motion, through the air.",
    derivation: "Gimel is the camel — the beast that crosses what cannot be crossed on foot, and the bridge it makes.",
  },
  {
    letterId: "dalet",
    name: "The Door",
    hebrew: "דלת",
    kind: "verb",
    verb: "open",
    use: "Open what is sealed.",
    derivation: "Dalet is the door and the threshold — and the poor one who stands at it waiting to be let through.",
  },
  {
    letterId: "vav",
    name: "The Hook",
    hebrew: "וו",
    kind: "verb",
    verb: "grapple",
    use: "Cast to an anchor and be drawn to it.",
    derivation: "Vav is the hook, the peg, the connective — the letter that joins one thing to another and holds.",
  },
  {
    letterId: "zayin",
    name: "The Edge",
    hebrew: "זין",
    kind: "verb",
    verb: "cut",
    use: "Cut through the thorn.",
    derivation: "Zayin is the sword — and the crown upon it. What it clears, it clears in order to pass, not to conquer.",
  },
  {
    letterId: "chet",
    name: "The Fence",
    hebrew: "חיץ",
    kind: "verb",
    verb: "wall-cling",
    use: "Hold to a sheer wall, and climb it by leaping.",
    derivation: "Chet is the fence, the enclosure — the wall that bounds a life, met here as something to hold rather than resent.",
  },
  {
    letterId: "kuf",
    name: "The Ascent",
    hebrew: "קוף",
    kind: "verb",
    verb: "climb",
    use: "Climb the hanging vine and the knotted rope.",
    derivation: "Kuf is the monkey and the eye of the needle — the narrow way up, taken by whoever will make themselves small enough.",
  },
  {
    letterId: "ayin",
    name: "The Eye",
    hebrew: "עין",
    kind: "verb",
    verb: "reveal",
    use: "See what is hidden — the veiled stone becomes solid underfoot.",
    derivation: "Ayin is the eye and the wellspring both. The hidden light, Or HaGanuz, was never absent — only unseen.",
  },
  {
    letterId: "shin",
    name: "The Flame",
    hebrew: "אש",
    kind: "verb",
    verb: "flame",
    use: "Carry fire: the dark opens, and what has overgrown burns back.",
    derivation: "Shin is the tooth and the fire — and Shanah, the year that turns by consuming what came before.",
  },
  {
    letterId: "mem",
    name: "The Waters",
    hebrew: "מים",
    kind: "verb",
    verb: "swim",
    use: "Enter the deep water and move within it.",
    derivation: "Mem is water and womb. Without it the deep only refuses you; with it the deep is a way through.",
  },
  {
    letterId: "tav",
    name: "The Mark",
    hebrew: "תו",
    kind: "verb",
    verb: "mark",
    use: "Set your mark. Whatever befalls you, you wake here.",
    derivation: "Tav is the sign, the mark, and Emet — truth. The last letter, which is why it is the one you can return to.",
  },

  // ---- the ten graces ----------------------------------------------------
  {
    letterId: "yod",
    name: "The Spark",
    hebrew: "יד",
    kind: "grace",
    grace: "light",
    use: "The light you carry reaches further into the dark.",
    derivation: "Yod is the hand, and the smallest letter — the point from which every other letter is written.",
  },
  {
    letterId: "heh",
    name: "The Window",
    hebrew: "חלון",
    kind: "grace",
    grace: "farsight",
    use: "The view widens; you see the ground before you reach it.",
    derivation: "Heh is the window and the breath of revelation — the opening cut in a wall so that what is outside can be known.",
  },
  {
    letterId: "nun",
    name: "The Fish",
    hebrew: "נון",
    kind: "grace",
    grace: "swift-water",
    use: "You move through water as though it were your own element.",
    derivation: "Nun is the fish and the soul — at home in the depth that everything else must hold its breath through.",
  },
  {
    letterId: "samech",
    name: "The Support",
    hebrew: "סמך",
    kind: "grace",
    grace: "slow-fall",
    use: "Hold, and you descend slowly, as though upheld.",
    derivation: "Samech is the prop, the pillar, the closed circle — the support that is there whether or not it is leaned upon.",
  },
  {
    letterId: "lamed",
    name: "The Staff",
    hebrew: "למד",
    kind: "grace",
    grace: "high-jump",
    use: "You rise higher from every leap.",
    derivation: "Lamed is the goad and the teacher — the only letter that rises above the line, reaching past where it stands.",
  },
  {
    letterId: "kaf",
    name: "The Palm",
    hebrew: "כף",
    kind: "grace",
    grace: "second-stone",
    use: "You may hold a second standing stone.",
    derivation: "Kaf is the open palm, the hand that bends to hold — capacity itself, which is why it grants one more.",
  },
  {
    letterId: "tzadi",
    name: "The Angler",
    hebrew: "צדי",
    kind: "grace",
    grace: "draw-motes",
    use: "Light nearby comes to you of its own accord.",
    derivation: "Tzadi is the fishhook and the righteous one — the tzadik, toward whom things quietly gather.",
  },
  {
    letterId: "tet",
    name: "The Coil",
    hebrew: "טית",
    kind: "grace",
    grace: "crawl",
    use: "You can fold yourself into the low passage.",
    derivation: "Tet is the coiled serpent in the basket — the good that is hidden, and reachable only by going low.",
  },
  {
    letterId: "peh",
    name: "The Mouth",
    hebrew: "פה",
    kind: "grace",
    grace: "speech",
    use: "You can speak with those who keep the Houses, and be answered.",
    derivation: "Peh is the mouth and the opening — speech, without which the figures of the Houses stand silent.",
  },
  {
    letterId: "resh",
    name: "The Beginning",
    hebrew: "ראש",
    kind: "grace",
    grace: "return",
    use: "Return at once to where this region began.",
    derivation: "Resh is the head and the beginning — and the poor one, who is always able to start again.",
  },
];

export const abilityByLetter: Record<string, LetterAbility> = Object.fromEntries(
  abilities.map((a) => [a.letterId, a]),
);

export const verbLetters: Record<Verb, string> = Object.fromEntries(
  abilities.filter((a) => a.verb).map((a) => [a.verb as Verb, a.letterId]),
) as Record<Verb, string>;

export const graceLetters: Record<Grace, string> = Object.fromEntries(
  abilities.filter((a) => a.grace).map((a) => [a.grace as Grace, a.letterId]),
) as Record<Grace, string>;

/** The letter card behind an ability, for its glyph and its chapter link. */
export function letterFor(ability: LetterAbility): LetterCard {
  const letter = lettersById[ability.letterId];
  if (!letter) throw new Error(`Ability references unknown letter: ${ability.letterId}`);
  return letter;
}

/** Does the Scribe hold this verb? */
export function has(held: readonly string[], verb: Verb): boolean {
  return held.includes(verbLetters[verb]);
}

/** Does the Scribe hold this grace? */
export function hasGrace(held: readonly string[], grace: Grace): boolean {
  return held.includes(graceLetters[grace]);
}
