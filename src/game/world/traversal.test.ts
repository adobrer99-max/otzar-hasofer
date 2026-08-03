import { describe, expect, it } from "vitest";
import { abilityByLetter, type Verb } from "../abilities";
import { routeTo, storeysOf } from "./route";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { SCROLL_TOTAL } from "../scroll";
import { solvableRoots } from "../wordGate";
import { makeRng, randomInt } from "../rng";
import { lettersFrom, otherEnd, pathsFrom } from "../tree";
import type { SefirahId } from "../../types/letter";
import { buildPath, buildRegion, paintChunks, PLAYER_H, rowsFor, tileAt, verbsOf } from "./build";
import { MAX_JUMP_RISE, openWordGate, step, type StepContext } from "./step";
import { CHUNK_H, CHUNK_W, CHUNKS, END_CHUNK, START_CHUNK } from "./chunks";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Chunk, type Input, type World } from "./types";

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
 * next rule was the level's own construction restated: while the way out is on
 * a storey above you, head for the end of the row you are on, because that is
 * where the stairwell is. It was true, and it lost, because knowing which end
 * of a rung to walk to says nothing about the shelf you are standing on.
 *
 * So **which way** comes off the route now — `routeTo` in `route.ts`, a graph
 * of the places a body can stand and the leaps and falls between them, with the
 * cost to the way out flooded backwards through it. Measured, with the floors
 * on: the row-end rule stalled nineteen runs of sixty; this crosses two hundred
 * and thirty-seven of two hundred and forty, and the one corridor it still
 * misses it missed before there were floors at all.
 *
 * **Only which way**, and that is a finding rather than a scruple. The route
 * also knows how far there is still to go, whether the next leg rises, how wide
 * the landing is and how far off. Every one of those was wired in and measured,
 * and every one made the probe worse: the distance because it changes by the
 * tile while the sense of being stuck is tuned to something that changes every
 * tick; the rise, the landing and the width because a body cannot execute a
 * chosen leap, and second-guessing its own direction in mid-air only made it
 * drift. Wired in full it stalled eighteen of sixty on ground it crosses
 * cleanly. The probe needed to know which way to go, not how to move.
 *
 * The one other thing taken from the route is not steering either: **whether
 * the way on is up.** Holding toward the exit is also holding *into* any wall
 * that happens to be that way, and holding into a wall is how the Fence climbs
 * — so without it the probe climbed every face it met, topped out under a
 * storey's ceiling, fell, and climbed it again.
 *
 * Distance to the goal — not distance travelled — is still what "am I getting
 * anywhere?" is asked against, or half a climb reads as being stuck.
 */
