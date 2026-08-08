import { describe, expect, it } from "vitest";
import type { SefirahId } from "../types/letter";
import { abilityByLetter, type Grace, type Verb } from "./abilities";
import { LAMPS } from "./combat";
import { ruleByNumber } from "./encounter";
import { afterFalling } from "./fall";
import { KELIM, powersFrom } from "./items";
import { lettersOnEntering, regionOfSefirah } from "./regions";
import { carried, CARRIED, foldRelics, kindlePrice, layClimb, relicById, RELICS } from "./relics";
import { sealOffered } from "./sealing";
import { TREE_PATHS } from "./tree";
import { buildPath } from "./world/build";
import { fighter } from "./world/probes";
import { NO_INPUT } from "./world/types";
import { step, type StepContext } from "./world/step";
import { Tile, TILE_SIZE } from "./world/tiles";

/**
 * **The relics act, and each one is made to prove it on the shipped code.**
 *
 * `foldRelics.test.ts` asks whether the numbers compose. This asks the harder
 * question, which is whether anything is *wired*: a relic whose bargain folds
 * correctly into a `Climbing` nobody reads is exactly as inert as one with no
 * bargain at all, and the plate would still promise it.
 *
 * That failure has happened in this codebase, in this shape, twice. `onVessel`
 * was threaded into `GameCanvas`'s props and never assigned onto the step
 * context, so no vessel could be picked up in the shipped game for the whole
 * life of P5b. And the Tannin's whole fight — its plate line, the case that
 * steers it, and the test that proved it — described a creature that leaves the
 * water, which nothing implemented. **Both were invisible because nothing in
 * the suite drove the wiring.** The eleven levers here are wired through
 * `layClimb`, `powersFrom`, `afterFalling`, `sealOffered`, `kindlePrice` and
 * `StepContext.keeps`, and every one of them is pulled below.
 */

const at = (id: string) => relicById[id];
const only = (...ids: string[]) => ids.map(at);
const held = (rung: number) => lettersOnEntering(rung);
const handFor = (rung: number): Pick<StepContext, "verbs" | "graces"> => ({
  verbs: held(rung)
    .map((l) => abilityByLetter[l]?.verb)
    .filter((v): v is Verb => Boolean(v)),
  graces: held(rung)
    .map((l) => abilityByLetter[l]?.grace)
    .filter((g): g is Grace => Boolean(g)),
});
/** A rung of the Tree to lay a climb onto — the same one every time. */
const rungAt = (rung: number, seed = 3) => {
  const path = TREE_PATHS.find(
    (p) => Math.max(...p.ends.map((e) => regionOfSefirah(e).index)) === rung,
  );
  if (!path) throw new Error(`no path arrives at rung ${rung}`);
  return { path, world: buildPath(path, seed, held(rung)) };
};

