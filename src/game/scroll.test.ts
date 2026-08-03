import { describe, expect, it } from "vitest";
import { regions } from "./regions";
import { fragmentAt, gather, SCROLL_FRAGMENTS, SCROLL_TOTAL } from "./scroll";
import { TREE_PATHS } from "./tree";
import { buildPath, buildRegion } from "./world/build";

/**
 * **The scroll, and where its pieces actually lie.**
 *
 * Three fragments make Peh, and Peh is the one hard gate in this game: it opens
 * the Houses (`world/step.ts`), and through them every Ushpizin bargain, all
 * seven testimonies, the ending's branch and 22-of-22. It is the one thing a
 * Scribe is meant to have to *go somewhere* for — one niche in the kingdom, two
 * in Yesod, and nowhere else (`regions.ts`).
 *
 * That was not true. `buildPath` took **how many** niches from the path's lower
 * end and **which fragments they are** from its capped upper end, so the two
 * disagreed the moment a Scribe's letters outgrew the ground they were standing
 * on. This file is the arithmetic written down where it cannot drift again.
 */

const ALL = TREE_PATHS.map((p) => p.letter);
/** Empty-handed, a few letters in, most of the way, and everything. */
const HANDS = [[], ALL.slice(0, 5), ALL.slice(0, 12), ALL] as const;
const SEEDS = [3, 91, 555];

/** Every fragment ref a rung is built holding, as numbers. */
function refsOf(world: { entities: readonly { kind: string; ref?: string }[] }): number[] {
  return world.entities.filter((e) => e.kind === "fragment").map((e) => Number(e.ref));
}

function refsOnPath(path: (typeof TREE_PATHS)[number], seed: number, held: readonly string[]) {
  return refsOf(buildPath(path, seed, held, 1, false, false));
}

describe("the three pieces of the scroll", () => {
  it("is three, and each one names a piece of the verse", () => {
    expect(SCROLL_TOTAL).toBe(3);
    expect(SCROLL_FRAGMENTS.map((f) => f.index)).toEqual([0, 1, 2]);
    for (let i = 0; i < SCROLL_TOTAL; i += 1) expect(fragmentAt(i)).toBeDefined();
    expect(fragmentAt(SCROLL_TOTAL)).toBeUndefined();
    expect(fragmentAt(-1)).toBeUndefined();
  });

  /** One in the kingdom, two in Yesod, none anywhere else. */
  it("lies in exactly two places on the Tree", () => {
    const holding = regions.filter((r) => (r.fragments ?? 0) > 0);
    expect(holding.map((r) => r.sefirah)).toEqual(["malchut", "yesod"]);
    expect(holding.reduce((n, r) => n + (r.fragments ?? 0), 0)).toBe(SCROLL_TOTAL);
  });
});

/**
 * **The regression.** A ref outside `0 … SCROLL_TOTAL - 1` names no piece of
 * the verse: `fragmentAt` returns `undefined`, and the plate raised over the
 * paused game renders with no text and no button.
 */
