import { beforeAll, describe, expect, it } from "vitest";
import { abilityByLetter } from "../abilities";
import { LAMPS, markBite, markPowers } from "../combat";
import { KELIM } from "../items";
import { boonsFrom, TIERS } from "../guardians";
import { lettersOnEntering, regionOfSefirah, regions, TOTAL_REGIONS } from "../regions";
import { TREE_PATHS } from "../tree";
import { buildPath, regionOfPath, rowsFor, verbsOf } from "./build";
import type { StepContext } from "./step";
import { fighter, type Fight } from "./probes";

/**
 * What the fight actually costs.
 *
 * `traversal.test.ts` proves the *ground* is crossable and deliberately empties
 * the region of klipot first, because that is a question about terrain. It has
 * one husk test, and it is the mirror image: with the klipot standing and the
 * lamps set to ninety-nine, can a Scribe who never strikes still get across?
 *
 * Nothing had ever measured a Scribe who fights. Every number in `combat.ts`
 * was a first-pass guess, and the only evidence for any of them was a browser
 * bot whose deaths turned out, twice, to be its own driving. This is the
 * deterministic instrument: same seeds, same result, every run.
 *
 * It asserts a band rather than a number, because the point is not to freeze
 * today's balance — it is to catch the two ways the fight can stop being a
 * fight. Too soft and a Scribe crosses ten rungs without losing a lamp; too
 * hard and the klipot become the wall the terrain is guaranteed not to be.
 *
 * **And it measures the ground a climb actually walks**, which it did not until
 * now. Every number in this file used to come from `buildRegion` — the pre-Tree
 * linear road, an honest generator for one Sefirah's ground and not the thing
 * anybody plays. P1 recorded the migration as done and it was not; `GamePage`
 * carried a comment saying so. The two fixtures differ enough to matter: a
 * region lays its own four kinds, and a *path* lays the union of both its ends,
 * so the Saraf that made a rung permanently alight showed up on paths as one
 * klipah in six and here as four across twenty seeds. Every band below was
 * re-measured on path ground when the fixture changed.
 */

function contextFor(regionIndex: number): StepContext {
  const held = lettersOnEntering(regionIndex);
  return {
    verbs: verbsOf(held),
    graces: held
      .map((id) => abilityByLetter[id]?.grace)
      .filter((g): g is NonNullable<typeof g> => Boolean(g)),
  };
}

/**
 * **The paths that arrive at a rung** — a Scribe reaches a Sefirah by walking a
 * path whose *upper* end is that Sefirah. Three arrive at the crown; **none at
 * Malchut**, which is where a climb begins rather than somewhere it is reached,
 * so the Tree has nine rungs to measure and not ten. Malchut's klipot are not
 * lost with it: they stand on every path out of the kingdom.
 */
function pathsInto(index: number) {
  const here = regions[index - 1].sefirah;
  return TREE_PATHS.filter(
    (p) =>
      p.ends.includes(here) &&
      Math.max(regionOfSefirah(p.ends[0]).index, regionOfSefirah(p.ends[1]).index) === index,
  );
}

/**
 * **One path per rung per seed**, chosen by the seed rather than fixed, so a
 * twenty-seed pool walks every way into a rung several times over and the
 * sample stays the size it was calibrated at. Walking all of them instead would
 * be four hundred and forty runs a cell, which is what `curve.test.ts` does
 * because the curve is the one question worth that much arithmetic.
 */
function groundAt(index: number, seed: number) {
  const paths = pathsInto(index);
  const path = paths[seed % paths.length];
  const held = lettersOnEntering(index);
  return {
    world: buildPath(path, seed, held, 1, false, false, 1, []),
    /** The rung the generator actually laid — capped by what the hand has earned. */
    rung: regionOfPath(path, held).index,
  };
}

/**
 * How long a Scribe is given, by the size of the rung — the same budget the
 * traversal probe is given, for the same reason: a floor of three rows is three
 * times the ground of a corridor. Read off the rung the generator laid rather
 * than the one asked for, because a path's floor is capped by the hand.
 */
