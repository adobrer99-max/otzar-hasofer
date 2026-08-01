import { describe, expect, it } from "vitest";
import { abilityByLetter } from "../abilities";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { buildRegion, PLAYER_H, tileAt, verbsOf } from "./build";
import { MAX_JUMP_RISE, step, type StepContext } from "./step";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input, type World } from "./types";

/**
 * A crude Scribe, to prove the ground is walkable.
 *
 * This is not an attempt at good play — it is a probe. It holds right, jumps
 * when it stops making progress, and reaches for the act key on a rhythm so
 * that hooks are cast, thorns cut and doors opened somewhere along the way.
 * If terrain a real player could cross defeats even this, the region has a
 * hole in it, and that is worth knowing at build time rather than from
 * someone stuck against a wall.
 */
function probe(
  world: World,
  ctx: StepContext,
  ticks: number,
): { reached: number; finished: boolean; lettersTaken: string[] } {
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
  let reached = world.player.x;
  let mark = world.player.x;
  let stuckFor = 0;
  // Ticks left to keep holding the jump key. Every reason to jump is spotted
  // while grounded, so without this the key releases the instant the body
  // leaves the floor — and a released key is a deliberately cut, half-height
  // jump. The probe would clear nothing it aimed at.
  let holdJump = 0;

  for (let i = 0; i < ticks && !world.finished; i += 1) {
    const p = world.player;
    const progressing = p.x > mark + 0.5;
    stuckFor = progressing ? 0 : stuckFor + 1;
    mark = Math.max(mark, p.x);

    // Look two strides ahead for a floor that isn't there. Without this the
    // probe walks into every pit at full speed, which tests nothing except
    // that pits exist.
    const aheadX = Math.floor((p.x + p.w / 2) / TILE_SIZE) + 2;
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
    const letterAhead =
      p.onGround &&
      !gapAhead &&
      world.entities.some(
        (e) =>
          e.kind === "letter" &&
          !e.taken &&
          e.x - (p.x + p.w) > -TILE_SIZE &&
          e.x - (p.x + p.w) < TILE_SIZE * 2.5,
      );

    // Jump for a reason — a gap, a letter on its shelf, a wall caught, or
    // plain stalling — and never on an idle rhythm: a probe that hops
    // constantly is almost never grounded once it has the second jump, and
    // every reason above is only visible while grounded.
    const wantJump = gapAhead || letterAhead || p.clinging !== 0 || (stuckFor > 6 && i % 9 === 0);
    if (wantJump) holdJump = 20;
    else if (holdJump > 0) holdJump -= 1;

    // A thorn, a door or a thicket standing a step or two ahead is cleared
    // from where you are, not walked into — the reach of the Edge and the
    // Flame is a couple of tiles. Blundering into a thornbrake only veils the
    // Scribe and sends them back to the mark, forever.
    let barrierAhead = false;
    for (let d = 1; d <= 3 && !barrierAhead; d += 1) {
      for (let up = 0; up <= 2 && !barrierAhead; up += 1) {
        const t = tileAt(world, ownX + d, footRow - up);
        if (t === Tile.Thorn || t === Tile.Growth || t === Tile.Door) barrierAhead = true;
      }
    }

    const input: Input = {
      ...NO_INPUT,
      // Holding right is also holding *into* a wall on the right, which is
      // exactly what climbing one asks for — so the probe needs no special
      // case for the Fence.
      right: true,
      jump: wantJump,
      jumpHeld: holdJump > 0 || stuckFor > 6,
      // Rise in water and up vines.
      up: p.inWater || p.climbing,
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
    reached = Math.max(reached, world.player.x);
  }

  return { reached, finished: world.finished, lettersTaken };
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

describe("walking the regions", () => {
  it("carries a crude Scribe to the exit of every region, on many seeds", () => {
    const report: string[] = [];
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [3, 91, 555, 12345]) {
        const world = buildRegion(region, seed);
        const ctx = contextFor(region);
        const span = world.width * TILE_SIZE;
        const { reached, finished, lettersTaken } = probe(world, ctx, 9000);
        const fraction = reached / span;
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
