import { describe, expect, it } from "vitest";
import { abilities } from "./abilities";
import {
  describeEffect,
  drawKeli,
  keliById,
  keliFor,
  KELIM,
  POOL_TODAY,
  poolFor,
  powersFrom,
  synergiesIn,
} from "./items";
import { markPowers } from "./combat";
import { makeRng } from "./rng";
import { TREE_PATHS } from "./tree";
import { TOTAL_REGIONS } from "./regions";
import { buildPath, buildRegion, keliOnPath, setTile } from "./world/build";
import { step, type StepContext } from "./world/step";
import { Tile, TILE_SIZE } from "./world/tiles";
import { NO_INPUT, type World } from "./world/types";

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
      // The behaviours. They widen what a vessel may touch and not what it may
      // *grant*: the assertion below is unchanged, and it is the rule.
      "bounces",
      "homing",
      "splits",
      "arcs",
      // And six more, which is the point of them. Fifteen of the twenty used to
      // be the same four knobs at different settings — six light-givers, five
      // that lengthened the moment after a hit, five that added a lamp — so a
      // second one of a kind was a bigger number and never a different idea.
      // Each of these comes out of the object's own line rather than out of a
      // gap in a table.
      "lingers",
      "returns",
      "heavy",
      "spared",
      "keeps",
      "relights",
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

  /**
   * And a behaviour has to be *said*, not merely had. This is the historical
   * failure mode of this codebase from the other side: `describeEffect` walks a
   * hand-written list of keys, so a vessel can quietly gain a behaviour whose
   * plate goes on reporting only its scalars — a Scribe reads "+60% grace after
   * a hit" and never learns the first blow of the rung is free.
   */
  it("names every behaviour a vessel can carry, and not only its numbers", () => {
    const behaviours = [
      "pierces",
      "bounces",
      "homing",
      "splits",
      "arcs",
      "lingers",
      "returns",
      "heavy",
      "spared",
      "keeps",
      "relights",
    ] as const;
    for (const flag of behaviours) {
      expect(describeEffect({ [flag]: true }), `a vessel that ${flag} says nothing of it`).not.toBe(
        "",
      );
    }
    // And on the real objects, where the scalars could have drowned it out.
    for (const keli of KELIM) {
      const carried = behaviours.filter((f) => keli.effect[f]);
      if (carried.length === 0) continue;
      const said = describeEffect(keli.effect);
      const bare = describeEffect(
        Object.fromEntries(Object.entries(keli.effect).filter(([k]) => !carried.includes(k as never))),
      );
      expect(said, `the ${keli.name} reads the same with its behaviours as without`).not.toBe(bare);
    }
  });
});

/**
 * **Twelve of the twenty, and which twelve is the day's business.**
 *
 * The pool above answers *where* a vessel lies. This answers *how many exist at
 * all*, which is the question the pool did not have an answer to: twenty
 * objects against twenty-two paths meant a Scribe who walked the Tree finished
 * every climb holding the whole game, and two finished climbs differed in the
 * route and in nothing that route was for.
 *
 * So the day lays twelve. A full tour leaves eight of them unmet — and the
 * eight are the day's, not a roll, because the seed is the Hebrew date. What a
 * Scribe cannot have today is a fact about today.
 */
