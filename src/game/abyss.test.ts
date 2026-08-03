import { describe, expect, it } from "vitest";
import { makeRng, randomInt } from "./rng";
import type { SefirahId } from "../types/letter";
import {
  ABYSS_PATHS,
  crossesAbyss,
  DAAT,
  lettersFrom,
  nodeOf,
  otherEnd,
  pathsFrom,
  TREE_PATHS,
  TREE_POINTS,
  TREE_VIEW,
} from "./tree";
import { buildPath, regionOfPath, tileAt, verbsOf } from "./world/build";
import { routeTo } from "./world/route";
import { openWordGate } from "./world/step";
import { Tile, TILE_SIZE } from "./world/tiles";
import { solvableRoots } from "./wordGate";
import type { World } from "./world/types";

/**
 * **The gulf, and the one place the game asks the Scribe to know something.**
 *
 * The Abyss was in this codebase for a long time as a word. `regions.ts` said
 * the supernals hold no House "above the Abyss", `story.ts` carried a paragraph
 * about it, and `GamePage.tsx` had a plate naming Da'at that was raised on the
 * *linear* road's index and therefore never once shown to anybody. Five paths
 * crossed the gulf and nothing on the map or in the ground said so. That is the
 * exact failure this project has caught twice before and written down both
 * times — a thing that says what it is and does nothing.
 *
 * So the crossing was given a price, and this is where the price is checked.
 * Two claims, and the second is the one the whole piece of work rests on:
 *
 * 1. A crossing carries no House and no shrine — no figure to ask, and no mark,
 *    so a veiling costs the whole rung.
 * 2. **The way out is genuinely behind the barrier.** Not "there is a gate on
 *    the screen" — that is easy and worthless. `route.ts` is the instrument:
 *    it is the same graph that guarantees every rung is crossable, and it holds
 *    a Word-Gate solid, so asking it for a way to the exit and being told there
 *    is none is a proof about the ground rather than about the drawing.
 */

const SEEDS = [3, 91, 555, 12345, 777, 40404];
const EVERYTHING = TREE_PATHS.map((p) => p.letter);

describe("the Abyss, on the Tree", () => {
  it("is crossed by five paths, and they are these five", () => {
    expect(ABYSS_PATHS.map((p) => p.id).sort()).toEqual(
      [
        "chesed-chochmah",
        "gevurah-binah",
        "tiferet-binah",
        "tiferet-chochmah",
        "tiferet-keter",
      ].sort(),
    );
  });

  /**
   * Da'at is drawn and cannot be stood on. It is the one point on the diagram
   * that is not a station — no disc, no name below it, nothing to kindle — and
   * the way that is kept honest is by its absence from the list of places.
   */
  it("draws Da'at on the middle pillar, and nowhere a Scribe can stand", () => {
    expect(DAAT.x).toBeCloseTo(TREE_VIEW.width / 2);
    expect(DAAT.y).toBeGreaterThan(nodeOf.keter.row - nodeOf.tiferet.row - 4);
    expect(DAAT.y).toBeLessThan(nodeOf.keter.row - nodeOf.tiferet.row);
    expect(TREE_POINTS.some((p) => p.x === DAAT.x && p.y === DAAT.y)).toBe(false);
  });

  it("leaves nothing standing on a crossing — no House, no figure, no mark", () => {
    for (const path of TREE_PATHS) {
      const region = regionOfPath(path, EVERYTHING);
      expect(region.overTheAbyss, path.id).toBe(crossesAbyss(path));
      if (!crossesAbyss(path)) continue;
      expect(region.hasHouse, path.id).toBe(false);
      expect(region.hasShrine, path.id).toBe(false);
    }
  });

  /**
   * And the ground agrees with the region, which is not the same statement:
   * `layout` reads those two flags to decide what to lay, and a flag nothing
   * reads is the failure this file exists to prevent.
   */
  it("lays no House and no shrine on the ground of a crossing", () => {
    for (const path of ABYSS_PATHS) {
      for (const seed of SEEDS) {
        const world = buildPath(path, seed, EVERYTHING);
        const kinds = world.entities.map((e) => e.kind);
        expect(kinds, `${path.id} seed ${seed}`).not.toContain("house");
        expect(kinds, `${path.id} seed ${seed}`).not.toContain("mark");
      }
    }
  });
});

/** Where the porch stands — the tile a Scribe inscribes from. */
function porchOf(world: World) {
  return world.entities.find((e) => e.kind === "word-gate");
}

