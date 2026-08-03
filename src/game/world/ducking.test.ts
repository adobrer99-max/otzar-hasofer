import { describe, expect, it } from "vitest";
import { buildRegion, setTile } from "./build";
import { step, type StepContext } from "./step";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input, type World } from "./types";
import { regions } from "../regions";

/**
 * **Ducking, and what the Coil actually buys.**
 *
 * For most of this game's life `down` did nothing at all unless the Scribe was
 * carrying Tet. That put a *body* verb behind a letter, which is the one thing
 * this alphabet is not for: the twenty-two say what a body can reach, not
 * whether it has knees. Anybody can duck now, and Tet buys the thing it always
 * said it bought — folding small enough to get through a low passage.
 *
 * Which leaves one collision to keep an eye on, and it is the reason this file
 * exists. `down` already meant *drop through the ledge you are standing on*,
 * and both readings of one key have to go on working: on a ledge it drops, on
 * anything else it ducks.
 */

const bare: StepContext = { verbs: [], graces: [] };
const coiled: StepContext = { verbs: [], graces: ["crawl"] };

/** An empty room with a stone floor, and the Scribe standing on it. */
function room(): World {
  const world = buildRegion(1, 7, 1, false, 1);
  world.tiles.fill(Tile.Empty);
  world.entities = [];
  world.husks = [];
  world.klipot = [];
  world.marks = [];
  world.rooms = [];
  for (let x = 0; x < world.width; x += 1) setTile(world, x, world.height - 1, Tile.Stone);
  world.player.x = 6 * TILE_SIZE;
  world.player.y = (world.height - 1) * TILE_SIZE - world.player.h;
  world.player.vx = 0;
  world.player.vy = 0;
  return world;
}

const run = (world: World, ctx: StepContext, ticks: number, input: Partial<Input> = {}) => {
  for (let i = 0; i < ticks; i += 1) step(world, { ...NO_INPUT, ...input }, ctx);
};

describe("ducking", () => {
  it("is anybody's, carrying nothing at all", () => {
    const world = room();
    run(world, bare, 4, { down: true });
    expect(world.player.crouching, "a Scribe with no letters cannot duck").toBe(true);
    expect(world.player.crawling, "ducking alone folded them small").toBe(false);
  });

  it("folds a Scribe small only once the Coil is carried", () => {
    const world = room();
    run(world, coiled, 4, { down: true });
    expect(world.player.crouching).toBe(true);
    expect(world.player.crawling).toBe(true);
  });

  it("stops the moment down is let go, and never in the air", () => {
    const world = room();
    run(world, bare, 4, { down: true });
    run(world, bare, 2);
    expect(world.player.crouching).toBe(false);
    // Jumped, and holding down: nothing to duck against.
    run(world, bare, 6, { jump: true, jumpHeld: true, down: true });
    expect(world.player.onGround).toBe(false);
    expect(world.player.crouching, "ducked in mid-air").toBe(false);
  });

  /** The point of it: a duck is shorter, and slower. */
  it("makes a ducking Scribe shorter and slower than a walking one", () => {
    const walk = room();
    run(walk, bare, 40, { right: true });
    const duck = room();
    run(duck, bare, 40, { right: true, down: true });
    expect(duck.player.x, "a duck was as fast as a walk").toBeLessThan(walk.player.x);
  });

  /**
   * **The low passage still asks for Tet.** This is the whole no-soft-lock
   * concern about making ducking free: every screen in the library that
   * declares `crawl` gates on `Tile.LowGap`, and if a duck alone got a Scribe
   * through one, all of them would have quietly stopped asking.
   */
  it("keeps the low passage shut to a Scribe without the Coil", () => {
    const through = (ctx: StepContext) => {
      const world = room();
      const wall = 12;
      for (let y = 0; y < world.height - 1; y += 1) setTile(world, wall, y, Tile.Stone);
      // One tile of low passage at the floor, which is the whole of the way on.
      setTile(world, wall, world.height - 2, Tile.LowGap);
      run(world, ctx, 200, { right: true, down: true });
      return world.player.x > wall * TILE_SIZE;
    };
    expect(through(bare), "a plain duck went through a low passage").toBe(false);
    expect(through(coiled), "the Coil did not get through a low passage").toBe(true);
  });

  /** And down on a ledge still drops through it, which it always did. */
  it("drops through a ledge rather than ducking on it", () => {
    const world = room();
    const row = world.height - 6;
    for (let x = 0; x < world.width; x += 1) setTile(world, x, row, Tile.Ledge);
    // Dropped onto it from just above, so the landing is the game's own.
    world.player.y = (row - 3) * TILE_SIZE;
    run(world, bare, 40);
    const stood = world.player.y;
    expect(world.player.onGround, "never landed on the ledge").toBe(true);
    expect(stood, "fell straight through the ledge").toBeLessThan(row * TILE_SIZE);
    run(world, bare, 40, { down: true });
    expect(world.player.y, "down on a ledge ducked instead of dropping").toBeGreaterThan(stood);
  });
});

