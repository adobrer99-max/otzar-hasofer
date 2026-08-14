import { describe, expect, it } from "vitest";
import { abilityByLetter } from "../abilities";
import { chainFor, declares, probe } from "./probes";
import { routeTo } from "./route";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { SCROLL_TOTAL } from "../scroll";
import { solvableRoots } from "../wordGate";
import { makeRng, randomInt } from "../rng";
import { crossesAbyss, lettersFrom, otherEnd, pathsFrom } from "../tree";
import type { SefirahId } from "../../types/letter";
import { buildPath, buildRegion, paintChunks, PLAYER_H, rowsFor, tileAt, verbsOf } from "./build";
import { MAX_JUMP_RISE, openWordGate, step, type StepContext } from "./step";
import { CHUNK_H, CHUNK_W, CHUNKS } from "./chunks";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type World } from "./types";


/**
 * A Scribe who has learned nothing: hold right, and jump when stalled.
 *
 * Its whole job is to fail. Every region of this game used to be crossable
 * this way — two of the seventeen screens in the library did not obstruct a
 * walker at all, and each of the rest was a single one-press solve — so a
 * regression here means the levels have gone soft again, which is exactly the
 * failure nothing in the suite was watching for.
 */
function naive(world: World, _ctx: StepContext, ticks: number): boolean {
  // A Scribe who has learned nothing uses nothing. The Breath and the Fence
  // stay, because they live on the leap key and are spent without deciding to;
  // everything else needs a key pressed on purpose, and this probe never
  // presses one. So what this measures is exactly the right thing: whether a
  // region asks for the alphabet at all, or merely stands next to it.
  const ctx: StepContext = { verbs: ["double-jump", "wall-cling"], graces: [] };
  let mark = world.player.x;
  let stuckFor = 0;
  let holdJump = 0;
  for (let i = 0; i < ticks && !world.finished; i += 1) {
    const p = world.player;
    stuckFor = p.x > mark + 0.5 ? 0 : stuckFor + 1;
    mark = Math.max(mark, p.x);
    const wantJump = stuckFor > 6 && i % 9 === 0;
    if (wantJump) holdJump = 20;
    else if (holdJump > 0) holdJump -= 1;
    step(world, { ...NO_INPUT, right: true, jump: wantJump, jumpHeld: holdJump > 0 }, ctx);
  }
  return world.finished;
}

function contextFor(regionIndex: number): StepContext {
  const held = lettersOnEntering(regionIndex);
  return {
    verbs: verbsOf(held),
    graces: held
      .map((id) => abilityByLetter[id]?.grace)
      .filter((g): g is NonNullable<typeof g> => Boolean(g)),
  };
}

/**
 * How long a competent Scribe is given. The regions ask a great deal more than
 * they did, and a veiling sends you back to the mark, so a crossing that used
 * to take a couple of thousand ticks can now take several times that. This is
 * a budget for *reachability*, not a target: what matters is that the exit is
 * reached at all.
 */
/**
 * How long a competent Scribe is given, **by the size of the rung**.
 *
 * A flat number was right when every rung was a corridor and they were all
 * about the same length. A floor of three rows is three times the ground, with
 * two stairwells to climb and two storeys to walk back along, and a budget that
 * did not know that was failing the upper Tree for being big rather than for
 * being broken. This is a budget for *reachability*, not a target: what matters
 * is that the exit is reached at all.
 */
const budgetFor = (regionIndex: number) => 12000 * (rowsFor(regionIndex) + 1);

/**
 * **The probe tests carry their own budgets.**
 *
 * Everything below that drives the probe runs tens of thousands of ticks a
 * seed, and a few of them sat just under vitest's five-second default — which
 * is not a considered budget for them, it is the absence of one. They passed
 * for as long as nothing else was competing for the machine, and started
 * failing intermittently the day `economy.test.ts` arrived and put a minute of
 * probe runs alongside them. A timing flake in a deterministic test is the
 * worst kind of noise: the thing it appears to be reporting is a level.
 */
/**
 * **Twenty-four seeds, and two different claims about them.**
 *
 * This walk used to run six seeds and demand that the probe finish all sixty
 * pairs. It passed, and it was a lucky ticket rather than a property of the
 * library: measured over three independent twenty-four-seed pools, the probe
 * finishes 95.0%, 90.4% and 93.3% of layouts, and Chochmah alone — three
 * storeys and two stairwells — costs it seven, eleven and six of twenty-four.
 * Six seeds that all happen to land in the 90% is a draw, and any change to the
 * chunk array reshuffles the draw. **Removing one existing screen from the pool
 * produces three stalls.** A guarantee that a screen cannot be added without
 * breaking it is not measuring the game.
 *
 * So the two claims are separated. `routeTo` floods the open space with the
 * verbs in hand and answers *exactly* whether the way out can be reached: that
 * is the no-soft-lock guarantee, it is asserted on every pair, and it came out
 * 240/240 in all three pools. Whether a heuristic body then walks it is a
 * different and softer question — real, because a route a bot cannot follow is
 * a rung that plays badly, but a share rather than an absolute.
 */
