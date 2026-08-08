import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace, type Verb } from "../abilities";
import { lettersOnEntering, regionOfSefirah } from "../regions";
import { TREE_PATHS, type TreePath } from "../tree";
import { buildPath } from "./build";
import { fighter } from "./probes";

/**
 * **The shape of the climb, measured on the ground a climb actually walks.**
 *
 * `fight.test.ts` has measured what the klipot cost since the fight was
 * written, and it measures `buildRegion` — the pre-Tree road, still the honest
 * generator for one Sefirah's ground and no longer the thing anybody plays.
 * The Tree builds with `buildPath`, and the difference is not cosmetic: a path
 * lays a rung's klipot at a rung's density, and the old fixture does not.
 *
 * The gap had a cost. The Saraf laid a fire every twenty-two ticks that burned
 * for a hundred and fifty, so seven overlapped at all times and the ground
 * around it was permanently alight. On path ground that made Tiferet end
 * **fifty-three per cent** of all walks against four to nineteen everywhere
 * else — a wall in the middle of the Tree that came back down again on the far
 * side. On `buildRegion` ground it moved the numbers by nothing, because the
 * old fixture lays four Sarafs across twenty seeds where a rung lays one in
 * every six klipot. Every band the suite had was looking the other way.
 *
 * So this file asks one question the others cannot: **is the climb shaped like
 * a climb?** Not "is it hard" — going out is a designed ending and the fall is
 * a real part of the game — but whether any one rung is far out of line with
 * the rest. A curve that rises is a difficulty curve. A curve that spikes in
 * the middle and comes back down is a defect, and it will read to a player as
 * the game being broken exactly where they were starting to enjoy it.
 *
 * Deliberately a **shape** rather than a ceiling. The ceiling in `fight.test.ts`
 * was drawn at 0.6 from a comment recording the worst rung at 0.4 — which is to
 * say it was drawn from the defect, and the defect passed it for years by
 * construction. A median moves with the game; a hand-picked ceiling only ever
 * records what was wrong when somebody last looked.
 */

const SEEDS = [3, 91, 555, 777, 1234, 42, 8888, 271, 1618, 99, 31337, 606];

/** The rung a path belongs to is the higher of its two ends. */
const rungOf = (p: TreePath) =>
  Math.max(regionOfSefirah(p.ends[0]).index, regionOfSefirah(p.ends[1]).index);

/** What the route has paid for by the time a Scribe is standing here. */
function handAt(index: number) {
  const held = lettersOnEntering(index);
  return {
    verbs: held.map((l) => abilityByLetter[l]?.verb).filter((v): v is Verb => Boolean(v)),
    graces: held.map((l) => abilityByLetter[l]?.grace).filter((g): g is Grace => Boolean(g)),
  };
}

interface Rung {
  walks: number;
  out: number;
  lamps: number;
  or: number;
}

/**
 * Every path of the Tree, every seed, walked by a Scribe holding exactly what
 * the route there pays for — which is the whole point, and is why this is not
 * simply `fight.test.ts` pointed at a different builder. A Scribe holding all
 * twenty-two letters finds no wall anywhere, because the wall is what the
 * *honest* hand runs into.
 */
let measured: Map<number, Rung> | undefined;
const RUNGS = () =>
  (measured ??= (() => {
    const rows = new Map<number, Rung>();
    for (const seed of SEEDS) {
      for (const path of TREE_PATHS) {
        const index = rungOf(path);
        const held = lettersOnEntering(index);
        const world = buildPath(path, seed, [], 1, false, false, 1, held);
        const fight = fighter(world, handAt(index), 9000);
        const row = rows.get(index) ?? { walks: 0, out: 0, lamps: 0, or: 0 };
        row.walks += 1;
        row.out += fight.out ? 1 : 0;
        row.lamps += fight.lampsLeft;
        row.or += fight.or;
        rows.set(index, row);
      }
    }
    return rows;
  })());

const rateOf = (r: Rung) => r.out / r.walks;

describe("the climb is shaped like a climb", () => {
  /**
   * **The measurement this file exists for.**
   *
   * Measured after the Saraf's fire was cut back, over two hundred and
   * sixty-four walks: 0, 4, 14, 25, 17, 6, 4, 17, 11 per cent from Yesod to
   * Keter, against 0, 4, 14, **53**, **42**, 14, 4, 19, 14 before. The median
   * sits near a ninth either way — which is exactly why the median is the thing
   * to compare against, and an absolute ceiling is not.
   */
  it("has no rung far out of line with the rest of the Tree", () => {
    const rungs = RUNGS();
    const rates = [...rungs.values()].map(rateOf).sort((a, b) => a - b);
    const median = rates[Math.floor(rates.length / 2)];
    const table = [...rungs.entries()]
      .sort(([a], [b]) => a - b)
      .map(([i, r]) => `${i}:${Math.round(rateOf(r) * 100)}%`)
      .join(" ");
    for (const [index, rung] of rungs) {
      const rate = rateOf(rung);
      expect(
        rate,
        `rung ${index} ends ${Math.round(rate * 100)}% of its walks against a median of ${Math.round(
          median * 100,
        )}% — a wall, not a hard place. ${table}`,
        // Two and a half times the median, with a floor so that a Tree whose
        // median is near zero does not make every rung a wall. The Saraf put
        // Tiferet at five times.
      ).toBeLessThan(Math.max(0.28, median * 2.5));
    }
  }, 900000);

  /**
   * The other direction, and the reason this is a band rather than a ceiling:
   * a Tree nobody can go out on has made the three lamps decoration, and the
   * fall is a designed part of this game rather than a failure of it.
   */
  it("still lets a Scribe go out", () => {
    const rungs = [...RUNGS().values()];
    const overall = rungs.reduce((n, r) => n + r.out, 0) / rungs.reduce((n, r) => n + r.walks, 0);
    expect(overall, "nothing on the Tree costs a Scribe the climb").toBeGreaterThan(0.04);
    expect(overall, "going out is the rule rather than the exception").toBeLessThan(0.25);
  }, 900000);

  /**
   * And the climb has to *go somewhere*. A curve with no wall in it can still
   * be flat, and a flat Tree is ten of the same rung: the upper Sefirot should
   * be worth more light and cost more of the Scribe than the lower ones.
   */
  it("pays more the higher it goes", () => {
    const rungs = RUNGS();
    const lightAt = (i: number) => {
      const r = rungs.get(i);
      return r ? r.or / r.walks : 0;
    };
    const low = (lightAt(2) + lightAt(3) + lightAt(4)) / 3;
    const high = (lightAt(8) + lightAt(9) + lightAt(10)) / 3;
    expect(high, `the top of the Tree carries ${high.toFixed(1)} against ${low.toFixed(1)} at the foot`).toBeGreaterThan(
      low * 1.3,
    );
  }, 900000);
});