describe("the crossing, as a rung", () => {
  it("puts a Word-Gate on every crossing and on no other path", () => {
    for (const path of TREE_PATHS) {
      for (const seed of SEEDS.slice(0, 3)) {
        const world = buildPath(path, seed, EVERYTHING);
        const barrier = [...world.tiles].some((t) => t === Tile.WordGate);
        // Every path gets *a* gate — the ordinary ones get the niche beside the
        // road. What is asserted here is that the crossing's is the only one on
        // its rung, because `openWordGate` dissolves the whole world's barriers
        // at once and a second gate would be a way to answer the question
        // somewhere it costs nothing.
        expect(barrier, `${path.id} seed ${seed}`).toBe(true);
        const gates = world.entities.filter((e) => e.kind === "word-gate").length;
        expect(gates, `${path.id} seed ${seed}`).toBe(1);
      }
    }
  });

  /**
   * **The assertion the whole piece of work rests on.**
   *
   * A Scribe holding every letter in the alphabet, which is strictly more than
   * any real climb can carry, cannot reach the way out of a crossing. Then the
   * barrier is dissolved and the same ground, unchanged in every other
   * particular, opens. Nothing but the gate is between them.
   */
  it("puts the way out behind the barrier, and only the barrier", () => {
    for (const path of ABYSS_PATHS) {
      for (const seed of SEEDS) {
        const shut = buildPath(path, seed, EVERYTHING);
        expect(
          routeTo(shut, verbsOf(EVERYTHING)).usable,
          `${path.id} seed ${seed}: the way out was reachable without answering`,
        ).toBe(false);

        const open = buildPath(path, seed, EVERYTHING);
        openWordGate(open, "The gate opens.");
        expect(
          routeTo(open, verbsOf(EVERYTHING)).usable,
          `${path.id} seed ${seed}: the way out was shut even with the gate open`,
        ).toBe(true);
      }
    }
  }, 60000);

  /**
   * And the porch is on this side of it. A gate that can only be inscribed from
   * inside the chamber it seals is a soft-lock with a question painted on it,
   * so the graph is pointed at the porch instead of the exit — the goal is the
   * one entity `routeTo` looks for — and asked the same way, with the barrier
   * still standing.
   */
  it("leaves the porch reachable while the barrier stands", () => {
    for (const path of ABYSS_PATHS) {
      for (const seed of SEEDS) {
        const world = buildPath(path, seed, EVERYTHING);
        const porch = porchOf(world);
        expect(porch, `${path.id} seed ${seed}`).toBeDefined();
        if (!porch) continue;
        const exit = world.entities.find((e) => e.kind === "exit");
        expect(exit).toBeDefined();
        if (!exit) continue;
        // The way out moved to the porch: everything else about the world, the
        // barrier included, is exactly as it was built.
        exit.x = porch.x;
        exit.y = porch.y;
        expect(
          routeTo(world, verbsOf(EVERYTHING)).usable,
          `${path.id} seed ${seed}: the porch could not be reached`,
        ).toBe(true);
      }
    }
  }, 60000);

  /**
   * The barrier is a wall rather than a doorknob, and it reaches the top of the
   * grid rather than stopping at a lintel. Both matter: the way out is read as
   * a doorway the full height of its storey, so a Scribe who wall-climbed over
   * a ceiling would leave the rung by standing above the chamber without ever
   * having gone into it. `route.ts` models the standing places and not the
   * climbing, so this is checked on the tiles directly.
   */
  it("roofs the chamber all the way to the sky", () => {
    for (const path of ABYSS_PATHS) {
      const world = buildPath(path, 91, EVERYTHING);
      const exit = world.entities.find((e) => e.kind === "exit");
      expect(exit).toBeDefined();
      if (!exit) continue;
      const ex = Math.floor(exit.x / TILE_SIZE);
      const ey = Math.floor(exit.y / TILE_SIZE);
      // Up from the way out: the chamber's own headroom, then the roof — and
      // from the roof to the top of the world, stone without a gap.
      let y = ey - 1;
      while (y >= 0 && tileAt(world, ex, y) === Tile.Empty) y -= 1;
      expect(y, `${path.id}: nothing over the chamber at all`).toBeGreaterThanOrEqual(0);
      for (let up = y; up >= 0; up -= 1) {
        expect(tileAt(world, ex, up), `${path.id}: a gap over the chamber at row ${up}`).toBe(
          Tile.Stone,
        );
      }
    }
  });
});