const WALK_SEEDS = [
  3, 91, 555, 12345, 777, 40404, 8, 1234, 60606, 31337,
  17, 42, 101, 2024, 5150, 7777, 99, 4242, 314, 2718,
  1618, 6060, 8080, 9090,
];

describe("walking the regions", () => {
  it("carries a competent Scribe to the exit of every region, on many seeds", { timeout: 120000 }, () => {
    const report: string[] = [];
    const stalls: string[] = [];
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      let gathered = 0;
      let crossed = 0;
      for (const seed of WALK_SEEDS) {
        const world = buildRegion(region, seed);
        // **The ground, on its own.** The klipot are cleared before the probe
        // walks, because this is the no-soft-lock guarantee and it is about
        // terrain: a region must be crossable independently of what happens to
        // be standing in it, and the probe does not fight.
        world.husks = [];
        // **And the pool they would be drawn from.** A figured stone gives way
        // under the probe and stands something up out of the floor — see
        // `Tile.Maskit` — so emptying the list of bodies is no longer the same
        // act as emptying the rung of klipot. Measured before this line: the
        // probe stalled at seventy-two per cent of Chochmah, because a pacer
        // had come up out of the ground in a corridor it will not fight in.
        world.klipot = [];
        // **And the gate is answered, because a gate is not terrain.** The
        // probe cannot spell a root — the honest crossing has its own test —
        // so a Word-Gate that lands on the route rather than in an alcove reads
        // here as a rung nobody can cross, which is a lie about the ground.
        // This walk asks one question and it is about stone.
        openWordGate(world, "opened for the walk");
        const ctx = contextFor(region);
        // **The guarantee itself, and it is not the probe.** Exact, geometric,
        // every region and every seed, no heuristic and no budget.
        expect(
          routeTo(world, ctx.verbs).usable,
          `region ${region} seed ${seed} has no route to the way out at all`,
        ).toBe(true);
        const { reached, finished, lettersTaken } = probe(world, ctx, budgetFor(region));
        const fraction = reached;
        report.push(`region ${region} seed ${seed}: ${(fraction * 100).toFixed(0)}%${finished ? " (exit)" : ""}`);
        if (finished) crossed += 1;
        else stalls.push(`region ${region} seed ${seed} at ${(fraction * 100).toFixed(0)}%`);

        // The probe is not precise enough to demand every letter — it jumps on
        // a heuristic, and missing one is a failure of the bot, not the level.
        // Reachability is asserted exactly, and geometrically, below.
        //
        // Counted across the seeds rather than on each, and the change is a
        // floor's doing: a rung is a room grid now, the alcoves are off the
        // shortest way through it, and a probe that walks the route rather than
        // the whole ground can honestly cross a rung without passing under one.
        // What this is still worth asserting is that a rung is not laying its
        // letters somewhere nothing ever goes.
        gathered += lettersTaken.length;
      }
      expect(gathered, `region ${region} collected nothing on any seed`).toBeGreaterThan(0);
      // **And no rung may become a wall.** The share above tolerates a probe
      // that wanders; it would also tolerate one rung nobody can get through,
      // if the other nine carried it. Measured worst case over three pools:
      // Chochmah at 13 of 24. The floor is set at ten, which is clear of that
      // and nowhere near a rung that has stopped being crossable.
      expect(
        crossed,
        `region ${region} was crossed only ${crossed}/${WALK_SEEDS.length} times`,
      ).toBeGreaterThanOrEqual(10);
    }

    // **The share, and where it is set.** Measured 95.0%, 90.4% and 93.3% over
    // three independent pools of these twenty-four seeds. The bar is at 85 —
    // below every measurement and far above what a real collapse would leave.
    const total = TOTAL_REGIONS * WALK_SEEDS.length;
    const walked = total - stalls.length;
    expect(
      walked / total,
      `the probe crossed ${walked}/${total}; it wandered on:\n  ${stalls.slice(0, 12).join("\n  ")}`,
    ).toBeGreaterThanOrEqual(0.85);
  });

  /**
   * The taught porch is laid for a Scribe on their very first climb — which is
   * exactly the Scribe holding nothing at all. If the three teaching screens
   * were crossable only with the Breath, the tutorial would strand the one
   * person it exists for, so this asks the same question as above with the
   * porch in place.
   */
  it("carries a first-time Scribe across the taught porch of Malchut", () => {
    for (const seed of [3, 91, 555, 12345]) {
      const plain = buildRegion(1, seed);
      const taught = buildRegion(1, seed, 1, true);
      // That the porch is *three screens* is `build.test.ts`'s claim and is
      // asserted there, off the laid screens — a rung is squared up to whole
      // rooms, so a width difference measures the parity of the plain rung as
      // much as it measures the porch. What matters here is only that the porch
      // is laid at all, and that a Scribe holding nothing can cross it.
      expect(taught.width, `seed ${seed}: the porch is not laid`).toBeGreaterThan(plain.width);

      const { finished } = probe(taught, contextFor(1), budgetFor(1));
      expect(finished, `taught Malchut, seed ${seed}, stalled`).toBe(true);
    }
  });

  it("lays the porch in Malchut and nowhere else", () => {
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      expect(buildRegion(region, 7, 1, true).width, `region ${region}`).toBe(
        buildRegion(region, 7).width,
      );
    }
  });

  /**
   * The other half of the guarantee, and the one that was missing.
   *
   * Reachability says the ground *can* be crossed. It says nothing about
   * whether crossing it asks anything, and for most of this game's life
   * nothing did — so this asserts the complement: past the on-ramp, walking
   * and jumping is not enough. If this test starts passing, the levels have
   * gone soft.
   */
  it("stops a Scribe who has learned nothing, past the on-ramp", { timeout: 60000 }, () => {
    // From Netzach up. Not arbitrary: a Scribe *entering* Malchut, Yesod or
    // Hod holds no verb that is reached for — Aleph and Chet both live on the
    // leap key — so those three regions have nothing to gate terrain on and
    // their difficulty can only ever be execution. The Bridge, found in Hod,
    // is the first letter that is a decision, and Netzach is the first region
    // that can ask for one.
    const FIRST_GATED_REGION = 4;
    const seeds = [3, 91, 555, 12345, 777, 40404];
    const crossed: string[] = [];
    for (let region = FIRST_GATED_REGION; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of seeds) {
        const world = buildRegion(region, seed);
        world.husks = [];
        // **And the pool they would be drawn from.** A figured stone gives way
        // under the probe and stands something up out of the floor — see
        // `Tile.Maskit` — so emptying the list of bodies is no longer the same
        // act as emptying the rung of klipot. Measured before this line: the
        // probe stalled at seventy-two per cent of Chochmah, because a pacer
        // had come up out of the ground in a corridor it will not fight in.
        world.klipot = [];
        if (naive(world, contextFor(region), 9000)) {
          crossed.push(`${regions[region - 1].name}/${seed}`);
        }
      }
    }
    const total = (TOTAL_REGIONS - FIRST_GATED_REGION + 1) * seeds.length;
    expect(
      crossed.length,
      `walk-and-jump alone crossed ${crossed.length}/${total}: ${crossed.join(", ")}`,
    ).toBe(0);
  });

  /**
   * And the curve itself — the inversion, measured. Keter drew on every chunk
   * in the library holding every verb in the game, and each of those chunks
   * was a solved one-press problem, so the crown used to cost a competent
   * Scribe *less* than the foot of the Tree.
   */
  it("costs more the higher the Tree is climbed", { timeout: 60000 }, () => {
    const cost = (region: number) => {
      let ticks = 0;
      let crossings = 0;
      for (const seed of [3, 91, 555, 12345]) {
        const world = buildRegion(region, seed);
        world.husks = [];
        // **And the pool they would be drawn from.** A figured stone gives way
        // under the probe and stands something up out of the floor — see
        // `Tile.Maskit` — so emptying the list of bodies is no longer the same
        // act as emptying the rung of klipot. Measured before this line: the
        // probe stalled at seventy-two per cent of Chochmah, because a pacer
        // had come up out of the ground in a corridor it will not fight in.
        world.klipot = [];
        const run = probe(world, contextFor(region), budgetFor(region));
        // **Only crossings count toward the curve.** A seed the probe wanders
        // on spends its whole budget and would read as the hardest rung in the
        // game while measuring nothing about the ground — see the walk above
        // for why a wander is a fact about this body rather than the terrain,
        // and for where reachability is asserted exactly. This is a *cost*, and
        // a run that never arrived has no cost.
        if (!run.finished) continue;
        crossings += 1;
        // Per screen, so a longer region does not read as a harder one.
        ticks += run.ticks / (world.width / TILE_SIZE);
      }
      expect(crossings, `region ${region} was never crossed on any seed`).toBeGreaterThan(1);
      return ticks / crossings;
    };
    const foot = (cost(1) + cost(2)) / 2;
    const crown = (cost(9) + cost(10)) / 2;
    expect(
      crown,
      `the crown costs ${crown.toFixed(1)} per screen against the foot's ${foot.toFixed(1)}`,
    ).toBeGreaterThan(foot);
  });

  /**
   * Branches, and the letter that exists for them.
   *
   * Resh was granted from the very first commit and did nothing whatsoever —
   * its own plate promised a return that no code performed. It needed
   * somewhere to return *to*, which is what a fork is.
   */
  it("returns a Scribe carrying the Beginning to the fork, and everyone else to the mark", () => {
    const world = buildRegion(6, 3);
    const mark = { x: 100, y: 300 };
    const fork = { x: 900, y: 300 };
    const withResh: StepContext = { verbs: [], graces: ["return"] };
    const without: StepContext = { verbs: [], graces: [] };

    for (const [label, ctx, expected] of [
      ["carrying Resh", withResh, fork],
      ["without it", without, mark],
    ] as const) {
      const w = { ...world, respawn: { ...mark }, fork: { ...fork }, wakeAt: undefined };
      w.player = { ...world.player, x: 500, y: 5000, veiled: 0 };
      // Fall out of the world, then run the veiling down.
      for (let i = 0; i < 80; i += 1) step(w, NO_INPUT, ctx);
      expect(w.player.x, `${label}`).toBeCloseTo(expected.x, 0);
    }
  });

  it("never returns to a fork that is behind the mark", () => {
    const world = buildRegion(6, 3);
    const w = { ...world, respawn: { x: 900, y: 300 }, fork: { x: 100, y: 300 }, wakeAt: undefined };
    w.player = { ...world.player, x: 950, y: 5000, veiled: 0 };
    for (let i = 0; i < 80; i += 1) step(w, NO_INPUT, { verbs: [], graces: ["return"] });
    expect(w.player.x).toBeCloseTo(900, 0);
  });

  /**
   * **The klipot are no longer optional, and this is where that is asserted.**
   *
   * This test used to say the opposite: with the klipot left standing, a
   * Scribe who never strikes had to get most of the way regardless, because a
   * region that became impassable simply because something stood in it would
   * have made the reachability guarantee a technicality.
   *
   * Rooms overturn it deliberately. A room closes behind you while something
   * in it is still holding light, so walking past a fight is exactly what is
   * no longer possible — which was the measured problem: half the husks went
   * unbroken and a driver that ignored every one still finished the climb.
   *
   * The guarantee has not been given up, it has moved: the *terrain* is still
   * crossable by a Scribe holding only what the rung gives (above), and the
   * *fight* is winnable wherever it is held (`fight.test.ts`). What is gone is
   * the third thing, which was never a guarantee so much as a symptom.
   */
  it("stops a Scribe who never strikes at the first door that closes", { timeout: 30000 }, () => {
    let stopped = 0;
    let total = 0;
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91]) {
        const world = buildRegion(region, seed);
        total += 1;
        const { finished } = probe(world, contextFor(region), budgetFor(region), { pacifist: true });
        if (!finished) stopped += 1;
      }
    }
    // Not every rung on every seed — a room only closes when something that
    // stands on its floor is still in it, and plenty of ground has none. What
    // matters is that walking past the fight has stopped being free.
    expect(stopped, `not one of ${total} runs was held by a sealed room`).toBeGreaterThan(0);
  });

  it("never veils a Scribe who simply stands still on the opening ground", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const world = buildRegion(region, 42);
      const ctx = contextFor(region);
      for (let i = 0; i < 240; i += 1) step(world, NO_INPUT, ctx);
      expect(world.player.veiled, `region ${region}`).toBe(0);
    }
  });
});

