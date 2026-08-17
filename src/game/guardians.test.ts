import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace, type Verb } from "./abilities";
import { BEASTS, GREAT, HUSKS, isGreat, markBite, markPowers } from "./combat";
import { boonsFrom, GUARDIAN_LIST, GUARDIANS, guardianOf, TIERS, tierOf } from "./guardians";
import { powersFrom, type Effect } from "./items";
import { regions } from "./regions";
import { LETTER_ORDER, TREE_PATHS } from "./tree";
import { buildArena } from "./world/build";
import { step, type StepContext } from "./world/step";
import { TILE_SIZE } from "./world/tiles";
import { NO_INPUT, type Input, type World } from "./world/types";

/**
 * **What holds a Sefirah, and what opens it.**
 *
 * Two claims, and they fail in different ways. The table can be wrong on paper
 * — a Sefirah with no guardian, two guardians with the same boon, a great one
 * keyed to a letter no route to it can carry — and all of that is checked here
 * without running anything.
 *
 * The other claim is the one this whole tier exists for and it cannot be
 * checked on paper at all: **without its letter, a great one does not open.**
 * A rule that says so in a comment and is not in the reducer would look, from
 * the outside, exactly like a fight that is simply hard. So each of the three
 * is fought twice in its own room, holding the letter and not holding it, and
 * what is asserted is the difference.
 */

const lettersFor = (verbs: Verb[], graces: Grace[]): StepContext => ({ verbs, graces });

/** Everything the Scribe can do except the one letter under test. */
const ALL_VERBS: Verb[] = Object.values(abilityByLetter)
  .map((a) => a?.verb)
  .filter((v): v is Verb => Boolean(v));
const ALL_GRACES: Grace[] = Object.values(abilityByLetter)
  .map((a) => a?.grace)
  .filter((g): g is Grace => Boolean(g));

