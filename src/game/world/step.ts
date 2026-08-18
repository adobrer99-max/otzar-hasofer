import type { Grace, Verb } from "../abilities";
import { LETTER_ECHOES } from "../tutorial";
import { setTile, tileAt } from "./build";
import { CHUNK_H } from "./chunks";
import { powersFrom, type Effect } from "../items";
import type { Keeping } from "../relics";
import {
  isClimbable,
  isHazard,
  isLedge,
  isSolid,
  isWater,
  Tile,
  TILE_SIZE,
} from "./tiles";
import type { Body, Entity, Husk, Input, Mark, Player, World } from "./types";
import {
  BEND_RATE,
  BEND_TOWARD,
  canBeStruck,
  GOING_OUT,
  THE_OPENING,
  HUSKS,
  isGreat,
  kindForRole,
  MARK_HUNT,
  KNOCKBACK_X,
  KNOCKBACK_Y,
  MARK_COOLDOWN,
  MARK_FALL,
  MARK_HANGS,
  MARK_LIFE,
  MARK_SIZE,
  MARK_SPEED,
  MARK_TURNS,
  markBite,
  markPowers,
  SHARD_LIFE,
  SHARD_SPEED,
  shellsTaken,
  takeHit,
} from "../combat";

/**
 * The simulation. One fixed tick, no wall-clock, no DOM — so a run is
 * reproducible, testable without a browser, and unaffected by frame rate.
 */
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

/** Tuning. These are the numbers the whole game feels like. */
const GRAVITY = 1750;
const MAX_FALL = 760;
const RUN_ACCEL = 2600;
const RUN_MAX = 205;
const GROUND_FRICTION = 2100;
const AIR_FRICTION = 620;
const JUMP_SPEED = 470;
/**
 * How far a plain standing jump lifts the body, in pixels. Derived rather
 * than typed in, so it stays true if the jump is ever retuned — the level
 * tests assert reachability against exactly this.
 */
export const MAX_JUMP_RISE = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
const HIGH_JUMP_SPEED = 545;
/** Cutting the jump short when the key is released — the variable-height jump. */
const JUMP_CUT = 0.45;
const COYOTE_TICKS = 7;
const JUMP_BUFFER_TICKS = 8;
const WALL_SLIDE_SPEED = 96;
/**
 * A wall-jump pushes up hard and away only a little, so a Scribe holding
 * toward the wall re-catches it on the way down and climbs a *single* face.
 * A larger push would demand two facing walls and alternating presses, which
 * is a technique to learn rather than a fence to hold.
 */
const WALL_JUMP_X = 110;
const WALL_JUMP_Y = 445;
const DASH_SPEED = 505;
const DASH_TICKS = 12;
const DASH_COOLDOWN_TICKS = 26;
const CLIMB_SPEED = 118;
const SWIM_ACCEL = 900;
const SWIM_MAX = 130;
const SWIM_RISE = -128;
const WATER_DRAG = 0.86;
const SLOW_FALL_SPEED = 92;
const GRAPPLE_RANGE = 7 * TILE_SIZE;
const GRAPPLE_PULL = 420;
const GRAPPLE_THROW_Y = 300;
const GRAPPLE_THROW_X = 250;
const GRAPPLE_COOLDOWN_TICKS = 16;
const VEIL_TICKS = 48;
/**
 * The last rung below the Abyss — Chesed. Aaron's rod is barred above it, and
 * the number is written here rather than imported because `regions.ts` has no
 * notion of the gulf: what marks it is `overTheAbyss` on the five crossings,
 * which is a fact about paths and not about rungs.
 */
const LAST_BELOW_ABYSS = 7;
const MESSAGE_TICKS = 200;

export interface StepContext {
  verbs: readonly Verb[];
  graces: readonly Grace[];
  /**
   * Verbs already used on this *climb* (the record's `verbUses` keys), so the
   * first-use echo fires once per climb rather than once per rung — a world
   * counts from zero every rung, and without this the letter would introduce
   * itself again on every way in.
   */
  practiced?: readonly Verb[];
  /**
   * The letter the Scribe writes with — the month's ascendant one, so the mark
   * he throws is the mark Sacred Time put in his hand. Defaults to Aleph.
   */
  markGlyph?: string;
  /** Raised when a letter is taken, so the page can show its plate. */
  onLetter?: (letterId: string) => void;
  /** Raised when a fragment of the torn scroll is lifted from its niche. */
  onFragment?: (index: number) => void;
  /** Raised at the porch of an unopened Word-Gate, to ask for an inscription. */
  onWordGate?: () => void;
  onHouse?: (cardId: string) => void;
  /** Raised when a vessel is lifted off its pedestal. */
  onVessel?: (keliId: string) => void;
  /**
   * Raised at a hidden thing in its chamber. Unlike every other pickup this
   * one outlives the climb, so it is *offered* the way a vessel is rather than
   * walked into — see `relics.ts`.
   */
  onRelic?: (relicId: string) => void;
  /**
   * **What the reliquary keeps** — the rules that are not numbers, from the
   * relics carried this climb. Three of them are read in this file and nowhere
   * else: the Shamir's mark that passes stone, Aaron's rod budding a lamp back,
   * and the fire of the altar refusing to go out. See `relics.ts`; the numbers
   * come in through the world (`huskLight`, `veilCost`, the lamps) because they
   * are laid as the world is entered rather than asked every tick.
   */
  keeps?: Keeping;
  /**
   * The vessels the Scribe carries. They change numbers — the mark's bite and
   * reach, the lamps, the light — and never grant a verb, which is the whole
   * line between an object and a letter. See `items.ts`.
   */
  items?: readonly string[];
  /**
   * What the Scribe *is*, from the guardians they have ever broken — the same
   * `Effect` shape a vessel carries, folded by the same `fold`, and separate
   * because it is not carried at all: it cannot be dropped, spent or declined.
   * See `guardians.ts`, where the split is stated — the Seven Encounters
   * change the world, and these change the Scribe.
   */
  boons?: readonly Effect[];
  onFinish?: () => void;
}

const has = (ctx: StepContext, verb: Verb) => ctx.verbs.includes(verb);

/**
 * Count a verb actually *used* — the letters' memory
 * (`AscentRecord.verbUses`). Counted at the moment the world answers, never
 * per tick a state merely holds: a dash is one use when it fires, a vine is
 * one use when the body takes hold of it, a thorn is one use when it parts.
 * Returns true so it can ride a short-circuit chain without changing what
 * the chain means.
 */
function spendVerb(world: World, ctx: StepContext, verb: Verb): boolean {
  const before = world.verbUses[verb] ?? 0;
  world.verbUses[verb] = before + 1;
  // **The first real use, noticed and named** — LETTER_ECHOES' answered beat,
  // fired when the world first honors the verb on this climb: zero uses this
  // rung and none on the record. Observed rather than manufactured; no draw,
  // no ground, one say.
  if (before === 0 && !ctx.practiced?.includes(verb)) {
    say(world, LETTER_ECHOES[verb].answered);
  }
  return true;
}
const grace = (ctx: StepContext, g: Grace) => ctx.graces.includes(g);

// ---------------------------------------------------------------------------
// tile queries
// ---------------------------------------------------------------------------

function solidAt(world: World, ctx: StepContext, tx: number, ty: number, crawling: boolean): boolean {
  const tile = tileAt(world, tx, ty);
  return isSolid(tile, { verbs: ctx.verbs, crawling, revealed: world.revealed });
}

/** Does the body's box overlap any solid tile at this position? */
function collides(world: World, ctx: StepContext, x: number, y: number, w: number, h: number, crawling: boolean): boolean {
  const x0 = Math.floor(x / TILE_SIZE);
  const x1 = Math.floor((x + w - 1) / TILE_SIZE);
  const y0 = Math.floor(y / TILE_SIZE);
  const y1 = Math.floor((y + h - 1) / TILE_SIZE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (solidAt(world, ctx, tx, ty, crawling)) return true;
    }
  }
  return false;
}

/** A ledge stops a falling body only when the body was fully above it. */
function landsOnLedge(world: World, x: number, y: number, w: number, h: number, previousY: number): boolean {
  const feet = y + h;
  const previousFeet = previousY + h;
  const row = Math.floor((feet - 1) / TILE_SIZE);
  if (Math.floor((previousFeet - 1) / TILE_SIZE) >= row) return false;
  const x0 = Math.floor(x / TILE_SIZE);
  const x1 = Math.floor((x + w - 1) / TILE_SIZE);
  for (let tx = x0; tx <= x1; tx += 1) {
    if (isLedge(tileAt(world, tx, row))) return true;
  }
  return false;
}

function anyTile(world: World, body: Player, predicate: (t: Tile) => boolean): boolean {
  const x0 = Math.floor(body.x / TILE_SIZE);
  const x1 = Math.floor((body.x + body.w - 1) / TILE_SIZE);
  const y0 = Math.floor(body.y / TILE_SIZE);
  const y1 = Math.floor((body.y + body.h - 1) / TILE_SIZE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (predicate(tileAt(world, tx, ty))) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// the tick
// ---------------------------------------------------------------------------

export function step(world: World, input: Input, ctx: StepContext): void {
  world.tick += 1;
  if (world.message && world.tick > world.message.until) world.message = undefined;

  const p = world.player;

  // A veiling is not a death. The Scribe is briefly insubstantial, and then
  // wakes at the mark — carrying every letter, having lost only the loose
  // light of the moment.
  if (p.veiled > 0) {
    p.veiled -= 1;
    if (p.veiled === 0) {
      // Where this veiling decided to set them down — the mark, or the fork
      // if they carry the Beginning. Decided at the moment of veiling, since
      // that is when the letters in hand are known.
      const wake = world.wakeAt ?? world.respawn;
      world.wakeAt = undefined;
      p.x = wake.x;
      p.y = wake.y;
      p.vx = 0;
      p.vy = 0;
      p.dash = 0;
      p.grappleTo = undefined;
    }
    return;
  }

  if (p.grappleCooldown > 0) p.grappleCooldown -= 1;
  const wasInWater = p.inWater;
  p.inWater = anyTile(world, p, isWater);
  if (p.inWater && !wasInWater && has(ctx, "swim")) spendVerb(world, ctx, "swim");
  const onVine = has(ctx, "climb") && anyTile(world, p, isClimbable);
  /**
   * **Down does one of two things, and which one is decided by the floor.**
   *
   * Standing on a ledge, down drops you through it — that is what a ledge is
   * for, and it has to keep working. Standing on anything else, down ducks.
   *
   * Read the other way round it was a collision waiting to happen: ducking used
   * to require the Coil, so `down` meant "drop" for most of the alphabet and
   * "crouch, and stop being able to drop through ledges" the moment Tet was
   * found. A letter that quietly takes a movement away is worse than a letter
   * that gives nothing.
   */
  const overLedge = p.onGround && standingOnLedge(world, p);
  p.crouching = input.down && p.onGround && !overLedge;
  p.crawling = p.crouching && grace(ctx, "crawl");

  applyVerbs(world, input, ctx);

  if (p.inWater) {
    swimTick(p, input, ctx);
  } else if (onVine && (input.up || input.down || p.climbing)) {
    if (!p.climbing) spendVerb(world, ctx, "climb");
    climbTick(p, input);
  } else {
    p.climbing = false;
    walkTick(world, p, input, ctx);
  }

  // **Down drops whenever it is not ducking**, which is the original line and
  // is right again for a new reason. Gating the drop on `overLedge` directly
  // looks tidier and breaks on the second tick: the fall starts, `p.onGround`
  // goes false, `overLedge` goes false with it, the drop turns off and the
  // ledge catches the body again — measured, a Scribe holding down bounced
  // between 258.0 and 258.5 forever. Ducking is the thing that knows about the
  // floor; dropping only has to know it is not ducking.
  moveAndCollide(world, ctx, p, input.down && !p.crouching);
  touchTiles(world, ctx);
  touchEntities(world, ctx);
  stepRooms(world);

  // The klipot, and everything in flight. After the body has moved, so a hit
  // is judged against where the Scribe actually ended up.
  if (p.iframes > 0) p.iframes -= 1;
  if (p.markCooldown > 0) p.markCooldown -= 1;
  throwMark(world, input, ctx);
  stepMarks(world, ctx);
  stepHusks(world, ctx);

  // Fallen out of the world entirely.
  if (p.y > world.height * TILE_SIZE + 96) {
    veil(world, ctx, "The dark took the light you carried.");
  }
}

/** Horizontal and vertical movement on land. */
function walkTick(world: World, p: Player, input: Input, ctx: StepContext): void {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) p.facing = dir as 1 | -1;

  if (p.dash > 0) {
    p.dash -= 1;
    p.vx = p.facing * DASH_SPEED;
    p.vy = 0;
    return;
  }
  if (p.dashCooldown > 0) p.dashCooldown -= 1;

  const maxSpeed = p.crouching ? RUN_MAX * 0.45 : RUN_MAX;
  if (dir !== 0) {
    p.vx += dir * RUN_ACCEL * DT;
    p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
  } else {
    const friction = (p.onGround ? GROUND_FRICTION : AIR_FRICTION) * DT;
    p.vx = Math.abs(p.vx) <= friction ? 0 : p.vx - Math.sign(p.vx) * friction;
  }

  // Clinging to a wall: Chet, the fence held rather than resented.
  const wasClinging = p.clinging;
  p.clinging = 0;
  if (!p.onGround && has(ctx, "wall-cling") && p.vy > 0) {
    const towardLeft = input.left && wallBeside(world, ctx, p, -1);
    const towardRight = input.right && wallBeside(world, ctx, p, 1);
    if (towardLeft) p.clinging = -1;
    if (towardRight) p.clinging = 1;
    if (p.clinging !== 0 && wasClinging === 0) spendVerb(world, ctx, "wall-cling");
  }

  if (p.coyote > 0) p.coyote -= 1;
  if (p.jumpBuffer > 0) p.jumpBuffer -= 1;
  if (input.jump) p.jumpBuffer = JUMP_BUFFER_TICKS;

  const jumpSpeed = grace(ctx, "high-jump") ? HIGH_JUMP_SPEED : JUMP_SPEED;

  if (p.jumpBuffer > 0) {
    if (p.onGround || p.coyote > 0) {
      p.vy = -jumpSpeed;
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.airJump = has(ctx, "double-jump");
    } else if (p.clinging !== 0) {
      p.vy = -WALL_JUMP_Y;
      p.vx = -p.clinging * WALL_JUMP_X;
      p.facing = (-p.clinging) as 1 | -1;
      p.clinging = 0;
      p.jumpBuffer = 0;
      p.airJump = has(ctx, "double-jump");
    } else if (p.airJump) {
      p.vy = -jumpSpeed * 0.92;
      p.airJump = false;
      p.jumpBuffer = 0;
      spendVerb(world, ctx, "double-jump");
    }
  }

  // Releasing the key mid-rise cuts the jump short — the whole difference
  // between a jump that answers the hand and one that does not.
  if (!input.jumpHeld && p.vy < 0) p.vy *= 1 - JUMP_CUT * (p.vy < -60 ? 1 : 0);

  if (p.clinging !== 0) {
    p.vy = Math.min(p.vy, WALL_SLIDE_SPEED);
  } else {
    p.vy += GRAVITY * DT;
    const slowFalling = grace(ctx, "slow-fall") && input.jumpHeld && p.vy > 0;
    p.vy = Math.min(p.vy, slowFalling ? SLOW_FALL_SPEED : MAX_FALL);
  }

  if (p.grappleTo) grappleTick(p);
}

function wallBeside(world: World, ctx: StepContext, p: Player, dir: -1 | 1): boolean {
  const probeX = dir < 0 ? p.x - 2 : p.x + p.w + 1;
  const tx = Math.floor(probeX / TILE_SIZE);
  const y0 = Math.floor(p.y / TILE_SIZE);
  const y1 = Math.floor((p.y + p.h - 1) / TILE_SIZE);
  for (let ty = y0; ty <= y1; ty += 1) {
    if (solidAt(world, ctx, tx, ty, false)) return true;
  }
  return false;
}

function swimTick(p: Player, input: Input, ctx: StepContext): void {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) p.facing = dir as 1 | -1;
  const swift = ctx.graces.includes("swift-water") ? 1.45 : 1;

  p.vx += dir * SWIM_ACCEL * DT;
  p.vx = Math.max(-SWIM_MAX * swift, Math.min(SWIM_MAX * swift, p.vx));
  p.vx *= WATER_DRAG;

  if (input.jumpHeld || input.up) p.vy = SWIM_RISE * swift;
  else if (input.down) p.vy = SWIM_MAX * 0.8;
  else p.vy = Math.min(p.vy + GRAVITY * 0.16 * DT, 60);

  p.airJump = ctx.verbs.includes("double-jump");
  p.dash = 0;
  p.clinging = 0;
}

