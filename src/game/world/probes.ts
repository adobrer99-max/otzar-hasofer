import type { Verb } from "../abilities";
import { routeTo, storeysOf } from "./route";
import { tileAt } from "./build";
import { step, type StepContext } from "./step";
import { CHUNK_H } from "./chunks";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Input, type World } from "./types";

/**
 * **The two probes, and why they do not live in a test file.**
 *
 * `steering`, `probe` and `fighter` are the instruments the whole suite
 * measures with: the traversal walk, the fight bands, the economy, the honest
 * climb and the guardian duels all drive one of them. They used to be exported
 * from `traversal.test.ts` and `fight.test.ts`, and every file that imported
 * one imported the other file's *tests* along with it — so `fight.test.ts` ran
 * inside `economy`, `climb` and `guardianFight` as well as itself, four times a
 * suite, and `traversal.test.ts` ran inside all of those again. Widening a
 * sample by one seed cost four seeds of runtime.
 *
 * Nothing about them is a test. They are a pair of hands: given a world and
 * what the Scribe holds, they play it and report what happened. They belong
 * beside the world they play.
 *
 * Not shipped, and nothing has to enforce that — no module the app imports
 * imports this one, so it is absent from the bundle by construction rather
 * than by a flag.
 */
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

export interface Fight {
  reached: number;
  finished: boolean;
  out: boolean;
  lampsLeft: number;
  broken: number;
  standing: number;
  veilings: number;
  ticks: number;
  /**
   * Light actually carried out — motes lifted plus what broke out of the
   * klipot, less the two a veiling costs. Recorded for `economy.test.ts`,
   * which needs to know not what a rung *holds* but what a Scribe leaves with.
   */
  or: number;
}

/**
 * A Scribe who fights back — the traversal probe with three things added.
 *
 * It is deliberately *the same walker*, so any difference between this and the
 * traversal numbers is the fight and nothing else. What it adds:
 *
 * 1. **It writes at what is in front of it**, on a rhythm no faster than the
 *    mark's own cooldown, and only when a husk is within the mark's reach and
 *    roughly at its own height — throwing at something two floors up is how a
 *    bot convinces itself the marks do nothing.
 * 2. **It backs off from something too close.** Not a dodge in any skilled
 *    sense: a hand's worth of retreat when a husk is inside a body's width,
 *    which is the difference between playing and walking into things. Without
 *    it this measures a Scribe standing still and being eaten, which is the
 *    floor rather than the game.
 * 3. **It stops walking into a husk it cannot break.** Some kinds are only
 *    open from a direction; the retreat covers that too.
 *
 * And it steers by the same route the traversal probe does, which it has to:
 * a rung is a floor now, walked along, up and back along, so the plain
 * right-walker this used to be spent every other storey marching away from the
 * way out with the klipot of the upper Tree following it. Measured, the moment
 * the rows came on: eight runs in ten went out in Gevurah, none of it about the
 * fight.
 */
