import { describe, expect, it } from "vitest";
import { abilityByLetter } from "../abilities";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { SCROLL_TOTAL } from "../scroll";
import { solvableRoots } from "../wordGate";
import { buildRegion, PLAYER_H, tileAt, verbsOf } from "./build";
import { MAX_JUMP_RISE, openWordGate, step, type StepContext } from "./step";
import { CHUNK_H } from "./chunks";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input, type World } from "./types";

/**
 * A **competent** Scribe, to prove the ground is crossable.
 *
 * This is the no-soft-lock guarantee and nothing else. It plays properly for
 * its size: it looks a stride ahead for a floor that is not there, dashes over
 * a real gap, casts the Hook while falling over nothing, clears a thorn or a
 * door from a couple of tiles off rather than walking into it, and holds into
 * a wall to climb it. If terrain defeats *this*, the region has a hole in it.
 *
 * What it must not be is the standard the levels are built down to. For most
 * of this game's life the only traversal test asserted that a bot finishes
 * every region on every seed — which quietly capped difficulty at whatever a
 * bot could do, and the levels obliged. `naive` below is the other half: a
 * Scribe who only walks and jumps, and who is now expected to **fail**.
 */
/**
 * Where to head, on a floor.
 *
 * A rung used to be a corridor and "the way out" was "to the right". It is a
 * floor now, walked as a boustrophedon — along, up, back along — so a probe
 * that holds right is walking *away* from the exit on every other storey. The
 * rule is the level's own construction restated: while the way out is on a
 * storey above you, head for the end of the row you are on, because that is
 * always where the stairwell is; once you are on its storey, head for the exit
 * itself.
 *
 * Distance to the goal — not distance travelled — is also what "am I getting
 * anywhere?" has to be asked against, or half a climb reads as being stuck.
 */
export function steering(world: World) {
  const exit = world.entities.find((e) => e.kind === "exit");
  const storeyH = CHUNK_H * TILE_SIZE;
  const storeys = Math.max(1, Math.round(world.height / CHUNK_H));
  const goalX = exit ? exit.x : world.width * TILE_SIZE;
  const goalY = exit ? exit.y : 0;
  /** Counting up from the bottom, which is the order they are walked in. */
  const fromBottom = (y: number) => storeys - 1 - Math.floor(y / storeyH);

  const goal = (p: { x: number; y: number; h: number }) => {
    const mine = fromBottom(p.y + p.h - 1);
    if (mine >= fromBottom(goalY)) return { x: goalX, y: goalY };
    // The stairwell is at the end of the row: the far right of an even storey,
    // the far left of an odd one, because odd storeys are laid mirrored.
    return { x: mine % 2 === 0 ? world.width * TILE_SIZE : 0, y: p.y };
  };

  /** How far there is still to go, in pixels of Manhattan distance. */
  const left = (p: { x: number; y: number; h: number }) => {
    const g = goal(p);
    const climbs = Math.max(0, fromBottom(goalY) - fromBottom(p.y + p.h - 1));
    return Math.abs(g.x - p.x) + climbs * storeyH;
  };
  // Measured the same way as the progress it is compared against, or the
  // fraction is a ratio of two different things — which read as 2% for a run
  // that had crossed most of a rung.
  const initial = Math.max(1, left(world.player));

  return {
    left,
    /** -1, 0 or 1: which way to lean. */
    towards(p: { x: number; y: number; h: number }) {
      const g = goal(p);
      if (Math.abs(g.x - p.x) < TILE_SIZE / 2) return 0;
      return g.x > p.x ? 1 : -1;
    },
    /** How much of the way there the best attempt got, as a fraction. */
    fraction(best: number) {
      return Math.max(0, Math.min(1, 1 - best / initial));
    },
  };
}

