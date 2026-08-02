import { describe, expect, it } from "vitest";
import { lettersOnEntering, TOTAL_REGIONS } from "../regions";
import { buildRegion, FLOOR_ROWS, verbsOf } from "./build";
import { routeTo } from "./route";
import { TILE_SIZE } from "./tiles";

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
 * It is asked **with the floors on**, which is the point. `rowsFor` still
 * returns one, so nothing here is what ships today; `FLOOR_ROWS` is the shape
 * that will, and this is what makes turning it on a decision about the driver
 * rather than a leap of faith. Building this graph is also what found the fault
 * in `sheer-face` — a screen crossed by standing on top of a wall, which needs
 * open sky above it and does not have any on a lower storey.
 */

const SEEDS = [3, 91, 555, 12345, 777, 40404, 1, 2, 8, 99, 1000, 65535];

describe("the way out", () => {
  it("exists on every rung and every seed, with the floors on", () => {
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

  it("still exists when a rung is one row, which is what ships", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
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
  it("grants only the reach the letters held actually buy", () => {
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
