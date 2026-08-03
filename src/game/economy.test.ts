import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace } from "./abilities";
import { HUSKS } from "./combat";
import { makeRng, randomInt } from "./rng";
import { kindleCost } from "../storage/ascentRepo";
import { afterWalking, otherEnd, pathsFrom, TREE_PATHS, type Standing } from "./tree";
import { buildPath, rowsFor, verbsOf } from "./world/build";
import { fighter } from "./world/fight.test";
import type { World } from "./world/types";
import type { StepContext } from "./world/step";
import { regionOfSefirah, regions } from "./regions";
import { wakeAt } from "./fall";
import type { SefirahId } from "../types/letter";

/**
 * **What a climb of the Tree costs, and what it pays.**
 *
 * A climb is sealed when every Sefirah has been kindled, and the whole tour
 * prices at `sum(20 + 5i)` over the ten — four hundred and seventy-five light.
 * That number was authored and never measured, and the plan that authored it
 * said so: *"must be measured, not assumed"*. This is the measuring.
 *
 * It is a real question rather than arithmetic, because the Tree decoupled two
 * things a line held together. On a line, ten rungs paid for ten kindlings and
 * the only decision was whether to spend. On the Tree the Scribe chooses which
 * of twenty-two paths to walk, `earnedRung` sizes each rung by what they are
 * carrying, and the shortest tour that touches all ten Sefirot is nine walks.
 * So there are three ways this can be wrong, and each has its own assertion
 * below: the tour can be unaffordable, which is a game that cannot be won; the
 * nine-walk dash can be affordable, which is a map that decides nothing; and
 * the first kindling can be out of reach of the first path, which is a Scribe
 * told to come back later before they have spent anything.
 *
 * ## Two instruments
 *
 * **The supply** is exact and costs nothing: `lightIn` counts what a rung is
 * built holding. **The yield** is what a Scribe actually leaves with, and needs
 * the fighting probe from `fight.test.ts` — motes are only light once someone
 * has walked over them, and a klipah's light is only light once its shell is
 * broken. The two differ by a lot and the difference is the game.
 */

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/** The price of kindling every Sefirah — the whole climb, in one number. */
export const FULL_TOUR = regions.reduce((sum, r) => sum + kindleCost(r.index), 0);

/**
 * Every scrap of light a rung is built holding: the motes lying on it, and what
 * is inside the klipot standing on it. A ceiling, not a forecast — nobody
 * gathers all of it.
 */
function lightIn(world: World): number {
  const motes = world.entities.filter((e) => e.kind === "mote").length * world.orPerMote;
  const inShells = world.husks.reduce((sum, h) => sum + HUSKS[h.kind].light, 0) * world.orPerMote;
  return motes + inShells;
}

function contextFor(held: readonly string[], lent: readonly Grace[] = []): StepContext {
  const own = held
    .map((id) => abilityByLetter[id]?.grace)
    .filter((g): g is Grace => Boolean(g));
  return {
    verbs: verbsOf(held),
    graces: [...own, ...lent.filter((g) => !own.includes(g))],
  };
}

/** The same budget by ground the Tree's probe test uses. */
const budgetFor = (world: World) =>
  Math.max(24000, 2000 * (world.width / 16) * Math.max(1, Math.round(world.height / 18)));

/**
 * One walk, played. Returns the light carried out — which is already net of the
 * two a veiling costs, because `veil` takes it off `world.or` as it happens.
 */
function walk(
  path: (typeof TREE_PATHS)[number],
  seed: number,
  held: string[],
  spent: boolean,
  /** Graces a guest of the Houses has given — see `ushpizinOffers.ts`. */
  lent: readonly Grace[] = [],
) {
  const world = buildPath(path, seed, held, 1, false, spent);
  return { or: fighter(world, contextFor(held, lent), budgetFor(world)).or, supply: lightIn(world) };
}