/**
 * Whether a standing jump from the ground beneath a point can actually touch
 * it. Letters are the game's entire progression, and a letter placed one tile
 * too high is invisible to every other test here: it never blocks an exit,
 * because an exit never needs it. It simply removes an ability from the run —
 * and in Malchut, where Aleph *is* the second jump, an unreachable letter
 * would mean the letter could only be had by the power it grants.
 */
function withinJump(world: World, e: { x: number; y: number }): boolean {
  const column = Math.floor((e.x + TILE_SIZE / 2) / TILE_SIZE);
  const startRow = Math.floor(e.y / TILE_SIZE);
  for (let ty = startRow; ty < world.height; ty += 1) {
    const tile = tileAt(world, column, ty);
    if (tile !== Tile.Stone && tile !== Tile.Ledge) continue;
    // Standing on this surface, then jumping as high as a jump goes. What
    // matters is the whole arc, not the apex: the body sweeps everything from
    // where it stood up to where it peaks, and touching the letter on the way
    // through counts. Testing the apex alone would call a letter unreachable
    // precisely when the jump overshoots it.
    const standing = ty * TILE_SIZE - PLAYER_H;
    const apex = standing - MAX_JUMP_RISE;
    const sweptTop = apex;
    const sweptBottom = standing + PLAYER_H;
    return sweptTop < e.y + TILE_SIZE && sweptBottom > e.y;
  }
  return false;
}

