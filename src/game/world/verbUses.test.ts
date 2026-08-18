import { describe, expect, it } from "vitest";
import { mergeVerbUses } from "../../storage/ascentRepo";
import { versedIn } from "../book";
import { LETTER_ECHOES } from "../tutorial";
import { buildRegion, setTile } from "./build";
import { step, type StepContext } from "./step";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input, type World } from "./types";

/**
 * **The letters' memory — `World.verbUses`, counted by `spendVerb`.**
 *
 * The rule under test is the one in `spendVerb`'s own doc: a use is counted
 * at the moment the world answers, never per tick a state merely holds. A
 * dash is one use when it fires and none while it runs; a vine is one hold,
 * not four hundred ticks of holding; a stone set is a use and a stone taken
 * back is not, because recalling is the undo and an undo practices nothing.
 *
 * Counted on the world and folded onto the record at the way out
 * (`mergeVerbUses`), exactly as `or` is — so a rung that ends in a veiling
 * keeps nothing, which is `AscentRecord.verbUses`'s own claim.
 */

/** The empty flat room `marks.test.ts` builds, for the same reason it does. */
function room(): World {
  const world = buildRegion(1, 7, 1, false, 1);
  world.tiles.fill(Tile.Empty);
  world.entities = [];
  world.husks = [];
  world.marks = [];
  world.rooms = [];
  for (let x = 0; x < world.width; x += 1) setTile(world, x, world.height - 1, Tile.Stone);
  world.player.x = 3 * TILE_SIZE;
  world.player.y = (world.height - 1) * TILE_SIZE - world.player.h;
  world.player.vx = 0;
  world.player.vy = 0;
  return world;
}

const press = (over: Partial<Input>): Input => ({ ...NO_INPUT, ...over });

describe("a verb is counted when the world answers", () => {
  it("counts a dash when it fires, and not while it runs", () => {
    const world = room();
    const ctx: StepContext = { verbs: ["dash"], graces: [] };
    step(world, press({ dash: true }), ctx);
    // The dash is running; holding the key through it adds nothing.
    for (let t = 0; t < 10; t += 1) step(world, press({ dash: true }), ctx);
    expect(world.verbUses.dash).toBe(1);
  });

  it("counts the second jump at the moment it is spent, never the first", () => {
    const world = room();
    const ctx: StepContext = { verbs: ["double-jump"], graces: [] };
    step(world, press({ jump: true }), ctx);
    expect(world.verbUses["double-jump"]).toBeUndefined();
    // Airborne now — the second press is the letter.
    for (let t = 0; t < 6; t += 1) step(world, NO_INPUT, ctx);
    step(world, press({ jump: true }), ctx);
    expect(world.verbUses["double-jump"]).toBe(1);
  });

  it("counts taking hold of a vine once, however long it is held", () => {
    const world = room();
    const ctx: StepContext = { verbs: ["climb"], graces: [] };
    const px = Math.floor((world.player.x + world.player.w / 2) / TILE_SIZE);
    for (let y = world.height - 6; y < world.height - 1; y += 1) {
      setTile(world, px, y, Tile.Vine);
    }
    for (let t = 0; t < 30; t += 1) step(world, press({ up: true }), ctx);
    expect(world.verbUses.climb).toBe(1);
  });

  it("counts a stone set, and not the stone taken back", () => {
    const world = room();
    const ctx: StepContext = { verbs: ["block"], graces: [] };
    step(world, press({ act: true }), ctx);
    expect(world.verbUses.block).toBe(1);
    // Let go, then ask again — the same stone comes back out of the floor.
    for (let t = 0; t < 4; t += 1) step(world, NO_INPUT, ctx);
    step(world, press({ act: true }), ctx);
    expect(world.verbUses.block, "recalling a stone is an undo, not a use").toBe(1);
  });

  it("counts nothing for a verb the hand does not hold", () => {
    const world = room();
    const ctx: StepContext = { verbs: [], graces: [] };
    step(world, press({ dash: true, jump: true, act: true }), ctx);
    for (let t = 0; t < 10; t += 1) step(world, NO_INPUT, ctx);
    expect(world.verbUses).toEqual({});
  });
});

describe("the fold onto the record", () => {
  it("adds counts, and leaves the base alone when the rung used nothing", () => {
    expect(mergeVerbUses({ dash: 2 }, { dash: 1, cut: 3 })).toEqual({ dash: 3, cut: 3 });
    const base = { dash: 2 };
    expect(mergeVerbUses(base, {})).toBe(base);
    expect(mergeVerbUses(base, undefined)).toBe(base);
    // A record that has never counted stays without the field.
    expect(mergeVerbUses(undefined, {})).toBeUndefined();
    expect(mergeVerbUses(undefined, { swim: 1 })).toEqual({ swim: 1 });
  });
});

describe("the first real use, noticed and named", () => {
  it("says the answered echo once, and only for a verb new to the climb", () => {
    const world = room();
    const ctx: StepContext = { verbs: ["dash"], graces: [], practiced: [] };
    step(world, press({ dash: true }), ctx);
    expect(world.message?.text).toBe(LETTER_ECHOES.dash.answered);
    // A second use later in the rung says nothing new.
    world.message = undefined;
    for (let t = 0; t < 80; t += 1) step(world, NO_INPUT, ctx);
    step(world, press({ dash: true }), ctx);
    expect(world.verbUses.dash).toBe(2);
    expect(world.message?.text).not.toBe(LETTER_ECHOES.dash.answered);
  });

  it("stays silent for a verb the record already knows", () => {
    // A new rung's world counts from zero, but the climb has dashed before —
    // `practiced` is the record's memory, and the letter must not introduce
    // itself again on every way in.
    const world = room();
    const ctx: StepContext = { verbs: ["dash"], graces: [], practiced: ["dash"] };
    step(world, press({ dash: true }), ctx);
    expect(world.verbUses.dash).toBe(1);
    expect(world.message?.text).not.toBe(LETTER_ECHOES.dash.answered);
  });
});

describe("the three beats of every verb letter", () => {
  it("authors all twelve, three distinct beats each, none empty", () => {
    const entries = Object.entries(LETTER_ECHOES);
    expect(entries).toHaveLength(12);
    for (const [verb, echo] of entries) {
      for (const beat of ["found", "answered", "mastered"] as const) {
        expect(echo[beat].length, `${verb}'s ${beat} beat is empty`).toBeGreaterThan(20);
      }
    }
    for (const beat of ["found", "answered", "mastered"] as const) {
      const lines = entries.map(([, e]) => e[beat]);
      expect(new Set(lines).size, `two verbs share a ${beat} line`).toBe(12);
    }
  });
});

describe("mastery, folded across sealed climbs", () => {
  it("sums sealed records only, and reads absence as nothing", () => {
    const base = {
      id: "x", seed: 1, seedLabel: "s", createdAt: "", updatedAt: "",
      regionIndex: 1, lettersHeld: [], or: 0, regionsCleared: [], housesMet: [],
    };
    const sealed = (id: string, uses: Record<string, number>) =>
      ({ ...base, id, verbUses: uses, sealedAt: "2026-01-01" }) as never;
    const open = (id: string, uses: Record<string, number>) =>
      ({ ...base, id, verbUses: uses }) as never;
    expect(versedIn([sealed("a", { dash: 30 }), sealed("b", { dash: 15, cut: 2 }), open("c", { dash: 99 })]))
      .toEqual({ dash: 45, cut: 2 });
    expect(versedIn([])).toEqual({});
  });
});