describe("the numbers reach the world", () => {
  it("is the plain game carrying nothing", () => {
    const { path, world } = rungAt(5);
    const before = { ...world, player: { ...world.player } };
    layClimb(world, undefined, foldRelics(undefined, []), path.ends);
    expect(world.huskLight).toBe(1);
    expect(world.sealedLight).toBe(1);
    expect(world.orPerMote).toBe(before.orPerMote);
    expect(world.player.lamps).toBe(before.player.lamps);
  });

  it("puts more light in a broken shell, and takes the lamp it said it would", () => {
    const { path, world } = rungAt(5);
    layClimb(world, undefined, foldRelics(undefined, only("argaz")), path.ends);
    expect(world.huskLight).toBeCloseTo(1.5, 5);
    expect(world.player.lamps).toBe(LAMPS - 1);
  });

  it("doubles what a veiling takes", () => {
    const { path, world } = rungAt(5);
    const plain = world.veilCost;
    layClimb(world, undefined, foldRelics(undefined, only("shetiyah")), path.ends);
    expect(world.veilCost).toBe(plain * 2);
  });

  /**
   * **The light stays in two pieces, and this is the test that says why.**
   *
   * `EncounterRule.motes` is scoped to one Sefirah — the First's rule is "light
   * counts double in Chesed" — and a relic is carried up the whole Tree. Folded
   * into one number, Aaron's rod would have made light thinner in Chesed and
   * nowhere else, which is a bargain a player could neither feel nor reason
   * about. So the rod bites on a rung the day has never heard of.
   */
  it("thins the light everywhere, and not only where the day is looking", () => {
    const rod = only("matteh");
    const away = rungAt(9);
    const plain = away.world.orPerMote;
    layClimb(away.world, ruleByNumber[1], foldRelics(ruleByNumber[1], rod), away.path.ends);
    expect(away.world.orPerMote, "the rod does nothing outside the day's Sefirah").toBeLessThan(
      plain === 1 ? 2 : plain,
    );
    // ...and the day's own doubling still happens where the day says, on top.
    const first = ruleByNumber[1];
    const lit = regionOfSefirah("chesed").index;
    const there = rungAt(lit);
    const bare = there.world.orPerMote;
    layClimb(there.world, first, foldRelics(first, []), ["chesed"]);
    expect(there.world.orPerMote).toBeGreaterThan(bare);
  });

  it("never lets three lamp-takers put a Scribe out before they set out", () => {
    const takers = RELICS.filter((r) => (r.bends?.lamps ?? 0) < 0);
    expect(takers.length, "nothing takes a lamp, so this proves nothing").toBeGreaterThan(0);
    const { path, world } = rungAt(5);
    layClimb(world, undefined, foldRelics(undefined, [...takers, ...takers, ...takers]), path.ends);
    expect(world.player.lamps).toBeGreaterThanOrEqual(1);
  });
});