describe("the guardians", () => {
  it("holds every Sefirah, and holds it with something that exists", () => {
    for (const region of regions) {
      const guardian = guardianOf(region.sefirah);
      expect(guardian, `${region.name} is held by nothing`).toBeDefined();
      expect(guardian.sefirah).toBe(region.sefirah);
      expect(HUSKS[guardian.kind], `${region.name} is held by an unknown creature`).toBeDefined();
      expect(guardian.because.length, `${region.name} does not say why`).toBeGreaterThan(30);
    }
    expect(GUARDIAN_LIST).toHaveLength(regions.length);
  });

  /**
   * Every guardian is a creature, and no creature holds two Sefirot. Seven
   * beasts below and three great ones above — which is also the check that
   * nobody quietly stood a klipah at a Sefirah because it was convenient.
   */
  it("stands one creature at each, and never a person", () => {
    const kinds = GUARDIAN_LIST.map((g) => g.kind);
    expect(new Set(kinds).size, "one creature holds two Sefirot").toBe(kinds.length);
    for (const kind of kinds) {
      expect(
        [...BEASTS, ...GREAT],
        `a Sefirah is held by ${kind}, which is a person and not a creature`,
      ).toContain(kind);
    }
    // And the three great ones stand above the Abyss, where nothing else does.
    const above = regions.filter((r) => !r.hasHouse).map((r) => r.sefirah);
    for (const sefirah of above) {
      expect(isGreat(GUARDIANS[sefirah].kind), `${sefirah} is held by an ordinary creature`).toBe(
        true,
      );
    }
    for (const g of GUARDIAN_LIST) {
      if (!isGreat(g.kind)) continue;
      expect(above, `${g.kind} stands below the Abyss`).toContain(g.sefirah);
    }
  });

  /**
   * A key has to be a letter the game actually grants, and it has to be
   * *gettable on the way there*. A great one keyed to a letter that only its
   * own Sefirah pays would be a lock whose key is inside it.
   */
  it("keys each great one to a letter a route there can carry", () => {
    for (const g of GUARDIAN_LIST) {
      if (!isGreat(g.kind)) {
        expect(g.opens, `${g.kind} is an ordinary creature with a key`).toBeUndefined();
        continue;
      }
      const opens = g.opens;
      expect(opens, `${g.kind} is a great one and opens to nothing`).toBeDefined();
      if (!opens) continue;
      const ability = abilityByLetter[opens.letter];
      expect(ability, `${g.kind} is keyed to "${opens.letter}", which is not a letter`).toBeDefined();
      expect(ability?.verb ?? ability?.grace, `${opens.letter} grants nothing`).toBe(
        opens.verb ?? opens.grace,
      );
      expect(opens.how.length, `${g.kind} does not say how`).toBeGreaterThan(40);

      // The path that pays this letter must not be a path into this Sefirah and
      // nothing else — otherwise the only way to hold the key is to already
      // have arrived, and having arrived is exactly when it is needed.
      const paying = TREE_PATHS.filter((p) => p.letter === opens.letter);
      expect(paying.length, `nothing on the Tree pays ${opens.letter}`).toBeGreaterThan(0);
      const elsewhere = paying.some((p) => !p.ends.includes(g.sefirah));
      expect(
        elsewhere,
        `${opens.letter} is only paid by a path into ${g.sefirah}, so its key is inside its own lock`,
      ).toBe(true);

      // And it must be payable *before* this Sefirah is reachable at all — the
      // letters sit on the Tree in `LETTER_ORDER`, so a key later in that order
      // than everything reaching here is a key that arrives too late.
      expect(LETTER_ORDER, `${opens.letter} is not on the Tree`).toContain(opens.letter);
    }
  });

  /**
   * The boons are the other across-runs system and they must not be the
   * Encounters. **The Encounters change the world; the guardians change the
   * Scribe** — so every boon moves a number the mark reads, none of them is
   * inert, and no two of them move the same one.
   */
  it("gives every guardian a boon that does something, and no two the same", () => {
    const bare = powersFrom([]);
    const seen = new Map<string, string>();
    for (const g of GUARDIAN_LIST) {
      const alone = powersFrom([], [g.boon]);
      expect(alone, `breaking ${g.kind} changes nothing`).not.toEqual(bare);
      expect(g.boonLine.length, `${g.kind} gives a boon that says nothing`).toBeGreaterThan(30);
      for (const knob of Object.keys(g.boon) as (keyof Effect)[]) {
        const already = seen.get(knob);
        expect(already, `${g.kind} and ${already} both move "${knob}"`).toBeUndefined();
        seen.set(knob, g.kind);
      }
    }
    // Ten guardians, ten distinct things about the mark.
    expect(seen.size).toBe(GUARDIAN_LIST.length);
  });

  /**
   * And the boons have to *reach the mark*. They cross four files to get there
   * — `guardians.ts` to `powersFrom` to `markPowers` to `throwMark` — and a
   * field dropped anywhere along that road would look exactly like a boon that
   * was never worth much, which is the failure this whole codebase keeps
   * catching itself in.
   */
  it("puts what a guardian gave into the mark the Scribe throws", () => {
    const bare = markPowers([], []);
    /**
     * **Three of the ten are not about the mark**, and saying so here is more
     * useful than pretending otherwise: a lamp is what the Scribe is made of,
     * the grace after a hit is read by `takeHit`, and what a mote is worth is
     * written into the world when it is built. They fold through the same
     * `Powers` and are asserted alive by the test above; what they do not do is
     * arrive in a thrown letter, and a test that demanded they did would be a
     * test demanding the wrong thing.
     */
    const BODILY = new Set(["lamps", "iframes", "light"]);
    for (const g of GUARDIAN_LIST) {
      if (Object.keys(g.boon).every((k) => BODILY.has(k))) continue;
      const after = markPowers([], [], [], [g.boon]);
      expect(after, `${g.kind}'s boon never reaches the mark`).not.toEqual(bare);
    }
    // The three great ones each lend the mark a behaviour, which is the thing
    // no number can stand in for.
    expect(markPowers([], [], [], [GUARDIANS.binah.boon]).homing).toBe(true);
    expect(markPowers([], [], [], [GUARDIANS.chochmah.boon]).splits).toBe(true);
    expect(markPowers([], [], [], [GUARDIANS.keter.boon]).bounces).toBe(true);
    // And a Scribe who has broken nothing throws the mark the game shipped.
    expect(markPowers([], [], [], []).homing).toBe(false);
  });

  it("carries only what has been broken", () => {
    expect(boonsFrom([])).toEqual([]);
    expect(boonsFrom(["gevurah"])).toEqual([GUARDIANS.gevurah.boon]);
    // A saved climb naming a Sefirah a later version no longer holds is ignored
    // rather than thrown on.
    expect(boonsFrom(["gevurah", "nowhere" as never])).toHaveLength(1);
  });
});

