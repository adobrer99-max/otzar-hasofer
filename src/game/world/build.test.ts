import { describe, expect, it } from "vitest";
import { lettersOnEntering, regionAt, regions, TOTAL_REGIONS } from "../regions";
import { CHUNKS, CHUNK_W } from "./chunks";
import { buildRegion, layoutOf, verbsOf } from "./build";

const SEEDS = [3, 91, 555, 12345, 777];

/**
 * How a region is assembled, as opposed to what it is made of.
 *
 * Two things are being protected here. The first is the chain: chunks now hand
 * the Scribe on at different heights, so a mismatched pair would drop them
 * into a wall. The second is the band — the knob that did not exist when the
 * pool grew with the letters held and the demand never grew with it, which is
 * how the crown ended up the easiest ground in the game.
 */

/** What a region can actually draw on, given its letters and its band. */
function poolFor(regionIndex: number) {
  const region = regionAt(regionIndex);
  const verbs = verbsOf(lettersOnEntering(regionIndex));
  return CHUNKS.filter(
    (c) =>
      c.requires.every((v) => verbs.includes(v)) &&
      c.demand >= region.demand.min &&
      c.demand <= region.demand.max,
  );
}

describe("assembling a region", () => {
  it("never leaves the Scribe stranded between two screens", () => {
    // A chunk's exit profile must be the next chunk's entry profile. There is
    // no direct handle on the laid sequence, so this asserts the property the
    // chain exists to produce: the tiles line up at every seam.
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        for (let seam = CHUNK_W; seam < world.width; seam += CHUNK_W) {
          for (let y = 0; y < world.height; y += 1) {
            const left = world.tiles[y * world.width + seam - 1];
            const right = world.tiles[y * world.width + seam];
            // Solid on one side and open on the other is fine mid-screen; what
            // must never happen is the *floor* disagreeing, which is what a
            // profile mismatch looks like on the ground.
            if (y >= 16) {
              expect(
                left === right,
                `region ${region} seed ${seed}: floor disagrees at seam ${seam}, row ${y}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it("begins and ends every region on the ground", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        const floorAt = (tx: number) => world.tiles[16 * world.width + tx];
        expect(floorAt(0), `region ${region} seed ${seed}: no floor at the mouth`).toBeGreaterThan(0);
        expect(
          floorAt(world.width - 1),
          `region ${region} seed ${seed}: no floor at the tail`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("gives every region enough distinct screens to draw on", () => {
    for (const region of regions) {
      expect(
        poolFor(region.index).length,
        `${region.name} can only draw on ${poolFor(region.index).length} screens`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  /**
   * The inversion, asserted away. Before the bands, the pool grew monotonically
   * with the letters held while every screen in it stayed a one-press solve, so
   * Keter drew on all seventeen chunks holding all twelve verbs and was the
   * gentlest ground in the ascent.
   */
  it("raises what a region asks as the Tree is climbed", () => {
    const mean = (index: number) => {
      const pool = poolFor(index);
      return pool.reduce((sum, c) => sum + c.demand, 0) / pool.length;
    };
    expect(mean(1), "Malchut should be the gentlest").toBeLessThan(mean(10));
    expect(mean(10), "Keter should ask a great deal").toBeGreaterThan(2.4);
    // And no gentle screen may reach the supernals at all.
    for (const index of [8, 9, 10]) {
      for (const c of poolFor(index)) {
        expect(c.demand, `${c.id} is a walk and reached region ${index}`).toBeGreaterThan(1);
      }
    }
  });

  it("keeps a region's terrain within the letters carried into it", () => {
    for (const region of regions) {
      const verbs = verbsOf(lettersOnEntering(region.index));
      for (const c of poolFor(region.index)) {
        for (const verb of c.requires) {
          expect(verbs, `${c.id} in ${region.name} asks for ${verb}`).toContain(verb);
        }
      }
    }
  });

  /**
   * A region that hands you twelve verbs and then never asks for one is the
   * flat feeling this whole change is about. Measured before the quota
   * existed: better than half of all upper-Tree assemblies could be crossed
   * without pressing a key beyond the two that move you.
   *
   * The Breath and the Fence do not count — they live on the leap key and are
   * spent without deciding to.
   */
  it("makes every region past the on-ramp actually ask for a letter", () => {
    const reachedFor = (c: { requires: string[] }) =>
      c.requires.some((v) => v !== "double-jump" && v !== "wall-cling");
    for (let region = 4; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const asked = layoutOf(region, seed).filter(reachedFor).length;
        expect(
          asked,
          `${regionAt(region).name} seed ${seed} asks for nothing`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("sets a mark below the Abyss and none above it", () => {
    for (const region of regions) {
      const world = buildRegion(region.index, 4242);
      const marks = world.entities.filter((e) => e.kind === "mark").length;
      expect(marks, `${region.name}`).toBe(region.hasShrine ? 1 : 0);
    }
  });

  it("still lays the taught porch in Malchut and nowhere else", () => {
    for (const seed of SEEDS) {
      expect(buildRegion(1, seed, 1, true).width).toBe(buildRegion(1, seed).width + 3 * CHUNK_W);
    }
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      expect(buildRegion(region, 7, 1, true).width, `region ${region}`).toBe(
        buildRegion(region, 7).width,
      );
    }
  });
});
