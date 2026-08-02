import { beforeEach, describe, expect, it } from "vitest";
import { MARK_HUNT, MARK_SIZE, MARK_TURNS } from "./combat";
import { buildRegion, setTile } from "./world/build";
import { step, type StepContext } from "./world/step";
import { Tile, TILE_SIZE } from "./world/tiles";
import { NO_INPUT, type Husk, type Mark, type World } from "./world/types";

/**
 * **What a mark does, as against how much of it there is.**
 *
 * For most of this game's life every vessel scaled one of four numbers — bite,
 * reach, speed, cooldown — so twenty objects were twenty profiles of the same
 * object, and the only question at a pedestal was whether the number was
 * bigger. Four behaviours were added to make a vessel an idea instead: stone
 * turns a mark, a mark bends after a shell, a broken shell throws shards, a
 * mark has weight.
 *
 * Each of them is a branch inside `stepMarks`, which is exactly the kind of
 * code that reads correct and does nothing — the flag threads through four
 * files before it reaches the branch, and a mark that never bounced would look
 * from the outside like a mark that was never thrown at a wall. So each one is
 * checked here against the reducer, twice: with the behaviour, and without it,
 * on the same arrangement. The pair is the assertion. One alone would only
 * prove the mark moved.
 *
 * The marks are pushed into the world directly rather than thrown by the
 * Scribe. What `throwMark` does with what the vessels come to is
 * `items.test.ts`'s question, and asking it here would mean tying every case
 * to whichever vessel happens to carry the behaviour today.
 */

const ctx: StepContext = { verbs: [], graces: [] };

/**
 * An empty room with a floor: every tile cleared, one row of stone along the
 * bottom, no klipot and no rooms.
 *
 * Built from a real region rather than by hand so every field of `World` is
 * the field the game uses, and then emptied so nothing but what a case places
 * is in it. `rooms` goes for the reason `encounter.test.ts` gives: `stepRooms`
 * recomputes the world's state every tick and would answer about wherever the
 * Scribe is standing, which on a wiped grid is nowhere in particular.
 */