describe("what the regions place", () => {
  it("never hangs a letter higher than a plain jump can reach", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91, 555, 12345, 60606]) {
        const world = buildRegion(region, seed);
        const drops = world.entities.filter((e) => e.kind === "letter");
        expect(drops.map((e) => e.ref).sort()).toEqual([...regions[region - 1].letters].sort());
        for (const drop of drops) {
          expect(
            withinJump(world, drop),
            `region ${region} seed ${seed}: ${drop.ref} at tile ${drop.x / TILE_SIZE},${drop.y / TILE_SIZE} is out of reach`,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps every Tav shrine reachable too, so a mark can always be set", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const world = buildRegion(region, 4242);
      for (const shrine of world.entities.filter((e) => e.kind === "mark")) {
        expect(withinJump(world, shrine), `region ${region}: shrine out of reach`).toBe(true);
      }
    }
  });
});

describe("the torn scroll", () => {
  it("strews every fragment exactly once, in order, across the ascent", () => {
    for (const seed of [3, 91, 555, 12345]) {
      const found: string[] = [];
      for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
        const world = buildRegion(region, seed);
        for (const e of world.entities.filter((x) => x.kind === "fragment")) {
          found.push(e.ref ?? "");
        }
      }
      // Three pieces, numbered 0..2, each laid down once — never a duplicate
      // (which would let the scroll complete a fragment short) and never a
      // gap (which would leave Peh forever unobtainable).
      expect(found.sort(), `seed ${seed}`).toEqual(["0", "1", "2"]);
    }
  });

  it("never hangs a fragment higher than a plain jump can reach", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91, 555, 12345, 60606]) {
        const world = buildRegion(region, seed);
        for (const piece of world.entities.filter((e) => e.kind === "fragment")) {
          expect(
            withinJump(world, piece),
            `region ${region} seed ${seed}: fragment ${piece.ref} is out of reach`,
          ).toBe(true);
        }
      }
    }
  });

  it("lays every fragment before the House figure that needs it", () => {
    // The ordering guarantee from `build.ts`. If a niche were ever laid after
    // the House in the same region, that House would stand silent for want of
    // a fragment lying further along the very same ground.
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91, 555, 12345, 60606, 777]) {
        const world = buildRegion(region, seed);
        const house = world.entities.find((e) => e.kind === "house");
        if (!house) continue;
        for (const piece of world.entities.filter((e) => e.kind === "fragment")) {
          expect(
            piece.x,
            `region ${region} seed ${seed}: fragment ${piece.ref} lies past its House`,
          ).toBeLessThan(house.x);
        }
      }
    }
  });

  it("completes the scroll before the Houses of all but the first region", () => {
    // Malchut's figure is meant to be met in silence — that is the prompt to
    // go looking. Everything above it must be able to speak.
    const { fragments: inMalchut = 0 } = regions[0];
    const strewnByEndOfYesod = inMalchut + (regions[1].fragments ?? 0);
    expect(strewnByEndOfYesod).toBe(SCROLL_TOTAL);
  });
});