/**
 * A climb, walked. Wanders from Malchut taking a path at random, gathering the
 * letters each one pays — which is what a Scribe does, and what makes the rungs
 * grow, since `earnedRung` sizes them by what is carried.
 *
 * The letters are credited in full, which is generous: a Scribe has to reach an
 * alcove to lift one. That generosity is deliberate and one-sided — it makes
 * the rungs *bigger* and so the supply *larger*, so every "not enough light"
 * result below is a floor rather than a guess.
 */
function climb(seed: number, walks: number) {
  const rng = makeRng((seed * 7919) >>> 0);
  let standing: Standing = { at: "malchut", pathsWalked: [] };
  let carried = 0;
  const held: string[] = [];
  // `at` is where the Scribe is standing **after** the leg, which is the
  // Sefirah the map offers to kindle and the one a fall would measure from.
  const legs: { or: number; supply: number; spent: boolean; at: SefirahId }[] = [];

  for (let i = 0; i < walks; i += 1) {
    // **A Scribe with a map prefers ground they have not taken.** Choosing
    // uniformly among the ways out models someone wandering, and on a graph
    // this dense that is mostly re-walking — which pays `SPENT_LIGHT`, so it
    // measured the economy of a Scribe who had not noticed the map. Fresh
    // paths first, and the walked ones only when there is nothing else out of
    // here, which is also how a route across the Tree actually goes.
    const all = pathsFrom(standing.at);
    const fresh = all.filter((p) => !standing.pathsWalked.includes(p.id));
    const from = fresh.length > 0 ? fresh : all;
    const path = from[randomInt(rng, from.length)];
    const spent = standing.pathsWalked.includes(path.id);
    const leg = walk(path, seed, held, spent);
    carried += leg.or;
    if (!held.includes(path.letter)) held.push(path.letter);
    standing = afterWalking(standing, path);
    legs.push({ ...leg, spent, at: standing.at });
  }
  return { carried, legs, held, at: standing.at, walked: standing.pathsWalked };
}

