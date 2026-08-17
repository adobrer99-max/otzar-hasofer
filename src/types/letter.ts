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

/**
 * The physical card's artwork, once scanned — drop the file under
 * `public/art/` and fill this field on the data entry. Purely additive:
 * entries without it render exactly as before.
 */
export interface CardArt {
  /** Path under public/, e.g. "/art/letters/aleph.jpg". */
  src: string;
  alt: string;
  /** e.g. the illustrator's name. */
  credit?: string;
}

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
  /** The physical card's artwork, when available. */
  art?: CardArt;
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
  /**
   * What the guest says when met **on their own Sukkot night** — Abraham on
   * the first, Isaac on the second, in the Zohar's order, which is also the
   * order of this array. Traditional in shape (the ushpizin are *invited*,
   * and the invitation is answered), authored for this work in its voice.
   * Absent nowhere: a guest with no greeting on their own night would be the
   * empty-plate class of gap, and `ushpizin.test.ts` counts seven.
   */
  sukkotSaying: string;
}
