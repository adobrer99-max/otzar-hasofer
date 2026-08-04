import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace, type Verb } from "../abilities";
import { guardianOf } from "../guardians";
import { lettersOnEntering, regions } from "../regions";
import type { SefirahId } from "../../types/letter";
import { buildArena, verbsOf } from "./build";
import { fighter } from "./probes";
import { step, type StepContext } from "./step";
import { tileAt } from "./build";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input } from "./types";

/**
 * **Every guardian, fought to the door — the ending-reachability instrument.**
 *
 * The only ending in this game routes through arena fights, and until this
 * file nothing had ever fought one to completion: `guardians.test.ts` proves
 * the locks hold (`press` shows which Scribe can take a shell off) and the
 * rooms seal, but its own comment refuses to steer — so whether the ten are
 * *beatable*, and what one costs in lamps and time, was unmeasured. The full
 * tour was being priced (`kindleCost`, `economy.test.ts`) on top of ten fights
 * nobody had ever finished.
 *
 * The duel below is a player's honest shape, made of the techniques the lock
 * tests already established one key at a time: walk up to the thing but not
 * into it, stop at the water's edge rather than swim at Leviathan, aim up when
 * it holds the roof, set a stone on a rhythm when it charges, throw whenever
 * the hand is free — and when the shell breaks, walk to the way out, which is
 * what the fighting probe already knows how to do.
 */

const ALL_VERBS: Verb[] = Object.values(abilityByLetter)
  .map((a) => a?.verb)
  .filter((v): v is Verb => Boolean(v));
const ALL_GRACES: Grace[] = Object.values(abilityByLetter)
  .map((a) => a?.grace)
  .filter((g): g is Grace => Boolean(g));
/** A Scribe holding everything — the hand the ending's gate assumes. */
const FULL: StepContext = { verbs: ALL_VERBS, graces: ALL_GRACES };

export interface Duel {
  finished: boolean;
  out: boolean;
  lampsLeft: number;
  /** Ticks the whole room took, fight and walk-out together. */
  ticks: number;
  /** Light carried out — what the broken shell spilled and the walk collected. */
  or: number;
}

/**
 * One guardian's room, entered at the door and left by the exit.
 *
 * Two phases on purpose. While the guardian stands, this is a duelist —
 * positioning and throwing, no interest in the exit, because the room is
 * sealed and the exit is not a fact yet. Broken, the rest is handed to the
 * `fighter`, which is the probe that knows how to leave a place. Exported for
 * the full-climb measurement, which walks a whole record through every room
 * the tour needs.
 */
export function duel(sefirah: SefirahId, seed: number, budget = 24000, ctx: StepContext = FULL): Duel {
  const world = buildArena(sefirah, seed);
  const beast = world.husks[0];
  const stone = guardianOf(sefirah).kind === "behemot";
  let i = 0;

  for (; i < budget && !world.finished && !world.out && !beast.broken; i += 1) {
    const p = world.player;
    const dx = beast.x + beast.w / 2 - (p.x + p.w / 2);
    const towards = (dx >= 0 ? 1 : -1) as 1 | -1;
    // Within a mark's carry, stand and write; further, close the distance —
    // but never into water, which is Leviathan's whole question: the bank is
    // the place to fight from, and the Hook does the crossing.
    // **Under a thing that is over you.** Seven tiles is a good distance to
    // write at something standing on the same floor, and it is the wrong
    // distance entirely for something in the air: a mark aimed up from seven
    // tiles away goes up, and the creature is over *there*. So when the beast
    // is overhead the probe keeps closing until it is beneath it, which is what
    // a person does — and in Yesod it is the whole fight, because the Nefilim
    // does nothing at all until someone is underneath it.
    const above = beast.y + beast.h < p.y;
    const far = Math.abs(dx) > TILE_SIZE * (above ? 1 : 7);
    const aheadX = Math.floor((p.x + p.w / 2) / TILE_SIZE) + towards;
    const footRow = Math.floor((p.y + p.h + 1) / TILE_SIZE);
    const waterAhead =
      tileAt(world, aheadX, footRow) === Tile.Water ||
      tileAt(world, aheadX, footRow - 1) === Tile.Water;
    const advance = far && !waterAhead;
    if (!advance) p.facing = towards;
    const input: Input = {
      ...NO_INPUT,
      right: advance && towards > 0,
      left: advance && towards < 0,
      // The Ziz holds the roof; held up is how a mark goes looking for it.
      up: above,
      // The stone rhythm from the lock tests: set one, take it back, set it
      // again, which is what a person does while the thing is running at them.
      act: stone && i % 30 === 0,
      strike: p.markCooldown === 0,
    };
    step(world, input, ctx);
  }

  if (beast.broken && !world.finished && !world.out) {
    const rest = fighter(world, ctx, budget - i);
    return {
      finished: rest.finished,
      out: rest.out,
      lampsLeft: rest.lampsLeft,
      ticks: i + rest.ticks,
      or: rest.or,
    };
  }
  return {
    finished: world.finished,
    out: Boolean(world.out),
    lampsLeft: world.player.lamps,
    ticks: i,
    or: world.or,
  };
}