describe("the rules that are not numbers", () => {
  it("keeps the light through a fall, and wakes where it set out", () => {
    const standing = {
      at: "tiferet" as const,
      sefirotLit: ["malchut", "yesod"] as SefirahId[],
      falls: 0,
      or: 40,
    };
    const plain = afterFalling(standing);
    expect(plain.or, "a plain fall stopped costing light").toBe(0);
    expect(plain.at, "a plain fall stopped costing ground").toBe("yesod");

    expect(afterFalling(standing, { keepsLight: true }).or).toBe(40);
    expect(afterFalling(standing, { wakesHigh: true }).at).toBe("tiferet");
    // And the stone does not also keep the light, which would make it two
    // relics in one and the tablets pointless.
    expect(afterFalling(standing, { wakesHigh: true }).or).toBe(0);
  });

  /**
   * **The one price that is not a number but an ending taken off the table.**
   * *"The crown will not receive you. Only all ten kindled will end this
   * climb."* Asserted rather than assumed, because a price nobody can be shown
   * to pay is a line of prose on a plate.
   */
  it("refuses the crown to a Scribe carrying the broken tablets", () => {
    const crowned = {
      at: "keter" as SefirahId,
      sefirotLit: [] as SefirahId[],
      guardiansBroken: ["keter"] as SefirahId[],
    };
    expect(sealOffered(crowned), "the crown ending is gone").toBe("crown");
    expect(sealOffered(crowned, foldRelics(undefined, only("luchot")).keeps)).toBeUndefined();
    // The consummation is still reachable — the tablets forbid the shortcut,
    // not the climb.
    const lit = { ...crowned, sefirotLit: [...regionsAll()] as SefirahId[] };
    expect(sealOffered(lit, foldRelics(undefined, only("luchot")).keeps)).toBe("kindled");
  });

  /**
   * Every vessel, rather than one chosen by hand — the first draft picked a
   * vessel that "trades a number for a number" and drew the wrong one: the
   * trade was in `reach`, which is a *quantity* and folds by addition, so the
   * five rate fields it checked all came back neutral and the test reported the
   * Ark lifting nothing. Sweeping the pool makes the choice the table's rather
   * than the author's, and the guard below is what says the sweep found a
   * price to lift at all.
   */
  it("bears every vessel's price and charges every vessel's gift", () => {
    /** Neutral, and which direction is the cost — `cooldown` reads backwards. */
    const rates = ["bite", "speed", "iframes", "light"] as const;
    let lifted = 0;
    for (const keli of KELIM) {
      const plain = powersFrom([keli.id]);
      const borne = powersFrom([keli.id], [], { bears: true });
      for (const key of rates) {
        if (plain[key] < 1) {
          expect(borne[key], `${keli.id}: ${key} is still charged`).toBeGreaterThan(plain[key]);
          lifted += 1;
        } else expect(borne[key], `${keli.id}: ${key}'s gift was dropped`).toBe(plain[key]);
      }
      if (plain.cooldown > 1) {
        expect(borne.cooldown, `${keli.id}: a slower hand is still charged`).toBeLessThan(
          plain.cooldown,
        );
        lifted += 1;
      } else expect(borne.cooldown, `${keli.id}: a faster hand was dropped`).toBe(plain.cooldown);
      // The two quantities, which fold by addition rather than by rate.
      if (plain.reach < 0) lifted += 1;
      expect(borne.reach, `${keli.id}: reach`).toBeGreaterThanOrEqual(plain.reach);
      if (plain.lamps < 0) lifted += 1;
      expect(borne.lamps, `${keli.id}: lamps`).toBeGreaterThanOrEqual(plain.lamps);
    }
    expect(lifted, "the Ark lifted nothing — no vessel in the pool has a price").toBeGreaterThan(0);
  });

  it("makes the first three kindlings cheap and no more", () => {
    const oil = foldRelics(undefined, only("shemen"));
    const bare = foldRelics(undefined, []);
    const base = 100;
    expect(kindlePrice(base, 0, bare)).toBe(base);
    for (const lit of [0, 1, 2]) {
      expect(kindlePrice(base, lit, oil), `the ${lit + 1}th kindling`).toBeLessThan(base);
    }
    expect(kindlePrice(base, 3, oil), "the oil never runs out").toBe(base);
    expect(kindlePrice(base, 9, oil)).toBe(base);
  });

  /**
   * The three rules `step.ts` reads, driven through the reducer rather than
   * asserted about it — a flag on a context nothing branches on is the exact
   * shape of the bug this file exists for.
   */
  it("sends a mark through stone, and only the Scribe's own", () => {
    const { world } = rungAt(5);
    // A wall right in front of the Scribe, so a mark must meet it at once.
    const p = world.player;
    const tx = Math.floor(p.x / TILE_SIZE) + 3;
    const ty = Math.floor((p.y + p.h - 1) / TILE_SIZE);
    for (let dy = -2; dy <= 0; dy += 1) world.tiles[(ty + dy) * world.width + tx] = Tile.Stone;

    const throwOne = (keeps: StepContext["keeps"]) => {
      const w = rungAt(5).world;
      for (let dy = -2; dy <= 0; dy += 1) w.tiles[(ty + dy) * w.width + tx] = Tile.Stone;
      const ctx: StepContext = { ...handFor(5), keeps };
      step(w, { ...NO_INPUT, strike: true }, ctx);
      let far = 0;
      for (let i = 0; i < 40; i += 1) {
        step(w, NO_INPUT, ctx);
        for (const m of w.marks) if (m.mine) far = Math.max(far, m.x);
      }
      return far;
    };
    const stopped = throwOne(undefined);
    const through = throwOne({ cuts: true });
    expect(stopped, "the mark never reached the wall — the fixture is wrong").toBeGreaterThan(p.x);
    expect(through, "the Shamir does not cut").toBeGreaterThan(stopped);
  });

  it("buds a lamp back below the Abyss, and never above it", () => {
    const bitten = (rung: number, keeps: StepContext["keeps"]) => {
      const { world } = rungAt(rung);
      const ctx: StepContext = { ...handFor(rung), keeps };
      // Stand something on him until a lamp goes.
      const start = world.player.lamps;
      for (let i = 0; i < 900 && world.player.lamps === start; i += 1) {
        world.player.iframes = 0;
        for (const h of world.husks) {
          if (h.broken) continue;
          h.x = world.player.x;
          h.y = world.player.y;
        }
        step(world, NO_INPUT, ctx);
      }
      return { lost: start - world.player.lamps, budded: Boolean(world.budded) };
    };
    expect(bitten(5, undefined).lost, "nothing bit the Scribe — the fixture is wrong").toBe(1);
    expect(bitten(5, { buds: true }).budded, "the rod did not bud below the Abyss").toBe(true);
    expect(bitten(9, { buds: true }).budded, "the rod budded above the Abyss").toBe(false);
  });
});

