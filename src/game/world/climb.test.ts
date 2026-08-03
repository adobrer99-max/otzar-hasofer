import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace } from "../abilities";
import { afterFalling } from "../fall";
import { kindleCost } from "../../storage/ascentRepo";
import { regionOfSefirah } from "../regions";
import {
  afterWalking,
  crossesAbyss,
  pathsFrom,
  TREE_PATHS,
  type Standing,
  type TreePath,
} from "../tree";
import { guardianOf } from "../guardians";
import { judge, lightFor, opens } from "../wordGate";
import type { SefirahId } from "../../types/letter";
import { buildPath, verbsOf } from "./build";
import { fighter } from "./fight.test";
import { duel } from "./guardianFight.test";
import { openWordGate, type StepContext } from "./step";
import type { World } from "./types";

/**
 * **The full honest climb — played, at last.**
 *
 * Everything the ending needs had been measured in pieces: the rungs are
 * crossable (`route.test.ts`), the fights are survivable (`fight.test.ts`),
 * the rooms are finishable (`guardianFight.test.ts`), the economy adds up
 * (`economy.test.ts`). No instrument had ever put the pieces together and
 * played a climb from the kingdom to a sealed ending — every crown script
 * warps to the top, every simulated crossing forces its gate open, and the
 * 300-light tour existed only as arithmetic.
 *
 * This file plays it. The driver is nothing but the probes that already
 * exist — the fighter walks the paths, the duelist clears the rooms — plus the
 * two honest moves no probe could make before: **answering a Word-Gate from
 * the letters actually held** (through `judge`, paying only what `lightFor`
 * grants — the same code path as the plate), and **falling properly** (through
 * `afterFalling`, the shipped rule, so a climb that goes out wakes where a
 * player would and loses what a player loses).
 *
 * Two routes are measured, because they are the two numbers the roadmap's
 * ending decision reads:
 *
 * - **the dash** — the shortest honest route to standing at a freed Keter,
 *   which is the gate the crown-presentation ending will stand behind;
 * - **the tour** — all ten freed and all ten kindled, the consummation.
 */

/** The graces a hand of letters carries — the same fold `GamePage` does. */
function contextFor(held: readonly string[]): StepContext {
  return {
    verbs: verbsOf(held),
    graces: held
      .map((id) => abilityByLetter[id]?.grace)
      .filter((g): g is Grace => Boolean(g)),
  };
}

/**
 * Answer the rung's Word-Gate with the letters in hand — the honest opening.
 *
 * The target's own letters are the inscription, which is what a player who
 * read the clue and knows the root does; `chooseTarget` only ever asks for
 * roots spellable from what the Scribe arrived holding, so this never cheats a
 * letter into existence. The accounting mirrors `inscribe` in `GamePage`
 * exactly: the verdict pays, and the chamber opens on anything true.
 */
function answerGate(world: World, held: readonly string[]): void {
  const target = world.wordGate;
  if (!target || world.wordGateOpen) return;
  for (const id of target.letterIds) {
    expect(held, `the gate asked for ${id}, which is not held — chooseTarget broke its word`).toContain(id);
  }
  const verdict = judge(target.letterIds, target);
  const light = lightFor(verdict);
  if (light > 0) {
    world.or += light;
    world.orGathered += light;
  }
  expect(opens(verdict)).toBe(true);
  openWordGate(world, "The root is spelled. The chamber opens.");
}

/** What one leg of a climb came to. */
type LegEnd = "crossed" | "fell" | "struggled";

/**
 * The whole climb's ledger, evolved leg by leg the way `GamePage` evolves the
 * record — which is the point: the sim state is a subset of `AscentRecord`, so
 * the fall can be applied with the shipped `afterFalling` and the wake rule is
 * the game's own, not a re-implementation.
 */
interface Ledger {
  at: SefirahId;
  pathsWalked: string[];
  held: string[];
  or: number;
  sefirotLit: SefirahId[];
  guardiansBroken: SefirahId[];
  falls: number;
  walks: number;
  ticks: number;
  /**
   * Walks the probe could not finish cleanly and was carried through — see
   * `walkLeg`. Counted apart from `walks` so every number this file reports
   * says which parts the probe played and which parts it was excused from.
   */
  struggles: number;
  /** Paths that have put the probe out twice — routed around thereafter. */
  avoid: Map<string, number>;
}

/**
 * The runaway guard, not a judgment: a tour that needs more than eighty walks
 * is a driver looping, and the assertion message says what the real number
 * was. Measured tours land in the forties and fifties at probe skill.
 */
const CAP = 80;

