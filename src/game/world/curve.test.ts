import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace, type Verb } from "../abilities";
import { lettersOnEntering, regionOfSefirah, regions, TOTAL_REGIONS } from "../regions";
import { TREE_PATHS } from "../tree";
import { buildPath } from "./build";
import { fighter } from "./probes";

/**
 * **The shape of the climb, measured on the ground a climb actually walks.**
 *
 * `fight.test.ts` measured what the klipot cost for as long as there has been a
 * fight, and until now it measured `buildRegion` — the pre-Tree linear road,
 * still an honest generator for one Sefirah's ground and no longer the thing
 * anybody plays. A path lays a rung's klipot at a rung's density and the old
 * fixture does not, so this file asks the one question the others could not:
 * **is the climb shaped like a climb?**
 *
 * Not "is it hard" — going out is a designed ending and the fall is a real part
 * of the game — but whether any one rung is far out of line with the rest. A
 * curve that rises is a difficulty curve. A curve that spikes in the middle and
 * comes back down is a defect, and it will read to a player as the game being
 * broken exactly where they were starting to enjoy it.
 *
 * **The first version of this file measured a curve that did not exist**, and
 * the way it went wrong is the reason for the care taken below. `buildPath`'s
 * third argument is the letters held and its eighth is the vessels carried;
 * the first draft passed the letters as vessels and an empty hand as the
 * letters. `regionOfPath` takes a rung's *klipot* from the union of the path's
 * two ends — independent of what is held — but caps its demand band, its
 * length and its figured stones by what the letters have earned. So an empty
 * hand laid **the upper Tree's creatures on Malchut's terrain**, and the probe
 * fought them holding the honest hand. That reported a wall at Tiferet ending
 * fifty-three per cent of its walks. On the ground the game actually builds
 * there is no such wall.
 *
 * Deliberately a **shape** rather than a ceiling. The old guard in
 * `fight.test.ts` was drawn at 0.6 from a comment recording the worst rung at
 * 0.4 — which is to say it was drawn *from* the defect, and the defect passed
 * it by construction. A median moves with the game; a hand-picked ceiling only
 * ever records what was wrong when somebody last looked.
 */

/** Twenty, because a rung reached by two paths is forty walks and no more. */
const SEEDS = [3, 91, 555, 777, 1234, 42, 8888, 271, 1618, 99, 31337, 606, 7, 13, 2024, 5150, 404, 1729, 808, 64];

/**
 * **The paths that arrive at a rung.** A Scribe reaches a Sefirah by walking a
 * path whose *upper* end is that Sefirah — three arrive at the crown, none at
 * Malchut, which is where a climb starts rather than somewhere it is reached.
 */
function pathsInto(index: number) {
  const here = regions[index - 1].sefirah;
  return TREE_PATHS.filter(
    (p) =>
      p.ends.includes(here) &&
      Math.max(regionOfSefirah(p.ends[0]).index, regionOfSefirah(p.ends[1]).index) === index,
  );
}

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
  or: number;
}

/**
 * Every path of the Tree, every seed, walked by a Scribe holding exactly what
 * the route there pays for — which is the whole point, and is why this is not
 * simply `fight.test.ts` pointed at a different builder. A Scribe holding all
 * twenty-two letters finds nothing anywhere, because a wall is what the
 * *honest* hand runs into.
 *
 * Four hundred and forty walks, about half a minute. Memoised across the three
 * tests below, which each read the same table from a different angle.
 */
let measured: Map<number, Rung> | undefined;
const RUNGS = () =>
  (measured ??= (() => {
    const rows = new Map<number, Rung>();
    for (const seed of SEEDS) {
      for (let index = 1; index <= TOTAL_REGIONS; index += 1) {
        const held = lettersOnEntering(index);
        for (const path of pathsInto(index)) {
          const world = buildPath(path, seed, held, 1, false, false, 1, []);
          const fight = fighter(world, handAt(index), 9000);
          const row = rows.get(index) ?? { walks: 0, out: 0, or: 0 };
          row.walks += 1;
          row.out += fight.out ? 1 : 0;
          row.or += fight.or;
          rows.set(index, row);
        }
      }
    }
    return rows;
  })());