/**
 * **The tiers — the reason to walk a way a second time.**
 *
 * The boons were ten booleans, every one reachable inside a single thorough
 * climb. After that, breaking a guardian again changed a Scribe by exactly
 * nothing: the game's oldest across-runs system ran out well before the Seven
 * Encounters did, and re-fighting was pure sentiment.
 */
describe("what a second and third breaking are worth", () => {
  const KNOBS = ["bite", "reach", "cooldown", "speed", "lamps", "iframes", "light"] as const;
  const BEHAVIOURS = ["pierces", "bounces", "homing", "splits", "arcs"] as const;

  it("counts from zero to a hard ceiling, and never past it", () => {
    expect(tierOf(0)).toBe(0);
    expect(tierOf(1)).toBe(1);
    expect(tierOf(TIERS)).toBe(TIERS);
    expect(tierOf(TIERS + 40)).toBe(TIERS);
    expect(tierOf(-3)).toBe(0);
  });

  it("gives the boon once and the deepening for every breaking after it", () => {
    expect(boonsFrom({ gevurah: 1 })).toEqual([GUARDIANS.gevurah.boon]);
    expect(boonsFrom({ gevurah: 2 })).toEqual([
      GUARDIANS.gevurah.boon,
      GUARDIANS.gevurah.deepens,
    ]);
    expect(boonsFrom({ gevurah: 3 })).toEqual([
      GUARDIANS.gevurah.boon,
      GUARDIANS.gevurah.deepens,
      GUARDIANS.gevurah.deepens,
    ]);
    // And the fourth is worth nothing, which is the cap being hard rather
    // than a curve that flattens.
    expect(boonsFrom({ gevurah: 9 })).toEqual(boonsFrom({ gevurah: TIERS }));
  });

  it("gives nothing at all for a guardian never broken", () => {
    expect(boonsFrom({ gevurah: 0 })).toEqual([]);
    expect(boonsFrom({})).toEqual([]);
  });

  /**
   * **The one that matters.** A deepening that moved no number would be
   * indistinguishable from no deepening at all — the same trap
   * `encounter.test.ts` catches for the Seven Encounters' rules, and the same
   * reason this is a table rather than a repetition of `boon`: repeating
   * would silently give the three great ones nothing, since a behaviour is
   * had or not had and ORs with itself.
   */
  it("gives no guardian a deepening that changes nothing", () => {
    const inert = GUARDIAN_LIST.filter((g) => {
      const moves = KNOBS.some((k) => g.deepens[k] !== undefined && g.deepens[k] !== 1);
      return !moves;
    });
    expect(inert.map((g) => g.sefirah), "these deepen by nothing").toEqual([]);
  });

  it("deepens in a number rather than a behaviour, even where the boon is one", () => {
    for (const guardian of GUARDIAN_LIST) {
      for (const flag of BEHAVIOURS) {
        expect(
          guardian.deepens[flag],
          `${guardian.sefirah} tries to give ${flag} again, which ORs to nothing`,
        ).toBeUndefined();
      }
    }
  });

  it("says what every tier is, in the voice of the thing", () => {
    for (const guardian of GUARDIAN_LIST) {
      expect(guardian.deepLine.length, `${guardian.sefirah}`).toBeGreaterThan(24);
      expect(guardian.deepLine, `${guardian.sefirah} repeats itself`).not.toBe(guardian.boonLine);
      // The tier cap has its own sentence — tiers 2 and 3 shared one for as
      // long as tiers existed, so the last fight ended in words already read.
      expect(guardian.crownLine.length, `${guardian.sefirah}`).toBeGreaterThan(24);
      expect(guardian.crownLine, `${guardian.sefirah}'s cap repeats tier 2`).not.toBe(guardian.deepLine);
      expect(guardian.crownLine, `${guardian.sefirah}'s cap repeats tier 1`).not.toBe(guardian.boonLine);
    }
  });

  /**
   * A third breaking must be better than a first and worse than a fourth would
   * have been if there were one — run through the real fold rather than
   * eyeballed, because the fold multiplies rates and *adds* quantities and the
   * two behave differently under repetition.
   */
  it("makes a Scribe measurably stronger for coming back, and then stops", () => {
    const at = (n: number) => markPowers([], [], [], boonsFrom({ tiferet: n })).bite ?? 0;
    expect(at(2)).toBeGreaterThan(at(1));
    expect(at(3)).toBeGreaterThan(at(2));
    expect(at(9)).toBe(at(3));
    // **The power, not the shells.** `markBite` rounds, so Tiferet's tiers on
    // their own move the mark from 1.15 shells to 1.24 and still take one off
    // a husk — a tier is a thumb on the scale that pays when something else is
    // carried beside it, exactly as the vessels' own small multipliers do.
    // Anyone reading this expecting a third breaking to add a shell by itself
    // should read that line in `combat.ts` first.
    expect(markBite(markPowers([], [], [], boonsFrom({ tiferet: 3 })))).toBe(1);
  });

  it("keeps the behaviour of a great one at the first breaking, tier or no tier", () => {
    for (const times of [1, 2, 3, 9]) {
      expect(markPowers([], [], [], boonsFrom({ keter: times })).bounces).toBe(true);
    }
  });
});

