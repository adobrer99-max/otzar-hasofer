import { describe, expect, it } from "vitest";
import { abilityByLetter, type Grace } from "../abilities";
import { directionOf, layDown, wakeOfDescent } from "../descent";
import { regionOfSefirah } from "../regions";
import { pool } from "../seedPools";
import { kindleCost } from "../../storage/ascentRepo";
import { letterIds, lettersFrom, nodeOf, otherEnd, pathBetween, pathsFrom, type TreePath } from "../tree";
import { judge, opens } from "../wordGate";
import type { SefirahId } from "../../types/letter";
import { buildPath, verbsOf } from "./build";
import { fighter } from "./probes";
import { openWordGate, type StepContext } from "./step";
import type { World } from "./types";

/**
 * **The descent, walked** — Chapter II, Part One (`docs/chapter-ii.md` §6).
 *
 * `route.test.ts` proves a way out exists on every road of a descent for any
 * hand a descent can hold. This asks the other question: can a Scribe who
 * *fights* get down it? On the way down the ground shrinks with the hand and
 * the creatures do not — a road's klipot come from its upper end — so the
 * roads out of the upper Tree are met with fewer and fewer letters.
 *
 * Its own small ledger rather than `climb.test.ts`'s: importing a test file
 * re-runs that file's tests, and that ledger credits a letter on arrival
 * where this one takes it.
 */

const SEEDS = pool([3, 91, 555, 12345]);
/** Patience, in walks. A descent that needs more is not converging. */
const CAP = 40;

const contextFor = (held: readonly string[]): StepContext => ({
  verbs: verbsOf(held),
  graces: held.map((id) => abilityByLetter[id]?.grace).filter((g): g is Grace => Boolean(g)),
});

/** The climb's own budget by ground, so a leg here is measured as a leg there. */
const budgetFor = (world: World) =>
  Math.max(24000, 2000 * (world.width / 16) * Math.max(1, Math.round(world.height / 18)));

/** Answer a crossing's gate from the hand, or fail loudly if it cannot be. */
function answerGate(world: World, held: readonly string[]): void {
  const target = world.wordGate;
  if (!target || world.wordGateOpen) return;
  for (const id of target.letterIds) {
    expect(held, `the gate asked for ${id}, which this hand has laid down`).toContain(id);
  }
  expect(opens(judge(target.letterIds, target))).toBe(true);
  openWordGate(world, "The root is spelled. The chamber opens.");
}

interface LegRecord {
  path: string;
  from: SefirahId;
  /** Letters in hand stepping onto the road. */
  hand: number;
  end: "crossed" | "fell" | "struggled";
  lampsLeft: number;
  or: number;
}

interface Descent {
  at: SefirahId;
  held: string[];
  or: number;
  /** Light gathered on roads crossed, whatever became of it after. */
  gathered: number;
  lightsDown: SefirahId[];
  falls: number;
  walks: number;
  struggles: number;
  ticks: number;
  legs: LegRecord[];
  /** Roads that put the probe out — a second identical try would be identical. */
  avoid: Set<string>;
  stopped?: string;
}

/**
 * What drawing a Sefirah's light down costs. **Not decided** — the design
 * says only that it falls as the Tree is descended. Two candidates are
 * measured so the price can be chosen from numbers: Chapter I's own kindling
 * price for the same place, and half of it.
 */
type Price = (sefirah: SefirahId) => number;
const FULL: Price = (s) => kindleCost(regionOfSefirah(s).index);
const HALF: Price = (s) => Math.ceil(FULL(s) / 2);

function walkLeg(d: Descent, path: TreePath, seed: number): void {
  const from = d.at;
  const world = buildPath(path, seed, d.held, 1, false, false, 1, [], 0, [], [], from);
  answerGate(world, d.held);
  const fight = fighter(world, contextFor(d.held), budgetFor(world) * 2);
  d.walks += 1;
  d.ticks += fight.ticks;
  const record = (end: LegRecord["end"]) =>
    d.legs.push({ path: path.id, from, hand: d.held.length, end, lampsLeft: fight.lampsLeft, or: fight.or });

  if (fight.out) {
    record("fell");
    d.falls += 1;
    d.or = 0;
    d.at = wakeOfDescent(d.lightsDown);
    d.avoid.add(`${path.id}<${from}`);
    return;
  }
  if (fight.finished) {
    d.or += fight.or;
    d.gathered += fight.or;
    record("crossed");
  } else {
    // A stall is the probe's steering, not the ground — `route.test.ts` holds
    // the way out. Carried through and counted, its light forfeited, exactly
    // as the climb's ledger does.
    d.struggles += 1;
    record("struggled");
  }
  d.held = layDown(d.held, path, from);
  d.at = otherEnd(path, from);
}

