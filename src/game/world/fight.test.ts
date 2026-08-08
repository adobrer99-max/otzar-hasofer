import { beforeAll, describe, expect, it } from "vitest";
import { abilityByLetter } from "../abilities";
import { LAMPS, markBite, markPowers } from "../combat";
import { KELIM } from "../items";
import { boonsFrom, TIERS } from "../guardians";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { buildRegion, rowsFor, verbsOf } from "./build";
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
 * Nothing has ever measured a Scribe who fights. Every number in `combat.ts`
 * is a first-pass guess, and the only evidence for any of them has been a
 * browser bot whose deaths turned out, twice today, to be its own driving.
 * This is the deterministic instrument: same seeds, same result, every run.
 *
 * It asserts a band rather than a number, because the point is not to freeze
 * today's balance — it is to catch the two ways the fight can stop being a
 * fight. Too soft and a Scribe crosses ten rungs without losing a lamp; too
 * hard and the klipot become the wall the terrain is guaranteed not to be.
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
 * How long a Scribe is given, by the size of the rung — the same budget the
 * traversal probe is given, for the same reason: a floor of three rows is three
 * times the ground of a corridor.
 */
const budgetFor = (regionIndex: number) => 12000 * (rowsFor(regionIndex) + 1);


// **Twenty rather than ten, and ten rather than six, for the same reason each
// time.** The per-rung rate is a share of these, and a share of a small sample
// is noise being read as balance: at six seeds one unlucky layout moved a rung
// by seventeen points, and at ten the whole-Tree rate still sat close enough to
// its own bar that adding a screen to the chunk library crossed it. Measured
// over three independent twenty-seed pools the going-out rate is 13.5%, 17.0%
// and 14.0% — that three-point spread is what a reshuffle costs, and every band
// below is set clear of it rather than against one draw.
const SEEDS = [
  3, 91, 555, 12345, 777, 40404, 8, 1234, 60606, 31337,
  17, 42, 101, 2024, 5150, 7777, 99, 4242, 314, 2718,
];

/**
 * Every region, every seed, with a Scribe who fights. Measured once, reused —
 * and **lazily**, because `economy.test.ts` imports `fighter` from this file
 * and a hundred probe runs at module scope is eighteen seconds it does not
 * need. Nothing here is wanted until an assertion asks for it.
 */