describe("the twelve the day lays out", () => {
  const DAY = 7;
  const idsOf = (seed: number) => poolFor(seed).map((k) => k.id);

  it("lays fewer than the game has", () => {
    expect(poolFor(DAY)).toHaveLength(POOL_TODAY);
    expect(
      POOL_TODAY,
      "the day lays the whole game, so a tour ends holding everything",
    ).toBeLessThan(KELIM.length);
    // And is deep enough that a tour is not a formality either.
    expect(POOL_TODAY).toBeGreaterThan(8);
  });

  it("is the same twelve all day and a different twelve tomorrow", () => {
    expect(idsOf(DAY)).toEqual(idsOf(DAY));
    const today = new Set(idsOf(DAY));
    const differs = [8, 9, 10, 11].some((d) => idsOf(d).some((id) => !today.has(id)));
    expect(differs, "every day lays the same twelve").toBe(true);
  });

  it("is uniform across the Tree — one pool, not one per path", () => {
    // Which twelve exist is a fact about the day; only *where* each one lies is
    // a fact about a path. Everything any path can offer is in the day's pool.
    const pool = new Set(idsOf(DAY));
    for (const path of TREE_PATHS) {
      const lying = keliOnPath(path, DAY, []);
      expect(pool.has(lying!.id), `${path.id} offers ${lying?.id}, which is not today's`).toBe(true);
    }
  });

  /**
   * The measurement the phase exists for: walk the whole Tree, take everything
   * offered, and end holding twelve — so eight of the twenty were never on the
   * board. Done through `keliOnPath` rather than twenty-two built rungs; the
   * test above holds the two against each other, which is what makes that fair.
   */
  it("leaves a Scribe who walks every path holding twelve of the twenty", () => {
    const held: string[] = [];
    for (const path of TREE_PATHS) {
      const lying = keliOnPath(path, DAY, held);
      if (lying && !held.includes(lying.id)) held.push(lying.id);
    }
    expect(held.length, "a full tour of the Tree found fewer than the day laid").toBe(POOL_TODAY);
    expect(
      KELIM.length - held.length,
      "a full tour ends holding the whole game",
    ).toBeGreaterThanOrEqual(KELIM.length - POOL_TODAY);
  });

  /**
   * And a spent pool leaves no bare plinths. `buildPath` lays the vessel room
   * only when there is a vessel for it, so the twenty-second path of a
   * thorough tour is a path with one fewer screen — not a walk to an empty
   * pedestal, which is the shape this failure would otherwise take.
   */
  it("stops offering rather than offering nothing", () => {
    const spent = idsOf(DAY);
    for (const path of TREE_PATHS.slice(0, 6)) {
      expect(keliOnPath(path, DAY, spent), `${path.id} still offers something`).toBeUndefined();
    }
    const world = buildPath(TREE_PATHS[0], DAY, [], 1, false, false, 1, spent);
    expect(
      world.entities.filter((e) => e.kind === "vessel"),
      "a spent day still lays a pedestal",
    ).toHaveLength(0);
  }, 60000);

  it("still offers a room to a Scribe carrying nothing", () => {
    for (const path of TREE_PATHS) {
      expect(keliOnPath(path, DAY, []), `${path.id} offers nothing to an empty hand`).toBeDefined();
    }
  });
});

/**
 * **The six that are not a bigger number.**
 *
 * Fifteen of the twenty vessels were the same handful of knobs at different
 * settings — six changed what light is worth, six a cooldown, five the lamps,
 * five the moment after a hit, four the reach — so a second object of a kind
 * was never a second idea, and a pedestal asked "is this number bigger?" and
 * nothing else.
 *
 * Six of them were given a behaviour instead, each read off the object's own
 * authored line rather than out of a gap in a table, and each one deliberately
 * *not* a verb: nothing here does what a letter does, which is the rule the
 * first test in this file keeps.
 *
 * What is asserted is the thing a scalar cannot do. Every case runs the same
 * arrangement twice, with the vessel and without it, because half of it alone
 * would only prove the reducer ran. The two that belong to a thrown mark are in
 * `marks.test.ts`, beside the four that came before them; the four here belong
 * to the body.
 */