function climbTick(p: Player, input: Input): void {
  p.climbing = true;
  p.vy = (input.up ? -1 : input.down ? 1 : 0) * CLIMB_SPEED;
  p.vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * CLIMB_SPEED * 0.7;
  p.airJump = true;
  if (input.jump) {
    p.climbing = false;
    p.vy = -JUMP_SPEED * 0.9;
  }
}

function grappleTick(p: Player): void {
  if (!p.grappleTo) return;
  const targetX = p.grappleTo.x * TILE_SIZE + TILE_SIZE / 2 - p.w / 2;
  const targetY = p.grappleTo.y * TILE_SIZE + TILE_SIZE / 2 - p.h / 2;
  const dx = targetX - p.x;
  const dy = targetY - p.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 12) {
    // Reaching the ring throws the Scribe on, up and forward, rather than
    // leaving them hanging on it — otherwise the nearest anchor is always the
    // one just reached, and the Hook becomes a pendulum instead of a way
    // across. The throw is what lets anchors be chained.
    p.grappleTo = undefined;
    p.grappleCooldown = GRAPPLE_COOLDOWN_TICKS;
    p.vy = -GRAPPLE_THROW_Y;
    p.vx = p.facing * GRAPPLE_THROW_X;
    return;
  }
  p.vx = (dx / distance) * GRAPPLE_PULL;
  p.vy = (dy / distance) * GRAPPLE_PULL;
}

/** The verbs bound to the act key, resolved in the order they can apply. */
function applyVerbs(world: World, input: Input, ctx: StepContext): void {
  const p = world.player;

  if (input.dash && has(ctx, "dash") && p.dash === 0 && p.dashCooldown === 0 && !p.inWater) {
    p.dash = DASH_TICKS;
    p.dashCooldown = DASH_COOLDOWN_TICKS;
    spendVerb(world, ctx, "dash");
    return;
  }

  if (!input.act) return;

  // The Hook — cast to the nearest anchor within reach, preferring one ahead.
  if (has(ctx, "grapple") && !p.grappleTo && p.grappleCooldown === 0) {
    const anchor = nearestAnchor(world, p);
    if (anchor) {
      p.grappleTo = anchor;
      spendVerb(world, ctx, "grapple");
      say(world, "The hook holds.");
      return;
    }
  }

  // The Edge, the Flame, the Door — each clears the barrier it answers.
  // `spendVerb` returns true, so appending it counts the use without
  // changing what the chain short-circuits on.
  const cleared =
    (has(ctx, "cut") &&
      clearAdjacent(world, p, Tile.Thorn, Tile.Empty, "The thorn parts.") &&
      spendVerb(world, ctx, "cut")) ||
    (has(ctx, "flame") &&
      clearAdjacent(world, p, Tile.Growth, Tile.Empty, "The overgrowth burns back.") &&
      spendVerb(world, ctx, "flame")) ||
    (has(ctx, "open") &&
      clearAdjacent(world, p, Tile.Door, Tile.Empty, "The door opens.") &&
      spendVerb(world, ctx, "open"));
  if (cleared) return;

  // The Eye — the hidden light was never absent, only unseen.
  if (has(ctx, "reveal") && !world.revealed) {
    world.revealed = true;
    spendVerb(world, ctx, "reveal");
    say(world, "Or HaGanuz — the hidden stone stands revealed.");
    return;
  }

  // The House — a stone set beneath you, and taken back by asking again.
  if (has(ctx, "block")) {
    toggleStone(world, ctx);
  }
}

function nearestTile(
  world: World,
  p: Player,
  want: Tile,
  range: number,
  accept?: (tx: number, ty: number) => boolean,
) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const reach = Math.ceil(range / TILE_SIZE);
  const tx0 = Math.floor(cx / TILE_SIZE);
  const ty0 = Math.floor(cy / TILE_SIZE);
  let best: { x: number; y: number } | undefined;
  let bestDistance = Infinity;
  for (let ty = ty0 - reach; ty <= ty0 + reach; ty += 1) {
    for (let tx = tx0 - reach; tx <= tx0 + reach; tx += 1) {
      if (tileAt(world, tx, ty) !== want) continue;
      if (accept && !accept(tx, ty)) continue;
      const distance = Math.hypot(tx * TILE_SIZE + TILE_SIZE / 2 - cx, ty * TILE_SIZE + TILE_SIZE / 2 - cy);
      if (distance <= range && distance < bestDistance) {
        bestDistance = distance;
        best = { x: tx, y: ty };
      }
    }
  }
  return best;
}

/**
 * The ring the Hook reaches for: the nearest one within range that lies ahead
 * of the Scribe, falling back to the nearest of any. Preferring what is ahead
 * is what a hand would do, and it keeps a chain of anchors reading forward.
 */
function nearestAnchor(world: World, p: Player) {
  const centreX = p.x + p.w / 2;
  const ahead = nearestTile(world, p, Tile.Anchor, GRAPPLE_RANGE, (tx) =>
    p.facing > 0 ? tx * TILE_SIZE + TILE_SIZE > centreX : tx * TILE_SIZE < centreX,
  );
  return ahead ?? nearestTile(world, p, Tile.Anchor, GRAPPLE_RANGE);
}

function clearAdjacent(world: World, p: Player, want: Tile, become: Tile, message: string): boolean {
  const found = nearestTile(world, p, want, TILE_SIZE * 2.2);
  if (!found) return false;
  // Clear the whole contiguous column of that barrier, so one stroke opens a
  // way rather than a single tile-sized notch.
  for (let ty = 0; ty < world.height; ty += 1) {
    if (tileAt(world, found.x, ty) === want) setTile(world, found.x, ty, become);
  }
  say(world, message);
  return true;
}

function toggleStone(world: World, ctx: StepContext): void {
  const p = world.player;
  // Beside the Scribe at the height of their own feet — a step to climb, not
  // a tile buried in the ground they are already standing on.
  const tx = Math.floor((p.x + p.w / 2) / TILE_SIZE) + p.facing;
  const ty = Math.floor((p.y + p.h - 1) / TILE_SIZE);

  const existing = world.placed.findIndex((s) => s.x === tx && s.y === ty);
  if (existing !== -1) {
    world.placed.splice(existing, 1);
    setTile(world, tx, ty, Tile.Empty);
    say(world, "The stone is taken back.");
    return;
  }

  if (tileAt(world, tx, ty) !== Tile.Empty) return;
  const limit = ctx.graces.includes("second-stone") ? 2 : 1;
  if (world.placed.length >= limit) {
    const oldest = world.placed.shift();
    if (oldest) setTile(world, oldest.x, oldest.y, Tile.Empty);
  }
  world.placed.push({ x: tx, y: ty });
  setTile(world, tx, ty, Tile.Placed);
  spendVerb(world, ctx, "block");
  say(world, "A stone stands where you set it.");
}

// ---------------------------------------------------------------------------
// movement resolution
// ---------------------------------------------------------------------------

/** Axis-separated sweep — the standard way to keep a tile platformer honest. */
function moveAndCollide(world: World, ctx: StepContext, p: Player, dropping: boolean): void {
  const height = p.crouching ? p.h * 0.55 : p.h;
  const yOffset = p.h - height;

  // --- horizontal ---
  const stepX = p.vx * DT;
  let nextX = p.x + stepX;
  if (collides(world, ctx, nextX, p.y + yOffset, p.w, height, p.crawling)) {
    const dir = Math.sign(stepX);
    // Back off to the tile boundary rather than to the previous position, so
    // a fast body ends flush against the wall instead of a pixel short.
    if (dir > 0) nextX = Math.floor((nextX + p.w) / TILE_SIZE) * TILE_SIZE - p.w - 0.01;
    else nextX = (Math.floor(nextX / TILE_SIZE) + 1) * TILE_SIZE + 0.01;
    if (collides(world, ctx, nextX, p.y + yOffset, p.w, height, p.crawling)) nextX = p.x;
    p.vx = 0;
    if (p.dash > 0) p.dash = 0;
    if (p.grappleTo) p.grappleTo = undefined;
  }
  p.x = Math.max(0, Math.min(world.width * TILE_SIZE - p.w, nextX));

  // --- vertical ---
  const previousY = p.y;
  const stepY = p.vy * DT;
  let nextY = p.y + stepY;
  let landed = false;

  if (collides(world, ctx, p.x, nextY + yOffset, p.w, height, p.crawling)) {
    if (stepY > 0) {
      nextY = Math.floor((nextY + yOffset + height) / TILE_SIZE) * TILE_SIZE - height - yOffset - 0.01;
      landed = true;
    } else {
      nextY = (Math.floor((nextY + yOffset) / TILE_SIZE) + 1) * TILE_SIZE - yOffset + 0.01;
    }
    if (collides(world, ctx, p.x, nextY + yOffset, p.w, height, p.crawling)) nextY = previousY;
    p.vy = 0;
    if (p.grappleTo) p.grappleTo = undefined;
  } else if (stepY > 0 && !dropping && landsOnLedge(world, p.x, nextY, p.w, p.h, previousY)) {
    nextY = Math.floor((nextY + p.h) / TILE_SIZE) * TILE_SIZE - p.h - 0.01;
    p.vy = 0;
    landed = true;
  }

  p.y = nextY;

  const wasOnGround = p.onGround;
  p.onGround = landed || groundedNow(world, ctx, p, dropping);
  if (p.onGround) {
    // Plant the body exactly on the surface. Without this the snap-back from
    // a collision leaves a sub-pixel gap, gravity re-accumulates into it every
    // tick, and the Scribe jitters against the floor forever instead of
    // standing on it.
    if (p.vy >= 0) {
      const row = Math.floor((p.y + p.h + 1) / TILE_SIZE);
      p.y = row * TILE_SIZE - p.h;
      p.vy = 0;
    }
    p.airJump = has(ctx, "double-jump");
    p.coyote = COYOTE_TICKS;
    p.grappleTo = undefined;
  } else if (wasOnGround && p.coyote === 0) {
    p.coyote = COYOTE_TICKS;
  }
}

/** Standing on something: a solid tile — or an undropped ledge — just below. */
function groundedNow(world: World, ctx: StepContext, p: Player, dropping: boolean): boolean {
  const row = Math.floor((p.y + p.h + 1) / TILE_SIZE);
  const x0 = Math.floor(p.x / TILE_SIZE);
  const x1 = Math.floor((p.x + p.w - 1) / TILE_SIZE);
  for (let tx = x0; tx <= x1; tx += 1) {
    if (solidAt(world, ctx, tx, row, p.crawling)) return true;
    if (!dropping && p.vy >= 0 && isLedge(tileAt(world, tx, row))) return true;
  }
  return false;
}

/**
 * Whether what is holding the Scribe up is a ledge and nothing else.
 *
 * A ledge over solid stone is still stone underfoot, and down there should duck
 * rather than fall four inches — so this asks for a ledge with nothing solid
 * beneath the same column.
 */
function standingOnLedge(world: World, p: Player): boolean {
  const row = Math.floor((p.y + p.h + 1) / TILE_SIZE);
  const x0 = Math.floor(p.x / TILE_SIZE);
  const x1 = Math.floor((p.x + p.w - 1) / TILE_SIZE);
  let ledge = false;
  for (let tx = x0; tx <= x1; tx += 1) {
    const here = tileAt(world, tx, row);
    if (isLedge(here)) ledge = true;
    else if (here !== Tile.Empty) return false;
  }
  return ledge;
}

// ---------------------------------------------------------------------------
// contact
// ---------------------------------------------------------------------------

function touchTiles(world: World, ctx: StepContext): void {
  const p = world.player;
  if (anyTile(world, p, isHazard)) {
    veil(world, ctx, "The thorn takes hold.");
    return;
  }
  // Deep water without Mem does not drown the Scribe; it refuses them, and
  // they surface back at the mark having lost only the moment.
  if (p.inWater && !has(ctx, "swim")) {
    veil(world, ctx, "The deep will not carry you yet.");
  }
  breakMaskit(world);
  mendFloor(world);
}

/**
 * **The figured stone gives way.**
 *
 * אֶבֶן מַשְׂכִּית — Vayikra 26:1, a stone set up to be looked at and forbidden to
 * be gone down upon. It is drawn as stone, it is solid as stone, and the moment
 * the Scribe's weight is on it, it is not there and something is coming up out
 * of the place it was.
 *
 * Two rules keep it a trap rather than a punishment. **It only springs under a
 * Scribe who is standing on it**, so a mark thrown at it or a klipah walking
 * over it leaves it alone — this is about weight, and it should be a Scribe's
 * own weight that does it. And **`build.ts` only ever lays one over solid
 * ground**, so what happens is a step down of one tile, never a hole.
 *
 * What comes up is drawn from the rung's own pool, so the kingdom would send
 * Cain and the crown sends what the crown has. Nothing is invented for it.
 */