/**
 * **אֶבֶן מַשְׂכִּית** — the figured stone, and the two rules that make it a trap
 * rather than a way to lose a rung.
 */
describe("the figured stone", () => {
  it("is laid nowhere in the kingdom, and above it over solid ground only", () => {
    expect(regions[0].maskit, "the teaching rung lays traps").toBe(0);
    for (let region = 1; region <= 10; region += 1) {
      for (const seed of [3, 91, 555, 12345]) {
        const world = buildRegion(region, seed);
        let found = 0;
        for (let y = 0; y < world.height; y += 1) {
          for (let x = 0; x < world.width; x += 1) {
            if (world.tiles[y * world.width + x] !== Tile.Maskit) continue;
            found += 1;
            // Air above, so it is walked on — and **stone below**, which is the
            // rule the whole thing stands on: what happens when it gives way is
            // a step down of one tile, never a hole in the world.
            expect(
              world.tiles[(y - 1) * world.width + x],
              `region ${region}: a figured stone with something on top of it`,
            ).toBe(Tile.Empty);
            expect(
              world.tiles[(y + 1) * world.width + x],
              `region ${region}: a figured stone over nothing`,
            ).toBe(Tile.Stone);
          }
        }
        if (region === 1) expect(found, "a trap in Malchut").toBe(0);
      }
    }
  });

  it("gives way under the Scribe, and stands something up out of it", () => {
    const world = room();
    world.klipot = ["cain"];
    const tx = 6;
    const row = world.height - 1;
    setTile(world, tx, row, Tile.Maskit);
    world.player.x = tx * TILE_SIZE;
    run(world, bare, 3);
    expect(world.tiles[row * world.width + tx], "the stone held").toBe(Tile.Empty);
    expect(world.husks.length, "nothing came up out of it").toBe(1);
    expect(world.husks[0].kind).toBe("cain");
  });

  /**
   * **And it closes again.** The reason the trap is allowed to exist at all:
   * `route.test.ts` earns the no-soft-lock guarantee against the painted grid,
   * so a tile that vanished for good would be a trap that can invalidate the
   * proof at runtime, where no test can see it.
   */
  it("closes over as hewn stone once nothing is standing in it", () => {
    const world = room();
    world.klipot = [];
    const tx = 6;
    const row = world.height - 1;
    setTile(world, tx, row, Tile.Maskit);
    world.player.x = tx * TILE_SIZE;
    run(world, bare, 3);
    expect(world.tiles[row * world.width + tx]).toBe(Tile.Empty);
    expect(world.mending.length).toBe(1);
    // Walked away, and given time.
    run(world, bare, 120, { right: true });
    expect(world.tiles[row * world.width + tx], "the floor never closed").toBe(Tile.Stone);
    expect(world.mending).toHaveLength(0);
  });

  it("never closes on top of the Scribe", () => {
    const world = room();
    world.klipot = [];
    const tx = 6;
    // In the *upper* of two floor rows, which is where the builder lays them:
    // what the Scribe does when it gives way is stand one tile lower, and stay
    // in the hole.
    const row = world.height - 2;
    for (let x = 0; x < world.width; x += 1) setTile(world, x, row, Tile.Stone);
    setTile(world, tx, row, Tile.Maskit);
    world.player.y = (row - 1) * TILE_SIZE - world.player.h + TILE_SIZE;
    world.player.x = tx * TILE_SIZE;
    run(world, bare, 200);
    // Stood in it the whole time: it waits rather than swallowing them.
    expect(world.tiles[row * world.width + tx]).toBe(Tile.Empty);
    expect(world.mending.length).toBe(1);
  });
});