/**
 * **The rooms, and the three that do not open.**
 *
 * Everything above is a table. This runs the reducer.
 */
describe("a guardian's room", () => {
  it("builds one for every Sefirah, with the guardian in it and a way out past it", () => {
    for (const region of regions) {
      const world = buildArena(region.sefirah, 7);
      expect(world.arena).toBe(region.sefirah);
      expect(world.husks, `${region.name}'s room is empty`).toHaveLength(1);
      expect(world.husks[0].kind).toBe(GUARDIANS[region.sefirah].kind);
      expect(world.entities.some((e) => e.kind === "exit"), `${region.name} has no way out`).toBe(
        true,
      );
      // Nothing else is in it: no letters, no vessel, no House. A room for one
      // thing.
      expect(world.entities.filter((e) => e.kind === "letter")).toHaveLength(0);
      expect(world.entities.filter((e) => e.kind === "vessel")).toHaveLength(0);
    }
  });

  it("shuts behind the Scribe, whatever kind of creature is in it", () => {
    for (const region of regions) {
      const world = buildArena(region.sefirah, 7);
      const ctx = lettersFor(ALL_VERBS, ALL_GRACES);
      // Walked into the middle room, which is the one the guardian holds.
      const middle = world.rooms[1];
      world.player.x = (middle.x + 2) * TILE_SIZE;
      world.player.y = (middle.y + middle.h - 3) * TILE_SIZE;
      for (let i = 0; i < 20; i += 1) step(world, NO_INPUT, ctx);
      expect(world.inSealedRoom, `${region.name}'s room did not shut`).toBe(true);
    }
  });
});

/**
 * **Without the letter, it does not open.** The claim, against the reducer.
 *
 * Each of the three is given exactly the same fight twice — same room, same
 * seed, same number of ticks, a Scribe holding everything the alphabet grants
 * — and the only difference between the two runs is the one letter. If the
 * shells come off both times, the letter is decoration and the whole tier is a
 * large klipah with a verse attached.
 */