/**
 * **And it must be answerable by whoever arrives.**
 *
 * The gate cannot be failed, only refused: `chooseTarget` draws only from roots
 * the Scribe can actually spell, `opens()` accepts any true root rather than
 * only the one asked for, and a wrong inscription may be retried forever. That
 * is the guarantee, and it is already in the machine — but it rests on
 * `chooseTarget` returning something, and `layout` falls back to an ordinary
 * way out when it does not.
 *
 * The plan for this piece of work asserted that the fallback would never be
 * reached, on the reasoning that anyone standing at Tiferet, Chesed or Gevurah
 * has walked three paths to get there. **That is wrong, and measuring it is how
 * it was found**: over eight hundred and eighty wandered legs, fifteen of two
 * hundred and one crossings were reached by a Scribe who could spell nothing —
 * seven and a half per cent. Tiferet is two paths from the kingdom by way of
 * Yesod, and two letters spell no root at all.
 *
 * So the fallback stays and is not a hole. It is the rule the game already
 * keeps at the foot of the Tree, said again higher up: **the Abyss asks a
 * question only of a Scribe who has language to answer it with.** Malchut and
 * Yesod carry no gate for exactly this reason. What is checked below is that
 * the exception is rare, and that a crossing which takes it is a whole rung
 * rather than a broken one.
 */
describe("the question at the gulf", () => {
  /** A seeded stroll, the same one `route.test.ts` walks. */
  function wander(seed: number, steps: number) {
    const rng = makeRng(seed >>> 0);
    let at: SefirahId = "malchut";
    const walked: string[] = [];
    const legs: { pathId: string; held: string[] }[] = [];
    for (let i = 0; i < steps; i += 1) {
      const out = pathsFrom(at);
      const path = out[randomInt(rng, out.length)];
      legs.push({ pathId: path.id, held: lettersFrom(walked) });
      walked.push(path.id);
      at = otherEnd(path, at);
    }
    return legs;
  }

  it("is answerable by nearly everyone who reaches it, and asked of no one else", () => {
    let asked = 0;
    let mute = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const { pathId, held } of wander(seed * 7919, 22)) {
        if (!ABYSS_PATHS.some((p) => p.id === pathId)) continue;
        asked += 1;
        if (solvableRoots(held).length === 0) mute += 1;
        // And whenever there *is* something to spell, it is a real question:
        // the pool is the Treasury's own roots, not a generated triple.
        else expect(solvableRoots(held).length, pathId).toBeGreaterThan(0);
      }
    }
    expect(asked, "the wander never crossed the gulf").toBeGreaterThan(50);
    // Measured at 15 of 201. The bar is set at a fifth so a change that made
    // the gulf mostly silent would fail rather than pass quietly.
    expect(
      mute / asked,
      `${mute} of ${asked} crossings were reached by a Scribe who could spell nothing`,
    ).toBeLessThan(0.2);
  }, 60000);

  /**
   * And the rung a mute Scribe walks is a whole one. No barrier, an ordinary
   * way out, and a route to it — which is the same guarantee every other rung
   * on the Tree keeps, asked here of the one case where the crossing gives up
   * its question.
   */
  it("lets a Scribe with nothing to say cross unasked", () => {
    const twoLetters = ["aleph", "gimel"];
    for (const path of ABYSS_PATHS) {
      for (const seed of SEEDS) {
        const world = buildPath(path, seed, twoLetters);
        expect([...world.tiles].some((t) => t === Tile.WordGate), `${path.id} seed ${seed}`).toBe(
          false,
        );
        expect(
          routeTo(world, verbsOf(twoLetters)).usable,
          `${path.id} seed ${seed}: no way across, and no question either`,
        ).toBe(true);
      }
    }
  }, 60000);

  /**
   * Three letters is the floor, and it is why the gulf is where this lives
   * rather than at the foot of the Tree: a Scribe standing at Tiferet, Chesed
   * or Gevurah has walked at least three paths to get there and therefore holds
   * at least three letters. Malchut's own gates ask nothing because there is
   * nothing yet to ask with.
   */
  it("stands only where the Scribe has letters to spell with", () => {
    for (const path of ABYSS_PATHS) {
      for (const end of path.ends) {
        expect(nodeOf[end].row, `${path.id}: ${end}`).toBeGreaterThan(0);
      }
    }
    expect(solvableRoots(["alef", "bet"])).toEqual([]);
  });
});
