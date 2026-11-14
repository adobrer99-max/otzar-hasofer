import { describe, expect, it } from "vitest";
import {
  beginDescentFrom,
  descendable,
  descentEnding,
  directionOf,
  layDown,
  wouldLayDown,
} from "./descent";
import { sealedCount } from "./encounter";
import { regions } from "./regions";
import { letterIds, pathById, TREE_PATHS } from "./tree";

const ALL_LIT = regions.map((r) => r.sefirah);
const path = (id: string) => pathById[id];

describe("which way a road runs", () => {
  it("is up from one end and down from the other, on every road that is not level", () => {
    for (const p of TREE_PATHS) {
      const a = directionOf(p, p.ends[0]);
      const b = directionOf(p, p.ends[1]);
      if (p.kind === "horizontal") {
        expect([a, b], `${p.id} is level`).toEqual(["across", "across"]);
      } else {
        expect([a, b].sort(), `${p.id} must run one way each way`).toEqual(["down", "up"]);
        // `ends` is lower end first — the Tree's own convention.
        expect(a, `${p.id} from its lower end`).toBe("up");
      }
    }
  });

  it("finds three level roads, and nineteen that descend", () => {
    const level = TREE_PATHS.filter((p) => directionOf(p, p.ends[0]) === "across");
    expect(level).toHaveLength(3);
    expect(TREE_PATHS.length - level.length).toBe(19);
  });
});

describe("laying a letter down", () => {
  const full = [...letterIds];

  it("takes the road's own letter, walked downward", () => {
    const road = path("tiferet-keter");
    const after = layDown(full, road, "keter");
    expect(after).toHaveLength(full.length - 1);
    expect(after).not.toContain(road.letter);
    expect(wouldLayDown(full, road, "keter")).toBe(road.letter);
  });

  it("takes nothing walked upward or across, and gives nothing back", () => {
    const road = path("tiferet-keter");
    const without = layDown(full, road, "keter");
    // Back up the same road: the letter is not picked up twice.
    expect(layDown(without, road, "tiferet")).toEqual(without);
    expect(wouldLayDown(without, road, "tiferet")).toBeUndefined();
    const level = TREE_PATHS.find((p) => p.kind === "horizontal")!;
    expect(layDown(full, level, level.ends[0])).toEqual(full);
    expect(layDown(full, level, level.ends[1])).toEqual(full);
  });

  it("takes nothing from a hand that does not hold the letter", () => {
    const road = path("malchut-yesod");
    const hand = full.filter((l) => l !== road.letter);
    expect(layDown(hand, road, "yesod")).toEqual(hand);
    expect(wouldLayDown(hand, road, "yesod")).toBeUndefined();
  });

  it("never grows a hand, by any road walked either way", () => {
    for (const p of TREE_PATHS) {
      for (const from of p.ends) {
        const after = layDown(full, p, from);
        expect(after.length).toBeLessThanOrEqual(full.length);
        for (const letter of after) expect(full).toContain(letter);
      }
    }
  });

  it("costs exactly three letters by the shortest way down", () => {
    let hand = full;
    hand = layDown(hand, path("tiferet-keter"), "keter");
    hand = layDown(hand, path("yesod-tiferet"), "tiferet");
    hand = layDown(hand, path("malchut-yesod"), "yesod");
    expect(hand).toHaveLength(full.length - 3);
  });
});

describe("which pages a descent may begin from", () => {
  const sealedAt = "2026-01-01T00:00:00.000Z";

  it("takes a crown and a kindled Tree", () => {
    expect(descendable({ sealedAt, at: "keter", sefirotLit: [] })).toBe(true);
    expect(descendable({ sealedAt, at: "hod", sefirotLit: ALL_LIT })).toBe(true);
    // A first ascent carried on to the crown stood at the crown.
    expect(descendable({ sealedAt, firstAscent: true, at: "keter", sefirotLit: [] })).toBe(true);
  });

  it("refuses a first ascent gone out in peace, an open climb, and a descent", () => {
    expect(descendable({ sealedAt, firstAscent: true, at: "yesod", sefirotLit: ["yesod"] })).toBe(false);
    expect(descendable({ at: "keter", sefirotLit: [] })).toBe(false);
    expect(descendable({ sealedAt, chapter: 2, at: "malchut", sefirotLit: [] })).toBe(false);
  });

  it("begins at the crown with that page's letters, whole lamps and no light", () => {
    const page = { id: "p1", sealedAt, at: "keter" as const, sefirotLit: [], lettersHeld: ["aleph", "bet", "ayin"] };
    const start = beginDescentFrom(page);
    expect(start).toEqual({
      chapter: 2, descendedFrom: "p1", at: "keter",
      lettersHeld: ["aleph", "bet", "ayin"], lamps: 3, or: 0,
    });
    // A copy: the page's own hand is not the descent's to lay down.
    start!.lettersHeld.pop();
    expect(page.lettersHeld).toHaveLength(3);
    expect(beginDescentFrom({ ...page, sealedAt: undefined })).toBeUndefined();
  });
});

describe("a descent and the rest of the Book", () => {
  it("does not advance the Seven Encounters", () => {
    const crowned = { sealedAt: "2026-01-01" } as never;
    const descended = { sealedAt: "2026-02-01", chapter: 2 } as never;
    expect(sealedCount([crowned, descended])).toBe(1);
  });

  it("is named by what was brought down", () => {
    expect(descentEnding(0)).toBe("empty");
    expect(descentEnding(1)).toBe("some");
    expect(descentEnding(6)).toBe("some");
    expect(descentEnding(7)).toBe("lit");
    expect(descentEnding(9)).toBe("lit");
    expect(descentEnding(10)).toBe("whole");
  });
});