const budgetFor = (rung: number) => 12000 * (rowsFor(rung) + 1);


// **Twenty rather than ten, and ten rather than six, for the same reason each
// time.** The per-rung rate is a share of these, and a share of a small sample
// is noise being read as balance: at six seeds one unlucky layout moved a rung
// by seventeen points, and at ten the whole-Tree rate still sat close enough to
// its own bar that adding a screen to the chunk library crossed it. Measured on
// path ground over three independent twenty-seed pools the going-out rate is
// 10.0%, 10.6% and 13.3% — that three-point spread is what a reshuffle costs,
// and every band below is set clear of it rather than against one draw.
//
// **And the spread is why a band is re-measured over three pools rather than
// re-read on one.** Migrating this file to path ground left ten of its eleven
// bands green on these seeds. The eleventh — the klipot getting heavier up the
// Tree — was green here and green on a second pool and failed on a third, at
// 1.40 against a bar of 1.5. A band that has only ever been checked against the
// pool it was drawn from is not a band.
const SEEDS = [
  3, 91, 555, 12345, 777, 40404, 8, 1234, 60606, 31337,
  17, 42, 101, 2024, 5150, 7777, 99, 4242, 314, 2718,
];

/**
 * Every rung, every seed, with a Scribe who fights. Measured once, reused — and
 * **lazily**, because a hundred and eighty probe runs at module scope is half a
 * minute paid by anything that so much as imports this file. Nothing here is
 * wanted until an assertion asks for it.
 */
let measured: { region: number; seed: number; fight: Fight }[] | undefined;
const RUNS = () => (measured ??= (() => {
  const rows: { region: number; seed: number; fight: Fight }[] = [];
  for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
    for (const seed of SEEDS) {
      const { world, rung } = groundAt(region, seed);
      rows.push({ region, seed, fight: fighter(world, contextFor(region), budgetFor(rung)) });
    }
  }
  return rows;
})());

// Measured once, before anything asserts, so the cost lands in a hook with a
// budget rather than inside whichever test happened to ask first.
beforeAll(() => {
  RUNS();
}, 300000);

const forRegion = (region: number) => RUNS().filter((r) => r.region === region);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

