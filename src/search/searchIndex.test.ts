import { describe, it, expect } from "vitest";
import { searchIndex, searchEntries, CATEGORY_ORDER } from "./searchIndex";

describe("searchIndex", () => {
  it("indexes every static category and gives each entry a route", () => {
    const categories = new Set(searchIndex.map((e) => e.category));
    // Commentaries/Drafts are user content, loaded per-session — never static.
    const staticCategories = CATEGORY_ORDER.filter((c) => c !== "Commentaries" && c !== "Drafts");
    for (const c of staticCategories) expect(categories.has(c)).toBe(true);
    expect(categories.has("Commentaries")).toBe(false);
    expect(categories.has("Drafts")).toBe(false);
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

  it("merges extra session entries and ranks them like the rest", () => {
    const extra = [
      {
        id: "commentary:x",
        label: "On the Silent Genesis",
        sublabel: "Aleph Yud",
        category: "Commentaries" as const,
        to: "/commentaries",
        keywords: "aleph silence",
      },
    ];
    const results = searchEntries("silent genesis", 20, extra);
    expect(results.some((e) => e.id === "commentary:x")).toBe(true);
    // The default parameter keeps extra-less calls unchanged.
    expect(searchEntries("silent genesis").some((e) => e.id === "commentary:x")).toBe(false);
    // Empty query still returns Pages only, extra or not.
    expect(searchEntries("", 20, extra).every((e) => e.category === "Pages")).toBe(true);
  });
});
