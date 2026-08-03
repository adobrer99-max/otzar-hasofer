import { describe, expect, it } from "vitest";
import type { AscentRecord } from "../storage/ascentRepo";
import { standingAt } from "../storage/ascentRepo";
import { sealedCount } from "./encounter";
import { afterFalling, wakeAt } from "./fall";
import { regionOfSefirah } from "./regions";

/**
 * **The oldest debt in the game, paid.**
 *
 * The prologue promised that when the last lamp goes out the kingdom comes up
 * to meet you *exactly as it did the first time*, and the plate raised at that
 * moment said the same thing in its own words — and both were false, because
 * the button under them sealed the record. Every claim below is one the game
 * has been making in prose for months and could not make in code.
 */

const climb = (over: Partial<AscentRecord>): AscentRecord => ({
  id: "a",
  seed: 1,
  seedLabel: "x",
  createdAt: "",
  updatedAt: "",
  regionIndex: 1,
  lettersHeld: [],
  or: 0,
  regionsCleared: [],
  housesMet: [],
  sacredNotes: [],
  ...over,
});

describe("where the Scribe wakes", () => {
  it("is the kingdom, for a climb that has kindled nothing", () => {
    expect(wakeAt(climb({ at: "gevurah" }))).toBe("malchut");
    expect(wakeAt(climb({ at: "gevurah", sefirotLit: [] }))).toBe("malchut");
    // And for a record written before the Tree could be walked, which has no
    // `at` at all — `standingAt` already answers the kingdom there.
    expect(wakeAt(climb({}))).toBe("malchut");
    expect(standingAt(climb({}))).toBe("malchut");
  });

  /**
   * **Kindling is a checkpoint as well as a score sink**, which is the mark's
   * own shape one level up: a place you paid for, that catches you.
   */
  it("is the highest Sefirah this climb has kindled", () => {
    expect(wakeAt(climb({ at: "chochmah", sefirotLit: ["malchut", "tiferet", "yesod"] }))).toBe(
      "tiferet",
    );
    // Order in the list means nothing — it is the index that is compared.
    expect(wakeAt(climb({ at: "chochmah", sefirotLit: ["tiferet", "yesod", "malchut"] }))).toBe(
      "tiferet",
    );
  });

  /**
   * **A fall never carries you upward.** Without the cap the fall is a free
   * warp: a Scribe standing low with no light in hand could go out on purpose
   * and wake at a Sefirah kindled far above. One comparison closes it.
   */
  it("never carries the Scribe above where they set out", () => {
    const lit: AscentRecord["sefirotLit"] = ["malchut", "yesod", "keter"];
    expect(wakeAt(climb({ at: "hod", sefirotLit: lit }))).toBe("yesod");
    expect(regionOfSefirah("yesod").index).toBeLessThan(regionOfSefirah("hod").index);
    // Standing at the crown, the crown is allowed — the cap is "not above",
    // not "strictly below".
    expect(wakeAt(climb({ at: "keter", sefirotLit: lit }))).toBe("keter");
  });
});

describe("what the fall takes", () => {
  it("takes the light in hand, and counts itself", () => {
    const before = climb({ at: "chesed", or: 287, sefirotLit: ["malchut"] });
    const after = { ...before, ...afterFalling(before) };
    expect(after.or).toBe(0);
    expect(after.falls).toBe(1);
    expect({ ...after, ...afterFalling(after) }.falls).toBe(2);
  });

  it("puts the Scribe down where they wake, in both of the two places that say so", () => {
    const before = climb({ at: "binah", regionIndex: 9, sefirotLit: ["gevurah"] });
    const after = { ...before, ...afterFalling(before) };
    expect(after.at).toBe("gevurah");
    // `regionIndex` predates the Tree and is kept in step with `at` everywhere
    // else; a fall that moved one and not the other would leave the HUD naming
    // a rung the Scribe is not standing on.
    expect(after.regionIndex).toBe(regionOfSefirah("gevurah").index);
  });

  /**
   * And nothing else at all. Asserted as a whole record rather than field by
   * field, so a field added later that ought to survive a fall and does not
   * fails here rather than going quietly.
   */
  it("takes nothing else — not a letter, not a vessel, not a guardian broken", () => {
    const before = climb({
      at: "tiferet",
      regionIndex: 6,
      or: 140,
      lettersHeld: ["aleph", "bet", "gimel"],
      items: ["kulmus", "sargel"],
      guardiansBroken: ["malchut", "yesod", "tiferet"],
      sefirotLit: ["malchut", "yesod"],
      regionsCleared: [1, 2, 3],
      housesMet: ["some-card"],
      wordsFormed: [],
      scrollFragments: [0, 1],
    });
    const after = { ...before, ...afterFalling(before) };
    expect(after).toEqual({
      ...before,
      at: "yesod",
      regionIndex: regionOfSefirah("yesod").index,
      or: 0,
      falls: 1,
    });
  });
});

/**
 * **The climb goes on**, which is the whole of it, and the reason the Seven
 * Encounters stop being buyable with failure.
 */
describe("what the fall does not do", () => {
  it("does not seal the climb", () => {
    const before = climb({ at: "chesed", or: 200 });
    const after = { ...before, ...afterFalling(before) };
    expect(after.sealedAt).toBeUndefined();
    expect("sealedAt" in afterFalling(before)).toBe(false);
  });

  it("does not advance the Encounters, however often it happens", () => {
    let record = climb({ at: "chesed", or: 200 });
    for (let i = 0; i < 7; i += 1) record = { ...record, ...afterFalling(record) };
    expect(record.falls).toBe(7);
    expect(sealedCount([record])).toBe(0);
    // A climb carried to its ending still counts, which is the other half of
    // the same claim.
    expect(sealedCount([record, { ...record, sealedAt: "2026-01-01" }])).toBe(1);
  });
});