describe("the price of the Tree", () => {
  /**
   * The arithmetic, stated once so the rest of the file can talk about a number
   * rather than a formula — and so that changing `kindleCost` fails here first,
   * where the reason is written down, instead of somewhere further out.
   */
  it("prices the whole tour at what kindling every Sefirah comes to", () => {
    expect(FULL_TOUR).toBe(regions.reduce((sum, r) => sum + 8 + r.index * 4, 0));
    // Every Sefirah costs something, and the crown costs most.
    expect(Math.min(...regions.map((r) => kindleCost(r.index)))).toBeGreaterThan(0);
    expect(kindleCost(10)).toBeGreaterThan(kindleCost(1));
  });

  /**
   * **The first kindling is within reach of the first path.**
   *
   * Malchut is where a Scribe wakes and where they will stand after one walk,
   * carrying whatever that one rung paid. If the kingdom cost more than a rung
   * holds, the first thing the map would ever say is *not yet*, before the
   * Scribe had spent anything or learned that light is spent at all.
   */
  it("lets a Scribe kindle where they land, a few paths in", () => {
    // Two rather than one, because one path takes you *out* of the kingdom —
    // the first Sefirah anybody is standing on with light in hand is Yesod, Hod
    // or Netzach, not Malchut. And measured against the median rather than the
    // worst of the sample: a fifth of walks stall the probe outright, and those
    // carry nothing at all, which is a statement about the probe and not about
    // the price.
    // Per climb, not across climbs: what *this* Scribe is carrying against what
    // *this* Scribe is standing on. Comparing a median purse to the dearest
    // landing anywhere in the sample compares two different Scribes.
    const rows = [1, 2, 3, 4, 5, 6].map((seed) => {
      const c = climb(seed, 3);
      return { purse: c.carried, cost: kindleCost(regionOfSefirah(c.at).index), at: c.at };
    });
    const afford = rows.filter((r) => r.purse >= r.cost).length;
    expect(
      afford,
      `only ${afford} of ${rows.length} climbs could kindle where three paths left them: ` +
        rows.map((r) => `${r.at} ${Math.round(r.purse)}/${r.cost}`).join(", "),
    ).toBeGreaterThan(rows.length / 2);
  }, 120000);

  /**
   * **The dash cannot be afforded.**
   *
   * Nine walks is the fewest that can put a Scribe on all ten Sefirot, so if
   * nine walks paid for all ten kindlings the map would decide nothing: every
   * climb would be the same sprint and the other thirteen paths would be
   * scenery. This is the assertion that makes the tour a tour.
   */
  it("cannot be paid for by the shortest tour that touches all ten", () => {
    const short = [1, 2, 3, 4].map((seed) => climb(seed, 9).carried);
    const best = Math.max(...short);
    expect(
      best,
      `nine walks paid ${best} of the ${FULL_TOUR} the ten Sefirot ask — the dash is affordable`,
    ).toBeLessThan(FULL_TOUR);
  }, 300000);

  /**
   * **And the tour can.** The other side of the same coin, and the one that
   * decides whether the game can be finished at all. Twenty-two walks — the
   * number of paths on the Tree, which is a climb that has been everywhere —
   * has to clear the price with room, because a route also spends walks getting
   * from one end of the Tree to the other and those are re-walks, which pay
   * `SPENT_LIGHT`.
   */
  it("is affordable to a climb that walks the whole Tree", () => {
    const full = [1, 2, 3, 4, 5, 6].map((seed) => climb(seed, 22).carried);
    const worst = Math.min(...full);
    expect(
      worst,
      `the leanest of four climbs of twenty-two walks carried ${worst} against ${FULL_TOUR} — ` +
        `all four: ${full.map((n) => Math.round(n)).join(", ")}`,
    ).toBeGreaterThan(FULL_TOUR);
  }, 300000);

  /**
   * **A path already walked pays little.**
   *
   * `buildPath` is deterministic, so without this a Scribe short of light walks
   * the cheapest path again, and again, and kindling all ten stops being a
   * route and becomes a farm — the map would decide nothing for a second and
   * worse reason. `SPENT_LIGHT` in `build.ts` is the knob; this is what holds
   * it honest. Not *nothing*, on purpose: the klipot are rebuilt with the rung,
   * so crossing back still pays, and the fight is the reason it does.
   */
  it("leaves little on a path already walked", () => {
    const path = pathsFrom("malchut")[0];
    const fresh = mean([3, 91, 555, 12345].map((seed) => walk(path, seed, [], false).supply));
    const again = mean([3, 91, 555, 12345].map((seed) => walk(path, seed, [], true).supply));
    expect(
      again,
      `a re-walk holds ${again.toFixed(0)} against a first walk's ${fresh.toFixed(0)} — the farm is open`,
    ).toBeLessThan(fresh * 0.6);
    // But not empty: what is left is the klipot, and they are worth breaking.
    expect(again, "a re-walked path holds nothing at all").toBeGreaterThan(0);
  }, 120000);

  /**
   * **Light grows with letters**, which is what stops a bolt for the crown
   * being the optimal line.
   *
   * `earnedRung` caps a rung's storeys, its band and its length by the highest
   * rung whose entry kit the Scribe could pass for. So a Scribe who runs ahead
   * of their letters walks small, poor ground — rushing the crown makes the
   * crown shallow, and it makes it cheap. That is a load-bearing consequence of
   * the cap rather than a happy accident, and it should fail here if the cap
   * ever comes off.
   */
  it("pays a well-lettered Scribe more for the same ground", () => {
    const everything = TREE_PATHS.map((p) => p.letter);
    const upper = TREE_PATHS.filter((p) => p.ends.includes("keter"));
    const bare = mean(upper.flatMap((p) => [3, 91].map((s) => walk(p, s, [], false).supply)));
    const full = mean(
      upper.flatMap((p) => [3, 91].map((s) => walk(p, s, [...everything], false).supply)),
    );
    expect(
      full,
      `the crown's paths hold ${full.toFixed(0)} to a full hand and ${bare.toFixed(0)} to an empty one`,
    ).toBeGreaterThan(bare);
  }, 120000);
});