/**
 * How long the floor stays open. Long enough to fall through and be somewhere
 * else; short enough that the hole is never a feature of the rung.
 */
const MENDS_AFTER = 40;

/**
 * The floor closing over what opened in it.
 *
 * **Never on top of anybody.** A tile that re-solidified around a body would
 * put the Scribe inside stone, which is the same failure `seal` had and is
 * worse here because it happens on ordinary ground. It simply waits: the stone
 * comes back when there is nothing in the way of it, which is also what it
 * would look like.
 */
function mendFloor(world: World): void {
  if (world.mending.length === 0) return;
  const p = world.player;
  world.mending = world.mending.filter((m) => {
    if (world.tick < m.at) return true;
    const x = m.x * TILE_SIZE;
    const y = m.y * TILE_SIZE;
    const inIt = (b: { x: number; y: number; w: number; h: number }) =>
      b.x < x + TILE_SIZE && b.x + b.w > x && b.y < y + TILE_SIZE && b.y + b.h > y;
    if (inIt(p) || world.husks.some((h) => !h.broken && inIt(h))) return true;
    setTile(world, m.x, m.y, Tile.Stone);
    return false;
  });
}

function breakMaskit(world: World): void {
  const p = world.player;
  if (!p.onGround || p.veiled > 0) return;
  const row = Math.floor((p.y + p.h + 1) / TILE_SIZE);
  const x0 = Math.floor(p.x / TILE_SIZE);
  const x1 = Math.floor((p.x + p.w - 1) / TILE_SIZE);
  for (let tx = x0; tx <= x1; tx += 1) {
    if (tileAt(world, tx, row) !== Tile.Maskit) continue;
    setTile(world, tx, row, Tile.Empty);
    // It closes again, as hewn stone and not as itself: the trap is spent, the
    // rung is the rung the route graph proved, and the Scribe keeps the fall.
    world.mending.push({ x: tx, y: row, at: world.tick + MENDS_AFTER });
    /**
     * **A pacer, and it comes up beside you rather than under you.**
     *
     * Measured: with a charger rising in the Scribe's own tile and moving after
     * four tenths of a second, the traps alone took going-out from sixteen runs
     * in a hundred to twenty-three. That is not a trap, it is an ambush at zero
     * range with no answer — a player meets it exactly as the probe does, which
     * is by losing a lamp and learning nothing.
     *
     * So: something that walks rather than runs you down, standing a couple of
     * tiles off, and a full second of coming up before it does anything. The
     * ground still gives way and something still comes out of it; what changes
     * is that there is a moment in which to decide.
     */
    const kind = kindForRole(world.klipot, "pacer", tx);
    if (kind) {
      const spec = HUSKS[kind];
      const away = p.facing * 2 * TILE_SIZE;
      const x = tx * TILE_SIZE + away + (TILE_SIZE - spec.size.w) / 2;
      const y = (row + 1) * TILE_SIZE - spec.size.h;
      world.husks.push({
        id: `maskit-${world.tick}-${tx}`,
        kind,
        x,
        y,
        w: spec.size.w,
        h: spec.size.h,
        vx: 0,
        vy: -180,
        facing: (p.x < x ? -1 : 1) as 1 | -1,
        shells: spec.shells,
        home: { x, y },
        // A second before it does anything, so what happens reads as *this
        // came out of the floor* rather than as being hit by the scenery.
        cooldown: 60,
        charging: 0,
        struck: 0,
      });
      say(world, `${spec.name} was under the stone.`);
    } else {
      say(world, "The stone was never stone.");
    }
    return;
  }
}

/** Which storey of a floor a world-space y falls in. */
function storeyOf(y: number): number {
  return Math.floor(y / (CHUNK_H * TILE_SIZE));
}

// ---------------------------------------------------------------------------
// the rooms
// ---------------------------------------------------------------------------

/**
 * A room closes behind you while there is something standing in it.
 *
 * This is the one lever the tuning pass wanted and could not pull. Measured
 * before rooms existed: **the klipot are optional.** About half of them go
 * unbroken, and a driver that ignores every one still finishes the climb — so
 * the fight was something happening beside the game rather than in it. Sealing
 * makes the room the unit of the fight, and it does so without touching a
 * single number in `combat.ts`.
 *
 * Three rules keep it from ever becoming a lock, and they are the whole reason
 * this is safe to do:
 *
 * 1. **The seal is only ever on while you are inside.** Leaving lifts it, so
 *    it can never shut a Scribe *out* of anywhere.
 * 2. **A veiling lifts it too** — you wake at your mark, and the room is open
 *    again behind you. A fight you cannot win costs ground, never the run.
 * 3. **The way in and the way out never seal**, so a rung can always be
 *    entered and always be left.
 */