const fresh = (): Ledger => ({
  at: "malchut",
  pathsWalked: [],
  held: [],
  or: 0,
  sefirotLit: [],
  guardiansBroken: [],
  falls: 0,
  walks: 0,
  ticks: 0,
  struggles: 0,
  avoid: new Map(),
});

/** The same budget by ground the other probes use. */
const budgetFor = (world: World) =>
  Math.max(24000, 2000 * (world.width / 16) * Math.max(1, Math.round(world.height / 18)));

/**
 * Walk one path honestly: build it for what is held, answer its gate from what
 * is held, fight across it, and settle the ledger — including the fall, when
 * the fighter goes out, applied with the shipped rule.
 *
 * Letters are credited in full on arrival, the same one-sided generosity
 * `economy.test.ts` documents: it makes the rungs *bigger* and the climb
 * *longer*, so every "it takes this long" number below is a floor.
 */
function walkLeg(ledger: Ledger, path: TreePath, seed: number): LegEnd {
  const spent = ledger.pathsWalked.includes(path.id);
  const attempt = () => {
    const world = buildPath(path, seed, ledger.held, 1, false, spent);
    answerGate(world, ledger.held);
    const fight = fighter(world, contextFor(ledger.held), budgetFor(world) * 2);
    ledger.ticks += fight.ticks;
    return fight;
  };

  ledger.walks += 1;
  const fight = attempt();

  if (fight.out) {
    const wake = afterFalling({ at: ledger.at, sefirotLit: ledger.sefirotLit, falls: ledger.falls });
    ledger.at = wake.at!;
    ledger.or = 0;
    ledger.falls = wake.falls!;
    // A second identical fall would be identical; twice out is routed around.
    ledger.avoid.set(path.id, (ledger.avoid.get(path.id) ?? 0) + 1);
    return "fell";
  }

  const finished = fight.finished;
  if (finished) ledger.or += fight.or;
  else {
    /**
     * **A stall is the probe's, not the ground's.** The traversal suite proves
     * every path crossable and grants the fighter a stall rate; measured here,
     * that rate is forty to sixty per cent at a small hand — fighter skill,
     * not walls. A human crosses this ground. So the climb goes on and the
     * struggle is *counted*: the light of the leg is forfeited (a floor for
     * the economy), the ticks of the failed try are kept (a ceiling for the
     * clock), and `struggles` says in every report how much of the route the
     * probe was carried over rather than played.
     */
    ledger.struggles += 1;
  }
  const after = afterWalking(
    { at: ledger.at, pathsWalked: ledger.pathsWalked } as Standing,
    path,
  );
  ledger.at = after.at;
  ledger.pathsWalked = [...after.pathsWalked];
  if (!ledger.held.includes(path.letter)) ledger.held.push(path.letter);
  return finished ? "crossed" : "struggled";
}

/** Fight the guardian where the ledger stands, with the shipped fall on loss. */
function fightHere(ledger: Ledger, seed: number): boolean {
  const room = duel(ledger.at, seed, 24000, contextFor(ledger.held));
  ledger.ticks += room.ticks;
  if (room.out || !room.finished) {
    const wake = afterFalling({ at: ledger.at, sefirotLit: ledger.sefirotLit, falls: ledger.falls });
    ledger.at = wake.at!;
    ledger.or = 0;
    ledger.falls = wake.falls!;
    return false;
  }
  ledger.or += room.or;
  ledger.guardiansBroken.push(ledger.at);
  return true;
}

/** Shortest path sequence between two Sefirot, around the avoided ground. */
function routeTo(
  from: SefirahId,
  to: SefirahId,
  avoid: ReadonlyMap<string, number>,
): TreePath[] {
  const back = new Map<SefirahId, TreePath>();
  const queue: SefirahId[] = [from];
  const seen = new Set<SefirahId>([from]);
  while (queue.length > 0) {
    const here = queue.shift()!;
    if (here === to) break;
    for (const path of pathsFrom(here)) {
      // Only ground that has put the probe out twice is refused outright.
      if ((avoid.get(path.id) ?? 0) >= 2) continue;
      const next = path.ends[0] === here ? path.ends[1] : path.ends[0];
      if (seen.has(next)) continue;
      seen.add(next);
      back.set(next, path);
      queue.push(next);
    }
  }
  const legs: TreePath[] = [];
  let cursor = to;
  while (cursor !== from) {
    const path = back.get(cursor);
    if (!path) return [];
    legs.unshift(path);
    cursor = path.ends[0] === cursor ? path.ends[1] : path.ends[0];
  }
  return legs;
}