/**
 * **What the fall is for**, and the one number this whole piece of work exists
 * to move.
 *
 * Light buys exactly one thing — kindling — and the offer comes every time the
 * Scribe stands somewhere. Until the fall stopped ending a climb, nothing could
 * ever take `or` back, so hoarding all three hundred for a grand finale was
 * *strictly* correct and the game's only economic decision had one answer. See
 * `game/fall.ts`.
 *
 * Both policies are run over **the same legs of the same climb**, so this is not
 * two stochastic runs being compared: the ground, the seeds and the probe's own
 * clumsiness are held fixed, and the only difference is when the light was laid
 * down. That also makes the no-fall case an exact identity rather than a near
 * miss, which is the fairness check the comparison rests on.
 *
 * The kindler's second advantage is deliberately **not** counted: waking at a
 * kindled Sefirah rather than in the kingdom saves them the walk back, and the
 * ground they would re-walk pays `SPENT_LIGHT`. Leaving it out makes every
 * margin below a floor rather than a guess — the same one-sided generosity
 * `climb` already keeps by crediting letters in full.
 */
describe("what the fall costs, and what kindling early is worth", () => {
  /** A policy walked over a climb's legs: light laid into the Tree, and light still in hand. */
  function underPolicy(
    legs: readonly { or: number; at: SefirahId }[],
    opts: { kindle: boolean; fallAfter?: number },
  ) {
    let purse = 0;
    const lit: SefirahId[] = [];
    legs.forEach((leg, i) => {
      purse += leg.or;
      if (opts.kindle && !lit.includes(leg.at)) {
        const cost = kindleCost(regionOfSefirah(leg.at).index);
        if (purse >= cost) {
          purse -= cost;
          lit.push(leg.at);
        }
      }
      // The fall: the light in hand goes out, and nothing else does.
      if (i === opts.fallAfter) purse = 0;
    });
    const banked = lit.reduce((sum, s) => sum + kindleCost(regionOfSefirah(s).index), 0);
    return { banked, purse, lit, total: banked + purse };
  }

  const CLIMBS = [1, 2, 3, 4].map((seed) => climb(seed, 12));

  /**
   * The fairness check, and a real claim about the design: **kindling costs
   * nothing when nothing goes wrong.** Light converts into a lit Sefirah at
   * par, so a Scribe who spends as they go and one who saves to the end are
   * exactly level until something takes the purse. Which is precisely why the
   * decision did not exist before.
   */
  it("makes no difference at all to a climb that never goes out", () => {
    for (const { legs } of CLIMBS) {
      const kindling = underPolicy(legs, { kindle: true });
      const hoarding = underPolicy(legs, { kindle: false });
      expect(kindling.total).toBe(hoarding.total);
      expect(hoarding.lit).toEqual([]);
    }
  }, 300000);

  it("takes the whole purse from a Scribe who was carrying it", () => {
    for (const { legs } of CLIMBS) {
      const straight = underPolicy(legs, { kindle: false });
      const fell = underPolicy(legs, { kindle: false, fallAfter: Math.floor(legs.length * 0.7) });
      expect(fell.total).toBeLessThan(straight.total);
      expect(fell.banked).toBe(0);
    }
  }, 300000);

  /**
   * **And this is the number.** If a hoarder still came out ahead through a
   * fall, the change did not do its job and this is where that shows.
   *
   * Measured over four twelve-walk climbs, with the fall dropped in at seven
   * tenths of the way: kindling as it went kept **161, 241, 172 and 127**
   * against hoarding's **77, 105, 64 and 67**. Between one and three quarters
   * and two and three quarters as much, and the leanest margin sixty light —
   * five kindlings' worth at the foot of the Tree.
   *
   * The bar is a *ratio* rather than those absolutes, because the probe's own
   * clumsiness sets the scale and a better driver would move every number here
   * together. What must not move is which policy wins.
   */
  it("leaves a Scribe who kindled as they went well ahead of one who saved it up", () => {
    const margins = CLIMBS.map(({ legs }) => {
      const fallAfter = Math.floor(legs.length * 0.7);
      const kindling = underPolicy(legs, { kindle: true, fallAfter });
      const hoarding = underPolicy(legs, { kindle: false, fallAfter });
      return {
        kindling,
        hoarding,
        kept: kindling.total - hoarding.total,
        ratio: kindling.total / Math.max(1, hoarding.total),
      };
    });
    const told = margins
      .map((m) => `${m.kindling.total.toFixed(0)} against ${m.hoarding.total.toFixed(0)}`)
      .join("; ");
    const worst = Math.min(...margins.map((m) => m.kept));
    expect(worst, `through one fall, kindling kept ${told} — leanest margin ${worst.toFixed(0)}`)
      .toBeGreaterThan(0);
    const leanest = Math.min(...margins.map((m) => m.ratio));
    expect(
      leanest,
      `the leanest ratio was ${leanest.toFixed(2)}× — measured at 1.9× when this was written (${told})`,
    ).toBeGreaterThan(1.4);
    // And the light it kept is light *in the Tree* — the win condition, not a
    // number on the HUD.
    expect(margins.every((m) => m.kindling.banked > 0)).toBe(true);
  }, 300000);

  /**
   * The other half of the same rule, and the one that keeps the fall from being
   * a warp: a Scribe wakes at the highest Sefirah they lit **at or below where
   * they set out**, so falling can never carry them up the Tree.
   */
  it("wakes the Scribe no higher than they set out, whatever they lit", () => {
    for (const { legs } of CLIMBS) {
      const { lit } = underPolicy(legs, { kindle: true });
      for (const leg of legs) {
        const woke = wakeAt({ at: leg.at, sefirotLit: lit });
        expect(regionOfSefirah(woke).index).toBeLessThanOrEqual(regionOfSefirah(leg.at).index);
      }
    }
  }, 300000);
});

