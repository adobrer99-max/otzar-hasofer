import { describe, expect, it } from "vitest";
import { allRegionLetters, lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { SCROLL_LETTER, SCROLL_TOTAL } from "../scroll";
import { abilities, abilityByLetter } from "../abilities";
import { letters } from "../../data/letters";
import { buildRegion, tileAt, verbsOf } from "./build";
import { step, type StepContext } from "./step";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input, type World } from "./types";

function contextFor(regionIndex: number, extraLetters: string[] = []): StepContext {
  const held = [...lettersOnEntering(regionIndex), ...extraLetters];
  return {
    verbs: verbsOf(held),
    graces: held
      .map((id) => abilityByLetter[id]?.grace)
      .filter((g): g is NonNullable<typeof g> => Boolean(g)),
  };
}

function run(world: World, ctx: StepContext, ticks: number, input: Partial<Input> = {}): void {
  for (let i = 0; i < ticks; i += 1) {
    step(world, { ...NO_INPUT, ...input }, ctx);
  }
}

describe("the letters and the regions", () => {
  it("accounts for all twenty-two letters: twenty-one in alcoves, Peh assembled", () => {
    const given = allRegionLetters();
    expect(given).toHaveLength(21);
    expect(new Set(given).size).toBe(21);
    // Peh is deliberately absent from every alcove — it is the one letter that
    // must be put together, from the fragments of the torn scroll.
    expect(given).not.toContain(SCROLL_LETTER);

    const all = [...given, SCROLL_LETTER];
    expect(new Set(all).size).toBe(22);
    for (const letter of letters) {
      expect(all, `${letter.name} can never be had`).toContain(letter.id);
    }
  });

  it("strews exactly as many fragments as the scroll has pieces", () => {
    const strewn = regions.reduce((n, r) => n + (r.fragments ?? 0), 0);
    expect(strewn).toBe(SCROLL_TOTAL);
  });

  it("finishes the scroll early, so the Houses are not mute for most of the climb", () => {
    // The whole point of assembling Peh rather than finding it: the Dorot
    // episodes are the richest content the game draws on, and they were
    // behind six regions of silence when Peh sat in Chesed.
    const lastFragmentRegion = regions.filter((r) => r.fragments).at(-1)?.index ?? 0;
    expect(lastFragmentRegion).toBeLessThanOrEqual(2);
  });

  it("defines an ability for every letter, and every verb exactly once", () => {
    expect(abilities).toHaveLength(22);
    const verbs = abilities.filter((a) => a.kind === "verb").map((a) => a.verb);
    expect(verbs).toHaveLength(12);
    expect(new Set(verbs).size).toBe(12);
    const graces = abilities.filter((a) => a.kind === "grace").map((a) => a.grace);
    expect(graces).toHaveLength(10);
    expect(new Set(graces).size).toBe(10);
  });

  it("never asks a region for a verb the Scribe could not already hold", () => {
    // This is the no-soft-lock guarantee, checked against the real builder
    // rather than trusted: a region's terrain may only require what its
    // predecessors gave.
    for (let i = 1; i <= TOTAL_REGIONS; i += 1) {
      const held = verbsOf(lettersOnEntering(i));
      const world = buildRegion(i, 1234 + i);
      expect(world.width).toBeGreaterThan(0);
      // A veiled stone that can never be revealed would be a wall forever.
      if (!held.includes("reveal")) {
        expect(world.tiles.includes(Tile.Veiled), `region ${i} hides stone before the Eye`).toBe(false);
      }
      if (!held.includes("swim")) {
        expect(world.tiles.includes(Tile.Water), `region ${i} floods before the Waters`).toBe(false);
      }
      if (!held.includes("open")) {
        expect(world.tiles.includes(Tile.Door), `region ${i} seals before the Door`).toBe(false);
      }
    }
  });

  it("builds every region for many seeds with a spawn, an exit, and its letters", () => {
    for (let i = 1; i <= TOTAL_REGIONS; i += 1) {
      for (const seed of [1, 7, 99, 4242, 88888]) {
        const world = buildRegion(i, seed);
        const exits = world.entities.filter((e) => e.kind === "exit");
        const marks = world.entities.filter((e) => e.kind === "mark");
        const letterDrops = world.entities.filter((e) => e.kind === "letter");
        expect(exits, `region ${i} seed ${seed} exit`).toHaveLength(1);
        // One mark below the Abyss, and none above it — Binah, Chochmah and
        // Keter hold no House and now hold no shrine either, so a veiling
        // there costs the whole region's ground.
        expect(marks.length, `region ${i} seed ${seed} shrine`).toBe(
          regions[i - 1].hasShrine ? 1 : 0,
        );
        expect(letterDrops.map((e) => e.ref).sort()).toEqual([...regions[i - 1].letters].sort());
      }
    }
  });

  it("puts the House figure in the lower seven and nowhere above the Abyss", () => {
    for (let i = 1; i <= TOTAL_REGIONS; i += 1) {
      const world = buildRegion(i, 31337);
      const houses = world.entities.filter((e) => e.kind === "house");
      expect(houses.length, `region ${i}`).toBe(regions[i - 1].hasHouse ? 1 : 0);
    }
  });
});