describe("what a vessel does that a bigger number cannot", () => {
  const ctx: StepContext = { verbs: [], graces: [] };

  /** A floor, a Scribe stood on it, and nothing else in the room. */
  function room(): World {
    const world = buildRegion(1, 7, 1, false, 1);
    world.tiles.fill(Tile.Empty);
    world.entities = [];
    world.husks = [];
    world.marks = [];
    world.rooms = [];
    for (let x = 0; x < world.width; x += 1) setTile(world, x, world.height - 1, Tile.Stone);
    world.player.x = 6 * TILE_SIZE;
    world.player.y = (world.height - 1) * TILE_SIZE - world.player.h;
    world.player.vx = 0;
    world.player.vy = 0;
    return world;
  }

  /** One klipah of the ordinary sort, laid on top of the Scribe so it lands. */
  function blow(world: World): void {
    const source = buildRegion(5, 91, 1, false, 1).husks.find((h) => h.kind !== "delilah");
    world.husks = [
      { ...source!, x: world.player.x, y: world.player.y, vx: 0, vy: 0, shells: 9, cooldown: 0 },
    ];
  }

  /** Lands one blow on a Scribe holding these, and says what it did. */
  function struck(items: string[], lamps = 5): { world: World; before: number } {
    const world = room();
    world.player.lamps = lamps;
    world.player.iframes = 0;
    blow(world);
    const before = world.player.lamps;
    step(world, NO_INPUT, { ...ctx, items });
    return { world, before };
  }

  /**
   * **The Wrapper — the first blow of a rung takes no lamp.** Its `iframes`
   * already buy a longer moment *after* a hit; this is the hit itself, once,
   * and then spent for the rung. The difference between the first mistake and
   * the second, rather than a lamp that regrows.
   */
  it("wraps the first blow of a rung, and only the first", () => {
    const { world, before } = struck(["mappah"]);
    expect(world.player.lamps, "the wrapping was not there for the first blow").toBe(before);
    expect(world.spared, "nothing was spent, so it will spare forever").toBe(true);
    // Spent. The second blow is an ordinary blow.
    world.player.iframes = 0;
    world.husks[0].cooldown = 0;
    step(world, NO_INPUT, { ...ctx, items: ["mappah"] });
    expect(world.player.lamps, "the wrapping spared a second blow too").toBe(before - 1);
    // And a bare Scribe pays for the first one.
    expect(struck([]).world.player.lamps).toBe(before - 1);
  });

  /**
   * **The Lampstand — the middle light does not go out.** A different mercy
   * from the Wrapper's: that one spends itself on whatever comes first, and
   * this one waits at the bottom for the blow that would end the climb.
   */
  it("refuses the last lamp once, and lets it go the second time", () => {
    const { world } = struck(["menorah"], 1);
    expect(world.out, "the last lamp went out with the Lampstand held").toBeFalsy();
    expect(world.player.lamps, "the Lampstand let the last lamp go").toBe(1);
    expect(world.relit).toBe(true);
    world.player.iframes = 0;
    world.husks[0].cooldown = 0;
    step(world, NO_INPUT, { ...ctx, items: ["menorah"] });
    expect(world.out, "the Lampstand kept relighting").toBe(true);
    // And without it, the same blow ends the same rung.
    expect(struck([], 1).world.out).toBe(true);
  });

  /**
   * **The Hide is heavy.** Not a lamp saved but a body not thrown — which over
   * a basin is the difference between a lamp and a lamp and a veiling.
   */
  it("halves what a blow throws a Scribe", () => {
    const thrown = (items: string[]) => {
      const { world } = struck(items);
      return Math.abs(world.player.vx);
    };
    const light = thrown([]);
    expect(light, "nothing threw the Scribe at all, so nothing was measured").toBeGreaterThan(0);
    expect(thrown(["gevil"]), "the Hide weighs nothing").toBeCloseTo(light / 2, 5);
  });

  /**
   * **The Case — a veiling spills no light.** A veiling still costs the time and
   * the ground, which is what a veiling is for; what it stops costing is the
   * light already gathered. The one vessel that answers the only price the
   * terrain is allowed to charge.
   */
  it("keeps the light through a veiling that would otherwise spill it", () => {
    const veiled = (items: string[]) => {
      const world = room();
      world.or = 40;
      setTile(world, Math.floor(world.player.x / TILE_SIZE), world.height - 2, Tile.Thorn);
      step(world, NO_INPUT, { ...ctx, items });
      expect(world.veilings, "nothing was veiled, so nothing was measured").toBe(1);
      return world.or;
    };
    expect(veiled([]), "a veiling cost a bare Scribe nothing").toBeLessThan(40);
    expect(veiled(["nartik"]), "the Case spilled the light anyway").toBe(40);
  });

  /**
   * And the other half of the same change, as with the first four: a behaviour
   * nothing carries is a branch no climb reaches, and one that does not survive
   * the fold from vessel to `Powers` is a branch no climb reaches either.
   */
  it("puts all six on something a climb can find, and lends them to nobody else", () => {
    const flags = ["lingers", "returns", "heavy", "spared", "keeps", "relights"] as const;
    for (const flag of flags) {
      const carriers = KELIM.filter((k) => k.effect[flag] || k.synergy?.effect[flag]);
      expect(carriers.length, `nothing in the pool ${flag}`).toBeGreaterThan(0);
      expect(
        powersFrom([carriers[0].id])[flag],
        `${carriers[0].id} does not reach the Scribe`,
      ).toBe(true);
      expect(powersFrom([])[flag], `an empty hand ${flag}`).toBeFalsy();
    }
    // The two that belong to a mark have to survive the second fold as well.
    for (const flag of ["lingers", "returns"] as const) {
      const carrier = KELIM.find((k) => k.effect[flag])!;
      expect(markPowers([], [], [carrier.id])[flag], `${carrier.id} does not reach the mark`).toBe(
        true,
      );
    }
  });
});