/**
 * Walk a planned way down. Where the planned road has already put the probe
 * out, take any other road down from where it stands — a person would — and
 * rejoin the plan if it comes back to it.
 */
function descend(seed: number, hand: readonly string[], plan: readonly SefirahId[], price?: Price): Descent {
  const d: Descent = {
    at: "keter", held: [...hand], or: 0, gathered: 0, lightsDown: [],
    falls: 0, walks: 0, struggles: 0, ticks: 0, legs: [], avoid: new Set(),
  };
  while (d.at !== "malchut" && d.walks < CAP) {
    if (price && !d.lightsDown.includes(d.at) && d.or >= price(d.at)) {
      d.or -= price(d.at);
      d.lightsDown.push(d.at);
    }
    const i = plan.indexOf(d.at);
    const planned = i >= 0 && i < plan.length - 1 ? pathBetween(d.at, plan[i + 1]) : undefined;
    const open = (p: TreePath | undefined) => p && !d.avoid.has(`${p.id}<${d.at}`);
    const next = open(planned)
      ? planned
      : pathsFrom(d.at)
          .filter((p) => open(p) && directionOf(p, d.at) === "down")
          .sort((a, b) => nodeOf[otherEnd(a, d.at)].row - nodeOf[otherEnd(b, d.at)].row)[0];
    if (!next) {
      d.stopped = `every road down from ${d.at} has put the probe out`;
      break;
    }
    walkLeg(d, next, seed);
  }
  if (!d.stopped && d.at !== "malchut") d.stopped = `still at ${d.at} after ${CAP} walks`;
  if (price && d.at === "malchut" && !d.lightsDown.includes("malchut") && d.or >= price("malchut")) {
    d.or -= price("malchut");
    d.lightsDown.push("malchut");
  }
  return d;
}

const SHORT: SefirahId[] = ["keter", "tiferet", "yesod", "malchut"];
const LONG: SefirahId[] = [
  "keter", "chochmah", "binah", "gevurah", "chesed", "tiferet", "netzach", "hod", "yesod", "malchut",
];

/** A hand a real climb could have carried to the crown — a seeded way up. */
function climbedHand(seed: number): string[] {
  let state = seed >>> 0;
  const next = (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % n;
  };
  let at: SefirahId = "malchut";
  const walked: string[] = [];
  for (let i = 0; i < 60 && at !== "keter"; i += 1) {
    const out = pathsFrom(at);
    const path = out[next(out.length)];
    walked.push(path.id);
    at = otherEnd(path, at);
  }
  return lettersFrom(walked);
}

const HANDS = {
  full: [...letterIds],
  climbed: climbedHand(23 * 7919),
  shortest: lettersFrom(["malchut-yesod", "yesod-tiferet", "tiferet-keter"]),
};

const tell = (name: string, seed: number, d: Descent) =>
  `${name} seed ${seed}: ${d.at === "malchut" ? "down" : "NOT down"} in ${d.walks} walks, ` +
  `${d.falls} falls, ${d.struggles} struggled, ${d.held.length} letters left, ` +
  `${d.gathered} light gathered, ${d.lightsDown.length} drawn down` +
  (d.stopped ? ` — ${d.stopped}` : "");

/**
 * Every run this file asks about, walked once and remembered: two routes,
 * three hands, three prices, the seed pool.
 */
type Run = { route: string; hand: string; price: string; seed: number; d: Descent };
let memo: Run[] | undefined;
function runs(): Run[] {
  if (memo) return memo;
  memo = [];
  for (const [route, plan] of [["short", SHORT], ["long", LONG]] as const) {
    for (const [hand, letters] of Object.entries(HANDS)) {
      for (const [price, cost] of [["none", undefined], ["half", HALF], ["full", FULL]] as const) {
        for (const seed of SEEDS) {
          memo.push({ route, hand, price, seed, d: descend(seed, letters, plan, cost) });
        }
      }
    }
  }
  return memo;
}
const of = (route: string, hand: string, price = "none") =>
  runs().filter((r) => r.route === route && r.hand === hand && r.price === price);
const told = (rs: Run[]) =>
  rs.map((r) => tell(`${r.route}/${r.hand}/${r.price}`, r.seed, r.d)).join("\n  ");
const down = (rs: Run[]) => rs.filter((r) => r.d.at === "malchut");