describe("the Word-Gates", () => {
  it("places one wherever the Scribe could already spell something, and nowhere else", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91, 555, 12345]) {
        const world = buildRegion(region, seed);
        const gates = world.entities.filter((e) => e.kind === "word-gate");
        const spellable = solvableRoots(lettersOnEntering(region)).length > 0;
        expect(gates.length, `region ${region} seed ${seed}`).toBe(spellable ? 1 : 0);
        // The target is always one the Scribe can spell on arrival.
        if (spellable) {
          expect(world.wordGate).toBeDefined();
          const held = new Set(lettersOnEntering(region));
          for (const letter of world.wordGate?.letterIds ?? []) {
            expect(held.has(letter), `region ${region}: target needs ${letter}`).toBe(true);
          }
        }
      }
    }
  });

  it("leaves Malchut and Yesod gateless — two letters spell nothing", () => {
    for (const region of [1, 2]) {
      const world = buildRegion(region, 777);
      expect(world.entities.filter((e) => e.kind === "word-gate")).toHaveLength(0);
      expect(world.wordGate).toBeUndefined();
    }
  });

  it("keeps every gate's porch within a plain jump of the ground", () => {
    for (let region = 3; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91, 555, 12345, 60606]) {
        const world = buildRegion(region, seed);
        for (const gate of world.entities.filter((e) => e.kind === "word-gate")) {
          expect(withinJump(world, gate), `region ${region} seed ${seed}: porch out of reach`).toBe(true);
        }
      }
    }
  });

  it("opens the whole barrier at once, and only once", () => {
    const world = buildRegion(5, 3);
    expect(world.tiles.includes(Tile.WordGate)).toBe(true);
    openWordGate(world, "opened");
    expect(world.wordGateOpen).toBe(true);
    // Not a notch in the wall — the way in is a way in.
    expect(world.tiles.includes(Tile.WordGate)).toBe(false);
    openWordGate(world, "again");
    expect(world.wordGateOpen).toBe(true);
  });
});

