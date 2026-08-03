import { describe, expect, it } from "vitest";
import type { AscentRecord } from "../storage/ascentRepo";
import { abilityForVerb, type Grace, type Verb } from "./abilities";
import { regions } from "./regions";
import { sefirahOfCard } from "./story";
import { dormantFor, GRACE_NEEDS, offerFor, vowKept } from "./ushpizinOffers";
import { buildPath, regionOfPath, verbsOf } from "./world/build";
import { TREE_PATHS } from "./tree";
import { dorotCardsById } from "../data/dorot";

/**
 * **The guests of the Houses — the bargain the game asks most directly.**
 *
 * `ushpizinOffers.ts` had no test file, and what that let through was not
 * subtle. Three of the seven guests ask a *vow* rather than a price; a vow is
 * judged at the exit; and the grace it granted lived in React state that
 * `walkPath` cleared before the next rung's first frame. Isaac's Staff, Jacob's
 * Beginning and Moses' Window were granted and wiped without ever reaching the
 * simulation — from the player's side, indistinguishable from Decline.
 *
 * The boon is on the record now (`AscentRecord.boons`), which is what these
 * tests are mostly about: not that the offers are well-formed, but that what
 * they give **outlives the rung it was given on**.
 */

const SEFIROT_WITH_GUESTS = regions
  .filter((r) => r.hasHouse)
  .map((r) => r.sefirah)
  .filter((s) => offerFor(s));

describe("the seven guests", () => {
  it("stands one at each of the seven Houses, and none above the Abyss", () => {
    expect(SEFIROT_WITH_GUESTS).toHaveLength(7);
    for (const region of regions.filter((r) => !r.hasHouse)) {
      expect(offerFor(region.sefirah), `${region.name} has no House but keeps a guest`).toBeUndefined();
    }
  });

  it("asks a price or a vow, never both and never neither", () => {
    for (const sefirah of SEFIROT_WITH_GUESTS) {
      const offer = offerFor(sefirah)!;
      expect(offer.price >= 0, `${sefirah} asks a negative price`).toBe(true);
      // A vow is the price. Charging light *and* binding the Scribe would be
      // two bargains wearing one coat.
      expect(offer.vow && offer.price > 0, `${sefirah} asks both a price and a vow`).toBeFalsy();
      expect(offer.grants, `${sefirah} grants nothing`).toBeTruthy();
      expect(offer.terms.length, `${sefirah} states no terms`).toBeGreaterThan(0);
    }
  });

  /** Every guest gives something different, or two Houses are one House. */
  it("gives seven different graces", () => {
    const given = SEFIROT_WITH_GUESTS.map((s) => offerFor(s)!.grants);
    expect(new Set(given).size).toBe(given.length);
  });
});

describe("a vow, judged at the exit", () => {
  const nothing = { orGathered: 0, veilings: 0, marksSet: 0 };

  it("is kept by doing none of the thing, and broken by doing any", () => {
    expect(vowKept("gather-nothing", nothing)).toBe(true);
    expect(vowKept("gather-nothing", { ...nothing, orGathered: 1 })).toBe(false);
    expect(vowKept("unveiled", nothing)).toBe(true);
    expect(vowKept("unveiled", { ...nothing, veilings: 1 })).toBe(false);
    expect(vowKept("no-mark", nothing)).toBe(true);
    expect(vowKept("no-mark", { ...nothing, marksSet: 1 })).toBe(false);
  });

  /** Each vow watches its own counter and is deaf to the other two. */
  it("is not broken by keeping a different vow badly", () => {
    expect(vowKept("gather-nothing", { orGathered: 0, veilings: 3, marksSet: 3 })).toBe(true);
    expect(vowKept("unveiled", { orGathered: 40, veilings: 0, marksSet: 3 })).toBe(true);
    expect(vowKept("no-mark", { orGathered: 40, veilings: 3, marksSet: 0 })).toBe(true);
  });
});

/**
 * **The regression this whole piece of work is for.** Stated against the record
 * rather than the page, so it is a claim about data: a boon given on one rung
 * is still held on the next.
 */