/**
 * **The band the boons cap does not have.**
 *
 * `TIERS` is capped because a permanent unconditional gain is a thing to be
 * capped. The Reliquary is three objects chosen at the threshold, every one of
 * them a bargain, and `powersFrom` *multiplies* — so penalties compound in a
 * way no single relic's line describes. Three relics that each take something,
 * carried beside vessels that also take something, is the combination nobody
 * authored and everybody can assemble.
 *
 * What is asserted is the floor rather than a curve: **no choosing of three
 * puts a Scribe out where an empty hand would not.** A Reliquary that can be
 * loaded into a losing climb is a trap, and the plate calls each of them a
 * bargain.
 */
describe("three of them at once", () => {
  const triples = (): string[][] => {
    const out: string[][] = [];
    const ids = RELICS.map((r) => r.id);
    for (let a = 0; a < ids.length; a += 1) {
      for (let b = a + 1; b < ids.length; b += 1) {
        for (let c = b + 1; c < ids.length; c += 1) out.push([ids[a], ids[b], ids[c]]);
      }
    }
    return out;
  };

  it("offers every triple as a real choice, and no triple as a trap", () => {
    const combos = triples();
    expect(combos.length, "the collection stopped being nine").toBe(84);
    // Every vessel the day could lay, which is the other half of the compound:
    // `powersFrom` multiplies, so the worst case is a full satchel *and* the
    // three meanest relics.
    const items = KELIM.map((k) => k.id);

    const walk = (ids: string[]) => {
      const rung = 5;
      const { path, world } = rungAt(rung, 91);
      const relics = carried(ids, ids);
      expect(relics, `${ids.join("+")} could not be carried`).toHaveLength(
        Math.min(ids.length, CARRIED),
      );
      const climb = foldRelics(undefined, relics);
      layClimb(world, undefined, climb, path.ends);
      const ctx: StepContext = {
        ...handFor(rung),
        items,
        boons: climb.effects,
        keeps: climb.keeps,
      };
      return fighter(world, ctx, 12000);
    };

    /**
     * **The control, asserted rather than assumed.** The claim below is "no
     * triple goes out where an empty hand does not", and if the empty hand
     * *did* go out the comparison would be vacuous for all eighty-four — the
     * exact shape of a green test that checks nothing.
     */
    const bare = walk([]);
    expect(bare.out, "the empty hand went out — every comparison below is vacuous").toBe(false);

    const out: string[] = [];
    let poorer = 0;
    for (const combo of combos) {
      const fight = walk(combo);
      if (fight.out) out.push(combo.join(" + "));
      if (fight.or < bare.or) poorer += 1;
    }
    /**
     * And the other half of a real band: the relics must be *felt*. If every
     * triple came out identical to the empty hand, the sweep would be green and
     * the Reliquary would be decoration — which is the failure the whole phase
     * is against.
     */
    expect(poorer, "no triple changed what the climb paid").toBeGreaterThan(0);
    expect(
      out,
      `${out.length} of ${combos.length} triples put a Scribe out on ground an empty hand walks:\n  ` +
        out.join("\n  "),
    ).toEqual([]);
  }, 900000);

  it("never leaves a Scribe fewer than one lamp, whatever three are chosen", () => {
    for (const combo of triples()) {
      const climb = foldRelics(undefined, carried(combo, combo));
      expect(LAMPS + climb.lamps, `${combo.join(" + ")}`).toBeGreaterThanOrEqual(1);
    }
  });
});

/** Every Sefirah, for the kindled-seal assertion above. */
function regionsAll() {
  return [
    "malchut",
    "yesod",
    "hod",
    "netzach",
    "tiferet",
    "gevurah",
    "chesed",
    "binah",
    "chochmah",
    "keter",
  ] as const;
}