/**
 * **Measured over the three seed pools, twelve seeds a cell** — the numbers
 * the bars below sit under, and the ones C2-3 chooses a price from.
 *
 * | route | hand | reached Malchut | walks | falls (all 12) |
 * |---|---|---|---|---|
 * | short | all 22 | 11 of 12 | 3–7 | 8 |
 * | short | a climb's 16 | 12 of 12 | 3–6 | 3 |
 * | short | the shortest crown's 3 | 8 of 12 | 3–11 | 18 |
 * | long | all 22 | 9 of 12 | 6–14 | 19 |
 * | long | a climb's 16 | 12 of 12 | 6–13 | 12 |
 * | long | the shortest crown's 3 | 5 of 12 | 6–21 | 37 |
 *
 * **The wall is at the top, not the bottom.** Of 158 roads walked out of the
 * crown, 62 put the probe out (39%) and 40 more stalled; of 59 roads walked
 * into the kingdom, 2 did (3%). A descent begins with its hardest road — an
 * Abyss crossing, against the crown's creatures — and ends on a walk. That is
 * the design working as written (the ground shrinks, the creatures are the
 * upper end's), and whether it is the *shape wanted* is the owner's question.
 *
 * **Light**: the long road gathered 94–318 on the runs that finished, the
 * short road 0–123. At Chapter I's kindling price that draws down 2–8 of the
 * ten lights on the long road and 0–3 on the short; at half of it, 2–9 and
 * 0–4. No run at either price brought down all ten.
 *
 * **The three-letter hand is reported, not asserted.** It is the harshest
 * descent the design permits and it reaches the kingdom on about half the
 * seeds. Whether a dash to the crown *should* be able to come back down is a
 * design question, and a bar here would be answering it by accident.
 */
describe("the descent, walked", () => {
  it("reaches the kingdom from a real hand, by the short road and the long", () => {
    for (const route of ["short", "long"]) {
      for (const hand of ["full", "climbed"]) {
        const rs = of(route, hand);
        expect(
          down(rs).length,
          `the ${route} road from the ${hand} hand reached Malchut on too few seeds:\n  ${told(rs)}`,
        ).toBeGreaterThanOrEqual(Math.ceil(SEEDS.length / 2));
        for (const r of down(rs)) expect(r.d.walks, tell(route, r.seed, r.d)).toBeLessThanOrEqual(CAP);
      }
    }
  }, 3_600_000);

  it("never returns a letter, and lays down what the road walked says it should", () => {
    for (const r of runs()) {
      expect(r.d.held.length, tell(r.route, r.seed, r.d)).toBeLessThanOrEqual(HANDS[r.hand as keyof typeof HANDS].length);
      for (const letter of r.d.held) expect(HANDS[r.hand as keyof typeof HANDS]).toContain(letter);
    }
    // The short road, crossed without a fall, costs exactly its three letters.
    const clean = of("short", "full").filter((r) => r.d.at === "malchut" && r.d.falls === 0);
    expect(clean.length, "no clean short descent to read the count off").toBeGreaterThan(0);
    for (const r of clean) expect(r.d.held).toHaveLength(HANDS.full.length - 3);
  }, 3_600_000);

  /**
   * The design feared the last roads: a bare hand at the foot of the Tree.
   * Measured, they are the gentlest ground in the descent, and this holds
   * them there — under half the ceiling `curve.test.ts` gives the ascent's
   * hardest rung.
   */
  it("does not wall a nearly bare hand out of the kingdom", () => {
    const into = runs()
      .filter((r) => r.price === "none")
      .flatMap((r) => r.d.legs.filter((leg) => leg.path.startsWith("malchut-")));
    expect(into.length, "no road into the kingdom was walked").toBeGreaterThan(8);
    const fell = into.filter((leg) => leg.end === "fell").length;
    expect(fell / into.length, `${fell} of ${into.length} roads into the kingdom put the probe out`).toBeLessThan(0.2);
  }, 3_600_000);

  /**
   * And the first road is hard without being shut. A guard on the finding
   * above rather than a target: if the crown's roads ever put the probe out
   * much more often than this, the descent has stopped being startable.
   */
  it("leaves the roads out of the crown hard, and passable", () => {
    const out = runs()
      .filter((r) => r.price === "none" && r.hand !== "shortest")
      .flatMap((r) => r.d.legs.filter((leg) => leg.from === "keter"));
    expect(out.length).toBeGreaterThan(8);
    const fell = out.filter((leg) => leg.end === "fell").length;
    expect(fell / out.length, `${fell} of ${out.length} roads out of the crown put the probe out`).toBeLessThan(0.6);
    expect(out.some((leg) => leg.end === "crossed"), "no road out of the crown was ever crossed").toBe(true);
  }, 3_600_000);

  it("pays enough on the long road to draw down more than none", () => {
    for (const hand of ["full", "climbed"]) {
      const finished = down(of("long", hand, "half"));
      expect(finished.length).toBeGreaterThan(0);
      for (const r of finished) {
        expect(r.d.gathered, tell("long", r.seed, r.d)).toBeGreaterThan(0);
        expect(r.d.lightsDown.length, tell("long", r.seed, r.d)).toBeGreaterThanOrEqual(1);
      }
    }
  }, 3_600_000);
});