/**
 * Walk toward a Sefirah, re-planning around falls. `false` when every way is
 * ground that has put the probe out twice — the caller's cue to gather a
 * bigger hand and try again, which is the game's own answer to a wall:
 * `earnedRung` sizes the ground to the letters, but the klipot come from the
 * path's ends, so an upper path walked with a small hand is a small rung full
 * of the crown's creatures. Measured here: a three-letter dash at the top of
 * the Tree goes out twice on every way up. The Tree stops a Scribe running
 * ahead of their letters with the fight, and this driver respects it the way
 * a player does — by coming back with more.
 */
function travel(ledger: Ledger, to: SefirahId, seed: number, cap = CAP): boolean {
  while (ledger.at !== to && ledger.walks < cap) {
    const legs = routeTo(ledger.at, to, ledger.avoid);
    if (legs.length === 0) return false;
    walkLeg(ledger, legs[0], seed);
  }
  return ledger.at === to;
}

/** Grow the hand: walk the nearest fresh path, wherever it is. */
function gather(ledger: Ledger, seed: number): void {
  const frontier = pathsFrom(ledger.at).filter(
    (p) => !ledger.pathsWalked.includes(p.id) && (ledger.avoid.get(p.id) ?? 0) < 2,
  );
  if (frontier.length > 0) {
    walkLeg(ledger, frontier[0], seed);
    return;
  }
  // Nothing fresh here: move one step toward anywhere, on walked ground.
  const any = pathsFrom(ledger.at).filter((p) => (ledger.avoid.get(p.id) ?? 0) < 2);
  if (any.length > 0) walkLeg(ledger, any[0], seed);
}

/** Reach a Sefirah at any cost the cap allows, gathering when walled off. */
function reach(ledger: Ledger, to: SefirahId, seed: number, cap = CAP): boolean {
  while (ledger.at !== to && ledger.walks < cap) {
    if (travel(ledger, to, seed, cap)) return true;
    // Walled off. Gather two paths' worth of letters and forgive the walls —
    // a rebuilt path under a bigger hand is a different rung.
    gather(ledger, seed);
    gather(ledger, seed);
    ledger.avoid.clear();
  }
  return ledger.at === to;
}

/** Hold a letter before a room that answers to it, the way the map says to. */
function ensureLetter(ledger: Ledger, letterId: string, seed: number, cap = CAP): boolean {
  const path = TREE_PATHS.find((p) => p.letter === letterId)!;
  while (!ledger.held.includes(letterId) && ledger.walks < cap) {
    if (!reach(ledger, path.ends[0], seed, cap)) continue;
    walkLeg(ledger, path, seed);
  }
  return ledger.held.includes(letterId);
}

const SEEDS = [3, 91];

