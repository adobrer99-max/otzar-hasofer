import { letters, lettersById } from "../data/letters";
import type { LetterCard, LetterClassification } from "../types/letter";

/**
 * What a letter is *worth* on the board.
 *
 * The obvious move would be to play a letter for its gematria — but the
 * twenty-two run 1…400, so Tav (400) and Shin (300) would swamp every other
 * card and there would be no game. Instead the Ascent uses **mispar katan**
 * (מספר קטן, "small number"), the traditional reduction of a gematria to a
 * single digit by summing its digits until one remains. That is a real device
 * from the tradition, not an invented scale, and it happens to yield a clean
 * 1–9 card curve: the deck's twenty-two letters total exactly 100 Or.
 */
export function misparKatan(gematria: number): number {
  let n = Math.abs(Math.trunc(gematria));
  if (n === 0) return 0;
  while (n > 9) {
    let sum = 0;
    while (n > 0) {
      sum += n % 10;
      n = Math.floor(n / 10);
    }
    n = sum;
  }
  return n;
}

/** The base Or (light) a letter kindles when played, before any modifier. */
export function baseOr(letterId: string): number {
  const letter = lettersById[letterId];
  if (!letter) throw new Error(`Unknown letter: ${letterId}`);
  return misparKatan(letter.gematria);
}

/**
 * Sefer Yetzirah's three-fold division is the Ascent's card-class system:
 * three Mothers (the elements), seven Doubles (the planets), twelve Simples
 * (the months). The starting deck is the Mothers and the Doubles — the ten
 * that stand before the year begins — and the twelve Simples are what a
 * Scribe gathers on the way up. 3 + 7 + 12 = 22.
 */
export const MOTHERS: string[] = letters.filter((l) => l.classification === "Mother").map((l) => l.id);
export const DOUBLES: string[] = letters.filter((l) => l.classification === "Double").map((l) => l.id);
export const SIMPLES: string[] = letters.filter((l) => l.classification === "Simple").map((l) => l.id);

/** The deck a Scribe begins with: the three Mothers and the seven Doubles. */
export const STARTING_DECK: string[] = [...MOTHERS, ...DOUBLES];

export function classOf(letterId: string): LetterClassification {
  const letter = lettersById[letterId];
  if (!letter) throw new Error(`Unknown letter: ${letterId}`);
  return letter.classification;
}

export function letterOf(letterId: string): LetterCard {
  const letter = lettersById[letterId];
  if (!letter) throw new Error(`Unknown letter: ${letterId}`);
  return letter;
}

/**
 * The element a Mother casts over the station. The three Mothers carry their
 * elements in `letters.ts` (Aleph/Air, Mem/Water, Shin/Fire); this narrows
 * that free-text field to the three the board reasons about.
 */
export type FieldElement = "air" | "water" | "fire";

export const MOTHER_FIELDS: Record<string, FieldElement> = {
  aleph: "air",
  mem: "water",
  shin: "fire",
};

export function fieldCastBy(letterId: string): FieldElement | undefined {
  return MOTHER_FIELDS[letterId];
}

/** How each cast field reshapes the board, in the Scribe's words. */
export const FIELD_TEACHING: Record<FieldElement, { label: string; hebrew: string; effect: string }> = {
  air: {
    label: "Air",
    hebrew: "רוח",
    effect: "The breath widens the hand: every letter kindles +1 Or, and you hold one card more.",
  },
  water: {
    label: "Water",
    hebrew: "מים",
    effect: "The months flow: every Simple letter kindles double Or.",
  },
  fire: {
    label: "Fire",
    hebrew: "אש",
    effect: "The planets burn: every Double letter kindles double Or.",
  },
};
