import { describe, expect, it } from "vitest";
import { abilities } from "./abilities";
import { describeEffect, drawKeli, keliById, keliFor, KELIM, powersFrom, synergiesIn } from "./items";
import { markPowers } from "./combat";
import { makeRng } from "./rng";
import { TREE_PATHS } from "./tree";
import { TOTAL_REGIONS } from "./regions";
import { buildPath, buildRegion, keliOnPath } from "./world/build";
import { step, type StepContext } from "./world/step";
import { TILE_SIZE } from "./world/tiles";
import { NO_INPUT } from "./world/types";

/**
 * The vessels, and the line they must not cross.
 *
 * Twenty-two letters are the progression. A vessel changes numbers — how hard
 * a mark bites, how far it carries, how many lamps you are made of — and never
 * grants a verb, because an object that handed out a thirteenth verb would be
 * competing with the alphabet rather than furnishing it.
 *
 * The other thing asserted here is that a declared synergy *does something*. A
 * pair that reads well on a plate and changes no number is worse than no pair
 * at all, and the only way to know is to enumerate them.
 */

describe("the vessels", () => {
  it("grants no verb, and touches only what it is allowed to", () => {
    const allowed = new Set([
      "bite",
      "reach",
      "cooldown",
      "speed",
      "lamps",
      "iframes",
      "light",
      "pierces",
      // The four behaviours. They widen what a vessel may touch and not what it
      // may *grant*: the assertion below is unchanged, and it is the rule.
      "bounces",
      "homing",
      "splits",
      "arcs",
    ]);
    const verbs = new Set(abilities.filter((a) => a.kind === "verb").map((a) => a.verb));
    for (const keli of KELIM) {
      for (const key of Object.keys(keli.effect)) {
        expect(allowed.has(key), `${keli.id} touches "${key}"`).toBe(true);
        expect(verbs.has(key as never), `${keli.id} grants the verb "${key}"`).toBe(false);
      }
      for (const key of Object.keys(keli.synergy?.effect ?? {})) {
        expect(allowed.has(key), `${keli.id}'s synergy touches "${key}"`).toBe(true);
      }
    }
  });

  it("is a set of distinct objects, each of which says what it is", () => {
    expect(new Set(KELIM.map((k) => k.id)).size).toBe(KELIM.length);
    for (const keli of KELIM) {
      expect(keli.name.length, keli.id).toBeGreaterThan(2);
      expect(keli.hebrew.length, keli.id).toBeGreaterThan(1);
      expect(keli.found.length, `${keli.id} does not say what it is`).toBeGreaterThan(40);
      expect(Object.keys(keli.effect).length, `${keli.id} does nothing`).toBeGreaterThan(0);
    }
  });

  it("changes something for every vessel held", () => {
    for (const keli of KELIM) {
      const alone = powersFrom([keli.id]);
      const nothing = powersFrom([]);
      expect(alone, `${keli.id} held changes nothing`).not.toEqual(nothing);
    }
  });

  /** The reason to have more than one. A pair that reads well and does nothing is worse than no pair. */
  it("makes every declared synergy do something", () => {
    for (const keli of KELIM) {
      if (!keli.synergy) continue;
      const other = keli.synergy.with;
      expect(keliById[other], `${keli.id} pairs with an object that is not there`).toBeDefined();
      const apart = powersFrom([keli.id]);
      const together = powersFrom([keli.id, other]);
      const separately = powersFrom([other]);
      expect(together, `${keli.id} + ${other} is the same as holding them apart`).not.toEqual({
        ...apart,
        ...separately,
      });
      expect(Object.keys(keli.synergy.effect).length, `${keli.id}'s synergy is empty`).toBeGreaterThan(0);
      expect(keli.synergy.line.length, `${keli.id}'s synergy says nothing`).toBeGreaterThan(20);
      expect(synergiesIn([keli.id, other]).map((s) => s.keli.id)).toContain(keli.id);
      expect(synergiesIn([keli.id])).toEqual([]);
    }
  });

  /**
   * Quantities add and rates multiply, and the two must not be confused: a
   * second lamp has to be a second lamp, and two objects that each halve a
   * cooldown must not between them stop time.
   */
  it("adds quantities and multiplies rates", () => {
    const both = powersFrom(["kulmus", "izmel"]);
    expect(both.bite).toBeCloseTo(1.5 * 1.2, 5);
    expect(both.cooldown).toBeCloseTo(0.7, 5);
    expect(powersFrom(["ner"]).lamps).toBe(1);
    expect(powersFrom([]).cooldown).toBe(1);
    // An unknown id is ignored rather than throwing: a saved climb may name a
    // vessel a later version of the game no longer has.
    expect(powersFrom(["kulmus", "not-a-thing"])).toEqual(powersFrom(["kulmus"]));
  });

  it("lays the vessel it names into the rung itself", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const keli = keliFor(region);
      for (const seed of [3, 91, 555]) {
        const world = buildRegion(region, seed);
        const found = world.entities.filter((e) => e.kind === "vessel");
        expect(found.length, `region ${region} seed ${seed}`).toBe(keli ? 1 : 0);
        if (keli) expect(found[0].ref).toBe(keli.id);
      }
    }
  });

  /**
   * The old road furnishes one rung at a time and never twice — and it can no
   * longer show the whole pool, which is the point of there being a pool. It
   * used to assert that every vessel in the game was laid across the ten rungs,
   * because there were exactly seven of them and seven rungs to put them on.
   */
  it("puts one vessel on every rung of the old road that can hold one, and none in the kingdom", () => {
    expect(keliFor(1), "the kingdom teaches; it does not furnish").toBeUndefined();
    const placed = new Set<string>();
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      const keli = keliFor(region);
      if (!keli) continue;
      expect(placed.has(keli.id), `${keli.id} is laid twice`).toBe(false);
      placed.add(keli.id);
    }
    expect(placed.size, "the old road furnishes no rung").toBeGreaterThan(4);
    expect(
      placed.size,
      "the old road shows the whole pool, so a climb has nothing left to find",
    ).toBeLessThan(KELIM.length);
  });
});