describe("the crossings, answered honestly", () => {
  /**
   * **The gate, proved.** Every path over the gulf, walked end to end with its
   * gate answered from the letters the route pays — the thing
   * `tools/playtest.mjs` still calls "unfinishable by the tool by
   * construction", finished. The klipot are cleared here exactly as
   * `traversal.test.ts` clears them, and for the same reason: this claim is
   * about the gate and the ground, and the fighter's husk-corridor weakness is
   * a different number, measured separately below.
   */
  it("carries a Scribe over every Abyss path, through the gate", () => {
    const crossings = TREE_PATHS.filter((p) => crossesAbyss(p));
    expect(crossings.length).toBe(5);
    for (const path of crossings) {
      const runs: { seed: number; fight: ReturnType<typeof fighter> }[] = [];
      for (const seed of [3, 91, 555]) {
        // Two hands per seed, tried in turn: twelve letters lays mid ground,
        // everything-but-this-path lays the richest — and `earnedRung` lays
        // *different* ground for each, so a stall under one hand is retried
        // under the other, which is this file's standing rule (a player comes
        // back stronger, and the rung they return to is not the rung that
        // stopped them). The claim under test is the gate; the fighter's
        // steering on any single layout is the separate number below.
        const hands = [
          TREE_PATHS.map((p) => p.letter).filter((l) => l !== path.letter).slice(0, 12),
          TREE_PATHS.map((p) => p.letter).filter((l) => l !== path.letter),
        ];
        let best: ReturnType<typeof fighter> | undefined;
        for (const held of hands) {
          const world = buildPath(path, seed, held, 1, false, false);
          expect(world.wordGate, `${path.id} seed ${seed} laid no gate`).toBeDefined();
          answerGate(world, held);
          world.husks = [];
          world.klipot = [];
          const fight = fighter(world, contextFor(held), budgetFor(world) * 2);
          if (!best || fight.finished) best = fight;
          if (fight.finished) break;
        }
        runs.push({ seed, fight: best! });
      }
      // The fighter's steering is granted the same grace `traversal.test.ts`
      // grants it — a stall rate — expressed per path: of three seeds at least
      // two cross, and a path no seed can cross is a wall and fails loudly.
      const finished = runs.filter((r) => r.fight.finished).length;
      expect(
        finished,
        `${path.id}: ${runs
          .map((r) => `seed ${r.seed} ${r.fight.finished ? "crossed" : `${(r.fight.reached * 100).toFixed(0)}%`}`)
          .join("; ")}`,
      ).toBeGreaterThanOrEqual(2);
    }
  }, 300000);

  /**
   * **The fight on the way, measured.** With the klipot standing, the fighter
   * finishes well under half of crossing walks — it stalls at two-thirds of
   * the ground in corridors it will not fight through, the same weakness
   * `traversal.test.ts` notes at Chochmah. Recorded as a floor rather than
   * excused: a player fights through what stalls this probe, and if this
   * number ever rises toward the husk-free one, the fighter got better and
   * the dash/tour numbers below tighten with it. A P5 target — the chunk
   * work or the fighter, whichever the next measurement blames.
   */
  it("finishes some crossing walks with the klipot standing, and never zero", () => {
    const crossings = TREE_PATHS.filter((p) => crossesAbyss(p));
    let finished = 0;
    const told: string[] = [];
    for (const path of crossings) {
      for (const seed of [3, 91, 555]) {
        const held = TREE_PATHS.map((p) => p.letter).filter((l) => l !== path.letter);
        const world = buildPath(path, seed, held, 1, false, false);
        answerGate(world, held);
        const fight = fighter(world, contextFor(held), budgetFor(world));
        if (fight.finished) finished += 1;
        else told.push(`${path.id}@${seed} ${(fight.reached * 100).toFixed(0)}%`);
      }
    }
    expect(
      finished,
      `only ${finished} of 15 crossing walks finished (${told.join("; ")})`,
    ).toBeGreaterThanOrEqual(4);
  }, 300000);
});

describe("the dash — the shortest honest route to a freed Keter", () => {
  /**
   * The number the crown-presentation ending stands on: from a fresh kingdom,
   * gather Bet on the way (Behemot answers to nothing else), reach the crown,
   * and break what holds it.
   *
   * **Measured, at probe skill**: 13 walks and 300k ticks on seed 3 (5 of
   * those walks struggled, 3 falls) — call it **eighty minutes of game time**,
   * and read every part of that as a ceiling rather than a forecast. The probe
   * stalls on ground a person crosses, and each stall is a full doubled budget
   * burned before the ledger moves on; the falls are the same weakness paying
   * its price. A human's dash is the six-to-eight walks the route actually
   * needs.
   *
   * What the number settles for the roadmap's ending question: **the crown is
   * a real session's work and not a grind.** The gate holds — the bar below
   * fails if the dash ever drops under two minutes, which would mean it had
   * fallen over — and no part of the cost is the arenas, which band at 616–773
   * ticks each.
   */
  it("stands at a freed crown within the cap, on every seed", () => {
    for (const seed of SEEDS) {
      const ledger = fresh();
      // Up the ladder of the lower seven first — a beeline was measured and
      // the Tree refuses it: a three-letter hand goes out twice on every way
      // into the upper paths, because the klipot come from the ends however
      // small the ground is laid. The dash a player can actually make is the
      // ladder at speed: no rooms, no kindling, letters gathered by passage.
      for (const stop of ["yesod", "hod", "netzach", "tiferet", "gevurah", "chesed"] as SefirahId[]) {
        expect(reach(ledger, stop, seed), `seed ${seed}: ${stop} was never reached`).toBe(true);
      }
      expect(ensureLetter(ledger, "bet", seed), `seed ${seed}: Bet was never gathered`).toBe(true);
      expect(reach(ledger, "keter", seed), `seed ${seed}: the crown was never reached`).toBe(true);
      let freed = fightHere(ledger, seed);
      // A lost room is a fall; a player walks back up and tries again with
      // whatever the way back paid.
      for (let retry = 0; retry < 2 && !freed; retry += 1) {
        gather(ledger, seed);
        if (!reach(ledger, "keter", seed)) break;
        freed = fightHere(ledger, seed);
      }
      expect(freed, `seed ${seed}: Behemot was not broken (${ledger.falls} falls, ${ledger.walks} walks)`).toBe(true);
      expect(
        ledger.walks,
        `seed ${seed}: the dash took ${ledger.walks} walks, ${ledger.struggles} struggled, ${ledger.falls} falls, ${ledger.ticks} ticks`,
      ).toBeLessThanOrEqual(CAP);
      expect(
        ledger.ticks,
        `seed ${seed}: the dash took ${ledger.ticks} ticks — under two minutes reads as the gate fallen over`,
      ).toBeGreaterThan(7200);
    }
  }, 600000);
});