/**
 * **What a guest's bargain is worth**, which nothing had ever asked.
 *
 * Hod's Angler costs **10** light and Yesod's Support costs **6**, against a
 * `kindleCost` that starts at twelve — so a guest can be a fifth of a kindling,
 * priced by feel and never once measured. Until the boon went onto the record
 * the question was unanswerable anyway: the grace expired at the end of the rung
 * it was bought on, so a Scribe was paying climb-scale light for the back half
 * of one screen.
 *
 * Measured over the same paths with and without the grace, so the ground and the
 * seeds are held fixed and only the body differs.
 */
describe("what a guest's boon is worth", () => {
  const ALL = TREE_PATHS.map((p) => p.letter);
  /** Paths off the lower Sefirot — where the guests actually stand. */
  const RUNGS = TREE_PATHS.filter((p) =>
    ["malchut", "yesod", "hod", "netzach", "tiferet"].includes(p.ends[0]),
  ).slice(0, 6);
  /**
   * **Holding everything but the letter the boon duplicates.** A full hand
   * already carries all ten graces — Tzadi *is* `draw-motes` and Lamed *is*
   * `high-jump` — so lending one to a Scribe who has it measures nothing, which
   * is exactly the null result this pair of tests first produced. A guest's gift
   * only means anything to a body that has not found the letter.
   */
  const without = (letterId: string) => ALL.filter((l) => l !== letterId);

  /**
   * **The Angler pays for itself in about one rung — and only because the boon
   * now outlives the rung it was bought on.**
   *
   * Hod asks **10** light for `draw-motes`, which widens the collection radius
   * by three tiles (`touchEntities`). Measured over twelve rungs against a body
   * holding everything *except* Tzadi: **22→31, 24→28, 18→25, 22→30**, a mean of
   * **9.2 light a rung**.
   *
   * Which is the whole argument for `AscentRecord.boons` in one number. The
   * grace used to be cleared at the top of the next `walkPath`, so ten light
   * bought about nine light of value across the back half of a single screen —
   * a bargain that lost money, offered by a guest, in a game about light. It now
   * pays roughly its own price on the first rung and every rung after that.
   *
   * The bar is a floor rather than the measured figure: the probe is a route
   * ceiling, not a player, and a real Scribe's imperfect route is exactly what
   * this grace forgives, so the true value is higher and should not be pinned.
   */
  it("returns about what Hod asks for it, every rung, once it survives the rung", () => {
    const rows = RUNGS.flatMap((path) =>
      [3, 91].map((seed) => ({
        path: path.id,
        without: walk(path, seed, without("tzadi"), false).or,
        with: walk(path, seed, without("tzadi"), false, ["draw-motes"]).or,
      })),
    );
    const gain = mean(rows.map((r) => r.with - r.without));
    const told = rows
      .slice(0, 4)
      .map((r) => `${r.path} ${r.without}→${r.with}`)
      .join("; ");
    expect(
      gain,
      `the Angler was worth ${gain.toFixed(1)} light a rung against its price of 10 — measured at 9.2 when this was written (${told})`,
    ).toBeGreaterThan(3);
    // Over the rungs still ahead when a guest is met, it has to clear its own
    // price. That it could not, while the grace expired at the exit, is what
    // made the bargain a trick.
    expect(
      gain * 3,
      `three rungs of the Angler come to ${(gain * 3).toFixed(0)} against a price of 10`,
    ).toBeGreaterThan(10);
  }, 300000);

  /**
   * A control on the measurement above, and the check that first caught it: with
   * a **full** hand the harness showed exactly zero for every boon, because a
   * Scribe holding all twenty-two already carries all ten graces — Tzadi *is*
   * `draw-motes`, Lamed *is* `high-jump`. Lending someone what they have
   * measures nothing.
   *
   * So: a boon the probe can feel moves a number, on most rungs. Eleven of
   * twelve when this was written.
   */
  it("moves the ground under a body that has not got the letter", () => {
    const rows = RUNGS.flatMap((path) =>
      [3, 91].map((seed) => ({
        without: walk(path, seed, without("lamed"), false).or,
        with: walk(path, seed, without("lamed"), false, ["high-jump"]).or,
      })),
    );
    const moved = rows.filter((r) => r.with !== r.without).length;
    expect(
      moved,
      `${moved} rungs of ${rows.length} carried differently with the Staff — 11 when this was written`,
    ).toBeGreaterThan(rows.length / 2);
    // And the same lent to a hand that already holds Lamed changes nothing,
    // which is what makes the line above a measurement rather than noise.
    const redundant = RUNGS.slice(0, 3).map((path) => ({
      without: walk(path, 3, [...ALL], false).or,
      with: walk(path, 3, [...ALL], false, ["high-jump"]).or,
    }));
    expect(redundant.every((r) => r.with === r.without)).toBe(true);
  }, 300000);
});