export function steering(world: World, verbs: readonly Verb[] = []) {
  const route = routeTo(world, verbs);
  const exit = world.entities.find((e) => e.kind === "exit");
  const storeyH = CHUNK_H * TILE_SIZE;
  const storeys = storeysOf(world);
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

  /**
   * How far there is still to go, in pixels of Manhattan distance — and it is
   * **not** taken from the route, which knows the answer exactly.
   *
   * That was tried and measured. The route's own field is a count of tiles, so
   * it changes once per tile crossed, and this number is what "am I still
   * getting anywhere?" is asked against every single tick — so a probe walking
   * perfectly well reads as stuck for nine ticks in ten and spends the whole of
   * every rung dashing, casting the Hook and jumping on the unsticking rhythm.
   * Making it continuous helped and still lost. The old measure is coarse about
   * *where* the way out is and exactly right about *whether the body is
   * moving*, and that second thing is all this is for.
   */
  const left = (p: { x: number; y: number; h: number }) => {
    const g = goal(p);
    const climbs = Math.max(0, fromBottom(goalY) - fromBottom(p.y + p.h - 1));
    return Math.abs(g.x - p.x) + climbs * storeyH;
  };
  // Measured the same way as the progress it is compared against, or the
  // fraction is a ratio of two different things — which read as 2% for a run
  // that had crossed most of a rung.
  const initial = Math.max(1, left(world.player));
  /** The last way the route actually pointed — see `towards`. */
  let lastLean = 0;

  return {
    left,
    /** Whether the graph could see a way out at all, for the tests to assert. */
    routed: route.usable,
    /**
     * Whether the next place to stand is **above** the body — the one other
     * thing worth taking from the route, and it is not steering either.
     *
     * Holding toward the way out is also holding *into* any wall that happens
     * to be that way, and holding into a wall is how the Fence climbs. So a
     * probe with no notion of whether it wants to be up there climbs every face
     * it walks into, tops out under the storey's ceiling, falls, and climbs it
     * again: measured, two rungs of a hundred and twenty spent their whole
     * budget going up and down the same column, and the graph said plainly that
     * nothing up there was on the way to anywhere.
     */
    above(p: { x: number; y: number; h: number }) {
      if (!route.usable) return true;
      // **Being stranded is not a reason to come down**, however much it looks
      // like one. `landingRow` has no answer from a place the way out cannot be
      // reached from, and answering "no, not up" there was tried: the body
      // catching the outer face of a chasm screen and climbing it forever is
      // exactly the case it was written for, and it did fix that rung — while
      // costing three others, because a stairwell is a sheer face too and a
      // body halfway up one is often off the graph for a tile or two. One rung
      // gained, three lost. The silence stays read as "up"; coming down is
      // `grounding`'s job, and it is asked only from the floor.
      const row = route.landingRow(p.x, p.y, p.h);
      return row === undefined || row < (p.y + p.h - 1) / TILE_SIZE - 1;
    },
    /**
     * Whether the ground underfoot cannot reach the way out at all.
     *
     * The one other thing worth taking from the route, and it is not steering:
     * it is knowing you are lost. A body that has climbed into a pocket the
     * exit cannot be reached from has no direction that helps — what it needs
     * is to come down, which costs a veiling at worst and is what a player does
     * without thinking. Before this the probe wandered such a pocket in Gevurah
     * for twenty thousand ticks.
     */
    stranded(p: { x: number; y: number; h: number }) {
      return route.usable && !Number.isFinite(route.costAt(p.x, p.y, p.h));
    },
    /** -1, 0 or 1: which way to lean. */
    towards(p: { x: number; y: number; h: number }) {
      if (route.usable) {
        const lean = route.towards(p.x, p.y, p.h);
        if (lean !== 0) {
          lastLean = lean;
          return lean;
        }
        // Zero means the next leg is straight up or straight down, and there is
        // nowhere to lean — but a body has to be pressed *somewhere* to climb a
        // face, and holding nothing is how a probe stands still under a shaft.
        //
        // **Keep leaning the way you were.** Falling back to the row-end rule
        // here was quietly catastrophic in the one place the route says "up":
        // at the foot of a wall on a storey walked left to right, the old rule
        // answers *right*, which is away from the face. Measured, on Chesed:
        // the probe was in the pocket behind a fourteen-tile wall, the route
        // said climb, the fallback said walk away from it, and it walked away
        // from it for twenty thousand ticks.
        if (lastLean !== 0) return lastLean;
      }
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

export function probe(
  world: World,
  ctx: StepContext,
  ticks: number,
  opts?: { pacifist?: boolean },
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
  const aim = steering(world, ctx.verbs);
  let best = aim.left(world.player);
  let mark = best;
  let reached = 0;
  let stuckFor = 0;
  // Ticks left to keep holding the jump key. Every reason to jump is spotted
  // while grounded, so without this the key releases the instant the body
  // leaves the floor — and a released key is a deliberately cut, half-height
  // jump. The probe would clear nothing it aimed at.
  let holdJump = 0;
  // How long this bout of wall-climbing has gone on. A face is a way up until
  // it runs out of up, and a storey has a ceiling over it now, so a Scribe who
  // catches a wall under one climbs to the same corner and comes down, forever
  // — measured, twenty thousand ticks against one face in Gevurah. A hand tries
  // a climb, finds it goes nowhere, and lets go. This is the letting go.
  let climbing = 0;
  let climbTop = world.player.y;
  let sinceCling = 99;
  let gaveUp = 0;
  /** Whether this fall has already reached for something — see `act`. */
  let reached_ = false;
  /**
   * **A veiling is not a reset, and that is a finding rather than an oversight.**
   *
   * `mark` is the closest the Scribe has ever been to the way out, and being
   * closer than that is the only thing this probe calls progress. A veiling sets
   * the body back to where it woke, so from that tick on it is *further* from
   * the exit than its own record and cannot be nearer again until it has
   * re-walked everything it lost — which means `stuckFor` climbs and never comes
   * down, and the rest of the budget is spent in the state kept for being
   * trapped: jumping every few ticks, dashing every twenty-one, pressing act
   * every seven. That is plainly the wrong reading of a body that is simply
   * walking back, and it was fixed — the mark reset to where the Scribe woke,
   * which is what a player's own sense of progress does.
   *
   * It measured **worse**: eight stalls of a hundred and sixty against six, and
   * resetting the stuck-counters with it, nine. The panic behaviours are how
   * this probe gets past most of what stops it, and a veiling is the moment it
   * has just been proved to need them. Keeping the record is what keeps them on.
   * So the counter is only watched, never acted on — and this note is here so
   * the same correct-looking fix is not made a third time.
   */
  void world.veilings;

  for (let i = 0; i < ticks && !world.finished; i += 1) {
    const p = world.player;
    // **Progress is distance left to the way out, not distance travelled.** A
    // rung is a floor now and every other row is walked backwards, so a probe
    // that measured progress as "x got bigger" would read half the climb as
    // being stuck and jump the whole way along it.
    const left = aim.left(p);
    // Woken somewhere else: the record of how far it ever got stands, but what
    // counts as getting anywhere starts again from here.
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

    // The nearest klipah ahead and roughly level — what a mark thrown flat
    // will actually meet.
    let nearestHusk: number | undefined;
    for (const husk of world.husks) {
      const dx = (husk.x - p.x) * (towards || 1);
      if (dx < -TILE_SIZE || dx > TILE_SIZE * 9) continue;
      if (Math.abs(husk.y - p.y) > TILE_SIZE * 2) continue;
      if (nearestHusk === undefined || dx < nearestHusk) nearestHusk = dx;
    }

    /**
     * **Set a stone at the lip of a gap**, which is the whole of what Bet is
     * for and the one move this probe could not make.
     *
     * `toggleStone` puts a stone beside the Scribe at the height of their own
     * feet, so the move is: stand at the edge, set, step up onto it, and leap
     * from a tile further out and a tile higher. Every part of that happens on
     * the ground, and the probe never stood on the ground at a lip — it sees a
     * gap and jumps, so the only act it ever pressed was the unsticking rhythm,
     * by which point it was somewhere a stone did no good. Measured on
     * `set-stone`, whose entire content is one gap and one stone: none of six,
     * at every shape the gap was tried in.
     *
     * Once per gap, and only while nothing is set — a second press takes back
     * the stone under your feet, because one stands at a time.
     */
    const wantStoneAt = {
      x: ownX + (towards || p.facing),
      y: Math.floor((p.y + p.h - 1) / TILE_SIZE),
    };
    /** A vine within the body — see `up` below. */
    const onAVine =
      ctx.verbs.includes("climb") &&
      [0, 1].some((up) => tileAt(world, ownX, Math.floor((p.y + p.h - 1) / TILE_SIZE) - up) === Tile.Vine);

    /**
     * A ledge and nothing else underfoot — which is the only place `down` now
     * means "drop through" rather than "duck". Same question `step.ts` asks in
     * `standingOnLedge`, asked here because a probe that presses a key the game
     * will read differently than it meant is a probe measuring its own driving.
     */
    const onALedge = (() => {
      const row = Math.floor((p.y + p.h + 1) / TILE_SIZE);
      let ledge = false;
      for (let tx = Math.floor(p.x / TILE_SIZE); tx <= Math.floor((p.x + p.w - 1) / TILE_SIZE); tx += 1) {
        const here = tileAt(world, tx, row);
        if (here === Tile.Ledge) ledge = true;
        else if (here !== Tile.Empty) return false;
      }
      return ledge;
    })();

    const holdsStone = ctx.verbs.includes("block") && !ctx.verbs.includes("grapple");
    /**
     * A step too tall to jump, seen **a stride before reaching it** — which is
     * the only place a stone can go, since `toggleStone` needs the tile beside
     * you to be empty and walking up to a wall fills it.
     */
    const wallAhead =
      tileAt(world, ownX + towards * 2, wantStoneAt.y) === Tile.Stone &&
      tileAt(world, ownX + towards * 2, wantStoneAt.y - 1) === Tile.Stone;
    /**
     * **Only where a stone helps.** Setting one whenever the probe felt stuck
     * was tried and is worse than doing nothing: on open ground it lays a solid
     * tile at body height directly in its own path, cannot pass it, and cannot
     * take it back — measured, the probe walled itself in five screens short of
     * the wall it was walking towards and stood there for the rest of its
     * budget. A gap at the feet or a step too tall are the two places dry land
     * is worth making.
     */
    const setStone =
      p.onGround &&
      holdsStone &&
      (gapAhead || wallAhead) &&
      // Not "no stone anywhere" — one already standing somewhere behind is
      // taken back by setting this one, which is what a Scribe wants. What must
      // not happen is pressing twice in the same place, because the second
      // press unmakes the step you are about to climb onto.
      !world.placed.some((s) => s.x === wantStoneAt.x && s.y === wantStoneAt.y);

    // Reaching out over nothing — and **once per fall only when the reach is
    // Bet's**, which is the narrowest true statement of it.
    //
    // The Hook wants the key held: it self-limits through `grappleTo` while it
    // is flying, and it wants another cast the moment it has thrown the Scribe
    // at the next ring. Latching *it* was tried in both obvious shapes — once
    // per fall, and reset on a throw — and both crossed `set-stone` and broke
    // `anchor-chain` and `hooked-face`, because a press during the sixteen
    // ticks of `grappleCooldown` does nothing at all and still counts as the
    // one press you were allowed.
    //
    // Bet is the opposite and is the only verb on this key that is: pressing
    // again always does something, and what it does is take back the stone you
    // are standing on. Where a Scribe holds both, `applyVerbs` reaches for the
    // Hook first, so the latch is off exactly when it would be wrong.
    const reaching = !p.onGround && p.vy > 0 && !groundBelow && !p.grappleTo;
    // And **never once a stone already stands**: a second press takes the first
    // one back, so a Scribe who set a stone at the lip and then pressed again
    // on the way down destroyed the thing they were falling towards. Measured
    // on `set-stone`: the lip stone was laid correctly every time, unmade three
    // ticks later, and the probe went into the pit sixty-seven times.
    const reachOnce =
      reaching && (!holdsStone || (!reached_ && world.placed.length === 0));
    reached_ = p.onGround ? false : reached_ || reaching;

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

    // **Except where there is a hole in that ceiling.**
    //
    // The rule above is a proxy for "there is nothing left above me to climb
    // to", and it is wrong in exactly the place it matters most: a wall whose
    // crest lies in a storey's last two rows is the wall a Scribe has to finish
    // climbing in order to get *over* it, and a shaft is a hole in the ceiling
    // put there for precisely that. Measured, on Chesed: the way out of the
    // pocket behind a fourteen-tile face is up the face and through the shaft
    // above it, and the probe climbed to two rows short of the crest and
    // refused — on every lap, until the budget ran out.
    //
    // Scoped to climbing on purpose. The same test applied to *every* use of
    // `underCeiling` was measured too and cost three other rungs: coming down
    // out of a pocket is worth doing whether or not there is stone overhead.
    const headRow = Math.floor(p.y / TILE_SIZE);
    const myColumn = Math.floor((p.x + p.w / 2) / TILE_SIZE);
    let lidded = false;
    for (let up = 1; up <= 3 && !lidded; up += 1) {
      if (tileAt(world, myColumn, headRow - up) === Tile.Stone) lidded = true;
    }
    const noWayUp = underCeiling && lidded;

    // **A climb that is getting somewhere is never exhausted.** The first
    // version of this counted ticks spent on a face, which stopped the futile
    // climbs and also stopped the real ones: the stairwell of a floor is a
    // fourteen-tile sheer face, and a wall-jump gains a tile at a time, so a
    // flat budget of ticks cut the probe off halfway up the one climb that
    // mattered. What is worth giving up on is a climb that is **not gaining
    // height** — so the counter resets on every new high, and only a body
    // scrabbling at the same three tiles ever runs out.
    // **Clinging flickers.** A body sliding down a face loses contact for a
    // tick at a time, and every guard written as "while clinging" simply lets
    // go on those ticks: measured, a probe that had given up on a wall in Keter
    // wall-jumped its way up it anyway, on the off-beat, for the whole budget,
    // twenty pixels of world in twenty thousand ticks. What matters is having
    // been on the wall a moment ago.
    if (p.clinging !== 0) sinceCling = 0;
    else sinceCling += 1;
    const onAWall = sinceCling < 8;

    if (p.onGround) {
      climbing = 0;
      climbTop = p.y;
    } else if (onAWall) {
      if (p.y < climbTop - 1) {
        climbTop = p.y;
        climbing = 0;
      } else climbing += 1;
    }
    // And once a climb has been given up on, **stay** given up on for a while.
    // A body that climbs a face, is refused at the top, falls all the way down
    // and starts again touches the ground on every lap, so a counter that
    // resets there forgets the lesson every time round: measured, two rungs
    // spent their whole budget going up and down a single column beside a wall
    // that is roofed to the ceiling. Getting somewhere clears it early.
    if (climbing > 60) gaveUp = 180;
    else if (gaveUp > 0) gaveUp -= 1;
    if (progressing) gaveUp = 0;
    const climbExhausted = climbing > 60 || gaveUp > 0;
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
    const grounding =
      (stuckFor > 120 && stuckFor % 300 < 90 && underCeiling) ||
      (p.onGround && aim.stranded(p));

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
      !(onAWall && (noWayUp || climbExhausted)) &&
      (gapAhead ||
        letterAhead ||
        // **The second jump, spent on purpose, over a real chasm.** Every other
        // reason to leave the ground is spotted while standing on it, so the
        // Breath was only ever spent by accident — and the widest ground in the
        // game is authored against the Breath *and* the Bridge together:
        // fourteen tiles, which is a jump, a second jump and a dash. Missing
        // the middle one, the probe walked off the lip of Yesod's chasm and
        // fell through it on every lap.
        (!p.onGround && p.airJump && p.vy > 0 && !groundBelow) ||
        // A wall is a way up until it runs out of up. Holding into a face and
        // jumping climbs it — the Fence working exactly as intended — but a
        // storey has a ceiling over it now, and a Scribe who climbs into the
        // corner beneath one will climb straight back into it every time they
        // come down. Measured: twenty thousand ticks oscillating between two
        // columns at the top of a rung. Refusing to climb *at all* once stuck
        // is the wrong cure — a sheer face is the only way across several
        // screens — so it is refused only where there is nothing above.
        (onAWall && !noWayUp && !climbExhausted && aim.above(p)) ||
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
      /**
       * Rise in water, and up vines.
       *
       * **`p.climbing` alone was a circle and the probe never once climbed a
       * vine.** `step` starts a climb on `onVine && (up || down || climbing)`,
       * and this asked for `p.climbing` — which does not become true until the
       * key has been pressed, which did not happen until it was true. Every
       * vine in the game was scenery to this probe, which is why `vine-ascent`
       * came out uncrossable at every shape it was tried in, and it is a little
       * frightening that the route graph's own note — that leaving vines out
       * made a third of the Tree unreachable — was written about the *graph*
       * while the hands could not use one either.
       *
       * So: a vine underfoot and the way on above, and the first press is what
       * begins it.
       */
      up: p.inWater || p.climbing || (onAVine && aim.above(p)),
      // And come *down* when backing off. A storey has a floor over it now, so
      // a Scribe who climbs a wall can end up in a pocket against the ceiling
      // with the way on below — where holding away from the wall only shuffles
      // along the same shelf. Measured: the probe oscillated between two
      // columns at the top of a storey for twenty thousand ticks. A player
      // drops through the ledge; this is that, and no more.
      //
      // **Only on a ledge**, which is new and is the probe agreeing with the
      // game rather than the other way round: down used to mean "drop" on any
      // floor, because ducking was gated behind Tet and a Scribe without it
      // held down to no effect. Ducking is anybody's now, so down on solid
      // stone crouches — and a probe that holds it while walking crosses the
      // rung at forty-five per cent of its speed. Measured, the moment the
      // duck landed: Chochmah stalled at seventy-two per cent on a seed that
      // had always been crossed, and it was this line, not the new tile that
      // shipped alongside it and got the blame first.
      down: (backingOff || grounding) && p.onGround && onALedge,
      // Reach out while falling over nothing — which is when a gap actually
      // needs it. On the ground, act clears a barrier (thorn, door,
      // overgrowth); in the air it is whichever of the reaching letters the
      // Scribe holds.
      //
      // **Once per fall, not every tick of it**, and that distinction is the
      // whole of what Bet needed. The Hook is self-limiting — `grappleTo` is
      // set the moment it catches, and the guard above reads it — so holding
      // the key down cost nothing and nobody noticed. `toggleStone` has no such
      // latch and does not want one: it sets a stone *beside the Scribe at the
      // height of their own feet*, which is exactly the right rule and means a
      // falling body that presses every tick lays a stone, drops past it, lays
      // another one lower, and takes the first back — one stone stands at a
      // time. Measured, the probe rode its own stone to the bottom of every pit
      // on `set-stone` and crossed none of six. A player presses once. This is
      // pressing once.
      // The last clause is the unsticking rhythm, and it is **off for a Scribe
      // whose act is Bet** — pressing act on a beat toggles the stone on and
      // off, so the one thing that would free them is the one thing the rhythm
      // unmakes. `setStone` is their version of it, and it presses once per
      // place rather than once every seven ticks.
      act:
        barrierAhead ||
        reachOnce ||
        setStone ||
        (!holdsStone && p.onGround && stuckFor > 10 && i % 7 === 0),
      // Reach for the Bridge on the way down across a gap — but only over a
      // real gap. Dashing on every descent flings the probe past the very
      // alcoves it just jumped for.
      dash: (!p.onGround && p.vy > 40 && !groundBelow) || (stuckFor > 14 && i % 21 === 0),
      // **The competent Scribe writes.** A room closes behind you while there
      // is something standing in it, so breaking husks is no longer optional
      // colour on the way past — it is part of crossing a rung, and a probe
      // that never struck would now be stopped by the first sealed door.
      strike: !opts?.pacifist && nearestHusk !== undefined && p.markCooldown === 0,
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
describe("walking the regions", () => {
  it("carries a competent Scribe to the exit of every region, on many seeds", { timeout: 60000 }, () => {
    const report: string[] = [];
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      let gathered = 0;
      for (const seed of [3, 91, 555, 12345, 777, 40404]) {
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
        const ctx = contextFor(region);
        const { reached, finished, lettersTaken } = probe(world, ctx, budgetFor(region));
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
    for (let seed = 1; seed <= 12; seed += 1) {
      const rng = makeRng((seed * 7919) >>> 0);
      let at: SefirahId = "malchut";
      const gathered: string[] = [];
      for (let step = 0; step < 10; step += 1) {
        const out = pathsFrom(at);
        const path = out[randomInt(rng, out.length)];
        const held = lettersFrom(gathered);
        const world = buildPath(path, seed, held);
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
        expect(
      crossed,
      `crossed only ${(crossed * 100).toFixed(0)}% of ${walked} paths walked:\n  ${stalled.slice(0, 10).join("\n  ")}`,
    ).toBeGreaterThan(0.85);
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
  const chainFor = (chunk: Chunk): Chunk[] | undefined => {
    const up = CHUNKS.find((c) => c.id === "rise-to-high");
    const down = CHUNKS.find((c) => c.id === "fall-to-ground");
    if (!up || !down) throw new Error("the library lost its way up or down");
    if (chunk.entry === "ground" && chunk.exit === "ground") return [START_CHUNK, chunk, END_CHUNK];
    if (chunk.entry === "high" && chunk.exit === "high") return [START_CHUNK, up, chunk, down, END_CHUNK];
    if (chunk.entry === "ground" && chunk.exit === "high") return [START_CHUNK, chunk, down, END_CHUNK];
    if (chunk.entry === "high" && chunk.exit === "ground") return [START_CHUNK, up, chunk, END_CHUNK];
    // The branching `both` screens are laid in pairs and are covered by the pair.
    return undefined;
  };

  /**
   * A screen on the high road cannot be reached without whatever the lift
   * asks, so it is fair to hold that too — and `rise-to-high` asks for nothing,
   * which is itself part of what is being checked here.
   */
  const declares = (chunk: Chunk): Verb[] => {
    const lift = CHUNKS.filter((c) => c.id === "rise-to-high" || c.id === "fall-to-ground");
    const extra = chunk.entry === "high" || chunk.exit === "high" ? lift.flatMap((c) => c.requires) : [];
    return [...new Set([...chunk.requires, ...extra])];
  };

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