function stepRooms(world: World): void {
  if (world.rooms.length === 0) return;
  const p = world.player;
  const cx = (p.x + p.w / 2) / TILE_SIZE;
  const cy = (p.y + p.h / 2) / TILE_SIZE;

  const now = world.rooms.findIndex(
    (r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h,
  );
  if (now === -1) return;

  if (now !== world.roomIndex) {
    unseal(world, world.rooms[world.roomIndex]);
    world.roomIndex = now;
  }

  const room = world.rooms[now];
  // **A door is held by what stands in the way of it, and nothing else.**
  //
  // A klipah on the room's own floor is always in the path of a mark thrown
  // flat, so a door it holds is clearable by construction. One that drifts, or
  // spits from a shelf, may be somewhere a flat mark never reaches — so those
  // are in the room and are simply not what the door is waiting on. A door
  // held shut by something unreachable is the one thing sealing must never be,
  // and requiring *every* husk to be a standing one made the seal so rare it
  // barely fired: five runs in eighteen were held, and the klipot went on
  // being optional.
  const holding = world.husks.filter(
    (h) =>
      room.husks.includes(h.id) &&
      !h.broken &&
      // **An arena shuts on whatever is in it.** The rule below is about a rung,
      // where a door held by something that may be in a far corner and is not
      // coming would be a door nobody can open. A guardian's room holds one
      // creature and nothing else, and it is coming.
      (Boolean(world.arena) ||
      // A door waits only on a klipah that will actually **come to you**: the
      // ones that commit to a charge, and the ones on foot that notice you at
      // all. Cain paces its ledge and has never looked up, and Athaliah is off
      // chasing the loose light — a door held shut by one of those is a door
      // held shut by something that may be on the far side of the room and is
      // not coming, which is the one thing sealing must never be.
        HUSKS[h.kind].role === "charger" ||
        (HUSKS[h.kind].role === "pacer" && Number.isFinite(HUSKS[h.kind].notices))),
  );
  const standing = holding.length > 0;

  // **Whether this room has closed behind the Scribe**, worked out once and
  // used twice: to write the seal, and — by `strikeHusk`, which asks the world
  // rather than re-deriving it — to know whether a shell is breaking inside
  // one. The Second Encounter pays double for exactly that, and the two
  // conditions drifting apart would make it pay double somewhere else.
  //
  // Not in the kingdom. Malchut is where the walk, the leap and the mark are
  // taught, and a room that closes on a Scribe who has not yet been told which
  // key writes is a locked door with the lesson on the other side of it.
  const closes =
    standing &&
    // ...except in an arena, where the kingdom's exemption does not apply: a
    // Scribe who has walked into a guardian's room has already been taught
    // everything the porch teaches, and the room is the whole of the thing.
    (Boolean(world.arena) || world.regionIndex > 1) &&
    !room.cleared &&
    !room.entrance &&
    room.kind !== "exit" &&
    room.kind !== "vessel" &&
    // ...and not the relic chamber, for the vessel's reason sharpened. Both
    // rooms hold an *offer* rather than a fight, and a door that shuts on a
    // Scribe reaching for something they are free to decline is a trap. The
    // chamber has the stronger claim of the two: its ground lane runs clear the
    // whole width precisely so that a Scribe with no Ayin and no interest walks
    // past it, and a seal writes stone across that lane.
    room.kind !== "relic" &&
    /**
     * **...and not a gate, which is the same argument again and is now load
     * bearing.** A gate's chamber is a walled box behind a barrier, and a den
     * (`word-gate-den`) stands klipot inside it deliberately. Without this the
     * room would seal the moment a Scribe walked into *any part of it* — the
     * ground lane included — held shut by creatures on the far side of a
     * barrier they may not have answered yet. The one screen in the game whose
     * whole promise is that it can be refused would become the one that shuts
     * you in.
     *
     * The den does not need sealing to ask for a fight, which is the point of
     * putting it there: it is a box with the light at the back and three things
     * in the way, entered on purpose through a door you had to know a word to
     * open. The geometry is the demand. Nothing has to close.
     *
     * It was not free before the den, either — measured over 440 builds, three
     * chambers already had a klipah scattered into them by luck, and none of
     * the three happened to be a kind that can hold a door.
     */
    room.kind !== "gate";
  world.inSealedRoom = closes;

  if (!standing) {
    if (!room.cleared) {
      room.cleared = true;
      if (unseal(world, room)) say(world, "The room is quiet. The way opens.");
    }
    return;
  }

  if (!closes) return;
  if (seal(world, room)) say(world, "The way closes. Something here is still holding light.");
}

function seal(world: World, room: World["rooms"][number]): boolean {
  const p = world.player;
  /**
   * **Never on top of the Scribe.**
   *
   * A door closes on the tick the room decides it should, and the tick a room
   * decides is the tick the Scribe crossed into it — so the tile the door is
   * written on is very often the tile the Scribe is still standing in. Turned
   * solid underneath him, `moveAndCollide` ejects him the way he came, the room
   * he has just left is no longer the room he is in, and the whole thing starts
   * again: a Scribe pinned on the threshold of a room he can see into.
   *
   * It went unnoticed for as long as a sealing room was a room with klipot
   * scattered somewhere in it, because a door held by something across the room
   * is a door that shuts a moment later, with the Scribe well clear. A
   * guardian's room shuts on whatever is in it and shuts *at once*, and it made
   * the arena unenterable — which is the ordinary way a latent bug is found:
   * something new asks the old code the same question harder.
   *
   * Skipped rather than forced, so the door closes on the next tick instead.
   */
  const standingIn = (tx: number, ty: number) =>
    p.x < (tx + 1) * TILE_SIZE &&
    p.x + p.w > tx * TILE_SIZE &&
    p.y < (ty + 1) * TILE_SIZE &&
    p.y + p.h > ty * TILE_SIZE;

  let closed = false;
  for (const door of room.doors) {
    for (const tile of door.tiles) {
      if (tileAt(world, tile.x, tile.y) !== Tile.Empty) continue;
      if (standingIn(tile.x, tile.y)) continue;
      setTile(world, tile.x, tile.y, Tile.Seal);
      closed = true;
    }
  }
  return closed;
}

function unseal(world: World, room: World["rooms"][number] | undefined): boolean {
  if (!room) return false;
  let opened = false;
  for (const door of room.doors) {
    for (const tile of door.tiles) {
      if (tileAt(world, tile.x, tile.y) !== Tile.Seal) continue;
      setTile(world, tile.x, tile.y, Tile.Empty);
      opened = true;
    }
  }
  return opened;
}

function touchEntities(world: World, ctx: StepContext): void {
  const p = world.player;
  const pull = ctx.graces.includes("draw-motes") ? TILE_SIZE * 3 : 0;

  for (const e of world.entities) {
    if (e.taken) continue;
    // The way out of a region is a doorway, not a doorknob: it reaches the
    // full height of the screen, so a Scribe arriving fast and high — thrown
    // by the Hook, carried by the Bridge — cannot sail over the end of the
    // region and be left running at the wall beyond it.
    const near =
      e.kind === "exit"
        ? p.x < e.x + TILE_SIZE &&
          p.x + p.w > e.x &&
          // ...the full height of *its own screen*, which is not the same as
          // the full height of the world once a rung has storeys. Read as the
          // world's height it made the way out a column running through every
          // floor: a walk along the bottom row ended the rung the moment it
          // passed under an exit two storeys up. It crossed twenty-six of
          // forty-two regions that way before the floors were even climbable.
          storeyOf(p.y + p.h - 1) === storeyOf(e.y)
        : overlaps(p, e, e.kind === "mote" ? pull : 0);

    /**
     * **The floor of the chamber that was never one.**
     *
     * Ends the rung exactly as the last lamp does — `world.out`, and the page
     * does the rest through `afterFalling`: the light in hand goes out and the
     * Scribe wakes at the highest Sefirah still lit. Nothing new is invented,
     * which is the whole of why this is fair: the prologue's fifth page taught
     * this rule before the first rung, and a trap with a rule of its own would
     * be a cheat rather than a fall.
     *
     * Taken before anything else in the loop, so a mote sharing the tile cannot
     * be collected on the way down; and `taken` is set so it fires once.
     */
    if (e.kind === "opening" && overlaps(p, e, 0)) {
      e.taken = true;
      world.out = true;
      say(world, THE_OPENING);
      return;
    }

    // The Word-Gate's porch is a place you *stand* — so it must be triggered
    // on arriving, not on every tick you remain there. Level-triggering it
    // reopens the panel the instant it is dismissed, and there is no way back
    // out of the porch at all. `active` here means "currently standing in it".
    if (e.kind === "word-gate") {
      if (!near) {
        e.active = false;
      } else if (!e.active) {
        e.active = true;
        if (!world.wordGateOpen) ctx.onWordGate?.();
      }
      continue;
    }

    /**
     * A pedestal **offers**. Walking into a vessel used to take it, which made
     * the pool a set of numbers handed out along the way rather than a set of
     * decisions — and it meant no vessel could ever cost anything, because a
     * cost you cannot decline is not a bargain, it is a tax.
     *
     * Level-triggered the way the Word-Gate's porch is, and for the same
     * reason: `active` means "standing at it". Declining closes the plate, and
     * the plate would go straight back up on the next tick if the offer fired
     * off the touching rather than off the arriving. Stepping away clears it,
     * so a declined vessel is offered again to a Scribe who comes back — which
     * is what makes leaving it "not yet" rather than "never".
     *
     * `taken` is now set by the page, when the Scribe says yes.
     */
    if (e.kind === "vessel") {
      if (!near) {
        e.active = false;
      } else if (!e.active) {
        e.active = true;
        if (e.ref) ctx.onVessel?.(e.ref);
      }
      continue;
    }

    /**
     * A hidden thing, offered on the same terms and for a stronger reason: a
     * relic is kept past the seal, so taking one is the only decision in a
     * climb whose consequence is not spent by the end of it. Level-triggered
     * exactly as the pedestal is — `active` means "standing at it" — so
     * stepping away and coming back offers it again.
     *
     * `taken` is set by the page, when the Scribe says yes.
     */
    if (e.kind === "relic") {
      if (!near) {
        e.active = false;
      } else if (!e.active) {
        e.active = true;
        if (e.ref) ctx.onRelic?.(e.ref);
      }
      continue;
    }

    if (!near) continue;

    switch (e.kind) {
      case "mote":
        e.taken = true;
        world.or += world.orPerMote;
        world.orGathered += world.orPerMote;
        break;
      case "letter":
        e.taken = true;
        if (e.ref) ctx.onLetter?.(e.ref);
        break;
      case "fork":
        // Passing the divide. Recorded whether or not the Scribe carries Resh
        // — the letter decides what is *done* with it, not whether the world
        // notices where the road parted.
        if (!e.active) {
          e.active = true;
          world.fork = { x: e.x, y: e.y - 6 };
        }
        break;
      case "mark":
        // **The Mark is asked for.** Tav grants the `mark` verb and for the
        // whole life of this file nothing ever checked it — the shrine set a
        // respawn for anybody who walked into it, which made Tav the one
        // letter in the alphabet that did nothing at all. It is asked for
        // here, and the shrines start at Yesod so that every one of them is
        // met by a Scribe who already found Tav in the kingdom below.
        if (!e.active && has(ctx, "mark")) {
          e.active = true;
          world.marksSet += 1;
          spendVerb(world, ctx, "mark");
          world.respawn = { x: e.x, y: e.y - 6 };
          say(world, "Your mark is set here.");
        } else if (!e.active) {
          say(world, "A shrine, and nothing to set on it. The Mark is not yet yours.");
        }
        break;
      case "fragment":
        e.taken = true;
        if (e.ref) ctx.onFragment?.(Number(e.ref));
        break;
      case "house":
        if (e.ref && ctx.graces.includes("speech")) {
          e.taken = true;
          ctx.onHouse?.(e.ref);
        } else if (!e.taken) {
          // Without the Mouth the figure cannot answer — and saying so is the
          // whole reason to go looking for the torn scroll. Not marked taken:
          // come back with Peh and they will speak.
          say(world, "The figure inclines their head and says nothing. The Mouth is not yet yours.");
        }
        break;
      case "exit":
        if (!world.finished) {
          world.finished = true;
          ctx.onFinish?.();
        }
        break;
      default:
        break;
    }
  }
}

function overlaps(p: Player, e: Entity, slack: number): boolean {
  return (
    p.x < e.x + TILE_SIZE + slack &&
    p.x + p.w > e.x - slack &&
    p.y < e.y + TILE_SIZE + slack &&
    p.y + p.h > e.y - slack
  );
}

/**
 * Opens a Word-Gate's chamber: the whole barrier is dissolved, not one tile
 * of it, so the way in is a way in rather than a notch. Idempotent.
 */
export function openWordGate(world: World, message: string): void {
  if (world.wordGateOpen) return;
  world.wordGateOpen = true;
  for (let ty = 0; ty < world.height; ty += 1) {
    for (let tx = 0; tx < world.width; tx += 1) {
      if (tileAt(world, tx, ty) === Tile.WordGate) setTile(world, tx, ty, Tile.Empty);
    }
  }
  say(world, message);
}

/**
 * A veiling, and the one thing Resh does.
 *
 * The Beginning — Resh, the head — sets the Scribe down at the last fork they
 * passed rather than back at their mark, whenever the fork is the further of
 * the two. Which is to say: fail the upper road of a branch and you are
 * returned to where it parted from the lower one, with the choice in front of
 * you again, instead of losing every screen between here and the shrine.
 *
 * This is the letter's first job. It was granted from the beginning and did
 * nothing at all — its own plate promised a return that no code performed —
 * and it needed something to return *to*, which is what branches are.
 */
function veil(world: World, ctx: StepContext, message: string): void {
  if (world.player.veiled > 0) return;
  world.player.veiled = VEIL_TICKS;
  world.veilings += 1;
  // **The Case — nothing in it is lost.** A veiling still costs the time and
  // the ground, which is what a veiling is for; what it stops costing is the
  // light already gathered. The one vessel that answers the only price the
  // terrain is allowed to charge.
  if (!powersFrom(ctx.items ?? [], ctx.boons, ctx.keeps).keeps) {
    world.or = Math.max(0, world.or - world.veilCost);
  }

  // A veiling always opens the room. You wake at the mark, which is elsewhere,
  // and a room that stayed shut behind you would be a door nobody could ever
  // open again — the one way a sealed fight could become a lock.
  unseal(world, world.rooms[world.roomIndex]);

  const fork = world.fork;
  const returns = grace(ctx, "return") && fork && fork.x > world.respawn.x;
  world.wakeAt = returns ? { ...fork } : { ...world.respawn };
  say(world, `${message} You wake at ${returns ? "the fork" : "your mark"}.`);
}

/**
 * The world's own voice — one line, for a few seconds, over the ground it is
 * about.
 *
 * Exported because `GamePage` has one thing to say into a running world: that a
 * vow has been taken. Everything else it has to say waits for a plate, but a
 * vow starts binding the moment the guest is answered and the plate closes on
 * the same frame, so there is nowhere else for it to go.
 */
export function say(world: World, text: string): void {
  world.message = { text, until: world.tick + MESSAGE_TICKS };
}

// ---------------------------------------------------------------------------
// the klipot
// ---------------------------------------------------------------------------

/** Two bodies touching. The `overlaps` above is for entities, which are tiles. */
const bodiesTouch = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * The Scribe writes, and the letter flies.
 *
 * Thrown the way he faces, angled by holding up or down — which is the whole
 * reason it wanted a key of its own rather than a seventh job on the act key.
 * What the letters do to it lives in `combat.ts`; this only launches it.
 */
function throwMark(world: World, input: Input, ctx: StepContext): void {
  const p = world.player;
  if (!input.strike || p.markCooldown > 0 || p.veiled > 0) return;
  const powers = markPowers(ctx.verbs, ctx.graces, ctx.items, ctx.boons, ctx.keeps);
  const up = input.up ? -0.62 : input.down ? 0.62 : 0;
  const speed = MARK_SPEED * (powers.speed ?? 1);
  world.marks.push({
    id: `m${world.tick}`,
    mine: true,
    x: p.x + p.w / 2 - MARK_SIZE / 2,
    y: p.y + p.h / 2 - MARK_SIZE / 2,
    w: MARK_SIZE,
    h: MARK_SIZE,
    vx: p.facing * speed * (up === 0 ? 1 : 0.8),
    vy: up * speed,
    life: powers.reach,
    pierces: powers.pierces,
    bite: markBite(powers),
    draws: powers.draws,
    hunts: powers.homing ? MARK_HUNT : 0,
    turns: powers.bounces ? MARK_TURNS : 0,
    splits: powers.splits,
    arcs: powers.arcs,
    hangs: powers.lingers ? MARK_HANGS : undefined,
    returns: powers.returns,
    glyph: ctx.markGlyph ?? "א",
  });
  p.markCooldown = Math.max(4, Math.round(MARK_COOLDOWN * (powers.cooldown ?? 1)));
}

/**
 * One tick of turning toward something, at the rate hers was measured at.
 *
 * `toward` is the speed the bend steers *to*, and it is not the same number on
 * both sides. Hers pulls toward a 200-long velocity, which is what she was
 * tuned with. His marks fly at more than twice that, so steering them toward
 * 200 would brake them to a crawl and call it homing — measured, the hunting
 * mark ended up **further** from its shell than a flat throw, because it lost
 * the ground it would have covered. His bend therefore steers to whatever
 * speed the mark already has: it changes the direction and nothing else.
 */
function bend(m: Mark, at: Body, toward: number): void {
  const dx = at.x + at.w / 2 - (m.x + m.w / 2);
  const dy = at.y + at.h / 2 - (m.y + m.h / 2);
  const away = Math.hypot(dx, dy) || 1;
  m.vx += ((dx / away) * toward - m.vx) * BEND_RATE;
  m.vy += ((dy / away) * toward - m.vy) * BEND_RATE;
}

/**
 * The nearest shell a hunting mark could actually break — not the nearest
 * body. A mark that bent toward a husk standing in unrevealed stone would
 * spend its whole flight aiming at something it cannot touch.
 */
function nearestHusk(world: World, ctx: StepContext, m: Mark): Husk | undefined {
  let best: Husk | undefined;
  let bestAt = Infinity;
  for (const husk of world.husks) {
    if (husk.broken || outOfReach(husk, world)) continue;
    if (!canBeStruck(hiddenAt(world, husk), ctx.verbs)) continue;
    const at = Math.hypot(husk.x - m.x, husk.y - m.y);
    if (at < bestAt) {
      bestAt = at;
      best = husk;
    }
  }
  return best;
}

/** What comes out of a broken shell: two shards, up and away on both sides. */
function splitOf(m: Mark): Mark[] {
  return [-1, 1].map((side, i) => ({
    ...m,
    id: `${m.id}s${i}`,
    vx: side * SHARD_SPEED * 0.7,
    vy: -SHARD_SPEED * 0.7,
    life: SHARD_LIFE,
    // A shard is what is left of the mark, not another one of it: it does not
    // split, it does not hunt, and it does not bounce, or one throw into a
    // sealed room would clear the room.
    splits: false,
    hunts: 0,
    turns: 0,
  }));
}

function stepMarks(world: World, ctx: StepContext): void {
  const p = world.player;
  // Splitting pushes new marks into the world, and pushing into an array being
  // iterated is how a shard ends up stepped on the tick it was born and how a
  // split of a split becomes possible. Buffer, and join at the end.
  const shards: Mark[] = [];
  const stone = (x: number, y: number) =>
    isSolid(tileAt(world, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)), {
      verbs: ctx.verbs,
      crawling: false,
      revealed: world.revealed,
    });

  for (const m of world.marks) {
    /**
     * **The Scoring's line, which is a stroke and not a mark.** A spent mark
     * that hangs keeps its bite and loses everything else: it does not move, it
     * does not fall, it does not turn or bend or split. So the branch is here
     * at the top rather than folded into the flight below — a hanging line is
     * not a slow mark, it is a different thing that happens to still hurt.
     */
    if (m.hangs !== undefined && m.hangs > 0 && m.life <= 1) {
      m.hangs -= 1;
      m.life = m.hangs > 0 ? 2 : 0;
      m.vx = 0;
      m.vy = 0;
      continue;
    }
    // Weight, if it has any. Applied before the move so the fall and the
    // tile test agree about where the mark is.
    if (m.arcs) m.vy += GRAVITY * MARK_FALL * DT;
    const wasX = m.x;
    const wasY = m.y;
    m.x += m.vx * DT;
    m.y += m.vy * DT;
    m.life -= 1;

    /**
     * **The Pointer, taken up again.** At the end of its flight the mark turns
     * once and comes back along the line it went out on, striking whatever it
     * passed and missed. Once only — `turned` — because a mark that came back
     * forever is a mark that never has to be aimed, and aiming is the whole of
     * what the strike key is for.
     */
    if (m.returns && !m.turned && m.life <= 1) {
      m.turned = true;
      m.vx = -m.vx;
      m.vy = -m.vy;
      m.life = MARK_LIFE;
    }

    // Stone stops a mark. So does the edge of the world.
    //
    // **Unless the Scribe carries the Shamir**, in which case his own do not
    // stop: no iron was lifted over the stones of the house because this went
    // through them instead. A klipah's marks are unaffected, which is the whole
    // of what `m.mine` is doing here — the stone is still a wall to the dark.
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    if (stone(cx, cy) && !(m.mine && ctx.keeps?.cuts)) {
      if (!m.turns) {
        // A line that was going to hang hangs where the stone stopped it,
        // which is the one place a scribe would actually rule one.
        if (m.hangs !== undefined && m.hangs > 0) {
          m.x = wasX;
          m.y = wasY;
          m.life = 2;
        } else m.life = 0;
        continue;
      }
      // Which way it hit. Test the two components apart, or a mark that
      // catches a corner flips both and comes home along its own path.
      const hitX = stone(cx, wasY + m.h / 2);
      const hitY = stone(wasX + m.w / 2, cy);
      if (hitX) m.vx = -m.vx;
      if (hitY) m.vy = -m.vy;
      // A corner that is solid only diagonally turns the mark back the way it
      // came, because there is no face to choose between.
      if (!hitX && !hitY) {
        m.vx = -m.vx;
        m.vy = -m.vy;
      }
      m.x = wasX;
      m.y = wasY;
      m.turns -= 1;
    }

    // Jezebel's marks bend after the Scribe rather than flying flat — she
    // never had to be near anything she did.
    //
    // Gently, and only at the start of the flight. A mark that turns hard
    // enough never misses, and a projectile that cannot be dodged is not a
    // fight but a tax: hers accounted for more lamps than the other nine
    // klipot together. It bends once, early, and then it is committed —
    // which is also what throwing something at somebody is like.
    if (m.seeks && !m.mine && m.life > 95) {
      bend(m, p, BEND_TOWARD);
    }

    // The Scribe's side of the same thing, lent by a vessel rather than owned
    // by a klipah, and aimed at the nearest shell it could actually break. Its
    // window is a count of its own rather than a threshold on `life`, because
    // a mark of his lives a third as long as one of hers and would otherwise
    // never reach the condition at all.
    if (m.mine && m.hunts) {
      const husk = nearestHusk(world, ctx, m);
      if (husk) bend(m, husk, Math.hypot(m.vx, m.vy));
      m.hunts -= 1;
    }

    if (m.mine) {
      for (const husk of world.husks) {
        if (husk.broken || outOfReach(husk, world) || !bodiesTouch(m, husk)) continue;
        if (!canBeStruck(hiddenAt(world, husk), ctx.verbs)) continue;
        // **Once each.** See `Mark.through` — a mark that pierces is not
        // consumed, and without this it went on biting the same body every tick
        // it was inside it, which is five hits from one letter and was the whole
        // of why nearly the entire bestiary died to a single mark.
        if (m.through?.includes(husk.id)) continue;
        strikeHusk(world, husk, m.bite, m.draws ? -1 : 1, m.x);
        // What is broken throws two shards out of it, up and away on both
        // sides — coverage rather than a second throw, which is why they are
        // short-lived and never split again.
        if (m.splits) shards.push(...splitOf(m));
        if (m.pierces) (m.through ??= []).push(husk.id);
        else m.life = 0;
        break;
      }
    } else if (p.veiled === 0 && bodiesTouch(m, p)) {
      m.life = 0;
      wound(world, ctx, m.x < p.x ? 1 : -1);
    }
  }
  if (shards.length > 0) world.marks.push(...shards);
  world.marks = world.marks.filter((m) => m.life > 0);
}

/** Whether a husk is standing in stone the Eye has not yet opened. */
function hiddenAt(world: World, husk: Husk): boolean {
  if (world.revealed) return false;
  const tx = Math.floor((husk.x + husk.w / 2) / TILE_SIZE);
  const ty = Math.floor((husk.y + husk.h / 2) / TILE_SIZE);
  return tileAt(world, tx, ty) === Tile.Veiled;
}

