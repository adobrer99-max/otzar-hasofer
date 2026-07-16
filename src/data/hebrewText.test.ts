import { describe, it, expect } from "vitest";
import { spellWord, toFinalGlyph, finalizeWord } from "./hebrewText";

describe("hebrewText — final forms", () => {
  it("finalizes the five sofit letters", () => {
    expect(toFinalGlyph("כ")).toBe("ך");
    expect(toFinalGlyph("מ")).toBe("ם");
    expect(toFinalGlyph("נ")).toBe("ן");
    expect(toFinalGlyph("פ")).toBe("ף");
    expect(toFinalGlyph("צ")).toBe("ץ");
  });

  it("leaves non-sofit letters unchanged", () => {
    expect(toFinalGlyph("א")).toBe("א");
    expect(toFinalGlyph("ש")).toBe("ש");
  });

  it("spells a word with a final-form last letter", () => {
    // shin-lamed-mem → שלם (final mem)
    expect(spellWord(["shin", "lamed", "mem"])).toBe("שלם");
    // mem only becomes final at the END, not in the middle: mem-lamed-kaf → מלך
    expect(spellWord(["mem", "lamed", "kaf"])).toBe("מלך");
  });

  it("leaves a word ending in a non-sofit letter unchanged", () => {
    expect(spellWord(["dalet", "bet", "resh"])).toBe("דבר"); // davar — resh has no final form
  });

  it("handles a single letter and an empty word", () => {
    expect(spellWord(["mem"])).toBe("ם");
    expect(spellWord([])).toBe("");
  });

  it("finalizeWord operates on an already-spelled string", () => {
    expect(finalizeWord("שלמ")).toBe("שלם");
    expect(finalizeWord("דבר")).toBe("דבר");
  });
});
