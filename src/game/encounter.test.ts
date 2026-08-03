import { describe, expect, it } from "vitest";
import { encounters } from "../data/encounters";
import { abilityByLetter, type Grace } from "./abilities";
import {
  encounterFor,
  encounterTitle,
  ENCOUNTER_RULES,
  ILLUMINED_MULTIPLIER,
  illuminedBy,
  ruleByNumber,
  ruleOf,
  rulesFor,
  beyondTheSeven,
  sealedCount,
  VEIL_COST,
  type EncounterRule,
} from "./encounter";
import { allRegionLetters, regions } from "./regions";
import { buildRegion, verbsOf } from "./world/build";
import { step, type StepContext } from "./world/step";
import { TILE_SIZE } from "./world/tiles";
import { NO_INPUT, type World } from "./world/types";
import { TREE_PATHS } from "./tree";

/**
 * **Does any of this do anything?**
 *
 * The Seven Encounters were the game's only across-runs progression and for
 * most of their life they were a label: seven names, seven contemplative
 * questions, and one rule shared between them — light counts double in one
 * Sefirah. Six of the seven differed only in which rung was lit and in the
 * sentence printed at the threshold, which is a progression system that would
 * read exactly the same if it were deleted.
 *
 * So the question this file exists to answer is the one `items.test.ts` asks of
 * the vessels' synergies and `exposure.test.ts` asks of everything else: not
 * whether the system is *there* — a module graph proves that — but whether a
 * climb played under it is a different climb. A rule that changes no number is
 * indistinguishable from a rule that works, because the label prints either
 * way, and that is precisely the failure this system already had once.
 */

/** Every number a rule can move, and what it is when no rule moves it. */
const DEFAULTS = {
  motes: 1,
  sealed: 1,
  husks: 1,
  klipot: 1,
  lamps: 0,
  guestsFree: false,
  veilCost: VEIL_COST,
} as const;

type Knob = keyof typeof DEFAULTS;
const KNOBS = Object.keys(DEFAULTS) as Knob[];

/** Which numbers this rule actually moves — `grants` counted separately. */
function moved(rule: EncounterRule): string[] {
  const out = KNOBS.filter((k) => rule[k] !== undefined && rule[k] !== DEFAULTS[k]);
  return [...out, ...(rule.grants?.length ? ["grants"] : [])];
}

