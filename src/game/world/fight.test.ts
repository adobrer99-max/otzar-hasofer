import { describe, expect, it } from "vitest";
import { abilityByLetter } from "../abilities";
import { LAMPS } from "../combat";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { buildRegion, tileAt, verbsOf } from "./build";
import { step, type StepContext } from "./step";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input, type World } from "./types";

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

const TICK_BUDGET = 24000;

export interface Fight {
  reached: number;
  finished: boolean;
  out: boolean;
  lampsLeft: number;
  broken: number;
  standing: number;
  veilings: number;
  ticks: number;
}

/**
 * A Scribe who fights back — the traversal probe with three things added.
 *
 * It is deliberately *the same walker*, so any difference between this and the
 * traversal numbers is the fight and nothing else. What it adds:
 *
 * 1. **It writes at what is in front of it**, on a rhythm no faster than the
 *    mark's own cooldown, and only when a husk is within the mark's reach and
 *    roughly at its own height — throwing at something two floors up is how a
 *    bot convinces itself the marks do nothing.
 * 2. **It backs off from something too close.** Not a dodge in any skilled
 *    sense: a hand's worth of retreat when a husk is inside a body's width,
 *    which is the difference between playing and walking into things. Without
 *    it this measures a Scribe standing still and being eaten, which is the
 *    floor rather than the game.
 * 3. **It stops walking into a husk it cannot break.** Some kinds are only
 *    open from a direction; the retreat covers that too.
 */
function fighter(world: World, ctx: StepContext, ticks: number): Fight {
  const p0 = world.player;
  let reached = p0.x;
  let mark = p0.x;
  let stuckFor = 0;
  let holdJump = 0;
  let backAway = 0;
  let i = 0;

  for (; i < ticks && !world.finished && !world.out; i += 1) {
    const p = world.player;
    const progressing = p.x > mark + 0.5;
    stuckFor = progressing ? 0 : stuckFor + 1;
    mark = Math.max(mark, p.x);

    const aheadX = Math.floor((p.x + p.w / 2) / TILE_SIZE) + 1;
    const footRow = Math.floor((p.y + p.h + 1) / TILE_SIZE);
    const gapAhead =
      p.onGround &&
      tileAt(world, aheadX, footRow) === Tile.Empty &&
      tileAt(world, aheadX, footRow + 1) === Tile.Empty;

    const ownX = Math.floor((p.x + p.w / 2) / TILE_SIZE);
    let groundBelow = false;
    for (let ty = Math.floor((p.y + p.h) / TILE_SIZE) + 1; ty < world.height && !groundBelow; ty += 1) {
      const t = tileAt(world, ownX, ty);
      if (t === Tile.Stone || t === Tile.Ledge) groundBelow = true;
    }

    let barrierAhead = false;
    for (let d = 1; d <= 3 && !barrierAhead; d += 1) {
      for (let up = 0; up <= 2 && !barrierAhead; up += 1) {
        const t = tileAt(world, ownX + d, footRow - up);
        if (t === Tile.Thorn || t === Tile.Growth || t === Tile.Door) barrierAhead = true;
      }
    }

    // The nearest husk ahead and within a mark's reach — with its height, so
    // the throw can be angled. Holding up or down tilts a mark by 0.62, which
    // is what `throwMark` does with it, and a probe that only ever throws flat
    // simply cannot answer a drifter: two of the runs that went out had broken
    // *nothing*, because everything that killed them was above the line.
    let nearest: number | undefined;
    let nearestDy = 0;
    for (const husk of world.husks) {
      const dx = husk.x - p.x;
      if (dx < -TILE_SIZE || dx > TILE_SIZE * 9) continue;
      const dy = husk.y - p.y;
      if (Math.abs(dy) > TILE_SIZE * 4) continue;
      if (nearest === undefined || dx < nearest) {
        nearest = dx;
        nearestDy = dy;
      }
    }
    const aimUp = nearest !== undefined && nearestDy < -TILE_SIZE * 0.75;
    const aimDown = nearest !== undefined && nearestDy > TILE_SIZE * 0.75;

    // Give ground, then stand and write. The retreat has a floor as well as a
    // ceiling: a crawler that keeps walking into you re-triggers the retreat
    // every tick, and a probe that only ever retreats backs down the whole
    // region without throwing a single mark. Twelve ticks of giving ground,
    // then at least twelve of standing — which is when the marks go out.
    backAway -= 1;
    if (nearest !== undefined && nearest < p.w * 1.5 && backAway <= -12) backAway = 12;

    const backingOff = backAway > 0 || (stuckFor > 90 && stuckFor % 150 < 45);
    const wantJump =
      !backingOff && (gapAhead || p.clinging !== 0 || (stuckFor > 6 && i % 9 === 0));
    if (wantJump) holdJump = 20;
    else if (holdJump > 0) holdJump -= 1;

    const input: Input = {
      ...NO_INPUT,
      right: !backingOff,
      left: backingOff,
      jump: wantJump,
      jumpHeld: holdJump > 0 || stuckFor > 6,
      up: p.inWater || p.climbing || (aimUp && !backingOff),
      down: aimDown && !backingOff && p.onGround === false,
      act:
        barrierAhead ||
        (!p.onGround && p.vy > 0 && !groundBelow && !p.grappleTo) ||
        (p.onGround && stuckFor > 10 && i % 7 === 0),
      dash: (!p.onGround && p.vy > 40 && !groundBelow) || (stuckFor > 14 && i % 21 === 0),
      // The whole of what this file adds — and note the `!backingOff`. A mark
      // flies the way the body faces, and a retreating body faces the way it
      // is retreating, so a probe that throws while backing off throws every
      // mark *away* from the thing chasing it. It read as the klipot being
      // brutal and the marks being feeble; it was the bot shooting backwards.
      strike: !backingOff && nearest !== undefined && p.markCooldown === 0,
    };

    step(world, input, ctx);
    reached = Math.max(reached, world.player.x);
  }

  return {
    reached,
    finished: world.finished,
    out: Boolean(world.out),
    lampsLeft: world.player.lamps,
    broken: world.husksBroken,
    standing: world.husks.length,
    veilings: world.veilings,
    ticks: i,
  };
}