function arena(): World {
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

/** A mark of the Scribe's, at a tile, flying as told. Nothing lent to it. */
function mark(at: { x: number; y: number }, vx: number, vy = 0, extra: Partial<Mark> = {}): Mark {
  return {
    id: "m",
    mine: true,
    x: at.x * TILE_SIZE,
    y: at.y * TILE_SIZE,
    w: MARK_SIZE,
    h: MARK_SIZE,
    vx,
    vy,
    life: 60,
    pierces: false,
    bite: 1,
    draws: false,
    glyph: "א",
    ...extra,
  };
}

/** One klipah, taken from a real region so its shape and shells are the game's. */
function husk(world: World, at: { x: number; y: number }): Husk {
  const source = buildRegion(5, 91, 1, false, 1).husks[0];
  const one: Husk = { ...source, x: at.x * TILE_SIZE, y: at.y * TILE_SIZE, vx: 0, vy: 0, shells: 1 };
  world.husks = [one];
  return one;
}

/** Steps until every mark is spent, or the given ceiling — whichever is first. */
function fly(world: World, ticks = 120): number {
  for (let i = 0; i < ticks; i += 1) {
    step(world, NO_INPUT, ctx);
    if (world.marks.length === 0) return i + 1;
  }
  return ticks;
}

describe("what a vessel can lend a mark", () => {
  let world: World;
  beforeEach(() => {
    world = arena();
  });

  describe("bouncing", () => {
    /** A wall two tiles ahead of where the mark starts, floor to ceiling. */
    function wallAt(column: number): void {
      for (let y = 0; y < world.height; y += 1) setTile(world, column, y, Tile.Stone);
    }

    it("turns a mark that stone would otherwise have stopped", () => {
      wallAt(8);
      world.marks = [mark({ x: 4, y: 10 }, 300, 0, { turns: MARK_TURNS })];
      step(world, NO_INPUT, ctx);
      const bouncing = world.marks[0];
      expect(bouncing, "the bouncing mark was spent before it reached the wall").toBeDefined();
      // Flown into the wall and turned: still alive, now going the other way.
      let ticks = 0;
      while (world.marks[0]?.vx > 0 && ticks < 60) {
        step(world, NO_INPUT, ctx);
        ticks += 1;
      }
      expect(world.marks[0], "the mark died at the wall instead of turning").toBeDefined();
      expect(world.marks[0].vx).toBeLessThan(0);
      expect(world.marks[0].turns).toBe(MARK_TURNS - 1);
    });

    it("stops a plain mark at the same wall", () => {
      wallAt(8);
      world.marks = [mark({ x: 4, y: 10 }, 300)];
      fly(world, 60);
      expect(world.marks, "a plain mark went through stone").toHaveLength(0);
    });

    it("spends its turns and is then stone-stopped like any other", () => {
      // Two walls, so the mark is thrown back and forth and runs out of turns
      // rather than out of life.
      wallAt(8);
      wallAt(2);
      world.marks = [mark({ x: 5, y: 10 }, 500, 0, { turns: MARK_TURNS, life: 600 })];
      const spent = fly(world, 600);
      expect(spent, "a bouncing mark never came to rest").toBeLessThan(600);
      // It died on stone with its turns gone, not by outliving itself.
      expect(spent).toBeLessThan(300);
    });
  });

  describe("hunting", () => {
    /**
     * A shell off the line of flight. A mark thrown flat past it either bends
     * toward it or does not, and the distance at the end of the flight is the
     * only honest way to tell — a mark can bend and still miss.
     */
    function pastAShell(hunts: number): number {
      const w = arena();
      const target = husk(w, { x: 12, y: 6 });
      w.marks = [mark({ x: 4, y: 12 }, 400, 0, { hunts, life: 40 })];
      let closest = Infinity;
      for (let i = 0; i < 40 && w.marks.length > 0; i += 1) {
        step(w, NO_INPUT, ctx);
        // Pinned, because a klipah falls: left alone it drops onto the mark's
        // own line and the harness measures gravity rather than the bend.
        target.x = 12 * TILE_SIZE;
        target.y = 6 * TILE_SIZE;
        target.vx = 0;
        target.vy = 0;
        const m = w.marks[0];
        if (m) closest = Math.min(closest, Math.hypot(m.x - target.x, m.y - target.y));
      }
      return closest;
    }

    it("bends a mark after the nearest shell", () => {
      expect(pastAShell(MARK_HUNT)).toBeLessThan(pastAShell(0));
    });

    it("commits after its window, so a shell can still be missed", () => {
      // The window is what keeps this a fight. A mark that bent for its whole
      // flight would be a mark that never misses, which was measured once on
      // Jezebel's side and cost more lamps than the other nine klipot together.
      const near = pastAShell(MARK_HUNT);
      const forever = pastAShell(600);
      expect(forever).toBeLessThan(near);
    });

    it("bends after nothing when there is nothing to break", () => {
      world.marks = [mark({ x: 4, y: 12 }, 400, 0, { hunts: MARK_HUNT })];
      step(world, NO_INPUT, ctx);
      expect(world.marks[0].vy).toBe(0);
    });
  });

  describe("splitting", () => {
    /** Breaks the one shell in the room and returns whatever is left in flight. */
    function breakAShell(splits: boolean): Mark[] {
      const w = arena();
      const target = husk(w, { x: 7, y: 12 });
      w.marks = [mark({ x: 4, y: 12 }, 400, 0, { splits })];
      for (let i = 0; i < 40 && !target.broken; i += 1) {
        step(w, NO_INPUT, ctx);
        target.x = 7 * TILE_SIZE;
        target.y = 12 * TILE_SIZE;
        target.vx = 0;
      }
      expect(target.broken, "the shell never broke, so nothing was measured").toBe(true);
      return w.marks;
    }

    it("throws two shards out of what it breaks", () => {
      expect(breakAShell(true)).toHaveLength(2);
      expect(breakAShell(false)).toHaveLength(0);
    });

    it("gives a shard nothing of its own to split", () => {
      // Or a room with klipot in it clears itself off one throw, and a sealed
      // room is where the fight is.
      for (const shard of breakAShell(true)) {
        expect(shard.splits, "a shard carries the split on").toBeFalsy();
        expect(shard.hunts ?? 0).toBe(0);
        expect(shard.turns ?? 0).toBe(0);
      }
    });

    it("sends its shards apart", () => {
      const [left, right] = breakAShell(true);
      expect(Math.sign(left.vx)).toBe(-Math.sign(right.vx));
      expect(left.vy).toBeLessThan(0);
    });
  });

  describe("weight", () => {
    it("drops an arcing mark below a flat one thrown the same way", () => {
      const fall = (arcs: boolean) => {
        const w = arena();
        w.marks = [mark({ x: 2, y: 4 }, 300, 0, { arcs, life: 30 })];
        let last = w.marks[0].y;
        for (let i = 0; i < 30 && w.marks.length > 0; i += 1) {
          step(w, NO_INPUT, ctx);
          if (w.marks[0]) last = w.marks[0].y;
        }
        return last;
      };
      expect(fall(true)).toBeGreaterThan(fall(false));
    });
  });

  /**
   * And the mark the game has always had is unchanged: none of the four is on
   * unless something turns it on. Cheap to assert and the thing that would
   * break first if a default were ever written into `NOTHING`.
   */
  it("lends nothing to a mark that was lent nothing", () => {
    const wall = 8;
    for (let y = 0; y < world.height; y += 1) setTile(world, wall, y, Tile.Stone);
    const target = husk(world, { x: 4, y: 6 });
    world.marks = [mark({ x: 4, y: 12 }, 300)];
    step(world, NO_INPUT, ctx);
    expect(world.marks[0].vy, "a plain mark bent, or fell").toBe(0);
    fly(world, 60);
    expect(world.marks, "a plain mark survived stone").toHaveLength(0);
    expect(target.broken, "a plain mark broke something it flew nowhere near").toBeFalsy();
  });
});