describe("the Seven Encounters", () => {
  it("gives every Encounter exactly one rule, and no rule an Encounter that is not there", () => {
    expect(ENCOUNTER_RULES).toHaveLength(7);
    expect(ENCOUNTER_RULES.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const e of encounters) {
      const rule = ruleByNumber[e.number];
      expect(rule, `the ${e.name} Encounter has no rule`).toBeDefined();
      expect(rule.rule.length, `the ${e.name}'s rule says nothing`).toBeGreaterThan(10);
      // A rule is read aloud on the threshold, so it is a sentence.
      expect(rule.rule.endsWith("."), `the ${e.name}'s rule is not a sentence`).toBe(true);
    }
  });

  /**
   * **The one that matters.** Every rule must move at least one number away
   * from what the game does under no rule at all, or the Encounter it belongs
   * to is a label — which is what six of the seven were.
   */
  it("gives no Encounter a rule that changes nothing", () => {
    const inert = ENCOUNTER_RULES.filter((r) => moved(r).length === 0);
    expect(
      inert.map((r) => `${r.number}: ${r.rule}`),
      "these Encounters print a rule and change no number",
    ).toEqual([]);
  });

  /**
   * And no two of them may move the same number, which is the subtler version
   * of the same failure: two Encounters that both mean "more klipot" are one
   * Encounter with two names on it. The design's first draft had exactly that —
   * "sealed rooms hold two klipot's worth" for the Second was the Fifth's rule
   * wearing Gevurah's clothes — and this is what caught it.
   */
  it("gives no two Encounters the same rule", () => {
    const seen = new Map<string, number>();
    for (const rule of ENCOUNTER_RULES) {
      for (const knob of moved(rule)) {
        const already = seen.get(knob);
        expect(
          already,
          `the ${rule.number}${already ? `th and ${already}th` : ""} Encounters both turn "${knob}"`,
        ).toBeUndefined();
        seen.set(knob, rule.number);
      }
    }
    // And between them they reach most of what there is to turn, or the table
    // is seven rules drawn from three ideas.
    expect(seen.size, "the seven rules touch too little of the game").toBeGreaterThanOrEqual(6);
  });

  /**
   * Each rule has to be *reachable*: the Sefirah it keys on must be somewhere a
   * climb can stand, and — for the ones that key on a place at all — a path of
   * the Tree must actually run there. An Encounter whose Sefirah had no way in
   * would be a rule nobody could trigger, which is the same as no rule.
   */
  it("keys every Encounter to a Sefirah a climb can stand on", () => {
    for (const e of encounters) {
      const region = regions.find((r) => r.sefirah === e.sefirah);
      expect(region, `the ${e.name} Encounter keys on ${e.sefirah}, which is nowhere`).toBeDefined();
      expect(
        TREE_PATHS.some((p) => p.ends.includes(e.sefirah)),
        `no path of the Tree runs to ${e.sefirah}`,
      ).toBe(true);
    }
  });

  /**
   * A grace granted by an Encounter has to be a grace the game knows, and one
   * some letter also grants — `step.ts` reads them by name, so a typo would be
   * a rule that silently does nothing, which is the failure this whole file is
   * about arriving by a different door.
   */
  it("grants only graces the game can act on", () => {
    const real = new Set<Grace>(
      Object.values(abilityByLetter)
        .map((a) => a?.grace)
        .filter((g): g is Grace => Boolean(g)),
    );
    for (const rule of ENCOUNTER_RULES) {
      for (const g of rule.grants ?? []) {
        expect(real.has(g), `the ${rule.number}th Encounter grants "${g}", which nothing reads`).toBe(
          true,
        );
      }
    }
  });

  /**
   * The First keeps the rule the Encounters already had. It was not replaced by
   * the other six — it *is* the First's rule, and the day light was made is the
   * day light is worth more.
   */
  it("keeps the doubling as the First's own rule", () => {
    expect(ruleByNumber[1].motes).toBe(ILLUMINED_MULTIPLIER);
    expect(encounters[0].sefirah).toBe("chesed");
    // Read off the *rule*, which is what ships — past the seventh seal there
    // is no live Encounter, and a chosen First has to light Chesed anyway.
    expect(illuminedBy(ruleByNumber[1])).toBe("chesed");
    expect(illuminedBy(undefined)).toBeUndefined();
  });

  /** Every rule is worth *having*: none of them makes a climb harder. */
  it("never hands a Scribe a rule that costs them", () => {
    for (const rule of ENCOUNTER_RULES) {
      expect((rule.motes ?? 1) >= 1, `${rule.number} pays less light`).toBe(true);
      expect((rule.lamps ?? 0) >= 0, `${rule.number} takes a lamp`).toBe(true);
      expect((rule.veilCost ?? VEIL_COST) <= VEIL_COST, `${rule.number} taxes a veiling`).toBe(true);
      // The Fifth puts *more* klipot on a rung, which is more to fight — and it
      // pays for it, because each of them holds more. A rule that added bodies
      // without adding light would be the one that costs.
      if ((rule.klipot ?? 1) > 1) {
        expect((rule.husks ?? 1) > 1, `${rule.number} adds klipot and no light`).toBe(true);
      }
    }
  });
});

describe("which Encounter a climb belongs to", () => {
  it("counts a climb as the Nth by the number sealed before it", () => {
    expect(encounterFor(0)?.number).toBe(1);
    expect(encounterFor(6)?.number).toBe(7);
    // Past the seven there is no rule, and later climbs are played on the
    // game's own numbers — the Herald's rule about later readings, kept.
    expect(encounterFor(7)).toBeUndefined();
    expect(rulesFor(undefined)).toBeUndefined();
    expect(rulesFor(encounterFor(7))).toBeUndefined();
  });

  it("counts only the climbs that were carried to an ending", () => {
    const at = (sealedAt?: string) => ({ sealedAt }) as never;
    expect(sealedCount([at("2026-01-01"), at(undefined), at("2026-02-01")])).toBe(2);
    expect(sealedCount([])).toBe(0);
  });

  /**
   * **And a climb that went out is not one of them.** It used to be: going out
   * set `sealedAt` the same way crowning did, so the seven could be walked
   * through by dying seven times in the kingdom. Stated here as well as in
   * `fall.test.ts` because this is the file that owns what an Encounter counts.
   */
  it("is not advanced by going out, however many times", () => {
    const fell = { falls: 4, sealedAt: undefined } as never;
    const crowned = { falls: 4, sealedAt: "2026-01-01" } as never;
    expect(sealedCount([fell, fell, fell])).toBe(0);
    expect(sealedCount([fell, crowned, fell])).toBe(1);
  });

  it("names each Encounter by its Day", () => {
    expect(encounterTitle(encounters[0])).toBe("The First Encounter — Light");
    expect(encounterTitle(encounters[6])).toContain("Shabbat");
  });
});

