import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace, type Verb } from "../abilities";
import { guardianOf } from "../guardians";
import { regions } from "../regions";
import type { SefirahId } from "../../types/letter";
import { buildArena } from "./build";
import { fighter } from "./fight.test";
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
    const far = Math.abs(dx) > TILE_SIZE * 7;
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
      up: beast.y + beast.h < p.y,
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
   * Measured when this was written, over seeds 3/91/555 (ticks are the
   * slowest seed, lamps the worst seed):
   *
   * ```
   *   malchut  arbeh     ≤ 635 ticks   3 lamps kept
   *   yesod    nefilim   ≤ 616         3
   *   hod      saraf     ≤ 624         2
   *   netzach  reem      ≤ 616         3
   *   tiferet  rahav     ≤ 616         3
   *   gevurah  og        ≤ 616         3
   *   chesed   tannin    ≤ 616         3
   *   binah    livyatan  ≤ 690         3
   *   chochmah ziz       ≤ 631         3
   *   keter    behemot   ≤ 773         3
   * ```
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