describe("what the klipot cost a Scribe who fights", () => {
  /**
   * The guarantee, and it is deliberately **not** "never dies".
   *
   * The terrain half is absolute — `traversal.test.ts` demands the exit on
   * every region and every seed, because a wall no one can pass is a bug. The
   * fight is not like that. Going out is a designed ending with a plate of its
   * own, and a climb that could never end that way would make the three lamps
   * decoration. So this asks the other question: is going out the *exception*?
   *
   * Measured on path ground, a Scribe who gives ground, stands, and aims goes
   * out on about one rung in nine — call it two climbs in five ending short of
   * the crown, which for a game whose failure state is also its premise is
   * about right. The band catches both ways it could rot: klipot that become a
   * wall, and klipot nobody notices.
   */
  it("makes going out the exception rather than the rule", () => {
    const went = RUNS().filter((r) => r.fight.out);
    const share = went.length / RUNS().length;
    const where = went
      .map((r) => `region ${r.region} seed ${r.seed} at ${(r.fight.reached * 100).toFixed(0)}%`)
      .join("; ");
    // A band rather than a ceiling, because the doc above says the measurement
    // catches rot in both directions and only one of them was ever asserted.
    // Measured **10.0 / 10.6 / 13.3** per cent over three independent pools of
    // twenty seeds on path ground — the linear road read 13.5 / 17.0 / 14.0, so
    // the migration moved this three or four points down. The walls are eleven
    // points clear on the high side and four on the low, which is several times
    // the spread a reshuffle produces.
    expect(share, `${went.length} of ${RUNS().length} went out — ${where}`).toBeLessThan(0.24);
    expect(
      share,
      `only ${went.length} of ${RUNS().length} went out — the klipot have stopped costing anything`,
    ).toBeGreaterThan(0.06);
  });

  /**
   * **And no single rung may be the one that ends most climbs — asserted in
   * `curve.test.ts`, and deliberately not here.**
   *
   * This file used to carry that rule and it is worth recording why it left,
   * because the reason is the same one that moved `outOfReach` into a single
   * function. The guard read `< 0.6` against a comment recording the worst rung
   * at `0.4` — the line was drawn *from* the defect it was meant to catch, so
   * the defect passed by construction. It was then rewritten as a shape, which
   * was the right instrument on the wrong ground: this file built with
   * `buildRegion`, so it could not see a path's klipot at a path's density and
   * never saw the Saraf at all.
   *
   * Now that both files walk the same generator, keeping the rule in two places
   * would mean two samples of the same question — and `curve.test.ts` takes the
   * better one, four hundred and forty walks over *every* path into a rung
   * against this file's one path per seed. A rule with two homes is a rule that
   * gets fixed in one of them.
   */

  /**
   * The marks have to work. A Scribe who throws at everything in reach and
   * breaks almost nothing would mean the mark's reach, speed or bite is wrong
   * — and the reports would still look busy, because throwing is cheap.
   */
  it("breaks most of what it throws at", () => {
    // Across the Tree, and with a floor per rung rather than the same bar on
    // every one. The foot has the fewest klipot and the weakest mark — three
    // husks and no letters to strengthen it — so a flat share was always the
    // most brittle line in this file, and it is the mean that says whether the
    // marks work.
    const shares: number[] = [];
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      const rows = forRegion(region);
      const placed = mean(rows.map((r) => r.fight.broken + r.fight.standing));
      if (placed === 0) continue;
      const share = mean(rows.map((r) => r.fight.broken)) / placed;
      shares.push(share);
      // **A floor, not a target.** Measured across the Tree the share is not
      // flat and was never going to be: the foot runs at better than three
      // quarters, because three slow pacers meet a Scribe with nothing else to
      // do, and it falls toward a third at Binah and Chochmah, where the rungs
      // turn into three-row floors and the probe spends its attention on the
      // climb.
      //
      // **The migration moved this a long way and the floor moved with it.** On
      // the linear road the trough was a fifth and this line sat at 0.12; a path
      // lays both its ends' klipot at a rung's density and the probe breaks far
      // more of them, so the same trough now reads 33 per cent — measured
      // 33/33/42, 43/49/39 and 33/41/48 for regions eight, nine and ten over
      // three independent pools. The line is redrawn at a fifth, thirteen points
      // under the worst cell measured, which is where a floor belongs: clear of
      // the spread, and still able to say that a rung where the marks plainly do
      // not work is a rung where the marks plainly do not work.
      expect(
        share,
        `region ${region}: only ${(share * 100).toFixed(0)}% of ${placed.toFixed(1)} husks broken`,
      ).toBeGreaterThan(0.2);
    }
    // Mean 51 / 53 / 52 per cent over the three pools; the bar is sixteen points
    // under the lowest of them.
    expect(mean(shares), `mean ${(mean(shares) * 100).toFixed(0)}% broken`).toBeGreaterThan(0.35);
  });

  /**
   * **The fight is not free.** Somewhere on the way up, a lamp has to go — or
   * the klipot are scenery with a hit box and the three lamps are a HUD
   * element that never moves. Measured across the upper Tree rather than any
   * one rung, because a single region can legitimately be walked clean.
   *
   * 0.95 / 1.04 / 1.10 lamps over the three pools — very nearly the whole lamp
   * this test is named for, and up from the linear road, where it sat low
   * enough that the bar had to be drawn at 0.3 to clear the spread.
   */
  it("costs the upper Tree at least one lamp", () => {
    const upper = RUNS().filter((r) => r.region >= 6);
    const lost = mean(upper.map((r) => LAMPS - r.fight.lampsLeft));
    expect(lost, `mean lamps lost above Tiferet: ${lost.toFixed(2)}`).toBeGreaterThan(0.5);
  });

  /**
   * And the other edge of the band. A rung that reliably takes every lamp is
   * a rung nobody finishes, and the whole climb is ten of them in a row with
   * the lamps carried across — so any single region taking all three, on
   * average, would put the crown out of reach for reasons that have nothing to
   * do with the terrain.
   */
  it("never spends the whole lamp-stock on a single rung", () => {
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      const lost = mean(forRegion(region).map((r) => LAMPS - r.fight.lampsLeft));
      expect(lost, `region ${region} costs ${lost.toFixed(2)} of ${LAMPS} lamps`).toBeLessThan(
        LAMPS - 0.5,
      );
    }
  });

  /**
   * The klipot rise with the Tree — `regions.ts` says two in Malchut and ten
   * in Keter — so the fight must get heavier as it is climbed, exactly as the
   * terrain now does. This is the same shape as the demand curve, asked of the
   * other half of the difficulty.
   */
  it("gets heavier the higher the Tree is climbed", () => {
    const low = mean(RUNS().filter((r) => r.region <= 3).map((r) => r.fight.broken + r.fight.standing));
    const high = mean(RUNS().filter((r) => r.region >= 8).map((r) => r.fight.broken + r.fight.standing));
    // **The one band the migration caught passing on its own seeds.** At 1.5 it
    // was green on the committed pool and green on a second, and a third pool
    // measured 1.40. A path takes its klipot count from the *average* of its two
    // ends, so the foot of the Tree is heavier here than it was on the linear
    // road and the ratio is correspondingly flatter: 1.57 / 1.66 / 1.40. Drawn
    // at 1.25, clear of the lowest of the three rather than through it.
    expect(high, `low ${low.toFixed(1)} husks, high ${high.toFixed(1)}`).toBeGreaterThan(low * 1.25);
    // And the declared curve is what put them there.
    expect(regions[TOTAL_REGIONS - 1].klipot.count).toBeGreaterThan(regions[0].klipot.count);
  });
});