describe("what a guest gives, and how long it lasts", () => {
  /** What `GamePage.giveBoon` does, as data — the record grows, once each. */
  const give = (record: AscentRecord, grace: Grace): AscentRecord =>
    (record.boons ?? []).includes(grace)
      ? record
      : { ...record, boons: [...(record.boons ?? []), grace] };

  const climb = (over: Partial<AscentRecord> = {}): AscentRecord => ({
    id: "a", seed: 1, seedLabel: "x", createdAt: "", updatedAt: "",
    regionIndex: 1, lettersHeld: [], or: 0, regionsCleared: [],
    housesMet: [], sacredNotes: [], ...over,
  });

  it("survives the rung it was given on", () => {
    const atGevurah = give(climb({ at: "gevurah" }), "high-jump");
    expect(atGevurah.boons).toEqual(["high-jump"]);
    // Walking on is a change of `at` and a fresh world — and nothing else. The
    // boon used to be cleared at exactly this point, which is why the three
    // vow guests gave nothing: a vow is granted at the exit, and the exit was
    // the last moment the old state existed.
    const nextRung = { ...atGevurah, at: "tiferet" as const, regionIndex: 5 };
    expect(nextRung.boons).toEqual(["high-jump"]);
  });

  it("stacks across guests without repeating one", () => {
    let record = climb();
    for (const s of SEFIROT_WITH_GUESTS) record = give(record, offerFor(s)!.grants);
    for (const s of SEFIROT_WITH_GUESTS) record = give(record, offerFor(s)!.grants);
    expect(record.boons).toHaveLength(7);
  });

  /** A climb's, not a Scribe's — vessels are the thing that carries between. */
  it("is absent from a record that has met no guest", () => {
    expect(climb().boons).toBeUndefined();
  });
});

/**
 * **A bargain for a body that cannot use it.** `GRACE_NEEDS` is enforced at
 * design time against the *linear* letter order, which stopped being the whole
 * truth when the Tree let a route decide the alphabet.
 */
describe("a boon a Scribe could not yet use", () => {
  it("is named by the letter it wants, not the verb", () => {
    for (const [grace, verb] of Object.entries(GRACE_NEEDS) as [Grace, Verb][]) {
      const ability = abilityForVerb(verb);
      expect(ability, `no letter carries "${verb}", which ${grace} needs`).toBeDefined();
      expect(ability!.letterId).toBeTruthy();
    }
  });

  it("is spotted when the verb is missing, and not when it is held", () => {
    const abraham = offerFor("chesed")!;
    expect(GRACE_NEEDS[abraham.grants]).toBe("swim");
    expect(dormantFor(abraham, [])).toBe("swim");
    expect(dormantFor(abraham, ["swim"])).toBeUndefined();
    // A guest whose gift needs nothing is never dormant.
    const david = offerFor("malchut")!;
    expect(dormantFor(david, [])).toBeUndefined();
  });

  /**
   * And it is reachable on the Tree, which is the point: the design-time check
   * passes and the runtime case still happens. Chesed is walkable long before
   * Mem on a route that goes up the right-hand pillar.
   */
  it("really does happen on a route the Tree allows", () => {
    const toChesed = TREE_PATHS.filter((p) => p.ends.includes("chesed"));
    const withoutMem = verbsOf(TREE_PATHS.map((p) => p.letter).filter((l) => l !== "mem"));
    expect(withoutMem.includes("swim")).toBe(false);
    expect(toChesed.length).toBeGreaterThan(0);
    expect(dormantFor(offerFor("chesed")!, withoutMem)).toBe("swim");
  });
});

/**
 * **The plate must ask the rung it is standing on.** The figure comes from the
 * path's lower end; `world.regionIndex` is the upper end capped by the Scribe's
 * letters. The plate read the second, so the face, the accusation and the
 * bargain could belong to three different Sefirot — while the crown, which goes
 * through the card, counted correctly.
 */
describe("which guest is offered", () => {
  it("is the one whose figure is standing there, whatever the ground is sized for", () => {
    const ALL = TREE_PATHS.map((p) => p.letter);
    for (const path of TREE_PATHS) {
      for (const held of [[], ALL] as const) {
        const world = buildPath(path, 3, held, 1, false, false);
        const house = world.entities.find((e) => e.kind === "house");
        if (!house?.ref) continue;
        const standing = sefirahOfCard(house.ref);
        expect(standing, `${house.ref} belongs to no House`).toBeDefined();
        // The card is the lower end's, always — that is what `regionOfPath`
        // means by "the fixed screens stay with the lower end".
        expect(standing, `${path.id} put a ${standing} figure on it`).toBe(path.ends[0]);
        // And the offer follows the figure, not the rung's index.
        const offer = offerFor(standing!);
        expect(offer?.figure, `${path.id} offers nobody`).toBeTruthy();
        expect(dorotCardsById[house.ref]).toBeDefined();
      }
    }
  });

  /**
   * The divergence that caused it, kept as a live fact rather than a memory:
   * a path's `index` really is not its lower end's, so anything reading the
   * index for identity would still be wrong.
   */
  it("cannot be had from the rung's index, which is a different number", () => {
    const ALL = TREE_PATHS.map((p) => p.letter);
    const diverging = TREE_PATHS.filter((p) => {
      const region = regionOfPath(p, ALL);
      return region.sefirah !== regions[region.index - 1].sefirah;
    });
    expect(diverging.length, "no path's index differs from its lower end any more").toBeGreaterThan(0);
  });
});