function probe(
  world: World,
  ctx: StepContext,
  ticks: number,
): { reached: number; finished: boolean; lettersTaken: string[]; ticks: number; veilings: number } {
  const lettersTaken: string[] = [];
  const watching: StepContext = {
    ...ctx,
    onLetter: (id) => lettersTaken.push(id),
  };
  // Two different questions, so two different numbers. `reached` is how far
  // the Scribe ever got, for the report. `mark` is the high-water mark as of
  // the *start* of a tick, which is what "am I still getting anywhere?" has to
  // be asked against — a body pressed to a wall still shuffles by fractions of
  // a pixel, and comparing against this tick's own motion would read that as
  // progress and never trigger a jump.
  const aim = steering(world);
  let best = aim.left(world.player);
  let mark = best;
  let reached = 0;
  let stuckFor = 0;
  // Ticks left to keep holding the jump key. Every reason to jump is spotted
  // while grounded, so without this the key releases the instant the body
  // leaves the floor — and a released key is a deliberately cut, half-height
  // jump. The probe would clear nothing it aimed at.
  let holdJump = 0;

  for (let i = 0; i < ticks && !world.finished; i += 1) {
    const p = world.player;
    // **Progress is distance left to the way out, not distance travelled.** A
    // rung is a floor now and every other row is walked backwards, so a probe
    // that measured progress as "x got bigger" would read half the climb as
    // being stuck and jump the whole way along it.
    const left = aim.left(p);
    const progressing = left < mark - 0.5;
    stuckFor = progressing ? 0 : stuckFor + 1;
    mark = Math.min(mark, left);
    best = Math.min(best, left);

    const towards = aim.towards(p);

    // Look one stride ahead for a floor that isn't there. Without this the
    // probe walks into every pit at full speed, which tests nothing except
    // that pits exist — but looking *two* ahead is no better, because then it
    // leaves the ground a whole tile early and spends the arc clearing runway
    // instead of the gap. One ahead, plus coyote time, is where a hand jumps.
    const aheadX = Math.floor((p.x + p.w / 2) / TILE_SIZE) + towards;
    const footRow = Math.floor((p.y + p.h + 1) / TILE_SIZE);
    const gapAhead =
      p.onGround &&
      tileAt(world, aheadX, footRow) === Tile.Empty &&
      tileAt(world, aheadX, footRow + 1) === Tile.Empty;

    // Is there anything to land on beneath us, anywhere down this column?
    // Reaching for the Hook on every descent keeps the Scribe permanently
    // airborne, orbiting between two anchors and never touching ground again —
    // and a short probe is not enough, because the Hook leaves you hanging
    // high above floor that is genuinely there.
    const ownX = Math.floor((p.x + p.w / 2) / TILE_SIZE);
    let groundBelow = false;
    for (let ty = Math.floor((p.y + p.h) / TILE_SIZE) + 1; ty < world.height && !groundBelow; ty += 1) {
      const t = tileAt(world, ownX, ty);
      if (t === Tile.Stone || t === Tile.Ledge) groundBelow = true;
    }

    // A letter on its shelf just ahead is worth a jump. Without this the probe
    // runs straight underneath every alcove in the game and collects nothing,
    // which would let an unreachable letter pass unnoticed.
    // "Ahead" means *in the direction of travel*, which used to be the same as
    // "to the right" and no longer is. Measured rightward on a storey walked
    // leftward, a letter already behind the Scribe stayed permanently "ahead" —
    // so the probe jumped on every single tick, was almost never grounded, and
    // stalled halfway along a rung it could otherwise cross.
    const letterAhead =
      p.onGround &&
      !gapAhead &&
      towards !== 0 &&
      world.entities.some((e) => {
        if (e.kind !== "letter" || e.taken) return false;
        const ahead = (e.x - (p.x + p.w / 2)) * towards;
        return ahead > -TILE_SIZE && ahead < TILE_SIZE * 2.5;
      });

    // Optional pockets — a Word-Gate's porch above all — are places a body
    // holding right can climb into and then press against a sealed wall
    // forever. A player simply steps back down; the probe has to be told to.
    // After a long stall it backs off leftward in bursts until it is free.
    // Two tiles below the top of a storey there is nothing left to climb to —
    // *if* there is a storey above. On the top one, and on a rung that is only
    // one storey, the top of the screen is open sky and a sheer face climbed
    // to its very top is how several screens are crossed.
    const underCeiling =
      Math.floor(p.y / (CHUNK_H * TILE_SIZE)) > 0 &&
      p.y % (CHUNK_H * TILE_SIZE) < TILE_SIZE * 2;
    const backingOff = stuckFor > 90 && stuckFor % 150 < 45;
    // **And when backing off is not enough, come down.** Every pocket that
    // defeated this probe was *above* the way on — a shelf, a ledge, the
    // corner under a storey's ceiling — and the cure for all of them is the
    // same and needs no direction chosen: stop jumping, and walk off whatever
    // you are standing on. Gravity does the rest, and a fall costs a veiling
    // at worst, which is ground rather than the run.
    // ...but only up under a ceiling, which is where every pocket that
    // actually defeated it was. Applied wherever the Scribe happened to be off
    // the floor it was worse than the disease: the high road *is* off the
    // floor, so a probe that refuses to jump up there is dropped off it every
    // three hundred ticks and can never cross one.
    const grounding = stuckFor > 120 && stuckFor % 300 < 90 && underCeiling;

    // Jump for a reason — a gap, a letter on its shelf, a wall caught, or
    // plain stalling — and never on an idle rhythm: a probe that hops
    // constantly is almost never grounded once it has the second jump, and
    // every reason above is only visible while grounded.
    const wantJump =
      !backingOff &&
      !grounding &&
      // Pressed against a face with the ceiling right there, *any* jump is a
      // wall-jump back into the same corner — the rhythm jump that unsticks
      // everything else included.
      !(p.clinging !== 0 && underCeiling) &&
      (gapAhead ||
        letterAhead ||
        // A wall is a way up until it runs out of up. Holding into a face and
        // jumping climbs it — the Fence working exactly as intended — but a
        // storey has a ceiling over it now, and a Scribe who climbs into the
        // corner beneath one will climb straight back into it every time they
        // come down. Measured: twenty thousand ticks oscillating between two
        // columns at the top of a rung. Refusing to climb *at all* once stuck
        // is the wrong cure — a sheer face is the only way across several
        // screens — so it is refused only where there is nothing above.
        (p.clinging !== 0 && !underCeiling) ||
        (stuckFor > 6 && i % 9 === 0));
    if (wantJump) holdJump = 20;
    else if (holdJump > 0) holdJump -= 1;

    // A thorn, a door or a thicket standing a step or two ahead is cleared
    // from where you are, not walked into — the reach of the Edge and the
    // Flame is a couple of tiles. Blundering into a thornbrake only veils the
    // Scribe and sends them back to the mark, forever.
    let barrierAhead = false;
    for (let d = 1; d <= 3 && !barrierAhead; d += 1) {
      for (let up = 0; up <= 2 && !barrierAhead; up += 1) {
        const t = tileAt(world, ownX + d * towards, footRow - up);
        if (t === Tile.Thorn || t === Tile.Growth || t === Tile.Door) barrierAhead = true;
      }
    }

    const input: Input = {
      ...NO_INPUT,
      // Holding toward the way out is also holding *into* a wall in that
      // direction, which is exactly what climbing one asks for — so the probe
      // needs no special case for the Fence.
      // Backing off and coming down both mean *away*: a Scribe stranded on a
      // shelf with a wall in front of them has to walk off the edge behind
      // them, and walking into the wall while refusing to jump is standing
      // still with extra steps.
      right: backingOff || grounding ? towards < 0 : towards > 0,
      left: backingOff || grounding ? towards > 0 : towards < 0,
      jump: wantJump,
      jumpHeld: holdJump > 0 || stuckFor > 6,
      // Rise in water and up vines.
      up: p.inWater || p.climbing,
      // And come *down* when backing off. A storey has a floor over it now, so
      // a Scribe who climbs a wall can end up in a pocket against the ceiling
      // with the way on below — where holding away from the wall only shuffles
      // along the same shelf. Measured: the probe oscillated between two
      // columns at the top of a storey for twenty thousand ticks. A player
      // drops through the ledge; this is that, and no more.
      down: (backingOff || grounding) && p.onGround,
      // Reach for the hook while falling over nothing — which is when a gap
      // actually needs it.
      // On the ground, act clears a barrier (thorn, door, overgrowth) — in the
      // air it casts the Hook, so it must stay off unless a gap needs it.
      act:
        barrierAhead ||
        (!p.onGround && p.vy > 0 && !groundBelow && !p.grappleTo) ||
        (p.onGround && stuckFor > 10 && i % 7 === 0),
      // Reach for the Bridge on the way down across a gap — but only over a
      // real gap. Dashing on every descent flings the probe past the very
      // alcoves it just jumped for.
      dash: (!p.onGround && p.vy > 40 && !groundBelow) || (stuckFor > 14 && i % 21 === 0),
    };

    step(world, input, watching);
  }

  reached = aim.fraction(best);
  return {
    reached,
    finished: world.finished,
    lettersTaken,
    ticks: world.tick,
    veilings: world.veilings,
  };
}

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
const TICK_BUDGET = 24000;