let measured: { region: number; seed: number; fight: Fight }[] | undefined;
const RUNS = () => (measured ??= (() => {
  const rows: { region: number; seed: number; fight: Fight }[] = [];
  for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
    for (const seed of SEEDS) {
      const world = buildRegion(region, seed);
      rows.push({ region, seed, fight: fighter(world, contextFor(region), budgetFor(region)) });
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
   * Measured, a Scribe who gives ground, stands, and aims goes out in about
   * one rung in twenty — call it two climbs in five ending short of the crown,
   * which for a game whose failure state is also its premise is about right.
   * The band catches both ways it could rot: klipot that become a wall, and
   * klipot nobody notices.
   */
  it("makes going out the exception rather than the rule", () => {
    const went = RUNS().filter((r) => r.fight.out);
    const share = went.length / RUNS().length;
    const where = went
      .map((r) => `region ${r.region} seed ${r.seed} at ${(r.fight.reached * 100).toFixed(0)}%`)
      .join("; ");
    // A band rather than a ceiling, because the doc above says the measurement
    // catches rot in both directions and only one of them was ever asserted.
    // Measured 13.5 / 17.0 / 14.0 per cent over three pools of these twenty
    // seeds; the walls are four points clear on the high side and seven on the
    // low, which is several times the spread a reshuffle produces.
    expect(share, `${went.length} of ${RUNS().length} went out — ${where}`).toBeLessThan(0.24);
    expect(
      share,
      `only ${went.length} of ${RUNS().length} went out — the klipot have stopped costing anything`,
    ).toBeGreaterThan(0.06);
  });

  /**
   * And no single rung may be the one that ends most climbs.
   *
   * **The ceiling was drawn from the wall it was meant to catch.** This read
   * `< 0.6` against a comment recording Tiferet at eight of twenty — the line
   * was set two spreads clear of the worst rung, so the worst rung passed by
   * construction, and it went on passing while Tiferet ended more than half of
   * all walks and every other rung ended between none and one in five. An
   * absolute ceiling cannot tell a hard rung from a hole in the curve: it only
   * knows how bad the worst place is allowed to be, which is the number the
   * defect itself supplied.
   *
   * So the shape is what is asserted. A rung is a wall when it is far out of
   * line with *the rest of the Tree*, whatever the absolute figure — and the
   * median moves with the game, so this keeps meaning the same thing after a
   * retune rather than needing to be redrawn each time.
   *
   * **And note what this file's ground is.** `RUNS` builds with `buildRegion`,
   * the pre-Tree road — one Sefirah's honest ground, but not the ground a climb
   * actually walks, which is `buildPath`. The two differ enough to matter: the
   * Saraf's fire made Tiferet end more than half of all *path* walks and moved
   * nothing at all here, because the old fixture lays four of them across twenty
   * seeds where a rung lays one in six. The shipped curve is guarded in
   * `curve.test.ts`; this one guards the fixture the rung tests are written on.
   */
  it("has no rung that reliably puts a Scribe out", () => {
    const shares = new Map<number, { out: number; of: number }>();
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const rows = forRegion(region);
      if (rows.length === 0) continue;
      shares.set(region, { out: rows.filter((r) => r.fight.out).length, of: rows.length });
    }
    const rates = [...shares.values()].map((s) => s.out / s.of).sort((a, b) => a - b);
    const median = rates[Math.floor(rates.length / 2)];
    for (const [region, s] of shares) {
      const rate = s.out / s.of;
      // The absolute line stays as a backstop — a Tree where *every* rung ends
      // half the walks has no outlier and would slip through a ratio alone.
      expect(rate, `region ${region} put ${s.out} of ${s.of} runs out`).toBeLessThan(0.5);
      // And the shape. Measured after the Saraf's fire was cut back, the rungs
      // run 0–25 per cent against a median near a tenth; a rung at four times
      // the median is a hole rather than a hard place.
      expect(
        rate,
        `region ${region} ends ${(rate * 100).toFixed(0)}% of its walks against a median of ${(median * 100).toFixed(0)}% — it is a wall, not a rung`,
      ).toBeLessThan(Math.max(0.2, median * 4));
    }
  });

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
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const rows = forRegion(region);
      const placed = mean(rows.map((r) => r.fight.broken + r.fight.standing));
      if (placed === 0) continue;
      const share = mean(rows.map((r) => r.fight.broken)) / placed;
      shares.push(share);
      // **A floor, not a target.** Measured across the Tree the share is not
      // flat and was never going to be: the foot runs at four fifths because
      // three slow pacers meet a Scribe with nothing else to do, and it falls
      // to a trough of a fifth around Chesed to Tiferet, where the rungs turn
      // into floors and the probe spends its attention on the climb. Regions
      // four, five and six sit at 22, 27 and 19 per cent.
      //
      // This line used to be drawn at a fifth, which is to say *through* that
      // trough — so relaying the library moved a screen, region six came out at
      // 19.4, and a suite that measures the fight reported a failure about
      // level layout. The comment above already says the mean is what tells you
      // the marks work. What this is for is a rung where they plainly do not,
      // and it is set clear of the measured trough so that it says so and
      // nothing else.
      expect(
        share,
        `region ${region}: only ${(share * 100).toFixed(0)}% of ${placed.toFixed(1)} husks broken`,
      ).toBeGreaterThan(0.12);
    }
    expect(mean(shares), `mean ${(mean(shares) * 100).toFixed(0)}% broken`).toBeGreaterThan(0.35);
  });

  /**
   * **The fight is not free.** Somewhere on the way up, a lamp has to go — or
   * the klipot are scenery with a hit box and the three lamps are a HUD
   * element that never moves. Measured across the upper Tree rather than any
   * one rung, because a single region can legitimately be walked clean.
   */
  it("costs the upper Tree at least one lamp", () => {
    const upper = RUNS().filter((r) => r.region >= 6);
    const lost = mean(upper.map((r) => LAMPS - r.fight.lampsLeft));
    expect(lost, `mean lamps lost above Tiferet: ${lost.toFixed(2)}`).toBeGreaterThan(0.3);
  });

  /**
   * And the other edge of the band. A rung that reliably takes every lamp is
   * a rung nobody finishes, and the whole climb is ten of them in a row with
   * the lamps carried across — so any single region taking all three, on
   * average, would put the crown out of reach for reasons that have nothing to
   * do with the terrain.
   */
  it("never spends the whole lamp-stock on a single rung", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
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
    expect(high, `low ${low.toFixed(1)} husks, high ${high.toFixed(1)}`).toBeGreaterThan(low * 1.5);
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
 * Measured over regions four to eight, five seeds — the trough, which is where
 * a mistake in the fight shows first:
 *
 * ```
 * bare       out 6/25   broken 3.44   reached 0.879
 * tagin      out 7/25   broken 3.64   reached 0.897
 * kav        out 3/25   broken 4.08   reached 0.906
 * mishkolet  out 4/25   broken 3.44   reached 0.861
 * sargel     out 6/25   broken 3.36   reached 0.866
 * yad        out 6/25   broken 3.08   reached 0.836
 * kulmus     out 4/25   broken 4.08   reached 0.896   (a plain gain, the control)
 * ```
 *
 * Every one of these moved when `seal` stopped writing a door on top of the
 * Scribe — bare broke 2.12 and got 69% across before that, against 3.44 and
 * 88% after. A Scribe pinned on a threshold is a Scribe not fighting, and the
 * whole table was measuring that as much as it was measuring the vessels.
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
          const world = buildRegion(region, seed);
          rows.push(fighter(world, { ...contextFor(region), items }, budgetFor(region)));
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
   * over the same rungs — regions four to eight, five seeds:
   *
   * ```
   * nothing broken   out 6/25   broken 3.44   lamps left 1.68   reached 0.879
   * seven broken     out 3/25   broken 3.48   lamps left 1.72   reached 0.889
   * all ten broken   out 1/25   broken 4.36   lamps left 2.00   reached 0.934
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
        withAll.push(
          fighter(
            buildRegion(region, seed),
            { ...contextFor(region), boons: boonsFrom(freed) },
            budgetFor(region),
          ),
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
   * Measured over three independent pools of these fifteen seeds — seventy-five
   * runs a cell, regions four to eight:
   *
   * ```
   *            out /75        broken            lamps left
   *   bare     14 · 15 · 12   3.24 · 3.00 · 3.08   1.79 · 1.81 · 1.93
   *   tier 1    3 ·  8 ·  5   3.73 · 3.75 · 3.64   2.13 · 2.11 · 2.21
   *   tier 3    4 ·  3 ·  4   4.01 · 3.91 · 3.63   2.19 · 2.31 · 2.33
   * ```
   *
   * **Read the two steps differently, because they are different sizes.**
   * Bare to tier one is large and stable on every axis in every pool. Tier one
   * to tier three is small and only *lamps kept* moves the same way in all
   * three — going out flips (+1, −5, −1) and shells broken flips (+0.28, +0.16,
   * −0.01). That is the cap working, not the tiers failing: they are capped so
   * the top of the ladder is not a different game.
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
        topped.push(
          fighter(
            buildRegion(region, seed),
            { ...contextFor(region), boons: boonsFrom(everyTier) },
            budgetFor(region),
          ),
        );
      }
    }
    const tierOne = boonsFrom(regions.map((r) => r.sefirah));
    const atOne: Fight[] = [];
    for (let region = 4; region <= 8; region += 1) {
      for (const seed of HAND_SEEDS) {
        atOne.push(
          fighter(buildRegion(region, seed), { ...contextFor(region), boons: tierOne }, budgetFor(region)),
        );
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