/** Whether a body is standing in water. */
const inWaterAt = (world: World, x: number, y: number) =>
  isWater(tileAt(world, tile(x), tile(y)));
const inWater = (world: World, body: Husk) =>
  inWaterAt(world, body.x + body.w / 2, body.y + body.h / 2);

/**
 * **Inside the wall**, which is the Nachash's own and nobody else's.
 *
 * `Tile.Stone` and `Tile.Placed` and nothing else: a wall is what a wall is
 * made of. **Not `Tile.Veiled`**, which unrevealed is empty air rather than
 * stone — the P9d correction — so a serpent drifting through an unlit chamber
 * is in the open and answerable, which is true of the room a player is looking
 * at. Not a ledge either; a ledge is a floor and this creature is not under it.
 *
 * Asked of the body's centre, exactly as the water is, so the two conditions in
 * this file that are about *a place* are asked the same way.
 */
const inStone = (world: World, body: Husk) => {
  const at = tileAt(world, tile(body.x + body.w / 2), tile(body.y + body.h / 2));
  return at === Tile.Stone || at === Tile.Placed;
};

/**
 * **Whether a great one can be marked at all.**
 *
 * Everything else in this game opens to a mark thrown at it, and that is the
 * one thing the three from the fifth day do not do. Each is opened by a
 * condition rather than by a number, and the condition is what the letter
 * arranges — so the letter is the answer to the fight rather than a modifier
 * on it, which is what the whole game claims about the alphabet and had never
 * once been true of a fight.
 *
 * Nothing here reads the Scribe's letters. It reads the *world*, and Vav and
 * Bet are how the world gets that way — which is the difference between a
 * puzzle and a permission check, and it is why the Hook still moves Leviathan
 * on a strike that takes no shell off it.
 *
 * The Ziz is not here on purpose. Its condition is distance, and distance is
 * already a number the game keeps: `markPowers` gives the Staff sixteen more
 * ticks of mark life and nothing else in the game throws that far. A rule
 * saying so would be the same rule written twice and free to drift.
 *
 * **It switches on `HuskSpec.opening` rather than on `kind`, and that is the
 * whole of what P14b changes.** As a switch over creatures it read as two
 * bespoke cases under a `default: true` — which is to say eighteen kinds were
 * open at every moment of their lives *by omission*, and nothing anywhere said
 * so. As a switch over openings the table states it, two creatures that open
 * the same way share one line, and adding a member to `Opening` is a compile
 * error here, at the one place that has to answer for it.
 *
 * No condition has yet been added and none is removed: the two that existed are
 * the two that exist, expressed once instead of twice. Every band is green
 * because there is nothing for a band to notice.
 */
export function opened(world: World, husk: Husk): boolean {
  switch (HUSKS[husk.kind].opening) {
    // Out of the water, and only out of it. The Hook is what puts it there.
    case "landed":
      return !inWater(world, husk);
    // Stopped, and only a set stone stops it — `cooldown` is what a placed
    // stone leaves on it, which is the one thing in the game that stops it.
    case "stopped":
      return husk.cooldown > 0;
    // The charge is the thing it committed to, and `charging` counts it down.
    // A wall zeroes it early and leaves seventy ticks of standing stunned; the
    // count running out zeroes it late. Either way, what is answerable is the
    // creature that has finished, which is the fight its own line describes.
    case "spent":
      return husk.charging === 0;
    case "always":
      return true;
  }
}

/**
 * A blow lands on a klipah. Exported for the bench, which has to be able to
 * hit the one that does nothing until it is hit — there is no other way to
 * measure the Calf, and a creature no instrument can pose is a creature that
 * silently stops working.
 */
export function strikeHusk(
  world: World,
  husk: Husk,
  bite: number,
  push: number,
  from: number,
): void {
  // A great one still *moves* when it is struck unopened — which is not a
  // consolation, it is the mechanism: drawing Leviathan is a hit that takes no
  // shell and pulls it landward, and there is no other way out of the water.
  if (!opened(world, husk)) {
    // Long enough for the pull to actually carry it: `stepHusks` yields to
    // `struck` on the ones a pull is the answer to, and four ticks of that was
    // four ticks of steering winning the argument on the fifth.
    husk.struck = 12;
    // **And only a pull moves it.** A push against something that size is a
    // push against something that size — which is the verse, and it is also
    // the only thing that made the rule hold: with an ordinary shove counting,
    // a Scribe with no Hook simply drove Leviathan across the pool and onto
    // the far bank, and it broke in nine hundred ticks like anything else.
    if (push < 0) husk.vx += push * (husk.x < from ? -1 : 1) * 90;
    return;
  }
  /**
   * **Nothing comes apart at the first word.**
   *
   * Reported from play, twice, and the second time with the case: *the monsters
   * that hold the gate are still way too easy to kill — Saraf got one shot.* It
   * did. A Scribe holding Shin throws at `bite` two, and nine of the twenty
   * kinds carry two shells or fewer — so half the bestiary died to a single
   * press, with no exchange and nothing to react to.
   *
   * The rule is stated where it belongs, on the blow rather than on the
   * table: a klipah at its full number of shells is never taken to nothing by
   * one mark. It is left with one, and the second blow breaks it. **Nothing
   * with three shells or more is affected at all** — those already needed two —
   * so the whole of the change lands exactly on the creatures the report was
   * about, and the measured bands for everything else are untouched.
   *
   * **The table moved as well, by exactly one shell, and the number is the
   * probe's rather than the design's.** More shells costs the *probe* far more
   * than it costs a player, because a body that needs longer to break a thing
   * stands next to it longer — so the tour, which is thirty to fifty fighting
   * walks chained end to end, is where a shell floor is paid for. Swept over
   * the whole table: at **+1** the tour finishes inside its cap on every seed;
   * at **+2** it hits the cap on seed 555 with a hundred and seventy-eight
   * falls against the base table's eighteen, and shaping the increase (more on
   * the small ones, less on the great) moves *which* seed collapses and not
   * whether one does. That is a cliff and not a knife edge: once a fighting
   * probe goes out more often than it kindles, a fall wipes the purse and the
   * tour never affords the crown. **+1 is the measured headroom of the
   * instrument, not a claim about what a player can take** — and it is enough
   * for the thing that was reported, because at +1 nothing in the bestiary
   * dies to one word even before the rule above.
   *
   * **And a klipah with one shell keeps dying to one blow**, which is not an
   * exception so much as the rule read properly: a single shell is the whole of
   * what those three are, and the Arbeh is the guardian a beginner meets at
   * Malchut holding *nothing at all*. Clamping it broke that room on the first
   * run — the one fight in the game that has to be winnable bare-handed.
   */
  const take = shellsTaken(bite, HUSKS[husk.kind].shells);
  const full = husk.shells >= HUSKS[husk.kind].shells && husk.shells > 1;
  husk.shells = full ? Math.max(1, husk.shells - take) : husk.shells - take;
  husk.struck = 8;
  husk.vx += push * (husk.x < from ? -1 : 1) * 90;
  if (husk.shells > 0) return;

  // The shell breaks, and what was held in it comes out. This is the whole
  // idea: the motes the Scribe has always gathered were inside something.
  husk.broken = true;
  world.husksBroken += 1;
  const spec = HUSKS[husk.kind];
  // What was held in the shell — more of it on a Day whose creatures hold more,
  // and more again if the room had closed behind the Scribe when it broke.
  const held = Math.round(
    spec.light * world.huskLight * (world.inSealedRoom ? world.sealedLight : 1),
  );
  for (let i = 0; i < held; i += 1) {
    world.entities.push({
      id: `e-husk-${world.tick}-${i}`,
      kind: "mote",
      x: husk.x + (i - spec.light / 2) * 9,
      y: husk.y - 4,
      // The renderer's fact, not the economy's — see `Entity.from`. The
      // spill's positions above stay byte-identical for the same reason.
      from: husk.kind,
    });
  }
  // Named, because the naming is the point: a klipah is a husk *around*
  // something, and the something has a name in the sources — and now each
  // shell breaks with its own sentence, naming the kind of light it held.
  say(world, spec.release);
}

/**
 * Whether a klipah is somewhere no mark can follow it.
 *
 * Exported so the bench can ask it. What it is really measuring is how much of
 * a creature's life it is *answerable* for, and that turns out to be the only
 * question that catches a klipah nobody can break: `breakIn` cannot, because a
 * Scribe who keeps station is standing there for the one window in the cycle
 * when it is reachable, and takes it.
 *
 * **This read `charging === 0`, and that was the whole of why Korach could not
 * be broken.** `charging` counts only the rise, so every tick that was not the
 * rise counted as buried — including the ticks it spends standing in the open
 * afterwards. Over sixty-six honest walks a Scribe holding all twenty-two
 * letters broke one of thirty-seven, and adding the settling phase alone moved
 * that to two, because the creature was standing there in plain sight and still
 * immune to everything.
 *
 * So it asks the real question: is it under, or is it out? Rising is out.
 * Settling is out. Only the long burrow between one surfacing and the next is
 * inside the ground, and that is the only part of the cycle a mark should pass
 * through.
 */
export function outOfReach(husk: Husk, world?: World): boolean {
  /**
   * **The Tannin holds the water.** Three places said so — its own line on the
   * plate a player reads, the case that steers it, and the test that proves it
   * leaves the water at all — and nothing implemented it: a mark landing on a
   * submerged Tannin took a shell off it like any other. The sentence "it stays
   * in the water, where nothing can touch it, and comes out of it at you" was
   * the creature's whole shape, and the fight it describes — catch it in the
   * air, because the air is the only place it can be written on — did not exist.
   *
   * `world` is optional because most callers are asking about a klipah rather
   * than about a place; without one this answers the question it always
   * answered, which keeps the pure-husk callers honest.
   */
  if (husk.kind === "tannin") return world ? inWater(world, husk) : false;
  /**
   * **And the Nachash holds the stone**, which is the same sentence as the
   * Tannin's about a different element and was just as unimplemented.
   *
   * *Slow, and it does not stop, and stone is nothing to it.* Being unstopped by
   * a wall is what `flies` already does for it — it is the only kind in the
   * table that uses that field to mean stone rather than air. What was missing
   * was the other half: a mark **is** stopped by the wall, so a serpent inside
   * one is a serpent nothing can reach, and the fight is to answer it in the
   * open ground between.
   *
   * This costs no lamps by construction, which is why it is the first of the
   * per-creature openings rather than a later one: `harmful` opens by returning
   * false for anything out of reach, so the moment it is unanswerable is the
   * moment it is inside a wall and not touching anybody.
   */
  if (husk.kind === "nachash") return world ? inStone(world, husk) : false;
  return buried(husk);
}

/** Korach's own half of the rule: inside the earth, where nothing follows it. */
function buried(husk: Husk): boolean {
  if (husk.kind !== "korach") return false;
  if (husk.charging > 0) return false;
  return husk.cooldown <= (HUSKS.korach.throws ?? 0) - RISE - SETTLE;
}

/**
 * **Whether there is anything there to paint** — which is *not* the same
 * question as whether a mark can reach it, and was answered as though it were.
 *
 * `drawHusks` skipped exactly what `outOfReach` skipped, deliberately and with
 * a test holding it there: P5c found three places asking "is Korach in the
 * ground?" and all three answering it wrongly, so the rule was given one home
 * and the renderer was made to ask it. That was right about Korach and wrong as
 * a general law, and P7 walked straight into the difference — it taught
 * `outOfReach` that a submerged Tannin cannot be marked, which is true and is
 * the whole of that creature's fight, and thereby **stopped the Tannin being
 * drawn at all while it was in the water**. Measured on its own bench: painted
 * on 58% of ticks, absent for the other 42, which are precisely the ticks a
 * player would need to see it coming.
 *
 * The two questions come apart cleanly once they are asked separately. Korach
 * inside the earth is *not there*. The Tannin under the water **is** there — it
 * is simply out of reach, the way a thing on the far side of a river is, and a
 * fight whose rule is "catch it when it leaves the water" cannot be played
 * against something invisible until it arrives.
 */
export function unseen(husk: Husk): boolean {
  return buried(husk);
}

/**
 * Whether touching it costs anything.
 *
 * The same for everything except Korach, and for Korach it is the other half of
 * the settling phase. **The moment it is answerable is the moment it is
 * harmless.** The eruption is the attack — it opens under the Scribe's feet and
 * rises through him, and nothing about that is softened. What follows is the
 * price of having done it: it is out of the ground, stationary and spent, and a
 * Scribe who turns round and writes on it pays nothing for standing there.
 *
 * Made separate because it was not, and the first version of the settling phase
 * therefore handed the creature ninety extra ticks of *contact* along with the
 * ninety ticks of being hittable. The honest dash to a freed crown stopped
 * arriving on one seed in six: a klipah that had been unbreakable became
 * unbreakable and twice as costly, which is the opposite of the change.
 */
export function harmful(husk: Husk, world: World): boolean {
  if (outOfReach(husk, world)) return false;
  return husk.kind !== "korach" || husk.charging > 0;
}

/**
 * **Whether a mark thrown at it now would do anything at all** — the question
 * the *probe* has to ask, and the seam the rest of P14 is built on.
 *
 * It is deliberately not `opened`. A blow on an unopened great one takes no
 * shell and is still the fight: Leviathan is *drawn* by it, and the Hook
 * dragging it out of the water is the only way that room is ever won. A klipah
 * that staggers is a klipah something happened to. What this asks is the
 * narrower question — is there anything there for a mark to land on — and today
 * that is exactly `outOfReach`: a Korach inside the earth and a Tannin under
 * the water, where the mark loop `continue`s and not one thing occurs.
 *
 * Given a home now, while it has one caller and one meaning, because the class
 * of bug this codebase keeps finding is a question asked in three places and
 * answered separately — "is Korach in the ground?" was asked by the mark loop,
 * the contact check and the renderer, and fixing two of the three would have
 * made the creature's one answerable moment its one invisible one.
 */
export function answerable(world: World, husk: Husk): boolean {
  if (outOfReach(husk, world)) return false;
  /**
   * **The great ones are excepted, and it is not a courtesy.** A blow on an
   * unopened great one takes no shell and is still the fight: it sets
   * `struck = 12` and, with the Hook, drags Leviathan landward — which is the
   * only way that room is ever won. A probe that stopped throwing at a
   * submerged Leviathan would never pull it ashore and `guardianFight` would
   * report the creature unbeatable, which is the shape of the bug that phase
   * was written to catch.
   *
   * For everything else an unopened blow only staggers, so a mark spent on one
   * buys nothing but the fifteen ticks of cooldown that the open moment needed.
   */
  if (isGreat(husk.kind)) return true;
  return opened(world, husk);
}

