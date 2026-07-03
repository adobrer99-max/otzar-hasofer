export type LetterClassification = "Mother" | "Double" | "Simple";

/** One of the 22 Derekh Eretz letter ids (e.g. "aleph", "bet", ...), matching `LetterCard.id`. */
export type LetterId = string;

export type SefirahId =
  | "keter"
  | "chochmah"
  | "binah"
  | "chesed"
  | "gevurah"
  | "tiferet"
  | "netzach"
  | "hod"
  | "yesod"
  | "malchut";

export interface LetterCard {
  id: string;
  order: number;
  glyph: string;
  name: string;
  transliteration: string;
  gematria: number;
  classification: LetterClassification;
  element?: string;
  astrological?: string;
  sefirahOrPath?: string;
  keyword: string;
  /** Possible translations/roots for the letter's name, e.g. "Awe/Wonder, Chief, or school of learning/teacher". */
  translationRoot: string;
  /** The letter's one core teaching — replaces the old upright/reversed split; reversed orientation is a shared "turned inward" framing, not distinct per-letter text. */
  eternalPrinciple: string;
  /** A contemplative question for the reading. Not every letter has one. */
  question?: string;
  hebrewRoot?: string;
  traditionalSources: string[];
  scribeNotes?: string;
}

export interface TwoLetterRoot {
  id: string;
  letters: [LetterId, LetterId];
  rootWord: string;
  meaning: string;
  traditionalSources?: string[];
}

export interface UshpizinEntry {
  sefirah: SefirahId;
  sefirahName: string;
  figure: string;
  middah: string;
  description: string;
}