describe("standing in a Word-Gate's porch", () => {
  it("asks once on arriving, not on every tick you remain there", () => {
    const world = buildRegion(5, 3);
    const porch = world.entities.find((e) => e.kind === "word-gate");
    expect(porch).toBeDefined();
    if (!porch) return;

    let asked = 0;
    const ctx: StepContext = { verbs: [], graces: [], onWordGate: () => { asked += 1; } };
    world.player.x = porch.x;
    world.player.y = porch.y;
    for (let i = 0; i < 40; i += 1) step(world, NO_INPUT, ctx);
    // Level-triggering this would reopen the panel every frame and trap the
    // Scribe in the porch with no way to dismiss it.
    expect(asked).toBe(1);
  });

  it("asks again once the Scribe has left and come back", () => {
    const world = buildRegion(5, 3);
    const porch = world.entities.find((e) => e.kind === "word-gate");
    if (!porch) return;
    let asked = 0;
    const ctx: StepContext = { verbs: [], graces: [], onWordGate: () => { asked += 1; } };

    world.player.x = porch.x;
    world.player.y = porch.y;
    step(world, NO_INPUT, ctx);
    expect(asked).toBe(1);

    world.player.x = porch.x + TILE_SIZE * 6;
    step(world, NO_INPUT, ctx);
    world.player.x = porch.x;
    world.player.y = porch.y;
    step(world, NO_INPUT, ctx);
    expect(asked).toBe(2);
  });

  it("stops asking once the chamber is open", () => {
    const world = buildRegion(5, 3);
    const porch = world.entities.find((e) => e.kind === "word-gate");
    if (!porch) return;
    let asked = 0;
    const ctx: StepContext = { verbs: [], graces: [], onWordGate: () => { asked += 1; } };
    openWordGate(world, "opened");
    world.player.x = porch.x;
    world.player.y = porch.y;
    for (let i = 0; i < 20; i += 1) step(world, NO_INPUT, ctx);
    expect(asked).toBe(0);
  });
});


/**
 * **And the hands, on the Tree.**
 *
 * `route.test.ts` asks whether a way exists across every path a wander can take.
 * This asks whether a body can walk it — the same two questions in one coat that
 * the route graph was built to tell apart, now asked of ground that is generated
 * from what the Scribe is carrying rather than from how far up they have got.
 *
 * Fewer wanders than the route test runs, because a probe costs a thousand times
 * what a flood fill does, and the route test is the one that has to be
 * exhaustive: a path with no way through is a soft lock, while a path the probe
 * fumbles is a path the probe fumbles. So this is a sample, and it is asked with
 * the klipot cleared, because whether the fight is survivable is `fight.test.ts`
 * and mixing the two makes both unreadable.
 */
