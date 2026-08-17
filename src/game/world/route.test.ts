import { describe, expect, it } from "vitest";
import { lettersOnEntering, TOTAL_REGIONS } from "../regions";
import { makeRng, randomInt } from "../rng";
import {
  crossesAbyss,
  lettersFrom,
  nodeOf,
  otherEnd,
  pathsFrom,
  TREE_PATHS,
  type TreePath,
} from "../tree";
import type { SefirahId } from "../../types/letter";
import { buildPath, buildRegion, FLOOR_ROWS, verbsOf } from "./build";
import { routeTo } from "./route";
import { openWordGate } from "./step";
import { Tile, TILE_SIZE } from "./tiles";

/**
 * **The no-soft-lock guarantee, in two dimensions.**
 *
 * `traversal.test.ts` asks whether a bot gets to the way out, and that is two
 * questions wearing one coat: is there a way, and can this particular driver
 * drive it. For most of this game's life the two could not be told apart, so
 * every stall had to be investigated by hand to find out whether the ground was
 * broken or the bot was clumsy — and the answer was almost always the bot.
 *
 * This asks the first question on its own. `routeTo` builds the graph of the
 * places a body can actually stand and the moves that get between them — a
 * step, a leap, a fall, a wall caught, a vine — with the reach of each taken
 * from what the letters held actually buy, measured against the simulation
 * rather than reasoned about. Then it floods the cost to the exit backwards
 * through it. If the Scribe's own tile has a finite cost, a way exists.
 *
 * It is asked **with the floors on**, and it is what made turning them on a
 * decision rather than a leap of faith. Building this graph is what found the
 * fault in `sheer-face` — a screen crossed by standing on top of a wall, which
 * needs open sky above it and has none on a lower storey — and it is what
 * caught the graph itself inventing a fourteen-tile leap that arrived at the
 * height it left from, which is not a jump, because a jump falls.
 */

const SEEDS = [3, 91, 555, 12345, 777, 40404, 1, 2, 8, 99, 1000, 65535];

/**
 * **The graph cannot spell, and must not have to.**
 *
 * Over the Abyss the way out stands behind a Word-Gate — see `abyss.test.ts`,
 * which is where that barrier is proved to be a real one. A barrier that opens
 * on knowledge is not ground, so it is dissolved before the terrain is asked
 * about, exactly the way the probe is handed every verb it is entitled to.
 *
 * Say plainly what this means, because the next reader will otherwise take the
 * guarantee to cover more than it does: **on the five crossings, what is
 * guaranteed here is a way from the start to the gate and from the gate to the
 * exit.** Whether the Scribe can answer is a different question, asked in
 * `abyss.test.ts`, and answered there by the machine that only ever poses a
 * root the Scribe already holds the letters for.
 */
function ground(path: TreePath, seed: number, held: readonly string[], festival?: "sukkot" | "hanukkah") {
  const world = buildPath(
    path, seed, held, 1, false, false, 1, [], 0, [],
    festival ? [festival] : [],
  );
  if (crossesAbyss(path)) openWordGate(world, "The gate opens.");
  return world;
}


/**
 * These carry their own budgets, for the reason `traversal.test.ts` records:
 * flooding a graph over ten regions and twelve seeds sits just under vitest's
 * five-second default, which is the absence of a budget rather than a choice,
 * and it fails intermittently the moment anything else is using the machine. A
 * timing flake in a deterministic test reads as a broken level.
 */
describe("the way out", () => {
  it("exists on every rung and every seed, with the floors on", { timeout: 60000 }, () => {
    const lost: string[] = [];
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed, 1, false, FLOOR_ROWS(region));
        const route = routeTo(world, verbsOf(lettersOnEntering(region)));
        if (!route.usable) lost.push(`${region}/${seed}`);
      }
    }
    expect(
      lost,
      `no way from the start to the exit on ${lost.length} of ${TOTAL_REGIONS * SEEDS.length}: ${lost.join(", ")}`,
    ).toEqual([]);
  });

  /**
   * And on a corridor, which is what the foot of the Tree still is — and what
   * every rung was before the rooms. A rung built flat must stay sound, or the
   * teaching ground could break without anything noticing.
   */
  it("still exists when a rung is built flat", { timeout: 60000 }, () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed, 1, false, 1);
        const route = routeTo(world, verbsOf(lettersOnEntering(region)));
        expect(route.usable, `region ${region} seed ${seed}`).toBe(true);
      }
    }
  });

  it("carries the taught porch of Malchut, for a Scribe holding nothing", () => {
    for (const seed of SEEDS) {
      const world = buildRegion(1, seed, 1, true);
      expect(routeTo(world, []).usable, `seed ${seed}`).toBe(true);
    }
  });

  /**
   * The graph is only worth anything if it can say **no**. A route finder that
   * is merely generous would report every rung sound including a broken one, so
   * this walls the exit off and checks that it notices.
   */
  it("says so when there is no way", () => {
    const world = buildRegion(4, 3);
    const exit = world.entities.find((e) => e.kind === "exit");
    expect(exit).toBeDefined();
    if (!exit) return;
    const ex = Math.floor(exit.x / TILE_SIZE);
    for (let y = 0; y < world.height; y += 1) {
      for (const x of [ex - 3, ex - 2]) world.tiles[y * world.width + x] = 1;
    }
    expect(routeTo(world, verbsOf(lettersOnEntering(4))).usable).toBe(false);
  });

  /**
   * And that what it grants is what the letters buy. A Scribe holding nothing
   * cannot cross the ground the upper Tree is built from — if the empty-handed
   * graph reached the exit of Keter, the envelope would be fiction.
   */
  it("grants only the reach the letters held actually buy", { timeout: 60000 }, () => {
    let barred = 0;
    for (let region = 5; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS.slice(0, 6)) {
        const world = buildRegion(region, seed, 1, false, FLOOR_ROWS(region));
        if (!routeTo(world, []).usable) barred += 1;
      }
    }
    expect(barred, "empty-handed, the upper Tree was crossable everywhere").toBeGreaterThan(0);
  });
});