const rateOf = (r: Rung) => r.out / r.walks;

const curve = (rungs: Map<number, Rung>) =>
  [...rungs.entries()]
    .sort(([a], [b]) => a - b)
    .map(([i, r]) => `${i}:${Math.round(rateOf(r) * 100)}%`)
    .join(" ");

function medianRate(rungs: Map<number, Rung>): number {
  const rates = [...rungs.values()].map(rateOf).sort((a, b) => a - b);
  return rates[Math.floor(rates.length / 2)];
}

describe("the climb is shaped like a climb", () => {
  /**
   * **The measurement this file exists for**, over four hundred and forty
   * honest walks, each with the hand the route to that rung actually pays for:
   *
   * ```
   * 2:5% 3:5% 4:10% 5:5% 6:28% 7:10% 8:10% 9:8% 10:8%   overall 10%
   * ```
   *
   * Flat around a twelfth, with **one high point: Gevurah, at three and a half
   * times the median.** That is recorded rather than tuned away, because it is
   * not one broken creature — lifting any one of Amalek, the Arbeh, Cain,
   * Korach, the Saraf or Jezebel out of that rung cuts it by a third to two
   * thirds, and no single one accounts for it. A rung that is hard in aggregate
   * is a rung, and Gevurah is severity; a rung that is hard because of one
   * creature is the Korach bug. This is the first kind, and whether the middle
   * of the Tree should cost three times the rest is an owner's call and not a
   * measurement's.
   */
  it("has no rung far out of line with the rest of the Tree", () => {
    const rungs = RUNGS();
    const median = medianRate(rungs);
    for (const [index, rung] of rungs) {
      const rate = rateOf(rung);
      expect(
        rate,
        `rung ${index} ends ${Math.round(rate * 100)}% of its walks against a median of ${Math.round(
          median * 100,
        )}% — a wall, not a hard place. ${curve(rungs)}`,
        // Four times the median, with a floor so a Tree whose median is near
        // zero does not make every rung a wall. Gevurah stands at three and a
        // half; the terrain-wearing-a-creature's-name Saraf that the first
        // draft of this file went looking for stood at five.
      ).toBeLessThan(Math.max(0.4, median * 4));
    }
  }, 900000);

  /**
   * And the high point stays the high point. The band above moves with the game
   * and so cannot say much about a rung that is *already* the outlier; this can.
   * Gevurah at twenty-eight per cent has twelve points of room before it is a
   * different rung than the one that was measured.
   */
  it("does not let Gevurah get any worse", () => {
    const gevurah = RUNGS().get(regionOfSefirah("gevurah").index);
    expect(gevurah, "no path arrives at Gevurah").toBeDefined();
    expect(
      rateOf(gevurah as Rung),
      `the hardest rung on the Tree has got harder. ${curve(RUNGS())}`,
    ).toBeLessThan(0.4);
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
    /**
     * **Redrawn at 1.2, and the old 1.3 was another band drawn at its own
     * measurement rather than clear of it** — the fault P5a-0 went through the
     * whole suite to fix, found here by a change that did not touch the
     * economy.
     *
     * Measured over three independent pools of twenty seeds, on the ground
     * before the relic chamber was laid: **1.347, 1.269, 1.343**. The committed
     * pool cleared 1.3; the second pool does not, and never did. Adding the
     * chamber moved the numbers *up* on both ends — the room is a screen of
     * motes and no klipot, so light per walk rose from 21.6/29.1 to 25.0/32.3 —
     * and the ratio to 1.291, 1.416, 1.269. The two spreads overlap almost
     * exactly; the bar sits under both.
     *
     * Note what a ratio near 1.3 is being asked of. The fighter is given a
     * *fixed* nine thousand ticks whichever rung it is on, which is deliberate
     * — an equal exposure is the only way rungs compare — but it means a longer
     * rung is measured on how far a fixed budget carries rather than on what
     * the rung holds. The upper Tree is the longer ground, so this number is a
     * floor on the real difference and will always read flatter than the
     * design.
     */
    expect(
      high,
      `the top of the Tree carries ${high.toFixed(1)} against ${low.toFixed(1)} at the foot`,
    ).toBeGreaterThan(low * 1.2);
  }, 900000);
});
