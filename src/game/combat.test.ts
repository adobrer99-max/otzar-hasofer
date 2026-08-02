import { describe, expect, it } from "vitest";
import {
  BEASTS,
  canBeStruck,
  HUSK_CHARS,
  isBeast,
  HUSKS,
  kindForRole,
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
  it("names every shell, each with something in it and something inside that", () => {
    const kinds = Object.keys(HUSKS) as HuskKind[];
    // Ten klipot and seven creatures. Counted apart rather than together,
    // because they are two claims: the ten are human failures Tanach names,
    // and the seven are not failures at all — see `BEASTS`.
    expect(kinds.filter((k) => !isBeast(k))).toHaveLength(10);
    expect(BEASTS).toHaveLength(7);
    expect(kinds).toHaveLength(17);
    for (const kind of kinds) {
      const spec = HUSKS[kind];
      expect(spec.kind, `${kind} is filed under the wrong name`).toBe(kind);
      expect(spec.shells, `${kind} breaks to nothing`).toBeGreaterThan(0);
      expect(spec.light, `${kind} holds no light`).toBeGreaterThan(0);
      expect(spec.hebrew, `${kind} has no name`).toBeTruthy();
      // A klipah is a husk *around* something. The claim that each of these is
      // drawn from somewhere has to be checkable, or the bestiary is just
      // monsters with Hebrew on them.
      expect(spec.name.length, `${kind} has no name to write`).toBeGreaterThan(2);
      expect(spec.source, `${kind} cites nothing`).toMatch(/\d/);
      expect(spec.is.length, `${kind} does not say what it does`).toBeGreaterThan(30);
      expect(spec.reading.length, `${kind} does not say what it means`).toBeGreaterThan(40);
    }
  });

  /**
   * The behaviour **is** the reading, so a klipah whose one line could be
   * swapped with another's has not earned its name. Enumerated rather than
   * asserted by eye.
   */
  it("gives each of them a different way of coming at you", () => {
    const kinds = Object.keys(HUSKS) as HuskKind[];
    const shapes = kinds.map((k) => {
      const s = HUSKS[k];
      return [s.role, s.speed, s.notices, s.throws ?? 0, s.flies ?? false, s.takes ?? "lamp"].join("/");
    });
    expect(new Set(shapes).size, `two klipot move identically: ${shapes.join(", ")}`).toBe(
      kinds.length,
    );
    expect(new Set(kinds.map((k) => HUSKS[k].hebrew)).size).toBe(kinds.length);
  });

  /**
   * The roles are what the chunk library authors, and the rung supplies the
   * klipah — so every role a screen can write must be answerable somewhere,
   * and a rung must never be made *entirely* of the roles a door waits on. A
   * rung whose every klipah holds a door seals every room in it: measured, on
   * a Yesod of Cain and the Brothers alone, not one run of ten got out.
   */
  it("keeps every authored role answerable, and no rung all door-holders", () => {
    const roles = new Set(Object.values(HUSK_CHARS));
    for (const role of roles) {
      expect(
        Object.values(HUSKS).some((s) => s.role === role),
        `no klipah anywhere fills the "${role}" a screen can write`,
      ).toBe(true);
    }
    for (const region of regions) {
      const holds = region.klipot.kinds.filter(
        (k) => HUSKS[k].role === "charger" || (HUSKS[k].role === "pacer" && Number.isFinite(HUSKS[k].notices)),
      );
      expect(
        holds.length,
        `${region.name} is nothing but klipot that hold a door shut`,
      ).toBeLessThan(region.klipot.kinds.length);
    }
  });

  it("fills a spot from the rung's own pool, and never from outside it", () => {
    for (const region of regions) {
      for (const role of Object.values(HUSK_CHARS)) {
        for (let pick = 0; pick < 4; pick += 1) {
          const kind = kindForRole(region.klipot.kinds, role, pick);
          expect(kind, `${region.name} answers nothing for a ${role}`).toBeDefined();
          expect(
            region.klipot.kinds,
            `${region.name} stood a ${kind} that does not belong to it`,
          ).toContain(kind);
        }
      }
      // And where the rung *does* hold the role, it is the one that answers.
      for (const role of Object.values(HUSK_CHARS)) {
        const fitting = region.klipot.kinds.filter((k) => HUSKS[k].role === role);
        if (fitting.length === 0) continue;
        expect(fitting).toContain(kindForRole(region.klipot.kinds, role, 0));
      }
    }
  });

  it("makes the sturdier shells worth more light", () => {
    const bySize = (Object.keys(HUSKS) as HuskKind[]).sort(
      (a, b) => HUSKS[a].shells - HUSKS[b].shells,
    );
    const light = bySize.map((k) => HUSKS[k].light);
    expect([...light].sort((a, b) => a - b)).toEqual(light);
  });

  it("writes each role with a character no tile already uses", () => {
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