describe("what the builder deals", () => {
  it("never deals a fragment that names nothing, on any path, holding anything", () => {
    const bad: string[] = [];
    for (const path of TREE_PATHS) {
      for (const held of HANDS) {
        for (const seed of SEEDS) {
          for (const ref of refsOnPath(path, seed, held)) {
            if (!Number.isInteger(ref) || ref < 0 || ref >= SCROLL_TOTAL) {
              bad.push(`${path.id} holding ${held.length} seed ${seed} → ${ref}`);
            }
          }
        }
      }
    }
    expect(bad, `fragments naming nothing: ${bad.slice(0, 8).join("; ")}`).toEqual([]);
  });

  /**
   * **A niche is a place, not a number.** What the Scribe happens to be
   * carrying decides how big the ground is; it must not decide *which* piece of
   * the verse is lying on it.
   */
  it("deals the same fragments on a path whatever the Scribe holds", () => {
    for (const path of TREE_PATHS) {
      const first = refsOnPath(path, SEEDS[0], HANDS[0]).sort();
      for (const held of HANDS) {
        expect(
          refsOnPath(path, SEEDS[0], held).sort(),
          `${path.id} deals differently to a hand of ${held.length}`,
        ).toEqual(first);
      }
    }
  });

  /** And the same as the linear road, which was always right. */
  it("agrees with the road the regions were built for", () => {
    for (const region of regions.filter((r) => (r.fragments ?? 0) > 0)) {
      const onRoad = refsOf(buildRegion(region.index, SEEDS[0])).sort();
      const outOf = TREE_PATHS.filter((p) => p.ends[0] === region.sefirah);
      for (const path of outOf) {
        expect(
          refsOnPath(path, SEEDS[0], ALL).sort(),
          `${path.id} does not carry ${region.name}'s own niches`,
        ).toEqual(onRoad);
      }
    }
  });
});

/**
 * The second lock on the same door. Even with the builder fixed, nothing that
 * names no piece of the verse should be able to reach the record — the third
 * such nothing used to grant the Mouth.
 */
describe("taking a fragment out of a niche", () => {
  it("gathers a piece, in order, once", () => {
    expect(gather([], 1)).toEqual([1]);
    expect(gather([2], 0)).toEqual([0, 2]);
    expect(gather([0, 2], 1)).toEqual([0, 1, 2]);
    // Already held changes nothing — which is what stops one niche paying twice.
    expect(gather([0, 1], 1)).toBeNull();
  });

  it("refuses anything that names no piece of the verse", () => {
    for (const bad of [-1, SCROLL_TOTAL, SCROLL_TOTAL + 1, 3, 4, 1.5, NaN, Infinity]) {
      expect(gather([0], bad), `${bad} was gathered`).toBeNull();
    }
  });

  /** The whole point: three refusals cannot add up to the Mouth. */
  it("cannot be filled by things that are not fragments", () => {
    let held: number[] = [];
    for (const bad of [3, 4, 5]) held = gather(held, bad) ?? held;
    expect(held).toEqual([]);
    expect(held.length >= SCROLL_TOTAL).toBe(false);
  });
});

/**
 * **The Mouth has to be walked to.** Deduping is by fragment index
 * (`GamePage.onFragment`), so if one niche could emit different refs depending
 * on the way you left it, the same niche would pay more than once and Peh could
 * be assembled without ever entering Yesod — where two of the three lie.
 */
describe("what a Scribe can assemble, and from where", () => {
  const fromSefirah = (sefirah: string, held: readonly string[]) =>
    new Set(
      TREE_PATHS.filter((p) => p.ends.includes(sefirah as never)).flatMap((p) =>
        refsOnPath(p, SEEDS[0], held),
      ),
    );

  it("cannot be assembled out of the kingdom alone", () => {
    for (const held of HANDS) {
      const got = fromSefirah("malchut", held);
      expect(
        got.size,
        `the kingdom alone yielded ${[...got].sort().join(",")} to a hand of ${held.length}`,
      ).toBeLessThan(SCROLL_TOTAL);
    }
  });

  it("is whole once the kingdom and Yesod have both been walked", () => {
    const got = new Set([...fromSefirah("malchut", ALL), ...fromSefirah("yesod", ALL)]);
    expect([...got].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  /** No two places hold the same piece, or one of them would be skippable. */
  it("holds no piece in two places", () => {
    const seen = new Map<number, string>();
    for (const path of TREE_PATHS) {
      for (const ref of refsOnPath(path, SEEDS[0], ALL)) {
        const already = seen.get(ref);
        if (already && already !== path.ends[0]) {
          expect.fail(`fragment ${ref} lies at both ${already} and ${path.ends[0]}`);
        }
        seen.set(ref, path.ends[0]);
      }
    }
  });
});
