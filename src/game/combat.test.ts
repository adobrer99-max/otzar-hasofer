import { describe, expect, it } from "vitest";
import {
  canBeStruck,
  HUSK_CHARS,
  HUSKS,
  IFRAME_TICKS,
  LAMPS,
  markBite,
  markPowers,
  takeHit,
  type HuskKind,
} from "./combat";
import { TILE_CHARS } from "./world/tiles";
import { regions } from "./regions";

/**
 * The rules of the fight, on their own. `world/step.ts` decides when to ask
 * them; nothing here touches a clock, a DOM or a random number, so a hit can
 * be reasoned about without running a game.
 */
describe("the klipot", () => {
  it("names four shells, each with something in it", () => {
    const kinds = Object.keys(HUSKS) as HuskKind[];
    expect(kinds).toHaveLength(4);
    for (const kind of kinds) {
      const spec = HUSKS[kind];
      expect(spec.kind, `${kind} is filed under the wrong name`).toBe(kind);
      expect(spec.shells, `${kind} breaks to nothing`).toBeGreaterThan(0);
      expect(spec.light, `${kind} holds no light`).toBeGreaterThan(0);
      expect(spec.hebrew, `${kind} has no name`).toBeTruthy();
    }
  });

  it("makes the sturdier shells worth more light", () => {
    const bySize = (Object.keys(HUSKS) as HuskKind[]).sort(
      (a, b) => HUSKS[a].shells - HUSKS[b].shells,
    );
    const light = bySize.map((k) => HUSKS[k].light);
    expect([...light].sort((a, b) => a - b)).toEqual(light);
  });

  it("writes each husk with a character no tile already uses", () => {
    for (const ch of Object.keys(HUSK_CHARS)) {
      expect(ch in TILE_CHARS, `"${ch}" is already a tile`).toBe(false);
    }
    expect(new Set(Object.values(HUSK_CHARS)).size).toBe(Object.keys(HUSK_CHARS).length);
  });

  it("stands more of them the higher the Tree is climbed", () => {
    const counts = regions.map((r) => r.klipot.count);
    expect(counts[0], "Malchut should be the emptiest").toBeLessThan(counts[counts.length - 1]);
    for (const region of regions) {
      for (const kind of region.klipot.kinds) {
        expect(HUSKS[kind], `${region.name} names an unknown husk`).toBeDefined();
      }
    }
  });
});

describe("the Scribe's mark", () => {
  it("takes one shell bare, and two once the Flame is carried", () => {
    expect(markBite(markPowers([], []))).toBe(1);
    expect(markBite(markPowers(["flame"], []))).toBe(2);
  });

  it("passes through the first husk once the Edge is carried", () => {
    expect(markPowers([], []).pierces).toBe(false);
    expect(markPowers(["cut"], []).pierces).toBe(true);
  });

  it("draws rather than pushes once the Hook is carried", () => {
    expect(markPowers([], []).draws).toBe(false);
    expect(markPowers(["grapple"], []).draws).toBe(true);
  });

  it("is thrown further by the Staff", () => {
    expect(markPowers([], ["high-jump"]).reach).toBeGreaterThan(markPowers([], []).reach);
  });

  /**
   * The one place a letter decides whether a fight is possible at all rather
   * than how it goes: a husk standing in veiled stone is no more visible than
   * the stone is.
   */
  it("cannot touch what the Eye has not opened", () => {
    expect(canBeStruck(true, [])).toBe(false);
    expect(canBeStruck(true, ["reveal"])).toBe(true);
    expect(canBeStruck(false, [])).toBe(true);
  });
});

describe("lamps, and going out", () => {
  it("costs exactly one lamp, and buys a moment of grace", () => {
    const hit = takeHit(LAMPS, 0);
    expect(hit.lamps).toBe(LAMPS - 1);
    expect(hit.iframes).toBe(IFRAME_TICKS);
    expect(hit.out).toBe(false);
  });

  /** During the grace nothing happens at all — not a reduced hit, no hit. */
  it("cannot be hit twice inside one grace", () => {
    const first = takeHit(LAMPS, 0);
    const second = takeHit(first.lamps, first.iframes);
    expect(second.lamps).toBe(first.lamps);
    expect(second.out).toBe(false);
  });

  it("goes out on the last lamp, and stays out", () => {
    expect(takeHit(1, 0).out).toBe(true);
    expect(takeHit(1, 0).lamps).toBe(0);
    expect(takeHit(0, 0).out).toBe(true);
  });

  it("starts with more than one, so a mistake is not the run", () => {
    expect(LAMPS).toBeGreaterThan(1);
  });
});