export function fighter(world: World, ctx: StepContext, ticks: number): Fight {
  const aim = steering(world, ctx.verbs);
  let best = aim.left(world.player);
  let mark = best;
  let stuckFor = 0;
  let holdJump = 0;
  let backAway = 0;
  let i = 0;

  for (; i < ticks && !world.finished && !world.out; i += 1) {
    const p = world.player;
    const left = aim.left(p);
    const progressing = left < mark - 0.5;
    stuckFor = progressing ? 0 : stuckFor + 1;
    mark = Math.min(mark, left);
    best = Math.min(best, left);

    const towards = aim.towards(p);
    const aheadX = Math.floor((p.x + p.w / 2) / TILE_SIZE) + towards;
    const footRow = Math.floor((p.y + p.h + 1) / TILE_SIZE);
    const gapAhead =
      p.onGround &&
      tileAt(world, aheadX, footRow) === Tile.Empty &&
      tileAt(world, aheadX, footRow + 1) === Tile.Empty;

    const ownX = Math.floor((p.x + p.w / 2) / TILE_SIZE);
    let groundBelow = false;
    for (let ty = Math.floor((p.y + p.h) / TILE_SIZE) + 1; ty < world.height && !groundBelow; ty += 1) {
      const t = tileAt(world, ownX, ty);
      if (t === Tile.Stone || t === Tile.Ledge) groundBelow = true;
    }

    let barrierAhead = false;
    for (let d = 1; d <= 3 && !barrierAhead; d += 1) {
      for (let up = 0; up <= 2 && !barrierAhead; up += 1) {
        const t = tileAt(world, ownX + d * towards, footRow - up);
        if (t === Tile.Thorn || t === Tile.Growth || t === Tile.Door) barrierAhead = true;
      }
    }

    // The nearest husk ahead and within a mark's reach — with its height, so
    // the throw can be angled. Holding up or down tilts a mark by 0.62, which
    // is what `throwMark` does with it, and a probe that only ever throws flat
    // simply cannot answer what floats: two of the runs that went out had broken
    // *nothing*, because everything that killed them was above the line.
    let nearest: number | undefined;
    let nearestDy = 0;
    for (const husk of world.husks) {
      const dx = (husk.x - p.x) * (towards || 1);
      if (dx < -TILE_SIZE || dx > TILE_SIZE * 9) continue;
      const dy = husk.y - p.y;
      if (Math.abs(dy) > TILE_SIZE * 4) continue;
      if (nearest === undefined || dx < nearest) {
        nearest = dx;
        nearestDy = dy;
      }
    }
    const aimUp = nearest !== undefined && nearestDy < -TILE_SIZE * 0.75;
    const aimDown = nearest !== undefined && nearestDy > TILE_SIZE * 0.75;

    // Give ground, then stand and write. The retreat has a floor as well as a
    // ceiling: a klipah that keeps walking into you re-triggers the retreat
    // every tick, and a probe that only ever retreats backs down the whole
    // region without throwing a single mark. Twelve ticks of giving ground,
    // then at least twelve of standing — which is when the marks go out.
    backAway -= 1;
    if (nearest !== undefined && nearest < p.w * 1.5 && backAway <= -12) backAway = 12;

    const backingOff = backAway > 0 || (stuckFor > 90 && stuckFor % 150 < 45);
    const wantJump =
      !backingOff && (gapAhead || p.clinging !== 0 || (stuckFor > 6 && i % 9 === 0));
    if (wantJump) holdJump = 20;
    else if (holdJump > 0) holdJump -= 1;

    const input: Input = {
      ...NO_INPUT,
      right: backingOff ? towards < 0 : towards > 0,
      left: backingOff ? towards > 0 : towards < 0,
      jump: wantJump,
      jumpHeld: holdJump > 0 || stuckFor > 6,
      up: p.inWater || p.climbing || (aimUp && !backingOff),
      down: aimDown && !backingOff && p.onGround === false,
      act:
        barrierAhead ||
        (!p.onGround && p.vy > 0 && !groundBelow && !p.grappleTo) ||
        (p.onGround && stuckFor > 10 && i % 7 === 0),
      dash: (!p.onGround && p.vy > 40 && !groundBelow) || (stuckFor > 14 && i % 21 === 0),
      // The whole of what this file adds — and note the `!backingOff`. A mark
      // flies the way the body faces, and a retreating body faces the way it
      // is retreating, so a probe that throws while backing off throws every
      // mark *away* from the thing chasing it. It read as the klipot being
      // brutal and the marks being feeble; it was the bot shooting backwards.
      strike: !backingOff && nearest !== undefined && p.markCooldown === 0,
    };

    step(world, input, ctx);
  }

  return {
    reached: aim.fraction(best),
    finished: world.finished,
    out: Boolean(world.out),
    lampsLeft: world.player.lamps,
    broken: world.husksBroken,
    standing: world.husks.length,
    veilings: world.veilings,
    ticks: i,
    or: world.or,
  };
}
