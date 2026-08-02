import type { Grace, Verb } from "../abilities";
import { setTile, tileAt } from "./build";
import { CHUNK_H } from "./chunks";
import { powersFrom } from "../items";
import {
  isClimbable,
  isHazard,
  isLedge,
  isSolid,
  isWater,
  Tile,
  TILE_SIZE,
} from "./tiles";
import type { Entity, Husk, Input, Player, World } from "./types";
import {
  canBeStruck,
  GOING_OUT,
  HUSKS,
  KNOCKBACK_X,
  KNOCKBACK_Y,
  MARK_COOLDOWN,
  MARK_SIZE,
  MARK_SPEED,
  markBite,
  markPowers,
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
const MESSAGE_TICKS = 200;

export interface StepContext {
  verbs: readonly Verb[];
  graces: readonly Grace[];
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
   * The vessels the Scribe carries. They change numbers — the mark's bite and
   * reach, the lamps, the light — and never grant a verb, which is the whole
   * line between an object and a letter. See `items.ts`.
   */
  items?: readonly string[];
  onFinish?: () => void;
}

const has = (ctx: StepContext, verb: Verb) => ctx.verbs.includes(verb);
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
  p.inWater = anyTile(world, p, isWater);
  const onVine = has(ctx, "climb") && anyTile(world, p, isClimbable);
  p.crouching = input.down && p.onGround && grace(ctx, "crawl");

  applyVerbs(world, input, ctx);

  if (p.inWater) {
    swimTick(p, input, ctx);
  } else if (onVine && (input.up || input.down || p.climbing)) {
    climbTick(p, input);
  } else {
    p.climbing = false;
    walkTick(world, p, input, ctx);
  }

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
  p.clinging = 0;
  if (!p.onGround && has(ctx, "wall-cling") && p.vy > 0) {
    const towardLeft = input.left && wallBeside(world, ctx, p, -1);
    const towardRight = input.right && wallBeside(world, ctx, p, 1);
    if (towardLeft) p.clinging = -1;
    if (towardRight) p.clinging = 1;
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
    return;
  }

  if (!input.act) return;

  // The Hook — cast to the nearest anchor within reach, preferring one ahead.
  if (has(ctx, "grapple") && !p.grappleTo && p.grappleCooldown === 0) {
    const anchor = nearestAnchor(world, p);
    if (anchor) {
      p.grappleTo = anchor;
      say(world, "The hook holds.");
      return;
    }
  }

  // The Edge, the Flame, the Door — each clears the barrier it answers.
  const cleared =
    (has(ctx, "cut") && clearAdjacent(world, p, Tile.Thorn, Tile.Empty, "The thorn parts.")) ||
    (has(ctx, "flame") && clearAdjacent(world, p, Tile.Growth, Tile.Empty, "The overgrowth burns back.")) ||
    (has(ctx, "open") && clearAdjacent(world, p, Tile.Door, Tile.Empty, "The door opens."));
  if (cleared) return;

  // The Eye — the hidden light was never absent, only unseen.
  if (has(ctx, "reveal") && !world.revealed) {
    world.revealed = true;
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
  if (collides(world, ctx, nextX, p.y + yOffset, p.w, height, p.crouching)) {
    const dir = Math.sign(stepX);
    // Back off to the tile boundary rather than to the previous position, so
    // a fast body ends flush against the wall instead of a pixel short.
    if (dir > 0) nextX = Math.floor((nextX + p.w) / TILE_SIZE) * TILE_SIZE - p.w - 0.01;
    else nextX = (Math.floor(nextX / TILE_SIZE) + 1) * TILE_SIZE + 0.01;
    if (collides(world, ctx, nextX, p.y + yOffset, p.w, height, p.crouching)) nextX = p.x;
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

  if (collides(world, ctx, p.x, nextY + yOffset, p.w, height, p.crouching)) {
    if (stepY > 0) {
      nextY = Math.floor((nextY + yOffset + height) / TILE_SIZE) * TILE_SIZE - height - yOffset - 0.01;
      landed = true;
    } else {
      nextY = (Math.floor((nextY + yOffset) / TILE_SIZE) + 1) * TILE_SIZE - yOffset + 0.01;
    }
    if (collides(world, ctx, p.x, nextY + yOffset, p.w, height, p.crouching)) nextY = previousY;
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
    if (solidAt(world, ctx, tx, row, p.crouching)) return true;
    if (!dropping && p.vy >= 0 && isLedge(tileAt(world, tx, row))) return true;
  }
  return false;
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
    (h) => room.husks.includes(h.id) && !h.broken && (h.kind === "crawler" || h.kind === "sentinel"),
  );
  const standing = holding.length > 0;

  if (!standing) {
    if (!room.cleared) {
      room.cleared = true;
      if (unseal(world, room)) say(world, "The room is quiet. The way opens.");
    }
    return;
  }

  // Not in the kingdom. Malchut is where the walk, the leap and the mark are
  // taught, and a room that closes on a Scribe who has not yet been told which
  // key writes is a locked door with the lesson on the other side of it.
  if (world.regionIndex <= 1) return;
  if (room.cleared || room.entrance || room.kind === "exit" || room.kind === "vessel") return;
  if (seal(world, room)) say(world, "The way closes. Something here is still holding light.");
}

function seal(world: World, room: World["rooms"][number]): boolean {
  let closed = false;
  for (const door of room.doors) {
    for (const tile of door.tiles) {
      if (tileAt(world, tile.x, tile.y) !== Tile.Empty) continue;
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
      case "vessel":
        e.taken = true;
        if (e.ref) ctx.onVessel?.(e.ref);
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
  world.or = Math.max(0, world.or - 2);

  // A veiling always opens the room. You wake at the mark, which is elsewhere,
  // and a room that stayed shut behind you would be a door nobody could ever
  // open again — the one way a sealed fight could become a lock.
  unseal(world, world.rooms[world.roomIndex]);

  const fork = world.fork;
  const returns = grace(ctx, "return") && fork && fork.x > world.respawn.x;
  world.wakeAt = returns ? { ...fork } : { ...world.respawn };
  say(world, `${message} You wake at ${returns ? "the fork" : "your mark"}.`);
}

function say(world: World, text: string): void {
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
  const powers = markPowers(ctx.verbs, ctx.graces, ctx.items);
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
    glyph: ctx.markGlyph ?? "א",
  });
  p.markCooldown = Math.max(4, Math.round(MARK_COOLDOWN * (powers.cooldown ?? 1)));
}

function stepMarks(world: World, ctx: StepContext): void {
  const p = world.player;
  for (const m of world.marks) {
    m.x += m.vx * DT;
    m.y += m.vy * DT;
    m.life -= 1;

    // Stone stops a mark. So does the edge of the world.
    const tx = Math.floor((m.x + m.w / 2) / TILE_SIZE);
    const ty = Math.floor((m.y + m.h / 2) / TILE_SIZE);
    if (isSolid(tileAt(world, tx, ty), { verbs: ctx.verbs, crawling: false, revealed: world.revealed })) {
      m.life = 0;
      continue;
    }

    if (m.mine) {
      for (const husk of world.husks) {
        if (husk.broken || !bodiesTouch(m, husk)) continue;
        if (!canBeStruck(hiddenAt(world, husk), ctx.verbs)) continue;
        strikeHusk(world, husk, m.bite, m.draws ? -1 : 1, m.x);
        if (!m.pierces) m.life = 0;
        break;
      }
    } else if (p.veiled === 0 && bodiesTouch(m, p)) {
      m.life = 0;
      wound(world, ctx, m.x < p.x ? 1 : -1);
    }
  }
  world.marks = world.marks.filter((m) => m.life > 0);
}

/** Whether a husk is standing in stone the Eye has not yet opened. */
function hiddenAt(world: World, husk: Husk): boolean {
  if (world.revealed) return false;
  const tx = Math.floor((husk.x + husk.w / 2) / TILE_SIZE);
  const ty = Math.floor((husk.y + husk.h / 2) / TILE_SIZE);
  return tileAt(world, tx, ty) === Tile.Veiled;
}

function strikeHusk(world: World, husk: Husk, bite: number, push: number, from: number): void {
  husk.shells -= bite;
  husk.struck = 8;
  husk.vx += push * (husk.x < from ? -1 : 1) * 90;
  if (husk.shells > 0) return;

  // The shell breaks, and what was held in it comes out. This is the whole
  // idea: the motes the Scribe has always gathered were inside something.
  husk.broken = true;
  world.husksBroken += 1;
  const spec = HUSKS[husk.kind];
  for (let i = 0; i < spec.light; i += 1) {
    world.entities.push({
      id: `e-husk-${world.tick}-${i}`,
      kind: "mote",
      x: husk.x + (i - spec.light / 2) * 9,
      y: husk.y - 4,
    });
  }
  say(world, "The shell breaks, and the light in it is yours.");
}

/** A lamp goes, and the Scribe is thrown clear. At zero he goes out. */
function wound(world: World, ctx: StepContext, away: 1 | -1): void {
  const p = world.player;
  const hit = takeHit(p.lamps, p.iframes, powersFrom(ctx.items ?? []).iframes);
  if (hit.lamps === p.lamps && !hit.out) return;
  p.lamps = hit.lamps;
  p.iframes = hit.iframes;
  p.vx = away * KNOCKBACK_X;
  p.vy = -KNOCKBACK_Y;
  p.dash = 0;
  p.grappleTo = undefined;
  if (hit.out) {
    world.out = true;
    say(world, GOING_OUT);
    return;
  }
  say(world, `A husk takes a lamp. ${p.lamps} left.`);
  void ctx;
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
      case "crawler": {
        // Walks its ledge and turns at the edge, having never looked up.
        husk.vx = husk.facing * spec.speed;
        const aheadX = Math.floor((husk.x + (husk.facing > 0 ? husk.w + 2 : -2)) / TILE_SIZE);
        const footRow = Math.floor((husk.y + husk.h + 2) / TILE_SIZE);
        const floor = tileAt(world, aheadX, footRow);
        const wall = tileAt(world, aheadX, Math.floor((husk.y + husk.h / 2) / TILE_SIZE));
        const solid = { verbs: ctx.verbs, crawling: false, revealed: world.revealed };
        if ((floor === Tile.Empty && !isLedge(floor)) || isSolid(wall, solid)) {
          husk.facing = (husk.facing * -1) as 1 | -1;
        }
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        break;
      }
      case "drifter": {
        // The ground means nothing to it: a slow arc about where it began.
        husk.vy = Math.sin(world.tick / 42 + husk.home.x) * spec.speed;
        husk.vx = Math.cos(world.tick / 60 + husk.home.x) * spec.speed;
        break;
      }
      case "spitter": {
        husk.vx = 0;
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
        if (near < spec.notices && husk.cooldown === 0 && spec.throws) {
          husk.cooldown = spec.throws;
          world.marks.push({
            id: `m${world.tick}-${husk.id}`,
            mine: false,
            x: husk.x + husk.w / 2,
            y: husk.y + husk.h / 3,
            w: MARK_SIZE,
            h: MARK_SIZE,
            vx: husk.facing * 165,
            vy: -40,
            life: 150,
            pierces: false,
            bite: 1,
            draws: false,
            glyph: "·",
          });
        }
        break;
      }
      case "sentinel": {
        // Still, until you are near enough. Then once, hard.
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        if (husk.charging > 0) {
          husk.charging -= 1;
          husk.vx = husk.facing * spec.speed;
        } else if (near < spec.notices && husk.cooldown === 0 && spec.throws) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.charging = 20;
          husk.cooldown = spec.throws;
        } else {
          husk.vx *= 0.86;
        }
        break;
      }
    }

    moveHusk(world, ctx, husk);

    if (p.veiled === 0 && !world.out && bodiesTouch(husk, p)) {
      wound(world, ctx, p.x < husk.x ? -1 : 1);
    }
  }
  world.husks = world.husks.filter((h) => !h.broken);
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

  const nextX = husk.x + husk.vx * DT;
  if (husk.kind === "drifter" || !solid(nextX, husk.y)) husk.x = nextX;
  else {
    husk.vx = 0;
    husk.facing = (husk.facing * -1) as 1 | -1;
  }

  const nextY = husk.y + husk.vy * DT;
  if (husk.kind === "drifter" || !solid(husk.x, nextY)) husk.y = nextY;
  else husk.vy = 0;
}