describe("walking the Tree", () => {
  /**
   * **What this asserts, and why it is a share rather than a zero.**
   *
   * `route.test.ts` asks whether a way exists across every path a wander can
   * take, and it answers *always* — six hundred and sixty of six hundred and
   * sixty. That is the no-soft-lock guarantee and it is a hard zero, because a
   * path with no way through is a run that cannot be finished.
   *
   * This asks the other half: whether *this* pair of hands can walk it.
   *
   * It stood at eighty-two per cent, and the shortfall was seven named screens
   * that assumed a body they did not declare — reachable ground that this probe
   * could not cross holding only the letters the screen asked for. Those are
   * fixed: `anchor-gap` and `high-anchors` have their rings three tiles apart
   * rather than five, because the throw off a ring hangs a third of a second
   * and five tiles is further than that carries; `high-span`'s gap was exactly
   * what a bare body crosses and is now a tile less; `stone-chain` was two
   * tiles too wide; `vault-to-high` asked for a four-row vault the Breath does
   * not have and now asks for two of three; and `set-stone` became a step,
   * because a single stone cannot gate a *gap* with any margin at all. All
   * seven are held to it by the assertion below this one.
   *
   * Eighty-eight per cent now, and what is left is a different thing entirely:
   * **almost every remaining stall is a Scribe with no Breath.** Not on any
   * particular screen — on the length of the walk. `earnedRung` holds them to
   * Malchut's band, which is right, and Malchut's band is still a dozen screens
   * of pits crossed by a body that cannot double-jump, and this probe loses a
   * war of attrition it does not quite lose on any single screen.
   *
   * **That is meant.** It was an open question — leave it, or have the Tree pay
   * the Breath sooner — and it has been decided: leave it. Three paths run out
   * of the kingdom and only one of them pays Aleph, and a Scribe who takes one
   * of the other two has chosen the Fence or the Mark over the second jump and
   * will walk the next few rungs the hard way. `tree.test.ts` guarantees the
   * one thing that must hold, which is that every first step pays a *verb* and
   * not a grace; it has never guaranteed that every first step is equally kind,
   * and it should not. A map whose doors all cost the same is a corridor with
   * decorations.
   *
   * So the gap between this number and a hundred is a **property of the game**
   * and not a list of things to fix. Do not close it by moving Aleph — the
   * whole letter arrangement in `tree.ts` is built to put the Breath one step
   * from the kingdom *and no nearer*, and every measured reach in `chunks.ts`
   * depends on where it sits. Do not close it by softening Malchut's band
   * either: that band is what a Scribe with no letters is measured against, and
   * `route.test.ts` proves the ground is always crossable. Hard is not broken.
   *
   * The bar is set below the measurement rather than at it, because a probe is
   * one pair of hands and a seed is a seed. What it is for is catching a
   * *collapse*.
   *
   * The klipot are cleared, because whether a fight is survivable is
   * `fight.test.ts` and mixing the two makes both unreadable.
   */
  it("carries a competent Scribe along most paths, holding what the route there paid", () => {
    const stalled: string[] = [];
    let walked = 0;
    for (let seed = 1; seed <= 24; seed += 1) {
      const rng = makeRng((seed * 7919) >>> 0);
      let at: SefirahId = "malchut";
      const gathered: string[] = [];
      for (let step = 0; step < 10; step += 1) {
        const out = pathsFrom(at);
        const path = out[randomInt(rng, out.length)];
        const held = lettersFrom(gathered);
        const world = buildPath(path, seed, held);
        // **The probe cannot spell, and must not have to.** Over the Abyss the
        // way out stands behind a Word-Gate, so the barrier is dissolved before
        // the ground is asked about — the same way the probe is handed every
        // verb the letters buy. What is measured here is still only the floor.
        // Whether a Scribe can answer the question is `abyss.test.ts`, and it
        // is a different guarantee: this one covers the walk to the gate and
        // the walk from it, and nothing about knowing anything.
        if (crossesAbyss(path)) openWordGate(world, "The gate opens.");
        world.husks = [];
        // **And the pool they would be drawn from.** A figured stone gives way
        // under the probe and stands something up out of the floor — see
        // `Tile.Maskit` — so emptying the list of bodies is no longer the same
        // act as emptying the rung of klipot. Measured before this line: the
        // probe stalled at seventy-two per cent of Chochmah, because a pacer
        // had come up out of the ground in a corridor it will not fight in.
        world.klipot = [];
        const ctx: StepContext = {
          verbs: verbsOf(held),
          graces: held
            .map((id) => abilityByLetter[id]?.grace)
            .filter((g): g is NonNullable<typeof g> => Boolean(g)),
        };
        walked += 1;
        // By the ground rather than by the storeys: a path blends two Sefirot's
        // lengths, so two rungs of the same height can differ by half again.
        const screens = (world.width / CHUNK_W) * Math.max(1, Math.round(world.height / CHUNK_H));
        if (!probe(world, ctx, Math.max(24000, 2000 * screens)).finished) {
          stalled.push(`${path.id} seed ${seed} holding [${held.join(",") || "nothing"}]`);
        }
        gathered.push(path.id);
        at = otherEnd(path, at);
      }
    }
    expect(walked, "the wander walked nowhere").toBeGreaterThan(100);
    const crossed = (walked - stalled.length) / walked;
        // **Where the bar is, and why it moved down as the sample went up.**
    // Twelve seeds and a bar of 85 was a knife-edge: the measurement sat at
    // 89.2 and *any* reshuffle of the chunk array crossed it. Measured over
    // three independent ranges of thirty-six seeds — three hundred and sixty
    // walks each — the rate is 91.9%, 88.9% and 84.7%. That seven-point spread
    // is what a reshuffle actually costs, and it is a property of a probe
    // walking with whatever letters the route happened to pay, not of the
    // ground. So: twice the sample, and the bar set a clear span below the
    // worst range rather than a whisker below the best.
    expect(
      crossed,
      `crossed only ${(crossed * 100).toFixed(0)}% of ${walked} paths walked:\n  ${stalled.slice(0, 10).join("\n  ")}`,
    ).toBeGreaterThan(0.78);
  }, 300000);
});