/**
 * Delilah's contact, which is not a wound.
 *
 * It costs no lamp — so the i-frames never fire and it can keep taking — and
 * what it takes is `or`, the light gathered on this rung. That is deliberately
 * the one thing the rest of the fight is forbidden to touch: `takeHit` charges
 * lamps precisely so that a mistake never costs progress twice. Here the
 * inversion is the character. It is not a hit. It is a leak.
 */
function coax(world: World, husk: Husk): void {
  if (husk.cooldown > 0 || world.or <= 0) return;
  husk.cooldown = 26;
  world.or = Math.max(0, world.or - 1);
  say(world, "It takes a little, and asks again tomorrow.");
}

/** A lamp goes, and the Scribe is thrown clear. At zero he goes out. */
function wound(world: World, ctx: StepContext, away: 1 | -1): void {
  const p = world.player;
  const powers = powersFrom(ctx.items ?? [], ctx.boons, ctx.keeps);
  const hit = takeHit(p.lamps, p.iframes, powers.iframes);
  if (hit.lamps === p.lamps && !hit.out) return;

  /**
   * Thrown clear, which every blow does whatever it costs — including the two
   * a vessel pays for below, or a Scribe would be spared the lamp and left
   * standing in the thing that took it.
   *
   * **The Hide is heavy**, and halves it. What that buys is not being thrown
   * across the room, which over a basin is the difference between a lamp and a
   * lamp and a veiling.
   */
  const clear = () => {
    const thrown = powers.heavy ? 0.5 : 1;
    p.iframes = hit.iframes;
    p.vx = away * KNOCKBACK_X * thrown;
    p.vy = -KNOCKBACK_Y * thrown;
    p.dash = 0;
    p.grappleTo = undefined;
  };

  /**
   * **The Wrapper — the first blow of a rung takes no lamp.** Not a longer
   * moment after being hit, which is what its `iframes` already buy, but the
   * blow itself: *wrapped, a thing takes longer to come to harm.* Once, and the
   * grace is spent for the rung, so it is the difference between the first
   * mistake and the second rather than a lamp that regrows.
   */
  if (powers.spared && !world.spared) {
    world.spared = true;
    clear();
    say(world, "The wrapping takes it. Not this time.");
    return;
  }

  /**
   * **The Lampstand — the middle light is never let go out.** Once in a rung a
   * blow that would take the last lamp takes nothing, which is a different
   * mercy from the Wrapper's: that one spends itself on whatever comes first,
   * and this one waits at the bottom for the blow that would end the climb.
   */
  if (hit.out && powers.relights && !world.relit) {
    world.relit = true;
    clear();
    say(world, "The middle light does not go out.");
    return;
  }

  /**
   * **Aaron's rod** — a dead stick that budded and blossomed and bore almonds
   * all in one night. The first lamp lost on a rung grows back.
   *
   * Two things keep it from being the Wrapper under another name. It is barred
   * **above the Abyss**, where the ground is longest and the klipot heaviest,
   * so it is a kindness at the foot of the Tree and nothing at the top; and it
   * never saves the last lamp, because a lamp that buds back has to have
   * something to bud from. What would have ended the climb is the fire's
   * business, below.
   */
  if (!hit.out && ctx.keeps?.buds && !world.budded && world.regionIndex <= LAST_BELOW_ABYSS) {
    world.budded = true;
    clear();
    say(world, "The rod buds. The lamp comes back.");
    return;
  }

  /**
   * **The fire of the altar**, which came down once and was never lit again,
   * only kept. Once in a *climb* — not once a rung, which is the Lampstand's —
   * the last lamp refuses to go out.
   *
   * `world.everlasting` is the only flag in `World` meant to outlive its own
   * rung: the page reads it at the exit and at the fall and writes the relic
   * onto the record as spent, so a reload cannot hand the fire back. That is
   * the same reason `relicsFound` lives on the record rather than in state.
   */
  if (hit.out && ctx.keeps?.perpetual && !world.everlasting) {
    world.everlasting = true;
    clear();
    say(world, "The fire of the altar does not go out.");
    return;
  }

  p.lamps = hit.lamps;
  clear();
  if (hit.out) {
    world.out = true;
    say(world, GOING_OUT);
    return;
  }
  say(world, `A husk takes a lamp. ${p.lamps} left.`);
}

