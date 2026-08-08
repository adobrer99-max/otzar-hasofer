import { describe, expect, it } from "vitest";
import { LAMPS } from "./combat";
import { ENCOUNTER_RULES, ruleByNumber, ruleOf, VEIL_COST } from "./encounter";
import { foldRelics, relicById, RELICS, type Relic } from "./relics";

/**
 * **What a climb comes to once the day and what is carried are both counted.**
 *
 * Four objects have a claim on the same numbers — the day's `EncounterRule` and
 * up to three relics — and `EncounterRule` has no fold, deliberately. `Effect`
 * has one because a Scribe may hold many vessels; a climb has exactly one day.
 * So the order is stated and tested rather than discovered: **the day sets the
 * number absolutely, and a relic can only bend what the day left.**
 */

const at = (id: string) => relicById[id];
const only = (...ids: string[]): Relic[] => ids.map(at);

describe("the day, and then what is carried", () => {
  it("is the day alone when nothing is carried", () => {
    const first = ruleByNumber[1];
    const climb = foldRelics(first, []);
    expect(climb.motes).toBe(first.motes);
    expect(climb.veilCost).toBe(VEIL_COST);
    expect(climb.lamps).toBe(0);
    expect(climb.effects).toEqual([]);
  });

  it("is the plain game when there is neither", () => {
    const climb = foldRelics(undefined, []);
    expect(climb).toMatchObject({ motes: 1, sealed: 1, husks: 1, klipot: 1, kindle: 1, lamps: 0 });
    expect(climb.veilCost).toBe(VEIL_COST);
  });

  it("multiplies the day's number rather than replacing it", () => {
    // The Fifth lays half again as many klipot; the chest makes every shell
    // pay half again. Neither cancels the other.
    const fifth = ruleByNumber[5];
    const climb = foldRelics(fifth, only("argaz"));
    expect(climb.klipot).toBe(fifth.klipot);
    expect(climb.husks).toBeCloseTo((fifth.husks ?? 1) * 1.5, 5);
  });

  /**
   * **The precedence that matters most, and the reason it is multiplication.**
   *
   * Shabbat declares a veiling free. The foundation stone doubles what a
   * veiling takes. A "last one wins" policy would let an object in the hand
   * overrule the day the game called free — and a player would have no way to
   * find out why. Zero times two is zero, and that is the answer.
   */
  it("never lets a relic raise a price the day declared free", () => {
    const shabbat = ENCOUNTER_RULES.find((r) => r.veilCost === 0);
    expect(shabbat, "no Encounter frees the veiling any more").toBeDefined();
    expect(foldRelics(shabbat, only("shetiyah")).veilCost).toBe(0);
    // And on any other day the stone does exactly what it says.
    expect(foldRelics(undefined, only("shetiyah")).veilCost).toBe(VEIL_COST * 2);
  });

  /**
   * **A relic works on the first climb as it works on the eightieth.**
   *
   * `ruleOf` reads `encounterNumber` first and ignores `ruleNumber` while it is
   * set, so a relic routed *through* the rule would silently do nothing for a
   * new Scribe's first seven climbs and start working on the eighth. `foldRelics`
   * takes an already-resolved rule, which makes that unroutable — and this is
   * the test that says so, because nothing about the types would.
   */
  it("bends the same amount whichever way the day was decided", () => {
    const inside = ruleOf({ encounterNumber: 5 });
    const chosen = ruleOf({ ruleNumber: 5 });
    // Both defined, or the comparison below is two undefineds agreeing.
    expect(inside, "the fifth Encounter has no rule").toBeDefined();
    expect(chosen, "the fifth day cannot be chosen").toBeDefined();
    expect(inside).toBe(chosen);
    const carried = only("argaz", "esh");
    expect(foldRelics(inside, carried)).toEqual(foldRelics(chosen, carried));
    // And a day with no rule at all still takes the bend.
    expect(foldRelics(undefined, only("argaz")).husks).toBeCloseTo(1.5, 5);
  });

  it("adds lamps rather than multiplying them, and never takes the last", () => {
    const fourth = ruleByNumber[4];
    expect(foldRelics(fourth, []).lamps).toBe(fourth.lamps);
    expect(foldRelics(fourth, only("argaz")).lamps).toBe((fourth.lamps ?? 0) - 1);
    // Three lamp-takers would leave a Scribe at zero before setting out, which
    // is not a price but an ending. The floor is one lamp in hand.
    const takers = RELICS.filter((r) => (r.bends?.lamps ?? 0) < 0);
    expect(takers.length, "nothing in the table takes a lamp, so this proves nothing").toBeGreaterThan(0);
    const many = [...takers, ...takers, ...takers, ...takers];
    expect(LAMPS + foldRelics(undefined, many).lamps).toBeGreaterThanOrEqual(1);
  });

  /**
   * A relic may change what the numbers are. It may never change what a body
   * can do — that is the letters' alone, and it is the same rule the vessels
   * have kept since they were written.
   */
  it("grants no grace and frees no guest", () => {
    const third = ruleByNumber[3];
    expect(third.grants, "the Third stopped granting anything").toBeDefined();
    expect(foldRelics(third, [...RELICS]).grants).toEqual(third.grants);
    expect(foldRelics(undefined, [...RELICS]).grants).toEqual([]);
    expect(foldRelics(undefined, [...RELICS]).guestsFree).toBe(false);
    expect(foldRelics(ruleByNumber[6], []).guestsFree).toBe(true);
  });

  it("gathers the rules that are not numbers, and takes the most generous count", () => {
    const climb = foldRelics(undefined, only("luchot", "aron"));
    expect(climb.keeps).toEqual({
      keepsLight: true,
      kindledOnly: true,
      bears: true,
      oneVessel: true,
    });
    // `spends` is a count, so two of them would be a choice between numbers.
    const oil = at("shemen");
    const meaner: Relic = { ...oil, id: "meaner", keeps: { spends: 1 } };
    expect(foldRelics(undefined, [meaner, oil]).keeps.spends).toBe(oil.keeps?.spends);
    expect(foldRelics(undefined, [oil, meaner]).keeps.spends).toBe(oil.keeps?.spends);
  });

  it("hands a relic's own Effect on rather than folding it here", () => {
    // `powersFrom` already folds `Effect` and is the only thing that should:
    // this passes them through to the channel `boonsFrom` output uses.
    expect(foldRelics(undefined, only("shamir")).effects).toEqual([at("shamir").effect]);
    expect(foldRelics(undefined, only("luchot")).effects).toEqual([]);
  });

  it("does not care what order they were chosen in", () => {
    const a = foldRelics(ruleByNumber[2], only("argaz", "esh", "shemen"));
    const b = foldRelics(ruleByNumber[2], only("shemen", "argaz", "esh"));
    expect(a).toEqual(b);
  });
});