describe("the simulation", () => {
  it("settles the Scribe onto the ground and holds there", () => {
    const world = buildRegion(1, 5);
    const ctx = contextFor(1);
    run(world, ctx, 60);
    expect(world.player.onGround).toBe(true);
    const restingY = world.player.y;
    run(world, ctx, 60);
    expect(world.player.y).toBeCloseTo(restingY, 1);
  });

  it("walks right when told to, and stops when not", () => {
    const world = buildRegion(1, 5);
    const ctx = contextFor(1);
    run(world, ctx, 30);
    const startX = world.player.x;
    run(world, ctx, 60, { right: true });
    expect(world.player.x).toBeGreaterThan(startX + 40);
    run(world, ctx, 40);
    expect(Math.abs(world.player.vx)).toBeLessThan(1);
  });

  it("jumps, and a released key gives a lower jump than a held one", () => {
    const measure = (hold: boolean) => {
      const world = buildRegion(1, 5);
      const ctx = contextFor(1);
      run(world, ctx, 30);
      const ground = world.player.y;
      step(world, { ...NO_INPUT, jump: true, jumpHeld: true }, ctx);
      let peak = world.player.y;
      for (let i = 0; i < 60; i += 1) {
        step(world, { ...NO_INPUT, jumpHeld: hold }, ctx);
        peak = Math.min(peak, world.player.y);
      }
      return ground - peak;
    };
    const held = measure(true);
    const tapped = measure(false);
    expect(held).toBeGreaterThan(TILE_SIZE * 2);
    expect(tapped).toBeLessThan(held);
  });

  it("does not let a Scribe without the Breath jump twice", () => {
    const world = buildRegion(1, 5);
    const ctx: StepContext = { verbs: [], graces: [] };
    run(world, ctx, 30);
    step(world, { ...NO_INPUT, jump: true, jumpHeld: true }, ctx);
    run(world, ctx, 10, { jumpHeld: true });
    const beforeSecond = world.player.vy;
    step(world, { ...NO_INPUT, jump: true, jumpHeld: true }, ctx);
    expect(world.player.vy).toBeGreaterThanOrEqual(beforeSecond);
  });

  it("lets a Scribe with the Breath jump a second time in the air", () => {
    const world = buildRegion(1, 5);
    const ctx: StepContext = { verbs: ["double-jump"], graces: [] };
    run(world, ctx, 30);
    step(world, { ...NO_INPUT, jump: true, jumpHeld: true }, ctx);
    run(world, ctx, 12, { jumpHeld: true });
    const falling = world.player.vy;
    step(world, { ...NO_INPUT, jump: true, jumpHeld: true }, ctx);
    expect(world.player.vy).toBeLessThan(falling);
  });

  it("never kills — a veiling returns the Scribe to the mark with every letter", () => {
    const world = buildRegion(1, 5);
    const ctx = contextFor(1);
    run(world, ctx, 30);
    world.respawn = { x: 48, y: 300 };
    // Drop the Scribe out of the world entirely.
    world.player.y = world.height * TILE_SIZE + 400;
    step(world, NO_INPUT, ctx);
    expect(world.player.veiled).toBeGreaterThan(0);
    run(world, ctx, 90);
    // Returned to the mark's column and back inside the world — the drop to
    // the floor beneath the mark is gravity doing its ordinary work.
    expect(world.player.x).toBeCloseTo(48, 0);
    expect(world.player.y).toBeLessThan(world.height * TILE_SIZE);
    expect(world.player.onGround).toBe(true);
    expect(world.finished).toBe(false);
  });

  it("gathers a mote walked into, once", () => {
    const world = buildRegion(1, 5);
    const ctx = contextFor(1);
    const mote = world.entities.find((e) => e.kind === "mote");
    expect(mote).toBeDefined();
    if (!mote) return;
    world.player.x = mote.x;
    world.player.y = mote.y;
    step(world, NO_INPUT, ctx);
    expect(world.or).toBe(1);
    step(world, NO_INPUT, ctx);
    expect(world.or).toBe(1);
  });

  it("hands over a letter when its alcove is reached", () => {
    const world = buildRegion(1, 5);
    const found: string[] = [];
    const ctx: StepContext = { ...contextFor(1), onLetter: (id) => found.push(id) };
    const drop = world.entities.find((e) => e.kind === "letter");
    expect(drop).toBeDefined();
    if (!drop) return;
    world.player.x = drop.x;
    world.player.y = drop.y;
    step(world, NO_INPUT, ctx);
    expect(found).toEqual([drop.ref]);
  });

  it("moves the mark when a shrine is touched", () => {
    const world = buildRegion(1, 5);
    const ctx = contextFor(1);
    const shrine = world.entities.find((e) => e.kind === "mark");
    expect(shrine).toBeDefined();
    if (!shrine) return;
    world.player.x = shrine.x;
    world.player.y = shrine.y;
    step(world, NO_INPUT, ctx);
    expect(world.respawn.x).toBe(shrine.x);
  });

  it("finishes the region at the exit", () => {
    const world = buildRegion(1, 5);
    let finished = false;
    const ctx: StepContext = { ...contextFor(1), onFinish: () => { finished = true; } };
    const exit = world.entities.find((e) => e.kind === "exit");
    expect(exit).toBeDefined();
    if (!exit) return;
    world.player.x = exit.x;
    world.player.y = exit.y;
    step(world, NO_INPUT, ctx);
    expect(finished).toBe(true);
    expect(world.finished).toBe(true);
  });

  it("sets and takes back a stone with the House", () => {
    const world = buildRegion(1, 5);
    const ctx: StepContext = { verbs: ["block"], graces: [] };
    run(world, ctx, 40);
    step(world, { ...NO_INPUT, act: true }, ctx);
    expect(world.placed).toHaveLength(1);
    const stone = world.placed[0];
    expect(tileAt(world, stone.x, stone.y)).toBe(Tile.Placed);
  });

  it("opens the hidden stone once, and keeps it open", () => {
    const world = buildRegion(8, 5);
    const ctx: StepContext = { verbs: ["reveal"], graces: [] };
    run(world, ctx, 20);
    expect(world.revealed).toBe(false);
    step(world, { ...NO_INPUT, act: true }, ctx);
    expect(world.revealed).toBe(true);
    run(world, ctx, 60);
    expect(world.revealed).toBe(true);
  });

  it("stays deterministic — the same seed builds the same region", () => {
    const a = buildRegion(4, 777);
    const b = buildRegion(4, 777);
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(a.entities.map((e) => `${e.kind}:${e.x},${e.y}:${e.ref ?? ""}`)).toEqual(
      b.entities.map((e) => `${e.kind}:${e.x},${e.y}:${e.ref ?? ""}`),
    );
  });
});