const SEEDS = [3, 91, 555];

describe("every room can be walked out of", () => {
  /**
   * The claim the ending stands on, per guardian and per seed: entered with a
   * full hand and three plain lamps, the room is finished — the guardian
   * broken and the exit reached — with no going out.
   *
   * Measured over seeds 3/91/555 (ticks are the slowest seed, lamps the worst
   * seed), and re-measured once each room got its own terrain — the second
   * column is what the room cost when every guardian but Leviathan stood in the
   * same empty box:
   *
   * ```
   *   malchut  arbeh     ≤ 635 ticks  (was 635)   3 lamps kept
   *   yesod    nefilim   ≤ 616        (was 616)   3
   *   hod      saraf     ≤ 624        (was 624)   2
   *   netzach  reem      ≤ 825        (was 616)   3
   *   tiferet  rahav     ≤ 616        (was 616)   3
   *   gevurah  og        ≤ 616        (was 616)   3
   *   chesed   tannin    ≤ 616        (was 616)   3
   *   binah    livyatan  ≤ 689        (was 690)   3
   *   chochmah ziz       ≤ 616        (was 631)   3
   *   keter    behemot   ≤ 773        (was 773)   3
   * ```
   *
   * **One number moved, and it should be read as one number.** Netzach's Re'em
   * now has stone to run into — the line `combat.ts` wrote for it and could not
   * reach in an empty room — and the fight got a third longer because the room
   * does part of it. Everything else is within a tick or two of where it was,
   * and Chochmah is *lower* only because the probe learned to walk under a
   * thing that is over it, which is a change to the instrument and not to the
   * bird.
   *
   * That is the honest report of this phase. Yesod's Nefilim genuinely hangs
   * now and genuinely falls, which it never did, and costs exactly what it
   * cost before. The rest — Malchut's canopy, Hod's shelf, Tiferet's steps,
   * Gevurah's vault, Chesed's arcade, Chochmah's roost — change what a Scribe
   * *may* do and what the place looks like, and a probe that walks in a
   * straight line and throws does not take any of them up on it. Ten rooms
   * that are ten places; three of them are also three fights.
   *
   * The headline for the ending decision: **to a full-hand Scribe the rooms
   * are cheap** — ten to thirteen seconds of game time each, and a lamp is
   * almost never lost. The tour's price is the three hundred light, not the
   * ten fights; a first-timer's cost will be higher, but the ceiling case says
   * the arenas are not the wall. The bars below are deliberately loose: what
   * must never pass silently is a room that cannot be finished, or one that
   * reliably takes the whole body.
   */
  it("finishes all ten guardians, with lamps to spare", () => {
    const rows: string[] = [];
    for (const region of regions) {
      for (const seed of SEEDS) {
        const fight = duel(region.sefirah, seed);
        rows.push(
          `${region.sefirah} seed ${seed}: ${fight.finished ? "finished" : fight.out ? "OUT" : "stalled"} ` +
            `in ${fight.ticks} with ${fight.lampsLeft} lamps`,
        );
        expect(
          fight.finished,
          `${region.sefirah} (${guardianOf(region.sefirah).kind}) seed ${seed} was not finished:\n${rows.join("\n")}`,
        ).toBe(true);
        expect(fight.out, `${region.sefirah} seed ${seed} went out`).toBe(false);
      }
    }
  }, 300000);

  /**
   * And the cost stays inside a body: no room may *reliably* end a three-lamp
   * Scribe. One bad seed losing two lamps is a hard room; every seed losing
   * all three would be a wall the map cannot warn about.
   */
  it("leaves at least one lamp on every seed, in every room", () => {
    for (const region of regions) {
      for (const seed of SEEDS) {
        const fight = duel(region.sefirah, seed);
        expect(
          fight.lampsLeft,
          `${region.sefirah} seed ${seed} ended with ${fight.lampsLeft} lamps`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  }, 300000);
});

/** The same hand, minus named letters — a Scribe who did not walk every way. */
function without(letters: string[]): StepContext {
  const drop = new Set(letters);
  const held = Object.entries(abilityByLetter).filter(([id]) => !drop.has(id));
  return {
    verbs: held.map(([, a]) => a?.verb).filter((v): v is Verb => Boolean(v)),
    graces: held.map(([, a]) => a?.grace).filter((g): g is Grace => Boolean(g)),
  };
}

/**
 * **A room may ask for exactly the letter the map says it asks for.**
 *
 * `guardians.ts` declares one lock per guardian, and that declaration is what
 * the Tree shows a Scribe deciding where to walk. Binah's is Vav, the Hook,
 * because Leviathan cannot be marked in the water and has to be drawn out of
 * it. But the room's *terrain* had a second, undeclared demand in it: the
 * exit lay past eight columns of water, so a Scribe holding Vav and not Mem
 * arrived at a room they could not leave — stuck for the whole
 * twenty-four-thousand-tick budget, on every seed. The map had told them the
 * truth and the ground had not.
 *
 * The fix was terrain, not code: the channel narrowed to a gap a running body
 * clears (`ARENA_SEA_A`/`ARENA_SEA_B`), leaving the water exactly what it was
 * for. These hold both halves of that, because either can regress on its own —
 * widen the channel again and Mem comes back as a hidden lock; drain it and
 * Vav stops being needed and the declared lock becomes decorative.
 */
/**
 * **Every room, against the hand the map actually pays for arriving at it.**
 *
 * The band above enters each room holding all twenty-two letters, which is the
 * ceiling case and answers the question the ending stands on — *are the rooms
 * beatable at all*. It is not the question a Scribe asks. A Scribe arrives at a
 * rung holding what the route there paid, plus whatever the map told them that
 * guardian answers to, and nothing had ever measured that: the honest climb
 * walks it, and when the honest climb failed it failed a hundred walks later,
 * on a sentence about the crown.
 *
 * Measured, `lettersOnEntering(rung)` plus the declared key, three seeds each:
 *
 * ```
 *   malchut  arbeh     hand  0   3/3   635 ticks
 *   yesod    nefilim   hand  2   3/3   640
 *   hod      saraf     hand  5   3/3   637
 *   netzach  reem      hand  7   3/3   827
 *   tiferet  rahav     hand  9   3/3   637
 *   gevurah  og        hand 11   3/3   650
 *   chesed   tannin    hand 13   3/3   616
 *   binah    livyatan  hand 15   3/3   692
 *   chochmah ziz       hand 18   0/3   stuck
 *   keter    behemot   hand 20   3/3   773
 * ```
 */
describe("every room, against the hand its rung pays", () => {
  const honestHand = (index: number, key?: string) => [
    ...new Set([...lettersOnEntering(index), key].filter(Boolean) as string[]),
  ];
  const ctxOf = (held: readonly string[]): StepContext => ({
    verbs: verbsOf(held),
    graces: held
      .map((id) => abilityByLetter[id]?.grace)
      .filter((g): g is Grace => Boolean(g)),
  });

  it("finishes nine of the ten, and names the one it does not", () => {
    for (const region of regions) {
      const key = guardianOf(region.sefirah).opens?.letter;
      const ctx = ctxOf(honestHand(region.index, key));
      for (const seed of SEEDS) {
        const fight = duel(region.sefirah, seed, 24000, ctx);
        // Chochmah is the exception and it is a real one, not a wandering
        // probe: see the block below, which asserts exactly what it wants.
        if (region.sefirah === "chochmah") continue;
        expect(
          fight.finished,
          `${region.sefirah} (${guardianOf(region.sefirah).kind}) seed ${seed} cannot be finished ` +
            `by a Scribe holding what the route there paid`,
        ).toBe(true);
      }
    }
  }, 300000);

  /**
   * **Chochmah asks for the Flame, and the map says the Staff.**
   *
   * The Staff is not wrong — it is the reach, and it is load-bearing: without
   * Lamed the Ziz ends a sixty-thousand-tick duel with all six shells, never
   * once touched, which is exactly what "whether you reach it is a question
   * about how far you can throw" promises. What the map does not say is that
   * reaching it is not breaking it. A mark bites **one** shell unless the
   * Scribe carries Shin, which doubles it (`markBite`, `burns`), and six shells
   * at one apiece is far past a room's budget: measured, three of six off in
   * sixty thousand ticks and the duel lost long before the rest.
   *
   * **And Shin is not paid until after Chochmah.** The four letters an honest
   * Scribe does not yet hold on arriving are Dalet, Shin, Yod and Peh. So the
   * ninth rung of the ending path is, as it stands, a room a Scribe reaches
   * holding eighteen letters and cannot finish — and adding Shin alone finishes
   * it in six hundred and sixteen ticks, while adding Zayin or Kaf does
   * nothing.
   *
   * This is a balance question with three possible answers — move Shin earlier,
   * thin the Ziz's six shells, or let the Staff do more than carry — and it is
   * not one to settle on a probe's evidence in the middle of a chunk-library
   * phase. It is pinned here instead, in both directions, so that whichever
   * answer is chosen the test says so immediately.
   */
  it("cannot be finished at Chochmah until the Flame is in hand", () => {
    const key = guardianOf("chochmah").opens?.letter;
    const without = ctxOf(honestHand(9, key));
    const with_ = ctxOf([...honestHand(9, key), "shin"]);
    for (const seed of SEEDS) {
      expect(
        duel("chochmah", seed, 24000, without).finished,
        `seed ${seed}: the Ziz broke without the Flame — the balance question is answered, update this`,
      ).toBe(false);
      expect(
        duel("chochmah", seed, 24000, with_).finished,
        `seed ${seed}: the Ziz will not break even with the Flame`,
      ).toBe(true);
    }
  }, 300000);
});

describe("Binah's room asks for the Hook, and nothing else", () => {
  it("can be finished carrying Vav and not the Mouth of water", () => {
    for (const seed of SEEDS) {
      const fight = duel("binah", seed, 24000, without(["mem"]));
      expect(
        fight.finished,
        `seed ${seed}: no way out of the sea without Mem (${fight.ticks} ticks)`,
      ).toBe(true);
      expect(fight.out, `seed ${seed} went out`).toBe(false);
    }
  }, 300000);

  it("cannot be finished without Vav, which is the lock the map declares", () => {
    for (const seed of SEEDS) {
      const fight = duel("binah", seed, 24000, without(["vav"]));
      expect(
        fight.finished,
        `seed ${seed}: Leviathan was broken without the Hook`,
      ).toBe(false);
    }
  }, 300000);
});
