import { describe, expect, it } from "vitest";
import { ILLUMINED_MULTIPLIER } from "./encounter";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "./regions";
import { readAscentTime } from "./sacredAscent";
import { GRACE_NEEDS, offerFor } from "./ushpizinOffers";
import { buildRegion, verbsOf } from "./world/build";
import { kindleCost } from "../storage/ascentRepo";

/**
 * Does a player ever meet these systems?
 *
 * This file is an audit turned into a check. The question it was written to
 * answer was whether the game is over-systemed — whether a first-time Scribe
 * in Malchut meets movement teaching, letters, graces, motes, husks, lamps, a
 * shrine, scroll fragments, a House, an Ushpizin bargain and a kindling choice
 * before they have seen a Word-Gate, and whether all of that earns its place.
 *
 * The audit found **nothing dead**, and it found it the hard way: the first
 * pass reported that the Ushpizin offers never fire in any of six hundred and
 * seventy-two situations, which turned out to be the audit calling `offerFor`
 * with the wrong arity. Every guest is there. That would have been the fourth
 * false alarm of the day, and it is exactly why the numbers now live in a test
 * rather than in something I remember.
 *
 * What each assertion protects is *exposure* — not that a system exists, which
 * a module graph already proves, but that a climb actually runs into it. A
 * system nobody meets is worse than one that was cut, because it still has to
 * be maintained.
 */

const SEEDS = [3, 91, 555, 12345, 777, 40404];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

describe("what a climb actually runs into", () => {
  /**
   * Seven rungs keep a House, and every one of them must keep a guest with
   * something to offer — the House plate is where the whole Ushpizin economy
   * is reached, and a rung whose figure had nothing to say would silently
   * remove a seventh of it.
   */
  it("keeps a guest on every rung that keeps a House", () => {
    for (const region of regions) {
      const offer = offerFor(region.sefirah);
      if (region.hasHouse) {
        expect(offer, `${region.name} keeps a House and no guest`).toBeDefined();
        expect(offer?.terms, `${region.name}'s guest asks nothing`).toBeTruthy();
      } else {
        expect(offer, `${region.name} keeps a guest but no House to meet them at`).toBeUndefined();
      }
    }
    // And the bargains are not all the same bargain: some are paid in light,
    // some are vows, or the choice is a price list.
    const vows = regions.map((r) => offerFor(r.sefirah)?.vow).filter(Boolean);
    expect(vows.length, "no guest asks for a vow").toBeGreaterThan(1);
  });

  /**
   * **A guest may not give what cannot be used.**
   *
   * The two lowest rungs both did. David handed over the Palm — a second
   * standing stone — at the first rung, and a standing stone needs Bet, found
   * at the eighth. Joseph handed over the Fish at the second, and the deep
   * needs Mem, found at the seventh. So the first two bargains a player is
   * ever offered were both inert, for six rungs and five, and nothing could
   * notice: a grace is granted by name and every name is valid.
   *
   * `GRACE_NEEDS` writes the dependency down and this reads it. It is a
   * sequencing rule, not a taste one — the boon has to work when it is given
   * or the bargain is a trick.
   */
  it("never lets a guest grant a power the Scribe cannot yet use", () => {
    for (const region of regions) {
      const offer = offerFor(region.sefirah);
      const needs = offer && GRACE_NEEDS[offer.grants];
      if (!offer || !needs) continue;
      const held = verbsOf([...lettersOnEntering(region.index), ...region.letters]);
      expect(
        held.includes(needs),
        `${region.name}'s guest gives ${offer.grantsLabel}, which needs "${needs}" — not held here`,
      ).toBe(true);
    }
  });

  /**
   * **Kindling has to be affordable, and it has to cost something.**
   *
   * This used to pin the price of one kindling to roughly one rung's sweep,
   * because on a line that is exactly what it was: ten rungs walked in order,
   * ten Sefirot kindled, one choice at each doorway. The Tree unpicked that.
   * A climb now buys all ten out of one purse — three hundred light against a
   * whole route — so a per-rung ratio is measuring a design that no longer
   * exists, and it failed the moment the price was set from measurement rather
   * than from that ratio.
   *
   * What is left here is the *exposure* question this file is for, which is
   * still worth asking: a Scribe standing on a rung must be able to see the
   * price as something between "already paid" and "never". The real balance
   * lives in `economy.test.ts`, which walks climbs and counts what they carry.
   */
  it("prices kindling within sight of what a rung holds", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const light = mean(
        SEEDS.map((seed) => buildRegion(region, seed).entities.filter((e) => e.kind === "mote").length),
      );
      const cost = kindleCost(region);
      expect(
        cost,
        `region ${region}: ${cost} light to kindle, ${light.toFixed(0)} lying in it — out of sight`,
      ).toBeLessThan(light * 4);
      expect(cost, `region ${region} kindles for ${cost}, which is nothing`).toBeGreaterThan(
        light * 0.2,
      );
    }
  });

  /**
   * The day's grace is the one system whose exposure is set by the calendar
   * rather than by the game, and a gesture that came round twice a year would
   * be an ornament. Counted across a whole Gregorian year against the real
   * Hebrew calendar: it is live on roughly one day in four.
   */
  it("lends the day's grace often enough to be a system", () => {
    const start = new Date(2026, 0, 1);
    let graced = 0;
    for (let i = 0; i < 365; i += 1) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (readAscentTime(day).graceOfTheDay) graced += 1;
    }
    expect(graced, `only ${graced} days of 365 lend a grace`).toBeGreaterThan(40);
    // And not so many that the unlent day is the exception.
    expect(graced).toBeLessThan(200);
  });

  /** The Encounter's lit rung is worth going to, or it is a label on a number. */
  it("makes the illumined rung worth more than the others", () => {
    expect(ILLUMINED_MULTIPLIER).toBeGreaterThan(1);
  });

  /**
   * Every rung holds light, klipot and a way through. The count is not the
   * point — the point is that no rung is empty of the things the loop is made
   * of, which is what "over-systemed" would look like if it were the opposite.
   */
  it("puts light and klipot on every rung", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        expect(
          world.entities.filter((e) => e.kind === "mote").length,
          `region ${region} seed ${seed} holds no light`,
        ).toBeGreaterThan(0);
        expect(world.husks.length, `region ${region} seed ${seed} holds no klipot`).toBeGreaterThan(0);
        expect(
          world.entities.some((e) => e.kind === "exit"),
          `region ${region} seed ${seed} has no way out`,
        ).toBe(true);
      }
    }
  });
});
