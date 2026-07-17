import { describe, it, expect } from "vitest";
import { searchIndex, searchEntries, CATEGORY_ORDER } from "./searchIndex";

describe("searchIndex", () => {
  it("indexes every category and gives each entry a route", () => {
    const categories = new Set(searchIndex.map((e) => e.category));
    for (const c of CATEGORY_ORDER) expect(categories.has(c)).toBe(true);
    // Every entry has a non-empty in-app route beginning with "/".
    for (const e of searchIndex) {
      expect(e.to.startsWith("/")).toBe(true);
      expect(e.label.length).toBeGreaterThan(0);
    }
  });

  it("indexes all 22 letters and the 14 Houses", () => {
    expect(searchIndex.filter((e) => e.category === "Letters")).toHaveLength(22);
    expect(searchIndex.filter((e) => e.category === "Houses of the Dorot")).toHaveLength(14);
  });

  it("matches a letter by its English name and ranks it first", () => {
    const results = searchEntries("aleph");
    expect(results[0].to).toBe("/guide/letters/aleph");
    expect(results[0].category).toBe("Letters");
  });

  it("matches a letter by its Hebrew glyph", () => {
    const results = searchEntries("א");
    expect(results.some((e) => e.to === "/guide/letters/aleph")).toBe(true);
  });

  it("matches a House by figure name", () => {
    const results = searchEntries("abraham");
    expect(results[0].to).toBe("/guide/dorot/house-abraham");
  });

  it("matches a Sefer and a page by keyword/sublabel", () => {
    expect(searchEntries("roots").some((e) => e.category === "Sefarim")).toBe(true);
    expect(searchEntries("herald").some((e) => e.to === "/herald")).toBe(true);
  });

  it("ranks a prefix match ahead of a mere substring match", () => {
    // "bet" is a prefix of the letter Bet's name; it should outrank entries
    // that only contain "bet" deeper in their text (e.g. "Alphabet"-like).
    const results = searchEntries("bet");
    expect(results[0].to).toBe("/guide/letters/bet");
  });

  it("returns the Pages group as default suggestions for an empty query", () => {
    const results = searchEntries("");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.category === "Pages")).toBe(true);
  });

  it("respects the limit", () => {
    expect(searchEntries("the", 3)).toHaveLength(3);
  });

  it("returns nothing for a query that matches no entry", () => {
    expect(searchEntries("zzzzznotathing")).toHaveLength(0);
  });
});