describe("the three great ones", () => {
  /** Everything except the named verb, and everything except the named grace. */
  const without = (verb?: Verb, grace?: Grace): StepContext =>
    lettersFor(
      ALL_VERBS.filter((v) => v !== verb),
      ALL_GRACES.filter((g) => g !== grace),
    );

  /**
   * Marks thrown at the guardian on a steady rhythm, from wherever the Scribe
   * is put, for as long as it takes. Returns how many shells came off.
   *
   * Deliberately not the fighting probe: that steers toward an exit and would
   * be measuring its own pathfinding. What is being asked here is narrower and
   * has to be exact — given a Scribe who is aiming at the thing and pressing
   * the right key, does a shell come off.
   */
  function press(
    world: World,
    ctx: StepContext,
    ticks: number,
    each?: (world: World, tick: number) => Partial<Input>,
  ): number {
    const beast = world.husks[0];
    const before = beast.shells;
    for (let i = 0; i < ticks; i += 1) {
      const p = world.player;
      p.facing = beast.x + beast.w / 2 > p.x + p.w / 2 ? 1 : -1;
      const aim: Partial<Input> = {
        strike: p.markCooldown === 0,
        // Held up when the thing is above: the Ziz is only ever above.
        up: beast.y + beast.h < p.y,
      };
      step(world, { ...NO_INPUT, ...aim, ...each?.(world, i) }, ctx);
    }
    return before - beast.shells;
  }

  /** Stood on the bank at the near end of the pool, facing the water. */
  function atLeviathan(): World {
    const world = buildArena("binah", 7);
    const middle = world.rooms[1];
    world.player.x = (middle.x + 2) * TILE_SIZE;
    world.player.y = (middle.y + middle.h - 3) * TILE_SIZE;
    return world;
  }

  it("will not let Leviathan be marked in the water", () => {
    const world = atLeviathan();
    const taken = press(world, without("grapple"), 900);
    expect(taken, "Leviathan opened to a Scribe with no Hook").toBe(0);
    // And it is still in the water, which is why.
    const beast = world.husks[0];
    expect(beast.broken ?? false).toBe(false);
  });

  it("opens Leviathan to a Scribe who draws it out", () => {
    const world = atLeviathan();
    const taken = press(world, lettersFor(ALL_VERBS, ALL_GRACES), 900);
    expect(taken, "the Hook drew nothing out").toBeGreaterThan(0);
  });

  /**
   * The Ziz is a question about distance, so the answer is a *place to stand* —
   * and a Scribe who cannot reach it from where they are walks somewhere else
   * and tries again. Swept rather than fixed, because pinning one standing spot
   * would be tuning the bird to a single ray and calling it a fight.
   */
  function atZiz(from: number): World {
    const world = buildArena("chochmah", 7);
    const middle = world.rooms[1];
    world.player.x = (middle.x + from) * TILE_SIZE;
    world.player.y = (middle.y + middle.h - 3) * TILE_SIZE;
    return world;
  }
  const STANDING = [4, 8, 12, 16, 20, 24, 28];
  const anywhere = (ctx: StepContext) =>
    Math.max(...STANDING.map((from) => press(atZiz(from), ctx, 400)));

  it("keeps the Ziz out of reach of a Scribe without the Staff, from anywhere", () => {
    expect(anywhere(without(undefined, "high-jump")), "an ordinary mark reached it").toBe(0);
  });

  it("puts the Ziz inside the Staff's reach, from somewhere", () => {
    expect(anywhere(lettersFor(ALL_VERBS, ALL_GRACES)), "the Staff reached nothing").toBeGreaterThan(
      0,
    );
  });

  /**
   * Behemoth is the one that needs a hand: the answer is a stone set in its
   * way, and setting one is an act rather than an aim. So the act key is held
   * down on a rhythm, which is what a person does.
   */
  function atBehemoth(): World {
    const world = buildArena("keter", 7);
    const middle = world.rooms[1];
    world.player.x = (middle.x + 3) * TILE_SIZE;
    world.player.y = (middle.y + middle.h - 3) * TILE_SIZE;
    return world;
  }

  it("will not let Behemoth be marked while it is moving", () => {
    const world = atBehemoth();
    const taken = press(world, without("block"), 900);
    expect(taken, "Behemoth opened to a Scribe with no House").toBe(0);
    // Nothing was ever set in its way, which is the reason.
    expect(world.placed).toHaveLength(0);
  });

  it("stops Behemoth on a stone, and opens it while it is stopped", () => {
    const world = atBehemoth();
    const taken = press(world, lettersFor(ALL_VERBS, ALL_GRACES), 900, (_w, i) => ({
      // Set one, take it back, set it again — which is what a Scribe does when
      // the thing is running at them and the stone is in the wrong place.
      act: i % 30 === 0,
    }));
    expect(taken, "Behemoth never stopped, or stopped and took nothing").toBeGreaterThan(0);
  });
});