function stepHusks(world: World, ctx: StepContext): void {
  const p = world.player;
  for (const husk of world.husks) {
    if (husk.broken) continue;
    if (husk.struck > 0) husk.struck -= 1;
    if (husk.cooldown > 0) husk.cooldown -= 1;
    const spec = HUSKS[husk.kind];
    const toward = p.x + p.w / 2 - (husk.x + husk.w / 2);
    const near = Math.hypot(toward, p.y - husk.y);

    switch (husk.kind) {
      // **Cain.** נָע וָנָד — back and forth over the same earth, forever, and
      // it has never once looked up.
      case "cain": {
        pace(world, ctx, husk, spec.speed);
        break;
      }

      // **The Brothers.** Not one of them would have done it alone, and that
      // is the mechanic entire: it hangs back while it is on its own, and every
      // other brother still standing in the rung makes it faster and braver.
      // Break them one at a time and the rest lose their nerve as you go.
      case "brothers": {
        const others = world.husks.filter((h) => h.kind === "brothers" && !h.broken).length - 1;
        const nerve = Math.min(1 + others * 0.4, 2.2);
        // **They do not follow you out of the field.** Joseph came to them; they
        // did not go looking. And measured, a klipah that chases forever is
        // worse than useless as well as untrue: it is slower than a Scribe at a
        // run, so it trails behind him for the length of a rung, never gets in
        // front to be written at, and simply gnaws. Yesod broke thirteen per
        // cent of its shells. They hold their ground and close on what comes
        // to it.
        const strayed = Math.abs(husk.x - husk.home.x) > TILE_SIZE * 6;
        if (others > 0 && near < spec.notices && !strayed) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed * nerve;
          husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        } else if (strayed) {
          husk.facing = (husk.home.x > husk.x ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed;
          husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        } else {
          pace(world, ctx, husk, spec.speed * 0.7);
        }
        break;
      }

      // **The Calf.** It does nothing at all — it is only beautiful — until you
      // strike it, and a room that has closed behind you is a room you have to
      // strike it in. Then it never stops coming.
      //
      // **It now charges in runs rather than in one unbroken shove**, and that
      // is a cycle rather than a softening. Roused, it used to set
      // `charging = 30` *every tick*, which never decayed — so the field was a
      // permanent flag saying "awake" and not a window saying "committed". A
      // creature whose commitment never ends cannot be answered on the beat and
      // cannot carry an `opening` at all: keyed to that flag it would have shut
      // itself for the rest of its life at the first blow, which is the Korach
      // fault, and it is why P14d closed one kind and not eighteen.
      //
      // So: twenty-four ticks of running, then forty-eight of standing spent
      // and gathering, forever. It never gives up and never turns aside, which
      // is what "it never stops" was always about; what it does is overrun, and
      // the moment it is overrunning is the moment a Scribe answers it.
      //
      // **The split is a third, and it was a half.** At thirty and twenty-six
      // the creature measured 0.53 shut-and-dangerous on the bench's struck
      // posture — half its life unanswerable while it was still taking lamps,
      // which is the proportion `unfair()` exists to forbid. Twenty-four
      // running against forty-eight standing is the same rhythm at a third,
      // and at a hundred and twenty-eight pixels a second a run still carries
      // it two tiles, which is a charge rather than a lunge.
      case "calf": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        if (husk.shells >= spec.shells) {
          husk.vx = 0;
          break;
        }
        if (husk.charging > 0) {
          husk.charging -= 1;
          husk.vx = husk.facing * spec.speed;
          break;
        }
        // Spent. `cooldown` is set long enough at the commit to outlast the run
        // by the width of the window, so the gap is the same whatever happens
        // during the charge — a window whose length depends on the geometry is
        // a window a Scribe cannot learn.
        if (husk.cooldown > 0) {
          husk.vx = 0;
          break;
        }
        husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
        husk.charging = 24;
        husk.cooldown = 72;
        husk.vx = husk.facing * spec.speed;
        break;
      }

      // **Esau.** A man of the field: he runs you down over open ground and
      // gives up the moment you are above him, having sold the higher thing
      // for the one in front of him and never learned to look up since.
      case "esav": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        const above = husk.y - (p.y + p.h);
        const far = Math.abs(husk.x - husk.home.x) > TILE_SIZE * 9;
        const chasing = near < spec.notices && above < TILE_SIZE * 2 && !far;
        // **The run is the committed phase** (`opening: "spent"`): while it
        // closes on you over open ground a word written at it counts for
        // nothing — and the run is over the moment it has *run you down*
        // (arrived at arm's length) or given up (you rose above it, or it
        // strayed too far from its ground). Open on arrival is what keeps
        // the pairing honest for a creature whose shut phase is spent
        // closing: the dangerous stretch is short and ends where you are,
        // and the moment it is on you it is answerable.
        // **And the commitment is counted, like every other "spent" kind's.**
        // Keyed to the condition alone it never ends for a quarry it can
        // never arrive at — benched beneath it or behind a set stone it read
        // shut for its whole life (open 0.00, unfair 1.00 against a band of
        // 0.45), a pursuer made unanswerable by being unable to win. Forty
        // ticks of sprint, then it gives up and rests eighty, open, whether
        // or not it caught you — which is the creature exactly: no staying
        // power, the birthright sold for what is in front of it.
        if (husk.charging > 0 && (!chasing || near <= TILE_SIZE * 1.5)) {
          husk.charging = 0;
          husk.cooldown = 80;
        }
        if (husk.charging > 0) {
          husk.charging -= 1;
          if (husk.charging === 0) husk.cooldown = 80;
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed;
        } else if (chasing && near > TILE_SIZE * 1.5 && husk.cooldown === 0) {
          husk.charging = 40;
        } else if (chasing) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed * 0.5;
        } else {
          husk.vx *= 0.9;
          pace(world, ctx, husk, spec.speed * 0.3, true);
        }
        break;
      }

      // **Amalek.** אֲשֶׁר קָרְךָ בַּדֶּרֶךְ — he met you on the way and cut off
      // those behind you. It comes at your back and stands like stone while you
      // are looking at it, so the answer is simply to face it: the one klipah
      // in the game that a turn of the head disarms, which is the whole of what
      // "remember what Amalek did" means.
      case "amalek": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        const watched = (toward > 0 ? -1 : 1) === p.facing;
        const strayed = Math.abs(husk.x - husk.home.x) > TILE_SIZE * 9;
        if (!watched && near < spec.notices && !strayed) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed;
        } else husk.vx = 0;
        break;
      }

      // **Korach.** The earth opened her mouth. It travels inside the ground,
      // where nothing can touch it, tracking the column you are standing in —
      // and then it comes up under you. `charging` counts the moment it is
      // above ground; `cooldown` the long submersion before the next one.
      case "korach": {
        if (husk.charging > 0) {
          husk.charging -= 1;
          husk.vx = 0;
          husk.vy = -95;
          break;
        }
        /**
         * **And the earth closed upon them.**
         *
         * Bamidbar 16:33 — they went down alive into the pit, *and the earth
         * closed upon them*. The ground does not simply reopen for Korach when
         * he wants it: having come up, he is out, and he is out for a while.
         *
         * This is the one klipah measurement caught as unanswerable. Rising
         * took forty-two ticks in every three hundred and eighty-seven, so it
         * was above ground — which is the only place a mark can reach it,
         * since stone stops a mark and nothing stops Korach — for sixteen per
         * cent of its life, measured, and it moved fast for all sixteen. Over
         * sixty-six
         * honest walks a fighting Scribe holding every letter in the game laid
         * thirty-seven of them and broke **one**: three per cent, against
         * thirty-nine to eighty-five for every other kind in the table. A
         * klipah that cannot be broken is not a creature, it is weather — and
         * its four light can never be collected by anybody.
         *
         * So the cycle is three phases rather than two. It rises; then it
         * **stands there**, out of the ground and still, for long enough to be
         * answered; and only then does it go back down. Nothing about the
         * moment it opens under the Scribe is softened — that is the threat,
         * and it is unchanged. What is added is the price of having done it.
         */
        const settled = husk.cooldown > (spec.throws ?? 0) - RISE - SETTLE;
        if (settled) {
          // **Still, and weightless.** Not falling: `flies` is what lets it
          // move through the rock, and a klipah the rock does not hold falls
          // through the floor the instant gravity is applied to it. The first
          // draft of this settling phase did exactly that — it came up, dropped
          // straight through the world, and was measured as unbreakable for a
          // second time and for a new reason. It stands where the rise left it.
          husk.vx = 0;
          husk.vy = 0;
          break;
        }
        // Under. It slides toward the Scribe's column and rises when it is
        // beneath him — but never further than the ground it haunts. Stone is
        // nothing to it, so without a leash it simply followed the Scribe
        // through the rock for the length of a floor and opened under him again
        // and again: measured, the moment the rows came on, it took sixty lamps
        // in a hundred runs, more than twice any other klipah.
        const home = husk.home.x - husk.x;
        const chase = Math.abs(home) > TILE_SIZE * 12 ? home : toward;
        husk.vy = 90;
        husk.vx = Math.sign(chase) * spec.speed;
        /**
         * **Out of the ground under him — not out of him.**
         *
         * This read `husk.y = p.y + p.h + TILE_SIZE * 2.5`, which is the same
         * thing exactly as long as the Scribe is *standing* on something: his
         * feet are the surface. Off the ground it is not the same thing at
         * all, and a Scribe is off the ground for a good part of every rung.
         * Reported from play as "the creature that comes out of the stone is
         * stuck", and reproduced: triggered under a Scribe six tiles up, it
         * rose to his height, hit the settling phase — which is deliberately
         * weightless, since `flies` means gravity would drop it through the
         * world — and **hung there motionless in mid-air** for ninety ticks
         * before vanishing. Not stuck in the geometry; stuck in the sky.
         *
         * So the eruption is anchored to the earth, which is the thing it is
         * named for. `surfaceUnder` finds the ground beneath the Scribe's
         * column, and if there is none within eight tiles there is nothing to
         * open: it stays under and keeps waiting, which is the honest answer
         * for a Scribe hanging on a vine over a chasm.
         */
        const surface = surfaceUnder(world, ctx, p.x + p.w / 2, p.y + p.h);
        if (
          Math.abs(toward) < TILE_SIZE &&
          husk.cooldown === 0 &&
          spec.throws &&
          surface !== undefined
        ) {
          husk.charging = RISE;
          husk.cooldown = spec.throws;
          // **Under the feet, not in them.** Surfacing at the Scribe's own
          // height put the two bodies in the same place on the same tick, so
          // the earth opening cost a lamp with nothing to react to — measured,
          // Gevurah put eight runs in ten out. It comes up from below, and the
          // moment of rising is the moment to be somewhere else.
          husk.y = surface + DEPTH;
        }
        break;
      }

      // **Jezebel.** She never went anywhere: everything she did she did at a
      // distance and by other hands. What she throws bends after you.
      //
      // **And she gathers before she sends, which she did not.** Every thrower
      // in this game fired on the tick its cooldown reached zero, with no
      // wind-up and no tell — the same class as `charging` once being drawn
      // exactly like not-charging, and as a turned-aside blow flashing the same
      // gold as one that landed: a state a player could act on, given nothing to
      // act on it with.
      //
      // Twenty ticks of gathering, then the sending. `charging` is the
      // field for it, so the halo the renderer already paints for a creature
      // winding up is the tell, and `opening: "spent"` closes her for exactly
      // that long — you cannot write on her while she is drawing it up, and the
      // rest of the cycle you can.
      //
      // She is the cleanest creature in the table to close, and the reason is
      // `speed: 0`: rooted, she is never in contact with anybody, so her shut
      // phase costs a Scribe nothing at all by construction. That is the whole
      // criterion this roster was chosen by.
      //
      // **And `throws` came down to pay for the gather**, which is a correction
      // rather than a tune. A wind-up laid in front of a cooldown lengthens the
      // *period*, so the first version quietly cost her a sixth of her rate of
      // fire — measured, the whole Tree's going-out rate fell from 18.3% to
      // 16.1% on the strength of one creature throwing less. The tell was the
      // design; the tempo was not, and a change that makes the game easier by
      // accident is worse than one that makes it harder on purpose. Twenty and
      // a hundred and forty-five is a hundred and sixty-five, where it started.
      //
      // **And twenty rather than thirty-four because thirty-four broke the
      // standing proof**, which is worth writing plainly rather than dressing
      // as a design choice. At thirty-four the tour handed itself a letter on
      // one seed — the concession `climb.test.ts` forbids absolutely — and at
      // twenty it does not. The tour is forty to seventy heuristic walks chained
      // end to end and its own doc says every change to the Tree moves which
      // seeds are lucky, so this is a knife edge rather than a discovery about
      // Jezebel. What makes twenty *acceptable* rather than merely passing is
      // that a third of a second is still a legible tell for a projectile that
      // bends after you; what selected it was the proof.
      case "izevel": {
        husk.vx = 0;
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
        if (husk.charging > 0) {
          husk.charging -= 1;
          if (husk.charging > 0) break;
        } else if (near < spec.notices && husk.cooldown === 0 && spec.throws) {
          husk.charging = 20;
          break;
        }
        if (husk.charging === 0 && husk.cooldown === 0 && spec.throws && near < spec.notices) {
          husk.cooldown = spec.throws;
          world.marks.push({
            id: `m${world.tick}-${husk.id}`,
            mine: false,
            x: husk.x + husk.w / 2,
            y: husk.y + husk.h / 3,
            w: MARK_SIZE,
            h: MARK_SIZE,
            vx: husk.facing * 122,
            vy: -70,
            life: 155,
            pierces: false,
            bite: 1,
            draws: false,
            seeks: true,
            glyph: "·",
          });
        }
        break;
      }

      // **Delilah.** וַתְּאַלְצֵהוּ — she pressed him daily with her words.
      // It drifts to you and takes no lamp at all; what it takes is the light
      // you had gathered, which you do not feel going until you count it.
      case "delilah": {
        const away = Math.hypot(toward, p.y - husk.y) || 1;
        husk.vx = (toward / away) * spec.speed;
        husk.vy = ((p.y - husk.y) / away) * spec.speed;
        break;
      }

      // **Athaliah.** She destroyed all the seed royal — she did not want the
      // throne so much as she wanted nobody else to have it. It goes for the
      // loose light before you can and puts it out.
      case "atalya": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        const seed = nearestMote(world, husk);
        if (seed) {
          husk.facing = (seed.x > husk.x ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed;
          if (Math.abs(seed.x - husk.x) < TILE_SIZE && Math.abs(seed.y - husk.y) < TILE_SIZE * 2) {
            seed.taken = true;
            say(world, "It puts the light out before you reach it.");
          }
        } else pace(world, ctx, husk, spec.speed * 0.6);
        break;
      }

      // **The Serpent.** Slow, and it does not stop, and stone is nothing to
      // it. The first of them and the shape of all the rest: it never hurries,
      // because it has never needed to.
      case "nachash": {
        // It does not stop, and it does not leave its own ground either. A
        // relentless pursuer that ignores stone will cross a whole floor to
        // reach you, and then there is nowhere on the rung that is not it.
        const strayed = Math.hypot(husk.home.x - husk.x, husk.home.y - husk.y) > TILE_SIZE * 16;
        const toX = strayed ? husk.home.x - husk.x : toward;
        const toY = strayed ? husk.home.y - husk.y : p.y - husk.y;
        const off = Math.hypot(toX, toY) || 1;
        husk.vx = (toX / off) * spec.speed;
        husk.vy = (toY / off) * spec.speed;
        husk.facing = (husk.vx > 0 ? 1 : -1) as 1 | -1;
        break;
      }

      // ---------------------------------------------------------------------
      // the creatures
      // ---------------------------------------------------------------------

      // **The Tannin.** The great sea-creatures, and the first made thing the
      // account of creation bothers to name. It holds the water, where
      // `outOfReach` already forbids a mark from touching it, and comes out at
      // whatever is standing on the bank — so the fight is about catching it
      // in the air, which is the only place it can be written on.
      case "tannin": {
        const wet = isWater(tileAt(world, tile(husk.x + husk.w / 2), tile(husk.y + husk.h / 2)));
        if (wet) {
          // Under, it swims to the Scribe's column and gathers.
          husk.vx = Math.sign(toward) * spec.speed * 0.5;
          husk.vy = -spec.speed * 0.35;
          if (near < spec.notices && Math.abs(toward) < TILE_SIZE * 3 && husk.cooldown === 0) {
            husk.cooldown = 90;
            husk.charging = 28;
            husk.vy = -430;
          }
        } else if (husk.charging > 0) {
          // Out. It goes where it was aimed and gravity does the rest.
          husk.charging -= 1;
          husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        } else {
          // Landed, or laid on a rung with no water in it at all. It walks
          // like anything else rather than lying where it fell — a creature
          // that is inert wherever it was not authored to be is scenery.
          pace(world, ctx, husk, spec.speed * 0.5);
        }
        break;
      }

      // **The Re'em.** כְּתוֹעֲפֹת רְאֵם לוֹ — the horns of the wild ox. It picks
      // a line and runs it, and it has never once been asked to reconsider, so
      // **stone takes a shell off it**: step out of the way and it does the
      // work. The one klipah in the game a Scribe can break without writing.
      case "reem": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        if (husk.charging > 0) {
          husk.charging -= 1;
          husk.vx = husk.facing * spec.speed;
          const nose = tile(husk.x + (husk.facing > 0 ? husk.w + 3 : -3));
          if (isSolid(tileAt(world, nose, tile(husk.y + husk.h / 2)), solidFor(world, ctx))) {
            husk.charging = 0;
            husk.cooldown = 70;
            husk.vx = 0;
            strikeHusk(world, husk, 1, -husk.facing, husk.x);
            say(world, "It goes into the wall rather than turn.");
          }
        } else if (near < spec.notices && husk.cooldown === 0) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.charging = 150;
        } else {
          husk.vx *= 0.86;
        }
        break;
      }

      // **The Saraf.** הַנְּחָשִׁים הַשְּׂרָפִים. The bite is not what kills; what
      // kills is the ground you have to go back over. What it leaves behind is
      // a mark of its own — the world already carries those, moves them,
      // expires them and collides them with the Scribe, so a burning floor
      // needed no new machinery at all, only something that does not fly away.
      //
      // **And it gathers before it sets one down, which is the fairness fix of
      // the three throwers rather than an also-ran.** Read against the other
      // two: Jezebel's bends after you across the room, and Og's falls seven
      // tiles onto your head — a hundred and sixty-eight pixels at two hundred
      // and ten a second, which is eight tenths of a second of *visible* fall
      // and a real dodge. The Saraf's fire has `vx: 0, vy: 0`. It does not
      // travel. It simply exists, on the tick, under whatever is standing
      // there. This is the one attack in the game with no warning of any kind,
      // and the roster note that called Og's the worst was wrong.
      //
      // Eighteen ticks of the ground gathering heat before it takes, held in
      // `charging` so the halo says so, and `opening: "spent"` shuts it for
      // exactly that long. **`throws` pays for the gather** — 90 to 72, so the
      // period is where it was — for the reason Jezebel's did: a wind-up laid
      // in front of a cooldown lengthens the cycle, and a creature that attacks
      // less often because it now telegraphs is a nerf nobody chose.
      //
      // It is the one on this roster whose shut phase is **not** out of contact
      // by construction, because unlike Jezebel it walks. Eighteen of ninety is
      // about a fifth, against a band of 0.45, and `unfair()` is what decides
      // whether it is kept rather than an argument.
      case "saraf": {
        pace(world, ctx, husk, spec.speed);
        if (husk.charging > 0) {
          husk.charging -= 1;
          if (husk.charging > 0) break;
        } else if (husk.cooldown === 0 && spec.throws) {
          husk.charging = 12;
          break;
        }
        if (husk.charging === 0 && husk.cooldown === 0 && spec.throws) {
          husk.cooldown = spec.throws;
          world.marks.push({
            id: `f${world.tick}-${husk.id}`,
            mine: false,
            x: husk.x + husk.w / 2 - MARK_SIZE / 2,
            y: husk.y + husk.h - MARK_SIZE,
            w: MARK_SIZE,
            h: MARK_SIZE,
            vx: 0,
            vy: 0,
            life: SARAF_FIRE,
            pierces: false,
            bite: 1,
            draws: false,
            glyph: "שׂ",
          });
        }
        break;
      }

      // **Rahav.** הֲלוֹא אַתְּ־הִיא הַמַּחְצֶבֶת רַהַב. Pride does not diminish when
      // it is opposed: every shell taken off it makes it larger and quicker,
      // so the last one is a different creature from the first.
      case "rahav": {
        const swollen = 1 + (spec.shells - husk.shells) * 0.28;
        husk.w = spec.size.w * swollen;
        husk.h = spec.size.h * swollen;
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        if (near < spec.notices) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed * swollen;
        } else pace(world, ctx, husk, spec.speed * 0.5);
        break;
      }

      // **Og.** The last of the giants, whose bedstead was nine cubits of iron.
      // What is dangerous about him is not that he is quick — it is that the
      // ceiling comes down where you are standing rather than where he is.
      //
      // **And it gathers before the step lands.** Twenty-four ticks, longer than
      // the other two throwers' because this one is slow and enormous and its
      // whole line is about the *step* — a giant that telegraphs briskly is not
      // a giant. `throws` pays for it, 260 to 236, so the period is where it
      // was.
      //
      // Honestly: this buys the **opening** rather than a tell it lacked. What
      // it drops falls seven tiles at two hundred and ten a second, which is
      // eight tenths of a second of visible descent — a warning, and a dodge —
      // and the roster note that called this the worst warning-free attack in
      // the game was reading where the debris lands rather than how it gets
      // there. The Saraf's fire is the one with no travel at all.
      //
      // The debris keeps its release-time aim rather than committing to a spot
      // when the gather begins. Committing would want a field on `Husk` that
      // nothing else needs, and the fall is already the part a Scribe answers.
      case "og": {
        pace(world, ctx, husk, spec.speed);
        if (husk.charging > 0) {
          husk.charging -= 1;
          if (husk.charging > 0) break;
        } else if (husk.cooldown === 0 && spec.throws && near < TILE_SIZE * 10) {
          husk.charging = 24;
          break;
        }
        if (husk.charging === 0 && husk.cooldown === 0 && spec.throws && near < TILE_SIZE * 10) {
          husk.cooldown = spec.throws;
          world.marks.push({
            id: `o${world.tick}-${husk.id}`,
            mine: false,
            x: p.x + p.w / 2 - MARK_SIZE / 2,
            y: Math.max(0, p.y - TILE_SIZE * 7),
            w: MARK_SIZE,
            h: MARK_SIZE,
            vx: 0,
            vy: 210,
            life: 120,
            pierces: false,
            bite: 1,
            draws: false,
            glyph: "׃",
          });
          say(world, "The step shakes something loose above you.");
        }
        break;
      }

      // **The Nefilim.** They are named for the one thing they did, and
      // everything else about them is waiting. It hangs, weightless, until the
      // Scribe is underneath it — and then it is not weightless.
      // **And it goes back up**, which it did not, and the creature was the
      // poorer for it twice over. `charging` was set to 1 on the way down and
      // never cleared, so after one drop a Nefilim lay on the floor with its
      // weight still committed: furniture for the rest of the rung, and — like
      // the Calf — a permanent flag where a window was wanted. *Everything else
      // about them is waiting*, and a thing that has finished waiting has
      // nothing left to be.
      //
      // Now the whole verse: it hangs, it falls when you are underneath, it
      // lies where it landed for a beat, and it climbs back to the height it
      // was at to wait again. The fall is the committed part and is the part a
      // mark cannot touch; hanging and rising and lying spent are all
      // answerable, which is most of its life.
      case "nefilim": {
        const under = Math.abs(toward) < husk.w && p.y > husk.y;
        if (husk.charging > 0) {
          husk.vx = 0;
          // `moveHusk` zeroes `vy` on stone, and this one does not fly, so a
          // dead vertical is the ground arriving. Read rather than timed,
          // because how far there is to fall is a fact about the screen it was
          // laid on and not about the creature.
          //
          // **Asked before gravity, and counted from the second tick.** Asked
          // after, `vy` has just been set to a non-zero number and the landing
          // can never be seen — the first draft did exactly that and the bench
          // reported a Nefilim falling for all fifteen hundred ticks, shut and
          // dangerous for the whole of its life. And it has to skip the first
          // tick, because a creature that has been hanging weightless starts
          // its fall at a dead vertical too.
          if (husk.charging > 1 && husk.vy === 0) {
            husk.charging = 0;
            husk.cooldown = 70;
            break;
          }
          husk.charging += 1;
          husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
          break;
        }
        if (husk.cooldown > 0) {
          husk.vx = 0;
          husk.vy = 0;
          break;
        }
        if (husk.y > husk.home.y + 1) {
          // Climbing back to the ceiling it hangs from. Slowly, because the one
          // thing this creature has never done is hurry.
          husk.vx = 0;
          husk.vy = -46;
          break;
        }
        husk.y = husk.home.y;
        husk.vx = 0;
        husk.vy = 0;
        if (under) husk.charging = 1;
        break;
      }

      // **The Arbeh.** The eighth plague is the only one that is a number
      // rather than a thing. One of them is nothing; they are never one. It
      // drifts at the Scribe on a phase of its own, so a cloud of them arrives
      // spread out instead of stacked in a single body.
      case "arbeh": {
        const away = Math.hypot(toward, p.y - husk.y) || 1;
        const swing = Math.sin((world.tick + husk.home.x) / 14) * 0.55;
        husk.vx = (toward / away) * spec.speed;
        husk.vy = ((p.y - husk.y) / away) * spec.speed + swing * spec.speed;
        break;
      }

      // ---------------------------------------------------------------------
      // the three great ones
      // ---------------------------------------------------------------------

      // **Leviathan.** תִּמְשֹׁךְ לִוְיָתָן בְּחַכָּה — canst thou draw out leviathan
      // with an hook? In the water it rides the surface, where it is visible
      // and can be hit and where a hit does nothing at all except move it. Out
      // of the water it is heavy, and it wants the water back, so the whole
      // fight is the seconds between the two.
      case "livyatan": {
        // **The pull wins.** Struck, it goes where it was pulled and steers at
        // nothing — which is the whole mechanism, and it did not work until it
        // was written down: the case set `vx` outright every tick, so the
        // Hook's impulse was overwritten on the frame it landed and the thing
        // oscillated on the waterline forever. Measured: nine hundred ticks of
        // a Scribe holding every letter in the game, and not one shell.
        if (husk.struck > 0) {
          husk.vx *= 0.98;
          husk.vy = inWater(world, husk) ? 0 : Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
          break;
        }
        if (inWater(world, husk)) {
          husk.vx = Math.sign(toward || 1) * spec.speed;
          // Rides just under the surface rather than the bottom: a thing at the
          // bottom of a pool is a thing nothing can reach, which is a wall.
          const overhead = inWaterAt(world, husk.x + husk.w / 2, husk.y - TILE_SIZE);
          husk.vy = overhead ? -spec.speed * 0.7 : spec.speed * 0.3;
        } else {
          husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
          husk.vx = Math.sign(husk.home.x - husk.x) * spec.speed * 0.55;
        }
        break;
      }

      // **Behemoth.** הָעֹשׂוֹ יַגֵּשׁ חַרְבּוֹ — only the one who made him can bring
      // a blade near him, so the answer is not a blade. It runs, and the walls
      // of the room do not stop it: it turns at them, because it is vast rather
      // than stupid. **Only a stone the Scribe set stops it**, and only while
      // it is stopped is there anything to write on.
      case "behemot": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        if (husk.cooldown > 0) {
          husk.vx = 0;
          break;
        }
        if (husk.charging <= 0) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.charging = 240;
        }
        husk.charging -= 1;
        husk.vx = husk.facing * spec.speed;
        const nose = tile(husk.x + (husk.facing > 0 ? husk.w + 3 : -3));
        const ahead = tileAt(world, nose, tile(husk.y + husk.h / 2));
        if (ahead === Tile.Placed) {
          husk.charging = 0;
          husk.cooldown = 120;
          husk.vx = 0;
          say(world, "It goes into what was set in its way, and stops.");
        } else if (isSolid(ahead, solidFor(world, ctx))) {
          husk.facing = (husk.facing * -1) as 1 | -1;
        }
        break;
      }

      // **The Ziz.** It never comes down — it holds the roof and follows, and
      // once in a while it stoops. Whether you can reach it is a question about
      // how far you can throw, and there is exactly one letter about that.
      case "ziz": {
        // **It never comes down**, and that is not flavour — it is the gate.
        // A stoop was tried and thrown away: anything that dives at the Scribe
        // comes inside the reach of an ordinary mark on the way, which hands
        // the fight to a Scribe with no Staff and makes the letter a
        // suggestion. So it holds its height and drops what it is carrying,
        // and the only question left is how far you can throw.
        /**
         * **It crosses; it does not hover.** The line above is the design and
         * it is kept — what changes is that it used to fly *at* the Scribe's
         * column and sit there, which is the one place in the room a mark can
         * never arrive: a mark aimed up climbs diagonally, so from directly
         * beneath something eight tiles up there is no throw that reaches, at
         * any reach. The creature was removing its own window.
         *
         * That went unseen because a mark that pierced was not consumed by what
         * it hit and struck the same body every tick it was inside it — so the
         * single contact the Scribe got on the *approach*, while the angle was
         * still open, took all six shells at once. With one hit per mark the
         * fight needs three of those windows, and the Ziz was granting one.
         *
         * So it holds a heading, turns at the walls, and turns again once it is
         * well past the Scribe — a bird patrolling a roof. Every crossing is a
         * window at exactly the distance the Staff was made for, which is the
         * fight the line describes and a great deal closer to it than parking
         * overhead was.
         */
        const roof = husk.home.y;
        const edge = TILE_SIZE * 3;
        const far = world.width * TILE_SIZE - edge;
        /**
         * **It turns at the walls and nowhere else.**
         *
         * The first version also turned once it was well past the Scribe, which
         * looks like the same thing and is not: against a wall there is no room
         * to *get* past him, so it turned at once and hung there — inside the
         * one distance a mark aimed up can never reach. Traced at eleven
         * shells: three hits in the first five hundred ticks while it was still
         * crossing, then twenty thousand with the Scribe pinned in the corner
         * and the bird oscillating overhead.
         *
         * A full sweep gives a window on every pass, wherever the Scribe is
         * standing, which is what the line always described — it holds its
         * height and crosses, and the only question is how far you can throw.
         */
        if (husk.x < edge) husk.facing = 1;
        else if (husk.x + husk.w > far) husk.facing = -1;
        husk.vx = husk.facing * spec.speed;
        husk.vy = Math.max(-spec.speed, Math.min(spec.speed, (roof - husk.y) * 3));
        if (husk.cooldown === 0 && spec.throws) {
          husk.cooldown = spec.throws;
          world.marks.push({
            id: `z${world.tick}-${husk.id}`,
            mine: false,
            x: husk.x + husk.w / 2 - MARK_SIZE / 2,
            y: husk.y + husk.h,
            w: MARK_SIZE,
            h: MARK_SIZE,
            vx: 0,
            vy: 150,
            life: 200,
            pierces: false,
            bite: 1,
            draws: false,
            glyph: "ז",
          });
          say(world, "It lets something fall.");
        }
        break;
      }
    }

    moveHusk(world, ctx, husk);

    // **A guardian holds its own room.** The seal is held on the room's
    // *assignment* — `room.husks` names the creature whether or not it is
    // standing there — and a sealed mouth is solid, so a guardian that
    // wandered out before the way closed can never come back: the Scribe is
    // shut in an empty room whose door only the absent creature can open,
    // and an arena has no hazard, so not even a veiling can lift it. Both
    // fast movers did exactly that — Behemoth's charge crossed the porch
    // toward a walking Scribe before the Scribe reached the room, and the
    // Ziz followed the Scribe back over it. Photographed rather than
    // deduced: the arenas sheet showed Keter's room closed and empty. The
    // duel probe never saw it because it starts inside the room; a player
    // walks in. Hitting the bound reads as hitting a wall, which is a thing
    // every guardian already knows how to do.
    //
    // The Ziz is exempt, for both halves of the reason. It cannot be sealed
    // out — it patrols at roof height, above the mouths the seal writes
    // across, and measured from a walking entry it re-enters the sealed room
    // on every pass — and it must not be turned at the room's edge: its own
    // case turns at the *world's* walls precisely so that every sweep gets
    // past the Scribe, and turning it early is the corner-hover its comment
    // records killing, the bird hanging inside the one distance a mark aimed
    // up can never reach.
    if (world.arena && husk.kind !== "ziz") {
      const own = world.rooms.find((r) => r.husks.includes(husk.id));
      if (own) {
        const left = own.x * TILE_SIZE;
        const right = (own.x + own.w) * TILE_SIZE - husk.w;
        if (husk.x < left) {
          husk.x = left;
          husk.vx = Math.abs(husk.vx);
          husk.facing = 1;
        } else if (husk.x > right) {
          husk.x = right;
          husk.vx = -Math.abs(husk.vx);
          husk.facing = -1;
        }
      }
    }

    if (p.veiled === 0 && !world.out && harmful(husk, world) && bodiesTouch(husk, p)) {
      // Almost all of them take a lamp, because that is what a husk is.
      // Delilah takes what you gathered instead — nothing you feel at the time.
      if (spec.takes === "light") coax(world, husk);
      else wound(world, ctx, p.x < husk.x ? -1 : 1);
    }
  }
  world.husks = world.husks.filter((h) => !h.broken);
}