describe("walking the regions", () => {
  it("carries a competent Scribe to the exit of every region, on many seeds", () => {
    const report: string[] = [];
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91, 555, 12345, 777, 40404]) {
        const world = buildRegion(region, seed);
        // **The ground, on its own.** The klipot are cleared before the probe
        // walks, because this is the no-soft-lock guarantee and it is about
        // terrain: a region must be crossable independently of what happens to
        // be standing in it, and the probe does not fight.
        world.husks = [];
        const ctx = contextFor(region);
        const { reached, finished, lettersTaken } = probe(world, ctx, TICK_BUDGET);
        const fraction = reached;
        report.push(`region ${region} seed ${seed}: ${(fraction * 100).toFixed(0)}%${finished ? " (exit)" : ""}`);
        // Not "most of the way" — all the way. Every region, every seed, with
        // only the letters the Scribe could have on arriving. If this ever
        // fails, some assembly of screens has a barrier no one can pass.
        expect(
          finished,
          `region ${region} seed ${seed} stalled at ${(fraction * 100).toFixed(0)}% — ${report.join("; ")}`,
        ).toBe(true);

        // The probe is not precise enough to demand every letter — it jumps on
        // a heuristic, and missing one is a failure of the bot, not the level.
        // Reachability is asserted exactly, and geometrically, below.
        expect(lettersTaken.length, `region ${region} seed ${seed} collected nothing`).toBeGreaterThan(0);
      }
    }
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
      // Three teaching screens, squared up to whole rooms — see the same
      // reasoning in `build.test.ts`. What matters here is that the porch is
      // laid at all and that a Scribe holding nothing can cross it.
      expect(taught.width, `seed ${seed}: the porch is not laid`).toBeGreaterThanOrEqual(
        plain.width + 3 * 16,
      );

      const { finished } = probe(taught, contextFor(1), TICK_BUDGET);
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
  it("stops a Scribe who has learned nothing, past the on-ramp", () => {
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
  it("costs more the higher the Tree is climbed", () => {
    const cost = (region: number) => {
      let ticks = 0;
      for (const seed of [3, 91, 555, 12345]) {
        const world = buildRegion(region, seed);
        world.husks = [];
        const run = probe(world, contextFor(region), TICK_BUDGET);
        expect(run.finished, `region ${region} seed ${seed} stalled`).toBe(true);
        // Per screen, so a longer region does not read as a harder one.
        ticks += run.ticks / (world.width / TILE_SIZE);
      }
      return ticks / 4;
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
   * And the other half: with the klipot left standing, a Scribe who never
   * strikes must still get a long way. They are an obstacle, not a wall — if
   * a region became impassable simply because something stood in it, the
   * reachability guarantee above would be a technicality.
   */
  it("lets a Scribe who never strikes get most of the way regardless", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91]) {
        const world = buildRegion(region, seed);
        // Lamps enough that going out is not what stops them — this measures
        // whether the *ground* is still walkable with husks on it.
        world.player.lamps = 99;
        const { reached: fraction } = probe(world, contextFor(region), TICK_BUDGET);
        expect(
          fraction,
          `region ${region} seed ${seed}: only ${(fraction * 100).toFixed(0)}% with husks standing`,
        ).toBeGreaterThan(0.9);
      }
    }
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
        const spellable = solvableRoots(region).length > 0;
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