/**
 * **Every screen crossable by a body holding exactly what it declares.**
 *
 * `chunks.test.ts` asks this of the route graph and gets a clean answer: a way
 * exists across every screen in the library with nothing in hand but the
 * letters it names. This asks the same question of the hands, and for most of
 * this game's life it could not have been asked at all — the climb was a line,
 * so a screen laid in Gevurah was met by a Scribe holding everything Malchut
 * through Hod pay out, and no screen was ever offered its own bare minimum.
 *
 * The Tree offers exactly that. A path pays one letter, and `earnedRung` caps
 * the ground by what is carried, so a Scribe holding the Hook and little else
 * is handed `anchor-gap` — which declares the Hook, is crossable in the graph
 * holding the Hook, and could not be crossed by this probe holding the Hook.
 * Seven screens were in that state and they were the whole of why the Tree's
 * own probe test reports a share rather than a zero.
 *
 * The fault in all seven was the same and is worth naming, because it is not
 * what it looks like: none of them was under-declared about the letter it
 * *gates* on. Each assumed a body that could do more than step and jump —
 * general mobility the line guaranteed from the second region and the Tree does
 * not. Fixed the way `wide-chasm` was: measured against the hands, reshaped,
 * measured again.
 *
 * Husks cleared, because whether a fight is survivable is `fight.test.ts`.
 */
describe("the library, against a body holding only what it asks", () => {
  /**
   * `chainFor` and `declares` used to live here, and a copy of each lived in
   * `speed.test.ts`. They are in `probes.ts` now, beside the probes they drive.
   *
   * **Four screens came back with them.** Both copies returned `undefined` for
   * the `both` profile under a comment saying the branching screens were
   * "covered by the pair" — nothing covered them, and `the-fork`, `two-ways`,
   * `high-road` and `the-merge` have never been walked in isolation by
   * anything in this repo. They are walked inside real rungs, so it was never a
   * soft-lock hole; it was a claim quietly narrower than it read.
   */
  it("carries a competent Scribe across every screen, holding only its own letters", () => {
    const failing: string[] = [];
    for (const chunk of CHUNKS) {
      const chain = chainFor(chunk);
      if (!chain) continue;
      const verbs = declares(chunk);
      let crossed = 0;
      for (let seed = 1; seed <= 6; seed += 1) {
        const world = paintChunks(chain, seed);
        world.husks = [];
        // **And the pool they would be drawn from.** A figured stone gives way
        // under the probe and stands something up out of the floor — see
        // `Tile.Maskit` — so emptying the list of bodies is no longer the same
        // act as emptying the rung of klipot. Measured before this line: the
        // probe stalled at seventy-two per cent of Chochmah, because a pacer
        // had come up out of the ground in a corridor it will not fight in.
        world.klipot = [];
        if (probe(world, { verbs, graces: [] }, 20000).finished) crossed += 1;
      }
      // Five of six rather than six: a probe is one pair of hands and the odd
      // seed lays a mote or a fragment somewhere that distracts it. What is
      // being caught is a screen it cannot do, not one it occasionally fumbles.
      if (crossed < 5) {
        failing.push(`${chunk.id} — ${crossed}/6 holding [${verbs.join(", ") || "nothing"}]`);
      }
    }
    expect(
      failing,
      `screens that ask for a body they do not declare:\n  ${failing.join("\n  ")}`,
    ).toEqual([]);
  }, 600000);
});