/**
 * **The same guarantee, over the Tree.**
 *
 * The one above asks it of a line: region *n*, built for a Scribe holding
 * `lettersOnEntering(n)`. That was the whole shape of the climb, and it made
 * the question easy in a way that was hiding things — the letters were a
 * function of the index, so the generator was only ever asked for terrain
 * against ten letter sets, always the same ten, always in the same order.
 *
 * A path is a rung now. Twenty-two of them, walked in whatever order a Scribe
 * chooses, and the letters they hold when they step onto one are whatever the
 * route to it happened to pay. So the guarantee changes shape: not "region *n*
 * is crossable holding what region *n* gives", but **"every path is crossable
 * holding whatever the route to it gave"** — and it has to be re-earned, not
 * inherited.
 *
 * It was not met on the first asking: three hundred and twenty-nine of eight
 * hundred and eighty wanders came out with no way through. Almost all of it was
 * the instrument (see the head of `route.ts`), and three screens were genuinely
 * under-declared. `chunks.test.ts` now holds the screens to what they say they
 * need, which is the local form of this; this is the global one, and it is what
 * decided that the Tree could be built at all.
 */
describe("the way out, on the Tree", () => {
  /** A seeded stroll: from Malchut, take any path out of wherever you stand. */
  function wander(seed: number, steps: number) {
    const rng = makeRng(seed >>> 0);
    let at: SefirahId = "malchut";
    const legs: { path: TreePath; held: string[] }[] = [];
    const walked: string[] = [];
    for (let i = 0; i < steps; i += 1) {
      const out = pathsFrom(at);
      const path = out[randomInt(rng, out.length)];
      // What the Scribe holds *stepping onto* this path — the letter it pays is
      // not theirs until they have crossed it.
      legs.push({ path, held: lettersFrom(walked) });
      walked.push(path.id);
      at = otherEnd(path, at);
    }
    return legs;
  }

  it("exists on every path, holding only what the route there paid", () => {
    const lost: string[] = [];
    let walked = 0;
    for (let seed = 1; seed <= 30; seed += 1) {
      for (const { path, held } of wander(seed * 7919, 22)) {
        walked += 1;
        const world = ground(path, seed, held);
        if (!routeTo(world, verbsOf(held)).usable) {
          lost.push(`${path.id} seed ${seed} holding [${held.join(",") || "nothing"}]`);
        }
      }
    }
    expect(walked, "the wander walked nowhere").toBeGreaterThan(600);
    expect(
      lost.slice(0, 8),
      `no way across ${lost.length} of ${walked} paths walked`,
    ).toEqual([]);
  }, 120000);

  /**
   * **The figured stones may all give way at once, and the way out is still
   * there** — the guard that lets a lie open onto a *drop*.
   *
   * Until P13d, `layMaskit` demanded hewn stone directly beneath every trap, so
   * springing one was always a step down of a single tile. That rule was a
   * geometric proxy for a property, and its own comment said the property could
   * not be tested: "a trap that could take a tile out of a floor would be a trap
   * that can invalidate the proof at runtime, which no test could ever catch."
   *
   * It can be caught, and this is the catching of it. The proxy is gone and the
   * property is asserted directly, which is strictly stronger than the rule it
   * replaced — that rule permitted a stone anywhere the geometry looked right
   * and never once asked whether the rung survived it.
   *
   * **Two claims, because they are two different statements.** Taking every
   * stone out at once is the worst case for lost standing room; taking them out
   * one at a time is the case that actually happens, and it is not implied by
   * the first — every figured stone has air above it, so removing one can only
   * ever open a way *down*, and a route that needed such a hole would be a route
   * that exists only while a trap is sprung.
   *
   * What makes the drop safe beyond this is `mendFloor`: forty ticks later the
   * tile is hewn stone again, so even a rung that lost its way for a moment has
   * it back. `ducking.test.ts` holds that half.
   */
  it("keeps the way out when the figured stones give way", () => {
    const lost: string[] = [];
    let rungs = 0;
    let stones = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      for (const { path, held } of wander(seed * 7919, 22)) {
        const world = ground(path, seed, held);
        const verbs = verbsOf(held);
        const at: number[] = [];
        for (let i = 0; i < world.tiles.length; i += 1) {
          if (world.tiles[i] === Tile.Maskit) at.push(i);
        }
        rungs += 1;
        stones += at.length;
        if (at.length === 0) continue;
        const where = `${path.id} seed ${seed}`;
        // One at a time, which is what a Scribe's own weight actually does.
        for (const i of at) {
          world.tiles[i] = Tile.Empty;
          if (!routeTo(world, verbs).usable) lost.push(`${where} — the stone at ${i} alone`);
          world.tiles[i] = Tile.Maskit;
        }
        // And all of them together, for the floor that has nothing left in it.
        for (const i of at) world.tiles[i] = Tile.Empty;
        if (!routeTo(world, verbs).usable) lost.push(`${where} — all ${at.length} at once`);
      }
    }
    expect(rungs, "the wander walked nowhere").toBeGreaterThan(200);
    expect(stones, "no figured stone was laid anywhere, so this proves nothing").toBeGreaterThan(20);
    expect(lost.slice(0, 8), `${lost.length} rungs lost their way out to a sprung stone`).toEqual([]);
  }, 300000);

  /**
   * And the first step in particular, which is the one a Scribe takes holding
   * nothing at all. `tree.test.ts` makes sure that step pays a verb; this makes
   * sure the ground it crosses can be crossed by someone who has none.
   */
  it("carries an empty-handed Scribe out of Malchut, whichever way they turn", () => {
    for (const path of pathsFrom("malchut")) {
      for (const seed of SEEDS) {
        expect(
          routeTo(ground(path, seed, []), []).usable,
          `${path.id} seed ${seed}, holding nothing`,
        ).toBe(true);
      }
    }
  });

  /**
   * The Tree has to *ask* for letters as well as let them through, or the
   * twenty-two are scenery and the order they are taken in means nothing.
   *
   * Note what is built and what is asked, because the obvious version of this
   * test asserts nothing at all: `buildPath(path, seed, [])` lays ground *for*
   * an empty-handed Scribe, and the generator only ever lays screens whose
   * letters are held — so of course they can cross it. Every one of them, every
   * seed. The ground has to be built for a Scribe who has walked the Tree and
   * then offered to one who has not.
   */
  it("bars the upper paths to a Scribe who has gathered nothing", () => {
    const everything = TREE_PATHS.map((p) => p.letter);
    let barred = 0;
    let asked = 0;
    for (const path of TREE_PATHS) {
      // The upper Tree only — the foot is meant to be walkable, and Malchut's
      // own paths are built to be crossed by a Scribe holding nothing at all.
      if (nodeOf[path.ends[0]].row < 3) continue;
      for (const seed of SEEDS.slice(0, 4)) {
        asked += 1;
        if (!routeTo(ground(path, seed, everything), []).usable) barred += 1;
      }
    }
    expect(asked, "no upper paths were asked about").toBeGreaterThan(20);
    expect(barred, `the upper Tree was crossable holding nothing on all ${asked}`).toBeGreaterThan(0);
  }, 60000);
});

/**
 * **Festival ground keeps the guarantee.** The booth and the lamps are laid
 * in place of the ordinary chamber on their days — same envelope to the tile,
 * which the chunk contract already proves — and this is the other half: a way
 * out still exists across every path on a festival day, with the floors on.
 * Fewer seeds than the ordinary sweep because the chamber is one screen of a
 * rung and the envelope is contract-identical; what is being caught here is a
 * booth whose interior ledge or lamps somehow reached the walking line.
 */
describe("the way out, on the days that are not ordinary", () => {
  it("exists on every path on Sukkot and on Hanukkah", { timeout: 120000 }, () => {
    const lost: string[] = [];
    for (const festival of ["sukkot", "hanukkah"] as const) {
      for (const path of TREE_PATHS) {
        for (const seed of [3, 91, 555]) {
          const world = ground(path, seed, TREE_PATHS.map((p) => p.letter), festival);
          const route = routeTo(world, verbsOf(TREE_PATHS.map((p) => p.letter)));
          if (!route.usable) lost.push(`${festival}:${path.id}/${seed}`);
        }
      }
    }
    expect(lost, lost.join(", ")).toEqual([]);
  });
});
