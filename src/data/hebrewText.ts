import { lettersById } from "./letters";

/**
 * Hebrew orthography helpers. Five letters take a distinct *final* form (sofit)
 * when they end a word: kaf, mem, nun, peh, and tzadi. The deck and its cards
 * always use the base form (a card is a letter, not a position); the final
 * form is applied only when drawn letters are spelled out as a word.
 */

/** Base glyph → its word-final (sofit) glyph. */
export const FINAL_FORM: Record<string, string> = {
  כ: "ך",
  מ: "ם",
  נ: "ן",
  פ: "ף",
  צ: "ץ",
};

/** The word-final form of a glyph, or the glyph itself when it has none. */
export function toFinalGlyph(glyph: string): string {
  return FINAL_FORM[glyph] ?? glyph;
}

/**
 * Spells a sequence of letter ids as a Hebrew word, giving the final letter its
 * sofit form where one exists. A single letter, or a word ending in a
 * non-final letter, is returned unchanged.
 */
export function spellWord(letterIds: string[]): string {
  const glyphs = letterIds.map((id) => lettersById[id]?.glyph ?? "");
  if (glyphs.length === 0) return "";
  glyphs[glyphs.length - 1] = toFinalGlyph(glyphs[glyphs.length - 1]);
  return glyphs.join("");
}

/** Applies the sofit form to the last character of an already-spelled Hebrew string. */
export function finalizeWord(word: string): string {
  if (!word) return "";
  return word.slice(0, -1) + toFinalGlyph(word.slice(-1));
}