/**
 * **The pool, and why a climb draws from it.**
 *
 * Twenty-two letters are gathered by everyone who reaches the crown, so for as
 * long as the seven vessels were a fixture — the same seven, in the same seven
 * places — two finished climbs differed only in which bargains were struck and
 * what the day happened to lend. A Scribe was the same Scribe every time.
 *
 * The note that fixed them said an object which might or might not be there is
 * a reason to re-roll a climb rather than to make one, and that was right about
 * a line. It is wrong about the Tree, because **the seed is the Hebrew date**:
 * `buildPath` seeds a rung from the day and the path together, so which vessel
 * lies where is settled until midnight and there is nothing to roll. What a
 * Scribe chooses is which paths to walk, which turns the pool into a list of
 * places worth going.
 */
describe("the pool a climb draws from", () => {
  it("is deeper than any one climb can empty", () => {
    // Twenty-two paths, and a climb walks most but not all of them. The pool
    // has to outlast that or the last third of a route is bare pedestals.
    expect(KELIM.length, "the pool is thinner than a climb is long").toBeGreaterThan(12);
  });

  it("never offers a Scribe what they are already carrying", () => {
    const rng = makeRng(4242);
    const held: string[] = [];
    for (let i = 0; i < KELIM.length; i += 1) {
      const drawn = drawKeli(rng, held);
      expect(drawn, `the pool ran dry after ${i} of ${KELIM.length}`).toBeDefined();
      if (!drawn) return;
      expect(held, `${drawn.id} was offered twice`).not.toContain(drawn.id);
      held.push(drawn.id);
    }
    // And once everything is carried there is nothing left to lay, which is
    // what stops a pedestal standing empty at the end of a long climb.
    expect(drawKeli(rng, held)).toBeUndefined();
  });

  /**
   * **The map becomes a shopping list**, which is the whole of what this buys.
   * If every path offered the same vessel there would be nothing to route for.
   */
  it("puts different vessels on different paths of the same day's Tree", () => {
    const seen = new Set<string | undefined>();
    for (const path of TREE_PATHS) {
      const world = buildPath(path, 7, [], 1, false, false, 1, []);
      seen.add(world.entities.find((e) => e.kind === "vessel")?.ref);
    }
    expect(
      seen.size,
      `the whole Tree offers ${seen.size} distinct vessels — there is nothing to route for`,
    ).toBeGreaterThan(5);
  }, 120000);

  /**
   * And it is **the same Tree for everyone today**. Two Scribes who walk the
   * same path on the same day find the same thing on the pedestal; that is what
   * makes it a place rather than a roll, and it is why the old objection about
   * re-rolling does not apply.
   */
  it("puts the same vessel on the same path all day", () => {
    const path = TREE_PATHS[3];
    const once = buildPath(path, 7, [], 1, false, false, 1, []);
    const twice = buildPath(path, 7, [], 1, false, false, 1, []);
    const of = (w: typeof once) => w.entities.find((e) => e.kind === "vessel")?.ref;
    expect(of(once)).toBe(of(twice));
    // A different day is a different Tree.
    const tomorrow = buildPath(path, 8, [], 1, false, false, 1, []);
    expect(of(tomorrow)).toBeDefined();
  }, 60000);

  /**
   * **And it stays there while a hand fills up around it.**
   *
   * The draw used to index a list filtered by what was held, so picking
   * anything up anywhere re-ordered the pool and moved every other path's
   * vessel. Nobody could see it while walking into a pedestal took what was on
   * it — the vessel a Scribe never met was free to change. It stops being
   * invisible the moment one can be left standing: leave the Reed, take the
   * Awl two paths later, come back, and the Reed is gone and something else is
   * on its plinth. So the vessel a path holds may only change by being taken.
   */
  it("leaves a vessel where it lies while other vessels are picked up", () => {
    for (const path of TREE_PATHS.slice(0, 10)) {
      const lying = keliOnPath(path, 7, []);
      expect(lying, `${path.id} holds nothing at all`).toBeDefined();
      // Every other vessel taken, one at a time. None of them is this one, so
      // none of them may move it.
      for (const other of KELIM.filter((k) => k.id !== lying!.id)) {
        expect(
          keliOnPath(path, 7, [other.id])?.id,
          `taking the ${other.name} moved what lies on ${path.id}`,
        ).toBe(lying!.id);
      }
      // Taken, it is gone and the path holds something else — the one change
      // that is allowed.
      expect(keliOnPath(path, 7, [lying!.id])?.id).not.toBe(lying!.id);
    }
  });

  /**
   * **The menu and the ground must agree.** `keliOnPath` recreates the draw
   * without building the rung, so the overworld can name what lies on a way out
   * without painting twenty-two worlds — and it is coupled to `buildPath` by
   * the order of two lines. If a line moves, the map starts promising things
   * that are not there, which is worse than promising nothing.
   */
  it("names on the map exactly what the pedestal holds", () => {
    for (const path of TREE_PATHS.slice(0, 8)) {
      for (const held of [[], ["ner"], ["ner", "kulmus", "deyo"]]) {
        const world = buildPath(path, 7, [], 1, false, false, 1, held);
        const onGround = world.entities.find((e) => e.kind === "vessel")?.ref;
        expect(keliOnPath(path, 7, held)?.id, `${path.id} holding [${held.join(",")}]`).toBe(
          onGround,
        );
      }
    }
  }, 120000);

  /**
   * Two climbs of the same day, walking different ways, end up made of
   * different things. This is the assertion the whole change exists to satisfy.
   */
  it("makes two routes into two different Scribes", () => {
    const gather = (paths: readonly (typeof TREE_PATHS)[number][]) => {
      const held: string[] = [];
      for (const path of paths) {
        const world = buildPath(path, 7, [], 1, false, false, 1, held);
        const found = world.entities.find((e) => e.kind === "vessel")?.ref;
        if (found && !held.includes(found)) held.push(found);
      }
      return held;
    };
    const byPillar = gather(TREE_PATHS.slice(0, 6));
    const byOuter = gather(TREE_PATHS.slice(10, 16));
    expect(byPillar.length, "one route found nothing").toBeGreaterThan(2);
    expect(byOuter.length, "the other route found nothing").toBeGreaterThan(2);
    expect(byPillar, "both routes make the same Scribe").not.toEqual(byOuter);
    // And they are made of different things, not the same things reordered.
    const shared = byPillar.filter((id) => byOuter.includes(id)).length;
    expect(shared, "the two routes carry the same vessels").toBeLessThan(byPillar.length);
  }, 120000);
});