/**
 * **And do the numbers do anything once the world is running?**
 *
 * Everything above proves the table is well formed: seven rules, each moving a
 * number, none of them the same number. It does not prove that `step` reads any
 * of them, and a field the simulation ignores is exactly as decorative as a
 * rule that changes nothing — it just fails further from where it is written.
 *
 * So these three run the actual reducer. They set the world field an Encounter
 * would set and check the behaviour changes, which is the only evidence that
 * the Second, Fifth and Seventh are rules rather than entries in a record.
 */
describe("what the rules do to a running world", () => {
  /** Everything a Scribe could hold, so nothing here is about the letters. */
  const ALL = allRegionLetters();
  const ctx: StepContext = { verbs: verbsOf(ALL), graces: [] };

  /**
   * A world with one klipah left standing, so the break is unambiguous — and
   * **with its rooms taken out**, which is worth explaining.
   *
   * `stepRooms` recomputes `inSealedRoom` every tick, because it is the thing
   * that decides it: a room closes while something in it is still holding
   * light. That is right, and it means a test cannot simply assert the flag and
   * step — the reducer will overwrite it with the truth about wherever the
   * Scribe is actually standing, which on a hand-built corridor is nowhere in
   * particular. Emptying `rooms` makes `stepRooms` return at its first line, so
   * the flag stands as set.
   *
   * What that leaves is the right split of labour. Whether a room *seals* is
   * `rooms.test.ts`'s question and it already answers it. What is asked here is
   * the other half, which nothing else covers: given that it sealed, does the
   * light change.
   */
  function withOneHusk(veilCost = VEIL_COST) {
    const world = buildRegion(5, 91, 1, false, 1);
    world.husks = world.husks.slice(0, 1);
    world.entities = world.entities.filter((e) => e.kind !== "mote");
    world.rooms = [];
    world.veilCost = veilCost;
    return world;
  }

  /**
   * Break the one klipah and count the motes that fall out of it.
   *
   * Broken the way the game breaks one — a mark thrown at it — rather than by
   * reaching into `strikeHusk`, which is private for good reason: what is being
   * checked is that the *reducer* honours the field, and calling the function
   * that reads it would prove only that the function reads it.
   */
  function motesFrom(world: World): number {
    const husk = world.husks[0];
    // Stood two tiles in front of the Scribe, at their own height, with one
    // shell left: the shortest arrangement in which a thrown mark connects.
    husk.shells = 1;
    husk.x = world.player.x + TILE_SIZE * 2;
    husk.y = world.player.y;
    world.player.facing = 1;
    for (let i = 0; i < 200 && !husk.broken; i += 1) {
      step(world, { ...NO_INPUT, strike: world.player.markCooldown === 0 }, ctx);
      // Keep it there: a struck klipah is shoved, and the point is the break.
      husk.x = world.player.x + TILE_SIZE * 2;
      husk.y = world.player.y;
      husk.vx = 0;
    }
    expect(husk.broken, "the klipah never broke, so nothing was measured").toBe(true);
    return world.entities.filter((e) => e.kind === "mote").length;
  }

  it("pours more light out of a shell when the Living Creatures hold more", () => {
    const plain = withOneHusk();
    const many = withOneHusk();
    many.huskLight = 2;
    expect(motesFrom(many)).toBeGreaterThan(motesFrom(plain));
  });

  it("pours more again when the room has closed behind the Scribe", () => {
    const open = withOneHusk();
    open.sealedLight = 2;
    open.inSealedRoom = false;
    const shut = withOneHusk();
    shut.sealedLight = 2;
    shut.inSealedRoom = true;
    expect(motesFrom(shut)).toBeGreaterThan(motesFrom(open));
    // And the rule is *about* the sealing: without it, closing the room changes
    // nothing, which is what every climb past the Second should see.
    const plainOpen = withOneHusk();
    const plainShut = withOneHusk();
    plainShut.inSealedRoom = true;
    expect(motesFrom(plainShut)).toBe(motesFrom(plainOpen));
  });

  it("takes nothing off the light gathered on a Shabbat veiling", () => {
    const taxed = withOneHusk(VEIL_COST);
    const rested = withOneHusk(0);
    for (const world of [taxed, rested]) {
      world.or = 20;
      // Straight down, out of the bottom of the world — which `step` reads as a
      // veiling however the Scribe got there.
      world.player.y = world.height * TILE_SIZE + 200;
      step(world, NO_INPUT, ctx);
    }
    expect(taxed.veilings, "the fall was not read as a veiling").toBeGreaterThan(0);
    expect(rested.veilings).toBeGreaterThan(0);
    expect(taxed.or).toBe(20 - VEIL_COST);
    expect(rested.or, "Shabbat still took light off").toBe(20);
  });
});