// Ten rather than six. The per-rung rate is a share of these, and at six seeds
// a single unlucky layout moves a rung by seventeen points — which is noise
// being read as balance.
const SEEDS = [3, 91, 555, 12345, 777, 40404, 8, 1234, 60606, 31337];

/** Every region, every seed, with a Scribe who fights. Measured once, reused. */
const RUNS = (() => {
  const rows: { region: number; seed: number; fight: Fight; span: number }[] = [];
  for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
    for (const seed of SEEDS) {
      const world = buildRegion(region, seed);
      const span = world.width * TILE_SIZE;
      rows.push({ region, seed, fight: fighter(world, contextFor(region), TICK_BUDGET), span });
    }
  }
  return rows;
})();

const forRegion = (region: number) => RUNS.filter((r) => r.region === region);
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
    const went = RUNS.filter((r) => r.fight.out);
    const share = went.length / RUNS.length;
    const where = went
      .map((r) => `region ${r.region} seed ${r.seed} at ${((r.fight.reached / r.span) * 100).toFixed(0)}%`)
      .join("; ");
    expect(share, `${went.length} of ${RUNS.length} went out — ${where}`).toBeLessThan(0.2);
  });

  /** And no single rung may be the one that ends most climbs. */
  it("has no rung that reliably puts a Scribe out", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const rows = forRegion(region);
      const out = rows.filter((r) => r.fight.out).length;
      expect(out / rows.length, `region ${region} put ${out} of ${rows.length} runs out`).toBeLessThan(
        0.5,
      );
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
      expect(
        share,
        `region ${region}: only ${(share * 100).toFixed(0)}% of ${placed.toFixed(1)} husks broken`,
      ).toBeGreaterThan(0.2);
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
    const upper = RUNS.filter((r) => r.region >= 6);
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
    const low = mean(RUNS.filter((r) => r.region <= 3).map((r) => r.fight.broken + r.fight.standing));
    const high = mean(RUNS.filter((r) => r.region >= 8).map((r) => r.fight.broken + r.fight.standing));
    expect(high, `low ${low.toFixed(1)} husks, high ${high.toFixed(1)}`).toBeGreaterThan(low * 1.5);
    // And the declared curve is what put them there.
    expect(regions[TOTAL_REGIONS - 1].klipot.count).toBeGreaterThan(regions[0].klipot.count);
  });
});