/**
 * **The pedestal offers.**
 *
 * Walking into a vessel used to take it, and that one line decided more than it
 * looked like: nothing in the pool could ever cost anything, because a cost you
 * cannot decline is not a bargain but a tax, and a Scribe who wanted to stay
 * light had no way to say so. Now the plate goes up and the answer is theirs.
 *
 * Three things have to hold, and each of them is a way the feature quietly
 * fails: the offer must fire on *arriving* rather than on touching, or a
 * declined plate reappears on the next tick and there is no way out of the
 * room; the pedestal must keep what was refused, or "leave it" means "destroy
 * it"; and coming back must offer it again, or it means "never".
 *
 * **And it has to be here rather than in the harness.** `tools/playtest.mjs`
 * was tried first and cannot do it: its probe steers by the distance field to
 * the exit, and a pedestal stands in a niche a tile above the floor that a
 * Scribe climbs into on purpose. Four scripts across three rungs walked
 * straight past one — twice over the whole width of a region — which is the
 * design working and the harness being the wrong instrument. What a browser
 * did verify is the overworld's side of it: the map names each way out's
 * vessel and what it does, so a pedestal is a decision made before the walk as
 * well as at the plinth.
 */
describe("a vessel offered rather than taken", () => {
  const ctx: StepContext = { verbs: [], graces: [] };

  /** A rung with a pedestal on it, and the Scribe stood on top of the pedestal. */
  function atAPedestal() {
    const world = buildRegion(3, 91);
    const pedestal = world.entities.find((e) => e.kind === "vessel");
    expect(pedestal, "region three lays no vessel, so nothing was measured").toBeDefined();
    const offered: string[] = [];
    // Nothing else in reach, so only the pedestal can raise anything.
    world.entities = [pedestal!];
    world.husks = [];
    pedestal!.x = world.player.x;
    pedestal!.y = world.player.y;
    return { world, pedestal: pedestal!, offered, onVessel: (id: string) => offered.push(id) };
  }

  it("offers once on arriving, not once a tick", () => {
    const { world, pedestal, offered, onVessel } = atAPedestal();
    for (let i = 0; i < 30; i += 1) {
      step(world, NO_INPUT, { ...ctx, onVessel });
      pedestal.x = world.player.x;
      pedestal.y = world.player.y;
    }
    expect(offered).toEqual([pedestal.ref]);
  });

  it("leaves what was refused standing on its plinth", () => {
    const { world, pedestal, onVessel } = atAPedestal();
    step(world, NO_INPUT, { ...ctx, onVessel });
    expect(pedestal.taken, "declining emptied the pedestal").toBeFalsy();
  });

  it("offers again to a Scribe who walks away and comes back", () => {
    const { world, pedestal, offered, onVessel } = atAPedestal();
    step(world, NO_INPUT, { ...ctx, onVessel });
    // Away — far enough that nothing overlaps — and then back.
    pedestal.x = world.player.x + TILE_SIZE * 20;
    step(world, NO_INPUT, { ...ctx, onVessel });
    pedestal.x = world.player.x;
    pedestal.y = world.player.y;
    step(world, NO_INPUT, { ...ctx, onVessel });
    expect(offered, "leaving a vessel meant never rather than not yet").toHaveLength(2);
  });

  it("stops offering what has been taken", () => {
    const { world, pedestal, offered, onVessel } = atAPedestal();
    step(world, NO_INPUT, { ...ctx, onVessel });
    // What the page does on a yes.
    pedestal.taken = true;
    pedestal.active = false;
    for (let i = 0; i < 10; i += 1) step(world, NO_INPUT, { ...ctx, onVessel });
    expect(offered).toHaveLength(1);
  });
});

