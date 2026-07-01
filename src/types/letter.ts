export type LetterClassification = "Mother" | "Double" | "Simple";

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
  uprightMeaning: string;
  reversedMeaning: string;
  hebrewRoot?: string;
  traditionalSources: string[];
  scribeNotes?: string;
}

export interface LetterPair {
  id: string;
  letters: [string, string];
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