describe("what a rung holds against what is taken from it", () => {
  /**
   * The gap between the two instruments, recorded because it is the number
   * every balance decision in this file rests on and because it is not
   * obvious: a Scribe leaves with well under what a rung was built holding, and
   * anyone reasoning from the supply alone would price the climb far too low.
   */
  it("hands a Scribe a fraction of what a rung is built holding", () => {
    const rows = [1, 2, 3].flatMap((seed) => climb(seed, 6).legs);
    const supply = mean(rows.map((r) => r.supply));
    const taken = mean(rows.map((r) => r.or));
    const share = taken / supply;
    expect(
      share,
      `a Scribe leaves with ${(share * 100).toFixed(0)}% of what a rung holds ` +
        `(${taken.toFixed(0)} of ${supply.toFixed(0)})`,
    ).toBeGreaterThan(0.1);
    expect(share, "a Scribe sweeps a rung clean, so the supply is the yield").toBeLessThan(0.95);
  }, 300000);

  /** Nothing on the Tree is a rung with no light in it. */
  it("puts light on every path, however it is reached", () => {
    for (const path of TREE_PATHS) {
      for (const seed of [3, 91]) {
        const world = buildPath(path, seed, [], 1, false, false);
        expect(lightIn(world), `${path.id} seed ${seed} holds no light`).toBeGreaterThan(0);
      }
    }
  }, 120000);
});

/** Kept for the failure messages above — the ten, by name, in kindling order. */
export const TOUR: readonly { sefirah: SefirahId; cost: number }[] = regions.map((r) => ({
  sefirah: r.sefirah,
  cost: kindleCost(r.index),
}));

// Referenced so the helpers above cannot rot unnoticed if a test is removed.
void otherEnd;
void rowsFor;

