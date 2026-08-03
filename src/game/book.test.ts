import { describe, expect, it } from "vitest";
import { dorotCardsById, dorotHousesById, housesBySefirah } from "../data/dorot";
import { timesFreed, type AscentRecord } from "../storage/ascentRepo";
import { regions } from "./regions";
import {
  CARDS_IN_ALL,
  housesMet,
  lastSealed,
  lexicon,
  marks,
  pagesOf,
  tally,
  timesStood,
} from "./book";
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

/**
 * **How often a House has stood, which is not how often it was met.**
 *
 * Walking past a figure is not being spoken for. A Scribe who has gone mute
 * every time has met a great many of them and been stood for by nobody — and
 * this is the counter that decides how far into a House's episodes the rungs
 * may draw, so getting the two confused would hand the whole collection to
 * somebody who never carried the Mouth.
 */
describe("how often each House has stood", () => {
  it("counts a Sefirah once per sealed climb that named it", () => {
    const stood = timesStood([
      climb({ sealedAt: "2026-01-01T00:00:00.000Z", witnessSefirot: ["malchut", "hod"], endingPlea: "heard" }),
      climb({ sealedAt: "2026-01-02T00:00:00.000Z", witnessSefirot: ["malchut"], endingPlea: "heard" }),
    ]);
    expect(stood.malchut).toBe(2);
    expect(stood.hod).toBe(1);
    expect(stood.keter).toBeUndefined();
  });

  it("counts nothing for a climb that met figures and went mute", () => {
    // Met three cards, carried no Peh: nobody stood, so nothing deepens.
    const stood = timesStood([
      climb({
        sealedAt: "2026-01-01T00:00:00.000Z",
        lettersHeld: ["aleph"],
        housesMet: cardsOfMalchut.slice(0, 3).map((c) => c.id),
      }),
    ]);
    expect(stood).toEqual({});
  });

  it("counts nothing from a climb that is not sealed", () => {
    expect(timesStood([climb({ witnessSefirot: ["malchut"], endingPlea: "heard" })])).toEqual({});
  });
});

/**
 * **How often each guardian has been broken**, which is the counting
 * the old `guardiansFreed` threw away — and throwing it away was the whole
 * shape of the problem the tiers fix: ten booleans, all ten reachable inside
 * one thorough climb, and every climb after that changing a Scribe by nothing.
 */
describe("how often each guardian has been broken", () => {
  it("counts the climbs it was broken in, not the breakings", () => {
    // A climb holds each Sefirah once — a guardian broken stays broken for
    // that climb — so the honest unit is the return trip.
    const times = timesFreed([
      climb({ guardiansBroken: ["malchut", "yesod", "malchut"] }),
      climb({ guardiansBroken: ["malchut"] }),
    ]);
    expect(times.malchut).toBe(2);
    expect(times.yesod).toBe(1);
  });

  it("counts an unsealed climb too, because the guardian is broken either way", () => {
    // Unlike the Encounters, which advance only on finishing: the guardians
    // accrue from *doing*, and going out does not put a shell back together.
    expect(timesFreed([climb({ guardiansBroken: ["keter"] })]).keter).toBe(1);
  });

  it("keys exactly the set of what has ever been broken", () => {
    const ascents = [climb({ guardiansBroken: ["hod", "binah"] }), climb({ guardiansBroken: ["hod"] })];
    expect(Object.keys(timesFreed(ascents)).sort()).toEqual(["binah", "hod"]);
  });

  it("is empty for a Scribe who has broken nothing", () => {
    expect(timesFreed([climb(), climb()])).toEqual({});
  });
});

/**
 * **The marks — what a Scribe has proved, as against what they have done.**
 *
 * Folds over records that already exist: no flags, no unlock table, no schema.
 * Which means a Scribe who did the thing three years ago and never heard about
 * it has the mark the moment it ships — and it also means a mark can never
 * drift out of step with the history it describes.
 */
describe("the marks of mastery", () => {
  const ids = (list: ReturnType<typeof marks>) => list.filter((m) => m.earned).map((m) => m.id);

  it("gives none of them to a Scribe who has done nothing", () => {
    expect(ids(marks([]))).toEqual([]);
    expect(marks([]).length).toBeGreaterThan(3);
  });

  it("says how each is come by, whether or not it has been", () => {
    for (const mark of marks([])) {
      expect(mark.title.length, mark.id).toBeGreaterThan(3);
      expect(mark.how.length, `${mark.id} does not say how`).toBeGreaterThan(20);
      expect(mark.won.length, `${mark.id} does not say what was done`).toBeGreaterThan(20);
    }
  });

  it("is won by the whole case, and only by the whole case", () => {
    const sealed = (plea: "heard" | "whole") =>
      marks([climb({ sealedAt: "2026-01-01T00:00:00.000Z", endingPlea: plea, witnessSefirot: ["malchut"] })]);
    expect(ids(sealed("heard"))).not.toContain("whole");
    expect(ids(sealed("whole"))).toContain("whole");
  });

  it("is won by a lit Tree that never went out, and not by one that did", () => {
    const climbWith = (falls: number) =>
      climb({ sealedAt: "2026-01-01T00:00:00.000Z", sefirotLit: ALL_SEFIROT, falls });
    expect(ids(marks([climbWith(0)]))).toContain("unfallen");
    expect(ids(marks([climbWith(1)]))).not.toContain("unfallen");
  });

  it("is won by taking a guardian to its last tier, which takes three climbs", () => {
    const broke = (n: number) =>
      marks(Array.from({ length: n }, () => climb({ guardiansBroken: ["keter"] })));
    expect(ids(broke(2))).not.toContain("deep");
    expect(ids(broke(3))).toContain("deep");
  });

  /**
   * The Houses one is the long tail of the arc: a matriarchal House opens
   * fully at the seventh standing, so this mark and `cardsOpen` reach their
   * ceiling on the same climb. If one of those numbers ever moves, the other
   * has to move with it.
   */
  it("is won when a House has stood seven times, and has no episodes left", () => {
    const stood = (n: number) =>
      marks(
        Array.from({ length: n }, (_, i) =>
          climb({
            sealedAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
            endingPlea: "heard",
            witnessSefirot: ["malchut"],
          }),
        ),
      );
    expect(ids(stood(6))).not.toContain("remembered");
    expect(ids(stood(7))).toContain("remembered");
  });
});