/**
 * **And what a vessel does to the fight.**
 *
 * Everything above measures a Scribe carrying nothing, which is the baseline
 * and has to stay the baseline. This asks the other question, which only became
 * askable once about a third of the pool started costing something: is a costly
 * vessel a **trade** or a trap?
 *
 * The four behaviours are the ones worth watching, because each is paid for in
 * a currency the bot can feel — the Crowns and the Pointer buy coverage and
 * reach with tempo, the Measuring Line buys certainty with speed, the Plumb
 * Line buys weight with aim.
 *
 * Measured on path ground over regions four to eight, fifteen seeds a cell,
 * across three independent pools — the trough, which is where a mistake in the
 * fight shows first:
 *
 * ```
 *              out /75            broken               reached
 *   bare       11 ·  8 · 11   3.28 · 3.12 · 3.19   0.877 · 0.911 · 0.890
 *   tagin       6 ·  4 · 12   3.47 · 3.45 · 3.43   0.908 · 0.945 · 0.899
 *   kav         9 ·  9 · 11   3.20 · 3.21 · 3.04   0.870 · 0.897 · 0.878
 *   mishkolet   5 ·  8 · 13   3.39 · 3.49 · 3.29   0.871 · 0.902 · 0.884
 *   sargel      9 ·  6 · 13   3.31 · 3.36 · 3.45   0.889 · 0.910 · 0.905
 *   yad        10 ·  8 · 16   3.16 · 3.11 · 3.12   0.882 · 0.913 · 0.878
 *   kulmus      4 ·  5 ·  6   3.67 · 3.60 · 3.63   0.908 · 0.938 · 0.914
 * ```
 *
 * The Reed is the control and reads as one in every pool: a plain gain, fewest
 * bodies and most shells. The Pointer is the other end and reads as one too —
 * most bodies, fewest shells, in all three.
 *
 * Every one of these moved when `seal` stopped writing a door on top of the
 * Scribe — bare broke 2.12 and got 69% across before that. A Scribe pinned on a
 * threshold is a Scribe not fighting, and the whole table was measuring that as
 * much as it was measuring the vessels.
 *
 * Read honestly: **the bot cannot use most of what it is holding.** It does not
 * throw around corners, so a bounce is only the cooldown it cost; it does not
 * lead a falling mark, so weight is only the miss. What this shows is that the
 * costs land and are roughly paid for even by a Scribe who plays none of them
 * on purpose — which is the floor. The ceiling is a person, and no harness
 * measures that.
 *
 * The retune this caught is worth keeping in view: the Crowns first paid for
 * splitting with `bite: 0.7`, and it did **nothing**. `markBite` rounds and
 * floors at one shell, so a bite below one is invisible unless something else
 * has raised it — the vessel measured as a pure gain. The cost moved to the
 * cooldown, which the game can actually feel.
 */