/**
 * And the table itself, on the axis this file adds: every relic must actually
 * *do* something, on one of the three layers. A relic whose bargain is prose
 * only would read on the threshold as a real choice and be none.
 */
describe("the bargains are mechanical", () => {
  it("gives every relic something to bend, keep or become", () => {
    for (const relic of RELICS) {
      const acts = Boolean(relic.bends) || Boolean(relic.keeps) || Boolean(relic.effect);
      expect(acts, `${relic.id} says a bargain it does not make`).toBe(true);
    }
  });

  it("makes every one of them cost something", () => {
    for (const relic of RELICS) {
      const bends = relic.bends ?? {};
      // A price is a multiplier under one, a lamp taken, or a rule that closes
      // something off. Anything else is a pure gift chosen three at a time,
      // which is the failure the guardian tiers were capped against.
      const priced =
        Object.entries(bends).some(([key, v]) =>
          key === "lamps" ? v < 0 : key === "veilCost" ? v > 1 : v < 1,
        ) ||
        Boolean(relic.keeps?.kindledOnly) ||
        Boolean(relic.keeps?.oneVessel) ||
        Boolean(relic.keeps?.answers) ||
        typeof relic.keeps?.spends === "number" ||
        Object.values(relic.effect ?? {}).some((v) => typeof v === "number" && v < 1);
      expect(priced, `${relic.id} is a pure gift`).toBe(true);
    }
  });

  /**
   * And the check above has to be able to fail. A rule that passes for every
   * row it will ever see is not a rule, and this one is a hand-written boolean
   * over six shapes of price — exactly the sort that quietly stops matching.
   */
  it("would notice a relic that only gave", () => {
    const gift: Relic = {
      ...RELICS[0],
      id: "a-pure-gift",
      bends: { husks: 2, light: 2, lamps: 1 },
      keeps: { perpetual: true },
      effect: { bite: 2 },
    };
    const bends = gift.bends ?? {};
    const priced =
      Object.entries(bends).some(([key, v]) =>
        key === "lamps" ? v < 0 : key === "veilCost" ? v > 1 : v < 1,
      ) ||
      Boolean(gift.keeps?.kindledOnly) ||
      Boolean(gift.keeps?.oneVessel) ||
      Boolean(gift.keeps?.answers) ||
      typeof gift.keeps?.spends === "number" ||
      Object.values(gift.effect ?? {}).some((v) => typeof v === "number" && v < 1);
    expect(priced, "the price check passes anything").toBe(false);
  });

  /**
   * Two relics that keep the same flag would be one relic under two names on
   * the axis a player actually feels — the collection has nine slots and no
   * room for a duplicate.
   */
  it("gives no two relics the same rule to keep", () => {
    const seen = new Map<string, string>();
    for (const relic of RELICS) {
      for (const key of Object.keys(relic.keeps ?? {})) {
        const clash = seen.get(key);
        expect(clash, `${relic.id} and ${clash} both keep "${key}"`).toBeUndefined();
        seen.set(key, relic.id);
      }
    }
  });
});
