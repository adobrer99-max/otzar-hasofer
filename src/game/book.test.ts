import { describe, expect, it } from "vitest";
import { dorotCardsById, dorotHousesById, housesBySefirah } from "../data/dorot";
import type { AscentRecord } from "../storage/ascentRepo";
import { regions } from "./regions";
import { CARDS_IN_ALL, housesMet, lastSealed, lexicon, pagesOf, tally } from "./book";
import { endingOf } from "./story";

/**
 * **The Book is folds and nothing else**, which is the claim these hold. It
 * stores no state, adds no schema field, and can therefore read every record
 * this game has ever written — including the ones sealed years before any of
 * this existed, whose endings were computed on a plate and thrown away.
 */

const ALL_SEFIROT = regions.map((r) => r.sefirah);

const climb = (over: Partial<AscentRecord> = {}): AscentRecord => ({
  id: `a-${Math.random().toString(36).slice(2)}`,
  seed: 1,
  seedLabel: "1 Nisan 5786",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  regionIndex: 1,
  lettersHeld: [],
  or: 0,
  regionsCleared: [],
  housesMet: [],
  ...over,
});

const card = Object.values(dorotCardsById)[0];
const cardsOfMalchut = Object.values(dorotCardsById).filter(
  (c) => dorotHousesById[c.houseId]?.sefirah === "malchut",
);

describe("the pages", () => {
  it("keeps only endings — an open climb and a put-down one are not pages", () => {
    const pages = pagesOf([
      climb({ id: "open" }),
      climb({ id: "put-down", abandonedAt: "2026-01-02T00:00:00.000Z" }),
      climb({ id: "sealed", sealedAt: "2026-01-03T00:00:00.000Z" }),
    ]);
    expect(pages.map((p) => p.id)).toEqual(["sealed"]);
  });

  it("reads newest first, whatever order the store hands them over in", () => {
    const pages = pagesOf([
      climb({ id: "old", sealedAt: "2026-01-01T00:00:00.000Z" }),
      climb({ id: "new", sealedAt: "2026-03-01T00:00:00.000Z" }),
      climb({ id: "middle", sealedAt: "2026-02-01T00:00:00.000Z" }),
    ]);
    expect(pages.map((p) => p.id)).toEqual(["new", "middle", "old"]);
    expect(lastSealed(pages.map((p) => climb({ id: p.id, sealedAt: p.sealedAt })))?.id).toBe("new");
  });

  it("tells the two endings apart by the one thing that distinguishes them", () => {
    const crown = pagesOf([climb({ sealedAt: "2026-01-01T00:00:00.000Z" })])[0];
    const lit = pagesOf([
      climb({ sealedAt: "2026-01-01T00:00:00.000Z", sefirotLit: ALL_SEFIROT }),
    ])[0];
    expect(crown.ending).toBe("crown");
    expect(lit.ending).toBe("kindled");
  });

  /**
   * **The one that matters for history.** `endingPlea` and `witnessSefirot`
   * were added at P0; every climb sealed before that has neither, and the Book
   * must still be able to say how they ended — from the same function
   * `sealAscent` freezes from, so the two can never disagree.
   */
  it("derives the ending of a record sealed before the ending was ever kept", () => {
    const old = climb({
      sealedAt: "2020-01-01T00:00:00.000Z",
      lettersHeld: ["peh"],
      housesMet: [card.id],
    });
    const page = pagesOf([old])[0];
    const derived = endingOf(old.lettersHeld, old.housesMet);
    expect(page.plea).toBe(derived.plea);
    expect(page.witnesses).toEqual([...derived.witnessSefirot]);
  });

  it("prefers what was frozen over what can be re-derived", () => {
    // A record whose stored ending disagrees with its letters: the stored one
    // wins, because it is what the Scribe was actually shown, and the tables
    // underneath it are authored data that will drift.
    const page = pagesOf([
      climb({
        sealedAt: "2026-01-01T00:00:00.000Z",
        lettersHeld: [],
        housesMet: [],
        endingPlea: "whole",
        witnessSefirot: ["malchut"],
      }),
    ])[0];
    expect(page.plea).toBe("whole");
    expect(page.witnesses).toEqual(["malchut"]);
  });
});