describe("what a vessel costs a Scribe who fights", () => {
  const HANDS = [[], ["tagin"], ["kav"], ["mishkolet"], ["sargel"], ["yad"], ["kulmus"]];
  // Fifteen, because the step between boon tiers is small by design and a
  // five-seed cell cannot see it: the numbers below were re-measured over
  // three independent fifteen-seed pools before anything here was asserted.
  const HAND_SEEDS = [
    3, 91, 555, 12345, 777, 40404, 8, 1234, 60606, 31337, 17, 42, 101, 2024, 5150,
  ];

  /**
   * Measured once, in a hook, and **with a breath between hands**.
   *
   * A hundred and seventy-five probe runs is over a minute of arithmetic, and
   * a minute of unbroken synchronous work inside a worker starves vitest's own
   * reporter channel: the run fails with `Timeout calling "onTaskUpdate"` while
   * every assertion in it passes. Yielding to the macrotask queue between hands
   * lets the channel drain. The alternative was a smaller sample, which would
   * have been measuring less to make a harness happy.
   */
  let held: { hand: string; runs: Fight[] }[] = [];
  beforeAll(async () => {
    for (const items of HANDS) {
      const rows: Fight[] = [];
      for (let region = 4; region <= 8; region += 1) {
        for (const seed of HAND_SEEDS) {
          const { world, rung } = groundAt(region, seed);
          rows.push(fighter(world, { ...contextFor(region), items }, budgetFor(rung)));
        }
      }
      held.push({ hand: items.join(",") || "bare", runs: rows });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }, 300000);

  const HANDS_MEASURED = () => held;
  const bare = () => held[0].runs;

  /** No object in the pool may be a way to lose. */
  it("never hands a Scribe something that puts them out", () => {
    for (const { hand, runs } of HANDS_MEASURED()) {
      const share = runs.filter((r) => r.out).length / runs.length;
      expect(share, `holding [${hand}] went out ${(share * 100).toFixed(0)}% of the time`).toBeLessThan(
        0.4,
      );
    }
  });

  /**
   * And none of them may be a way to *stop*. A vessel that cost so much tempo
   * that a rung stopped being crossable would be a soft-lock wearing a name,
   * which is the one thing this game will not have.
   */
  it("leaves every rung crossable to a Scribe carrying anything", () => {
    for (const { hand, runs } of HANDS_MEASURED()) {
      const reached = mean(runs.map((r) => r.reached));
      expect(reached, `holding [${hand}] got ${(reached * 100).toFixed(0)}% across`).toBeGreaterThan(0.6);
    }
  });

  /**
   * The trade itself: a costly vessel gives something up, but not the fight.
   * A sixth of a bare-handed Scribe's shells is the slack, and the number is
   * measured rather than chosen: the Pointer sits at 3.08 against 3.44, which
   * is the one trade this bot cannot use at all. It buys reach with tempo, and
   * a probe that stands still and throws has nothing to spend reach on — so
   * what is being asked here is only that the *cost* is a price and not a
   * punishment, and a fifth of the shells would be a punishment.
   */
  it("charges a price without taking the fight away", () => {
    const floor = mean(bare().map((r) => r.broken)) * (5 / 6);
    for (const { hand, runs } of HANDS_MEASURED()) {
      const broken = mean(runs.map((r) => r.broken));
      expect(broken, `holding [${hand}] broke ${broken.toFixed(2)}, bare-handed is ${(floor / 0.9).toFixed(2)}`)
        .toBeGreaterThanOrEqual(floor);
    }
  });

  /**
   * **A cost the reducer rounds away is not a cost.** `markBite` floors at one
   * shell, so a `bite` below one changes nothing at all unless something else
   * raised it first — which is exactly how the Crowns spent a retune looking
   * like a trade and measuring as a gift. Asserted against the function the
   * fight actually calls.
   */
  /**
   * **And what ten broken guardians come to.**
   *
   * The other across-runs system, and it has the failure mode every
   * meta-progression has: earned power that quietly ends the game. Measured
   * over the same rungs and the same three pools — regions four to eight,
   * fifteen seeds a cell:
   *
   * ```
   *                    out /75        broken              lamps left
   *   nothing broken   11 · 8 · 11   3.28 · 3.12 · 3.19   1.7 · 1.8 · 1.8
   *   all ten broken    4 · 2 ·  3   3.67 · 3.80 · 3.89   2.36 · 2.55 · 2.36
   * ```
   *
   * Which is the shape it should have: a Scribe who has broken everything is
   * plainly stronger and is still losing a lamp a rung and still occasionally
   * going out. The three great ones carry the whole back half of that curve —
   * seven boons of a tenth each barely move it, and the three behaviours do.
   */
  it("makes a Scribe who has broken every guardian stronger, and not finished", () => {
    const freed = regions.map((r) => r.sefirah);
    const withAll: Fight[] = [];
    for (let region = 4; region <= 8; region += 1) {
      for (const seed of HAND_SEEDS) {
        const { world, rung } = groundAt(region, seed);
        withAll.push(
          fighter(world, { ...contextFor(region), boons: boonsFrom(freed) }, budgetFor(rung)),
        );
      }
    }
    const bareOut = bare().filter((r) => r.out).length;
    const boonOut = withAll.filter((r) => r.out).length;
    expect(boonOut, `${boonOut} out against ${bareOut} bare-handed`).toBeLessThanOrEqual(bareOut);
    expect(
      mean(withAll.map((r) => r.broken)),
      "ten guardians broken and the mark is no better",
    ).toBeGreaterThan(mean(bare().map((r) => r.broken)));
    // And it is still a fight: the lamps still go.
    expect(
      mean(withAll.map((r) => r.lampsLeft)),
      "a Scribe with every boon crosses the trough untouched",
    ).toBeLessThan(LAMPS);
  }, 300000);

  /**
   * **And what the ceiling of the tiers comes to**, which is the number the
   * old measurement above no longer reaches: "all ten broken" is tier one
   * everywhere, and a Scribe who has come back to every guardian three times
   * carries a great deal more. Measured on the same rungs and seeds when the
   * tiers were written:
   *
   * Measured on path ground over three independent pools of fifteen seeds —
   * seventy-five runs a cell, regions four to eight:
   *
   * ```
   *            out /75        broken               lamps left
   *   bare     11 ·  8 · 11   3.28 · 3.12 · 3.19   1.70 · 1.82 · 1.80
   *   tier 1    4 ·  2 ·  3   3.67 · 3.80 · 3.89   2.36 · 2.55 · 2.36
   *   tier 3    3 ·  0 ·  2   3.81 · 3.87 · 4.17   2.44 · 2.59 · 2.41
   * ```
   *
   * **Read the two steps differently, because they are different sizes.**
   * Bare to tier one is large and stable on every axis in every pool. Tier one
   * to tier three is small — a tenth of a lamp and a body or two — and it is the
   * cap working rather than the tiers failing: they are capped so the top of the
   * ladder is not a different game. On path ground it happens to move the same
   * way on all three axes in all three pools, which the linear road did not; that
   * is not enough to start asserting on shells, for the reason below.
   *
   * **And shells broken is not a measure of strength**, which is why it is
   * printed and not asserted. A stronger body breaks fewer, because it does not
   * have to — breaking is a count of fights *taken*, and the boons make fights
   * avoidable. Asserting on it read as "coming back three times is worth
   * nothing" the first time the chunk library moved, when what had actually
   * happened was that a tiered Scribe walked past more of them.
   *
   * What must never pass silently is a fully tiered Scribe who cannot be
   * touched — that is a game that has ended without saying so, and it is the
   * exact failure the boons were capped against in the first place.
   */
  it("keeps a Scribe at the top of every tier inside a fight", () => {
    const everyTier = Object.fromEntries(regions.map((r) => [r.sefirah, TIERS]));
    const topped: Fight[] = [];
    for (let region = 4; region <= 8; region += 1) {
      for (const seed of HAND_SEEDS) {
        const { world, rung } = groundAt(region, seed);
        topped.push(
          fighter(world, { ...contextFor(region), boons: boonsFrom(everyTier) }, budgetFor(rung)),
        );
      }
    }
    const tierOne = boonsFrom(regions.map((r) => r.sefirah));
    const atOne: Fight[] = [];
    for (let region = 4; region <= 8; region += 1) {
      for (const seed of HAND_SEEDS) {
        const { world, rung } = groundAt(region, seed);
        atOne.push(fighter(world, { ...contextFor(region), boons: tierOne }, budgetFor(rung)));
      }
    }
    const rows = [
      `tier 1: out ${atOne.filter((r) => r.out).length}/${atOne.length} broken ${mean(atOne.map((r) => r.broken)).toFixed(2)} lamps ${mean(atOne.map((r) => r.lampsLeft)).toFixed(2)}`,
      `tier ${TIERS}: out ${topped.filter((r) => r.out).length}/${topped.length} broken ${mean(topped.map((r) => r.broken)).toFixed(2)} lamps ${mean(topped.map((r) => r.lampsLeft)).toFixed(2)}`,
    ];
    console.log(rows.join("\n"));
    // The ladder as a whole, which is the large and stable claim: a Scribe at
    // the top of every tier keeps more lamp than one who has broken each
    // guardian once, and is not put out more often. Both directions asserted,
    // because "worth nothing" and "worth going backwards" are different rots.
    expect(
      mean(topped.map((r) => r.lampsLeft)),
      `coming back three times is worth nothing:\n${rows.join("\n")}`,
    ).toBeGreaterThanOrEqual(mean(atOne.map((r) => r.lampsLeft)));
    expect(
      topped.filter((r) => r.out).length,
      `coming back three times costs bodies:\n${rows.join("\n")}`,
    ).toBeLessThanOrEqual(atOne.filter((r) => r.out).length + Math.ceil(atOne.length * 0.05));
    // ...and still not invulnerable, which is the whole reason for the cap.
    expect(
      mean(topped.map((r) => r.lampsLeft)),
      `a fully tiered Scribe crosses the trough untouched:\n${rows.join("\n")}`,
    ).toBeLessThan(LAMPS);
  }, 300000);

  it("declares no change to a mark's bite that the mark never feels", () => {
    for (const keli of KELIM) {
      if (keli.effect.bite === undefined) continue;
      const alone = markBite(markPowers([], [], [keli.id]));
      expect(alone, `the ${keli.name} declares bite ${keli.effect.bite} and the mark bites the same`).not.toBe(
        markBite(markPowers([], [], [])),
      );
    }
  });
});