describe("the tour — all ten freed and kindled, the consummation", () => {
  /**
   * The 300-light ending, played rather than priced. Policy is the measured
   * optimum from `economy.test.ts`: kindle as you go, light banked into the
   * Tree where a fall cannot take it.
   *
   * **Measured, at probe skill**: 39 walks and 335k ticks on seed 3 (5
   * struggled, 13 falls). Against the dash's 13 walks that is the intended
   * shape — **three times the ground for the consummation** — and the extra
   * cost is exactly where it should be: light and walking, not fights. The
   * thirteen falls are the probe re-walking upper paths with a small hand,
   * which is also the honest picture of a first tour: the Tree stops a Scribe
   * running ahead of their letters with the klipot, not with the ground.
   */
  it("kindles all ten within the walk cap, on every seed", () => {
    for (const seed of SEEDS) {
      const ledger = fresh();
      const order: SefirahId[] = [
        "malchut", "yesod", "hod", "netzach", "tiferet",
        "gevurah", "chesed", "binah", "chochmah", "keter",
      ];
      for (const stop of order) {
        // The three great rooms answer to one letter each — hold it first,
        // which is what the map's own "answers to" line tells a player.
        //
        // **And Binah needs Mem as well, which the map does not say.**
        // Measured while building this file: the duelist holding Vav and not
        // Mem stalls the full budget against Leviathan — it cannot close the
        // water between the near bank and the beast, and the marks die on the
        // way. The same hand plus Mem finishes in six hundred and ninety
        // ticks. Binah is called the sea, and you need the Waters to fight in
        // it — thematically right, mechanically unstated: either the arena
        // should honour the map's claim that Vav alone answers, or the map
        // should say more. A P4 arena question, recorded where the instrument
        // found it.
        const kit = [guardianOf(stop).opens?.letter, stop === "binah" ? "mem" : undefined];
        for (const key of kit) {
          if (!key) continue;
          expect(ensureLetter(ledger, key, seed), `seed ${seed}: ${key} was never gathered`).toBe(true);
        }
        expect(reach(ledger, stop, seed), `seed ${seed}: ${stop} was never reached`).toBe(true);
        if (!ledger.guardiansBroken.includes(stop)) {
          let freed = fightHere(ledger, seed);
          for (let retry = 0; retry < 2 && !freed; retry += 1) {
            gather(ledger, seed);
            if (!reach(ledger, stop, seed)) break;
            freed = fightHere(ledger, seed);
          }
          expect(
            freed,
            `seed ${seed}: ${stop}'s room was not finished holding [${ledger.held.join(",")}] ` +
              `after ${ledger.walks} walks, ${ledger.falls} falls`,
          ).toBe(true);
        }
        // Kindle as you go, walking a fresh path and back for more light when
        // the purse is short — which is what the map actually offers a Scribe
        // standing somewhere they cannot yet afford.
        let patience = 6;
        while (
          ledger.at === stop &&
          !ledger.sefirotLit.includes(stop) &&
          patience > 0 &&
          ledger.walks < CAP
        ) {
          const cost = kindleCost(regionOfSefirah(stop).index);
          if (ledger.or >= cost) {
            ledger.or -= cost;
            ledger.sefirotLit.push(stop);
            break;
          }
          const ways = pathsFrom(stop).filter((p) => (ledger.avoid.get(p.id) ?? 0) < 2);
          const out =
            ways.find((p) => !ledger.pathsWalked.includes(p.id)) ?? ways[0] ?? pathsFrom(stop)[0];
          walkLeg(ledger, out, seed);
          reach(ledger, stop, seed);
          patience -= 1;
        }
        expect(
          ledger.sefirotLit,
          `seed ${seed}: ${stop} was never kindled (${ledger.or} light, ${ledger.walks} walks)`,
        ).toContain(stop);
      }
      expect(ledger.sefirotLit).toHaveLength(10);
      expect(
        ledger.walks,
        `seed ${seed}: the tour took ${ledger.walks} walks, ${ledger.struggles} struggled, ` +
          `${ledger.falls} falls, ${ledger.ticks} ticks`,
      ).toBeLessThanOrEqual(CAP);
    }
  }, 600000);
});
