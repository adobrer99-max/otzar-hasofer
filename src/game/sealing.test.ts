import { describe, expect, it } from "vitest";
import { regions, TOTAL_REGIONS } from "./regions";
import { CROWN, sealKindOf, sealOffered } from "./sealing";
import type { SefirahId } from "../types/letter";

const ALL = regions.map((r) => r.sefirah);
const nowhere = { at: "malchut" as SefirahId, sefirotLit: [], guardiansBroken: [] };

/**
 * **The half of the sentence the code never kept.** `sealedAt` has promised for
 * a long time that a climb ends at "the crown, or all ten kindled", and only
 * the second was reachable — `SealedPlate`'s whole "The crown is reached"
 * branch sat orphaned behind a map that offered sealing only to a lit Tree.
 */
describe("which ending is on offer", () => {
  it("offers nothing to a Scribe who has neither", () => {
    expect(sealOffered(nowhere)).toBeUndefined();
    // Standing on the crown is not enough — something is holding it.
    expect(sealOffered({ ...nowhere, at: CROWN })).toBeUndefined();
  });

  it("offers the crown on a Keter nothing is holding", () => {
    expect(sealOffered({ ...nowhere, at: CROWN, guardiansBroken: [CROWN] })).toBe("crown");
  });

  /**
   * And nowhere else. A freed Sefirah is a freed Sefirah; the crown is the one
   * place a case can be made, which is the whole fiction — a scribe cast down
   * from the crown, climbing back to ask.
   */
  it("offers the crown at no other Sefirah, however many are freed", () => {
    for (const at of ALL) {
      if (at === CROWN) continue;
      expect(sealOffered({ at, sefirotLit: [], guardiansBroken: ALL }), at).toBeUndefined();
    }
  });

  it("offers the kindled ending wherever the Scribe stands", () => {
    // A lit Tree is a fact about the Tree, not about the ground underfoot.
    for (const at of ALL) {
      expect(sealOffered({ at, sefirotLit: ALL, guardiansBroken: [] }), at).toBe("kindled");
    }
  });

  it("prefers the kindled ending when both are true", () => {
    expect(sealOffered({ at: CROWN, sefirotLit: ALL, guardiansBroken: ALL })).toBe("kindled");
  });

  it("needs every one of the ten, not merely many", () => {
    const nine = ALL.slice(0, TOTAL_REGIONS - 1);
    expect(nine).toHaveLength(TOTAL_REGIONS - 1);
    expect(sealOffered({ at: "tiferet", sefirotLit: nine, guardiansBroken: [] })).toBeUndefined();
    // And a repeated Sefirah is one Sefirah, or the count could be gamed by a
    // record that listed the same kindling twice.
    const doubled = [...nine, ...nine] as SefirahId[];
    expect(sealOffered({ at: "tiferet", sefirotLit: doubled, guardiansBroken: [] })).toBeUndefined();
  });
});

/**
 * The same question asked of history. Every record ever written can be read
 * this way — including the ones sealed before the crown ending existed —
 * because it reads nothing but `sefirotLit`, which has always been there.
 */
describe("which ending a sealed record holds", () => {
  it("reads a lit Tree as the consummation and everything else as the crown", () => {
    expect(sealKindOf({ sefirotLit: ALL })).toBe("kindled");
    expect(sealKindOf({ sefirotLit: ALL.slice(0, 3) })).toBe("crown");
    expect(sealKindOf({})).toBe("crown");
  });

  it("agrees with what was offered at the moment of sealing", () => {
    for (const lit of [[], ALL.slice(0, 5), ALL]) {
      const offered = sealOffered({ at: CROWN, sefirotLit: lit, guardiansBroken: [CROWN] });
      expect(sealKindOf({ sefirotLit: lit })).toBe(offered);
    }
  });
});