/**
 * **What a vessel costs.**
 *
 * For most of this pool's life every object was an improvement — twenty ways
 * for a number to get bigger — and the reason was structural rather than
 * timid: walking into a pedestal took what was on it, so a vessel with a real
 * downside would have been a tax collected off a Scribe who never agreed to
 * pay it. Once a pedestal can be walked past, a cost becomes a question, and a
 * question is the thing an item pool is actually for.
 *
 * So: about a quarter of them must give something up, none of them may be all
 * cost, and — because it is the same idea from the other side — each of the
 * four behaviours must be carried by something a climb can actually find.
 *
 * Measured off the folded numbers rather than a list of ids kept by hand,
 * which would be a list that goes stale the first time a vessel is retuned.
 */
describe("what a vessel costs", () => {
  /** Which way is up, for everything a vessel can touch. */
  const BETTER: Record<string, 1 | -1> = {
    bite: 1,
    reach: 1,
    cooldown: -1,
    speed: 1,
    lamps: 1,
    iframes: 1,
    light: 1,
  };
  const NOTHING = powersFrom([]);

  /** What this vessel gives up, and what it gives, held on its own. */
  function ledger(id: string): { gains: string[]; costs: string[] } {
    const alone = powersFrom([id]) as unknown as Record<string, number | boolean>;
    const base = NOTHING as unknown as Record<string, number | boolean>;
    const gains: string[] = [];
    const costs: string[] = [];
    for (const [knob, better] of Object.entries(BETTER)) {
      const moved = Math.sign((alone[knob] as number) - (base[knob] as number));
      if (moved === 0) continue;
      (moved === better ? gains : costs).push(knob);
    }
    // A behaviour is a gain wherever it is not a price. Weight is the price.
    for (const flag of ["pierces", "bounces", "homing", "splits"]) {
      if (alone[flag]) gains.push(flag);
    }
    if (alone.arcs) costs.push("arcs");
    return { gains, costs };
  }

  it("makes at least a quarter of the pool give something up", () => {
    const costly = KELIM.filter((k) => ledger(k.id).costs.length > 0);
    expect(
      costly.length,
      `only ${costly.length} of ${KELIM.length} vessels cost anything — the pool is twenty improvements`,
    ).toBeGreaterThanOrEqual(Math.ceil(KELIM.length / 4));
  });

  it("never asks for a price without paying one", () => {
    for (const keli of KELIM) {
      const { gains, costs } = ledger(keli.id);
      if (costs.length === 0) continue;
      expect(
        gains,
        `the ${keli.name} costs ${costs.join(", ")} and gives nothing back`,
      ).not.toEqual([]);
    }
  });

  /**
   * And a cost has to be paid in a **different currency** from the gift, or it
   * is not a trade — it is a smaller number in the same column, which a Scribe
   * cannot reason about and would never decline.
   */
  it("charges in a currency other than the one it gives", () => {
    for (const keli of KELIM) {
      const { gains, costs } = ledger(keli.id);
      for (const cost of costs) {
        expect(gains, `the ${keli.name} pays for ${cost} in ${cost}`).not.toContain(cost);
      }
    }
  });

  /**
   * The other half of the same change: a behaviour nothing carries is a branch
   * in `stepMarks` no climb will ever reach, which `marks.test.ts` would go on
   * passing forever. This is what ties the reducer to the pool.
   */
  it("puts every behaviour on something a climb can find", () => {
    for (const flag of ["bounces", "homing", "splits", "arcs"] as const) {
      const carriers = KELIM.filter((k) => k.effect[flag] || k.synergy?.effect[flag]);
      expect(carriers.length, `nothing in the pool ${flag}`).toBeGreaterThan(0);
      // And a mark thrown by a Scribe holding it actually gets it.
      expect(markPowers([], [], [carriers[0].id])[flag], `${carriers[0].id} does not reach the mark`).toBe(
        true,
      );
    }
  });

  /** Nothing is lent to a Scribe carrying nothing — the mark the game had. */
  it("lends no behaviour to an empty hand", () => {
    const bare = markPowers([], [], []);
    expect([bare.bounces, bare.homing, bare.splits, bare.arcs]).toEqual([false, false, false, false]);
  });

  /**
   * And what the map and the plate say about a vessel is read off these same
   * numbers, so it cannot promise what the vessel stopped doing.
   */
  it("says what each vessel does, in its own numbers", () => {
    for (const keli of KELIM) {
      const said = describeEffect(keli.effect);
      expect(said.length, `the ${keli.name} describes itself as nothing`).toBeGreaterThan(5);
      if (ledger(keli.id).costs.length > 0) {
        expect(said, `the ${keli.name} hides what it costs`).toContain("but");
      }
    }
  });
});