/**
 * **Past the seventh, you choose the day.**
 *
 * The Seven Encounters were this game's whole long arc and they end: the
 * eighth climb read "Beyond the seven" and was played on the game's own
 * numbers with nothing acting on it. Seven sealed climbs is a fortnight for
 * anybody enjoying themselves. So the seven become seven earned
 * play-modifiers — nothing invented, since the rules already exist and are
 * already proved distinct above.
 */
describe("the rule a climb is played under", () => {
  it("is the Encounter's, inside the seven", () => {
    for (const rule of ENCOUNTER_RULES) {
      expect(ruleOf({ encounterNumber: rule.number })).toBe(rule);
    }
  });

  it("is the chosen one, past them", () => {
    expect(ruleOf({ ruleNumber: 4 })).toBe(ruleByNumber[4]);
  });

  /**
   * A climb inside the seven is not choosing anything, and a record carrying
   * both must not be able to play the Fourth's fourth lamp while counting as
   * the First. The unfolding order wins, always.
   */
  it("never lets a chosen rule override the unfolding order", () => {
    expect(ruleOf({ encounterNumber: 1, ruleNumber: 4 })).toBe(ruleByNumber[1]);
  });

  it("is nothing at all for a bare climb, and for every record written before this existed", () => {
    expect(ruleOf({})).toBeUndefined();
    expect(ruleOf(undefined)).toBeUndefined();
    expect(ruleOf(null)).toBeUndefined();
    // A number that is not one of the seven is not a rule.
    expect(ruleOf({ ruleNumber: 9 })).toBeUndefined();
    expect(ruleOf({ encounterNumber: 0 })).toBeUndefined();
  });

  it("knows when the choice becomes the Scribe's", () => {
    for (let sealed = 0; sealed < 7; sealed += 1) {
      expect(beyondTheSeven(sealed), `${sealed} sealed`).toBe(false);
    }
    expect(beyondTheSeven(7)).toBe(true);
    expect(beyondTheSeven(40)).toBe(true);
  });

  /** Every rule is choosable, or the choice is a smaller thing than it looks. */
  it("offers all seven, and each of them acts", () => {
    for (const rule of ENCOUNTER_RULES) {
      const chosen = ruleOf({ ruleNumber: rule.number });
      expect(chosen, `the ${rule.number} cannot be chosen`).toBe(rule);
      expect(moved(chosen!), `the ${rule.number} moves nothing`).not.toEqual([]);
    }
  });

  /**
   * **The trap this nearly walked into.** Every rule but the First moves a
   * number that is a fact about the rule; the First's is a fact about a
   * *place* — light doubles in Chesed — and that place was read off the live
   * Encounter, which past the seventh seal is `undefined`. A Scribe who chose
   * the First would have been shown "light gathered in Chesed counts double"
   * and then gathered ordinary light in Chesed. A rule that changes nothing is
   * indistinguishable from a rule that works, which is the thing this whole
   * table is written to prevent.
   */
  it("still knows which Sefirah a chosen rule lights, with no Encounter to ask", () => {
    for (const rule of ENCOUNTER_RULES) {
      if (!rule.motes) continue;
      const lit = illuminedBy(ruleOf({ ruleNumber: rule.number }));
      expect(lit, `the ${rule.number} doubles light nowhere`).toBeTruthy();
      expect(regions.some((r) => r.sefirah === lit), `${lit} is not on the Tree`).toBe(true);
    }
  });
});