/** Pixels to the tile they fall in. Written out often enough to want a name. */
const tile = (px: number) => Math.floor(px / TILE_SIZE);

/** The stone test as a klipah sees it — never crawling, and the Eye is the Scribe's. */
const solidFor = (world: World, ctx: StepContext) => ({
  verbs: ctx.verbs,
  crawling: false,
  revealed: world.revealed,
});

/**
 * Walking a ledge and turning at its edge — the oldest of the behaviours, and
 * now shared, because eight of the twenty do it when they are doing nothing else.
 */
function pace(world: World, ctx: StepContext, husk: Husk, speed: number, gentle = false): void {
  const spec = HUSKS[husk.kind];
  if (!gentle) husk.vx = husk.facing * speed;
  const aheadX = Math.floor((husk.x + (husk.facing > 0 ? husk.w + 2 : -2)) / TILE_SIZE);
  const footRow = Math.floor((husk.y + husk.h + 2) / TILE_SIZE);
  const floor = tileAt(world, aheadX, footRow);
  const wall = tileAt(world, aheadX, Math.floor((husk.y + husk.h / 2) / TILE_SIZE));
  const solid = { verbs: ctx.verbs, crawling: false, revealed: world.revealed };
  if ((floor === Tile.Empty && !isLedge(floor)) || isSolid(wall, solid)) {
    husk.facing = (husk.facing * -1) as 1 | -1;
  }
  husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
  void spec;
}

/**
 * Korach's three phases, in ticks: the rise out of the ground, and the while he
 * is left standing in the open afterwards.
 *
 * **`RISE` is a distance, not a duration**, and that is why it is fifty-four
 * rather than the forty-two it was. It surfaces two and a half tiles beneath
 * the Scribe's feet and climbs at ninety-five a second, so forty-two ticks
 * carried it to the Scribe's *waist* and stopped — the creature stood there in
 * the open with its head two pixels under a flat mark's line, and every mark
 * ever thrown at it sailed over. Fifty-four ticks is the Scribe's own height
 * plus the ground it started under, which puts it on the floor he is standing
 * on. Measured: an aiming Scribe went from never breaking one in four thousand
 * ticks to breaking one in ninety-six.
 *
 * `SETTLE` is the other half. Ninety ticks is a second and a half — long enough
 * that a Scribe who is looking has time to answer, short enough that it is not
 * simply a pacer with an entrance. Against `throws: 345` the two together take
 * the creature from sixteen per cent of its life above ground to forty-three.
 *
 * Three phases because burrowing is the third: rise, stand, and go back under.
 */
const RISE = 54;
const SETTLE = 90;

/**
 * How deep under the surface an eruption begins.
 *
 * `RISE` ticks at ninety-five a second carry it eighty-five and a half pixels,
 * so it comes up through this sixty and stands a quarter of a tile proud of the
 * ground — which is not slack, it is where a flat mark flies. That was measured
 * the hard way once already: at forty-two ticks the rise stopped at the
 * Scribe's waist, two pixels under the line, and every mark ever thrown at the
 * creature sailed over it. **Do not tidy the overshoot away.** Tried, and the
 * bench went straight back to never breaking one.
 */
const DEPTH = TILE_SIZE * 2.5;

/**
 * The top of the ground beneath a point — the surface an eruption would come
 * through, or `undefined` if there is nothing under it worth calling earth.
 *
 * Ledges count, and that is deliberate: a ledge is ground you are standing on,
 * and Korach passes through everything anyway, so what this is really asking is
 * "is there a floor here to open" rather than "would a body be stopped".
 */
function surfaceUnder(
  world: World,
  ctx: StepContext,
  x: number,
  fromY: number,
  within = 8,
): number | undefined {
  const solid = { verbs: ctx.verbs, crawling: false, revealed: world.revealed };
  const column = Math.floor(x / TILE_SIZE);
  const first = Math.floor(fromY / TILE_SIZE);
  for (let row = first; row <= first + within; row += 1) {
    const tile = tileAt(world, column, row);
    if (isSolid(tile, solid) || isLedge(tile)) return row * TILE_SIZE;
  }
  return undefined;
}

/**
 * How long a Saraf's fire stays on the ground where it was laid, against a
 * `throws: 90` cadence — two-thirds of a second alight, a second and a half
 * between. It was a hundred and fifty ticks laid every twenty-two, which put
 * seven fires down at once and meant the ground around the creature was never
 * not burning: measured, that made Tiferet end fifty-three per cent of all
 * walks against four to nineteen everywhere else. A trail with gaps in it is
 * the thing its own line always described.
 */
const SARAF_FIRE = 40;

/** The nearest loose mote, for the klipah that hunts them. */
function nearestMote(world: World, husk: Husk): Entity | undefined {
  let best: Entity | undefined;
  let bestAt = Infinity;
  for (const e of world.entities) {
    if (e.kind !== "mote" || e.taken) continue;
    const at = Math.hypot(e.x - husk.x, e.y - husk.y);
    if (at < bestAt) {
      bestAt = at;
      best = e;
    }
  }
  return bestAt < TILE_SIZE * 14 ? best : undefined;
}

/** A husk is stopped by stone, and nothing else. */
function moveHusk(world: World, ctx: StepContext, husk: Husk): void {
  const solid = (x: number, y: number) => {
    const x0 = Math.floor(x / TILE_SIZE);
    const x1 = Math.floor((x + husk.w - 1) / TILE_SIZE);
    const y0 = Math.floor(y / TILE_SIZE);
    const y1 = Math.floor((y + husk.h - 1) / TILE_SIZE);
    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        if (isSolid(tileAt(world, tx, ty), { verbs: ctx.verbs, crawling: false, revealed: world.revealed })) {
          return true;
        }
      }
    }
    return false;
  };

  // Korach is inside the ground while it is under, which is the whole point of
  // it, so stone stops it only on the way up.
  const through = HUSKS[husk.kind].flies;

  const nextX = husk.x + husk.vx * DT;
  if (through || !solid(nextX, husk.y)) husk.x = nextX;
  else {
    husk.vx = 0;
    husk.facing = (husk.facing * -1) as 1 | -1;
  }

  const nextY = husk.y + husk.vy * DT;
  if (through || !solid(husk.x, nextY)) husk.y = nextY;
  else husk.vy = 0;
}