describe("the Houses met", () => {
  it("groups cards under their figure, and says how many that figure has", () => {
    const met = housesMet([climb({ housesMet: [cardsOfMalchut[0].id] })]);
    expect(met).toHaveLength(1);
    const house = dorotHousesById[cardsOfMalchut[0].houseId];
    expect(met[0].figure).toBe(house.figure);
    expect(met[0].sefirah).toBe("malchut");
    expect(met[0].cardIds).toEqual([cardsOfMalchut[0].id]);
    expect(met[0].total).toBeGreaterThan(1);
  });

  it("counts a card once however many climbs met it", () => {
    const met = housesMet([
      climb({ housesMet: [card.id] }),
      climb({ housesMet: [card.id] }),
      climb({ housesMet: [card.id] }),
    ]);
    expect(met[0].cardIds).toEqual([card.id]);
  });

  it("ignores a card id that is not a card", () => {
    expect(housesMet([climb({ housesMet: ["no-such-card"] })])).toEqual([]);
  });

  it("has a ceiling, and it is the whole of the Dorot", () => {
    expect(CARDS_IN_ALL).toBeGreaterThan(100);
    const everything = housesBySefirah("malchut").length;
    expect(everything).toBeGreaterThan(0);
  });
});

describe("the Lexicon", () => {
  const word = (hebrew: string, over = {}) => ({
    letterIds: ["aleph", "bet", "gimel"],
    hebrew,
    transliteration: hebrew,
    gloss: "a thing",
    wasTarget: false,
    regionIndex: 1,
    ...over,
  });

  it("keeps one entry per spelling, and counts the repeats", () => {
    const entries = lexicon([
      climb({ wordsFormed: [word("אבג"), word("אבג")] }),
      climb({ wordsFormed: [word("אבג")] }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].times).toBe(3);
  });

  /**
   * Once named by a gate, always named by a gate — the mark is about the root
   * rather than about whichever inscription happened to find it. Without this
   * a Scribe who answered a gate correctly and then spelled the same root
   * again somewhere else would watch the mark disappear.
   */
  it("remembers that a root was once the one a gate named", () => {
    const entries = lexicon([
      climb({ wordsFormed: [word("אבג", { wasTarget: true })] }),
      climb({ wordsFormed: [word("אבג", { wasTarget: false })] }),
    ]);
    expect(entries[0].wasTarget).toBe(true);
  });

  it("is empty for a Scribe who has never answered a gate", () => {
    expect(lexicon([climb(), climb()])).toEqual([]);
  });
});

describe("the tally", () => {
  it("counts what happened, including the climbs that were put down", () => {
    const t = tally([
      climb({ sealedAt: "2026-01-01T00:00:00.000Z", sefirotLit: ALL_SEFIROT, falls: 2 }),
      climb({ sealedAt: "2026-01-02T00:00:00.000Z", pathsWalked: ["malchut-yesod"], falls: 1 }),
      climb({ abandonedAt: "2026-01-03T00:00:00.000Z" }),
      climb(),
    ]);
    expect(t.sealed).toBe(2);
    expect(t.kindled).toBe(1);
    expect(t.abandoned).toBe(1);
    expect(t.pathsWalked).toBe(1);
    expect(t.falls).toBe(3);
  });

  it("counts distinct letters and cards across every climb", () => {
    const t = tally([
      climb({ lettersHeld: ["aleph", "bet"], housesMet: [card.id] }),
      climb({ lettersHeld: ["bet", "gimel"], housesMet: [card.id] }),
    ]);
    expect(t.lettersEver).toBe(3);
    expect(t.cardsEver).toBe(1);
  });

  it("is all zeroes for a Scribe who has never begun", () => {
    expect(tally([])).toEqual({
      sealed: 0,
      kindled: 0,
      abandoned: 0,
      pathsWalked: 0,
      falls: 0,
      lettersEver: 0,
      rootsEver: 0,
      cardsEver: 0,
    });
  });
});
