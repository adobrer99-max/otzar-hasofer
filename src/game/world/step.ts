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
    (h) =>
      room.husks.includes(h.id) &&
      !h.broken &&
      // A door waits only on a klipah that will actually **come to you**: the
      // ones that commit to a charge, and the ones on foot that notice you at
      // all. Cain paces its ledge and has never looked up, and Athaliah is off
      // chasing the loose light — a door held shut by one of those is a door
      // held shut by something that may be on the far side of the room and is
      // not coming, which is the one thing sealing must never be.
      (HUSKS[h.kind].role === "charger" ||
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
    world.regionIndex > 1 &&
    !room.cleared &&
    !room.entrance &&
    room.kind !== "exit" &&
    room.kind !== "vessel";
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
  world.or = Math.max(0, world.or - world.veilCost);

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

    // Jezebel's marks bend after the Scribe rather than flying flat — she
    // never had to be near anything she did.
    if (m.seeks && !m.mine) {
      const dx = p.x + p.w / 2 - (m.x + m.w / 2);
      const dy = p.y + p.h / 2 - (m.y + m.h / 2);
      const at = Math.hypot(dx, dy) || 1;
      // Gently. A mark that turns hard enough never misses, and a projectile
      // that cannot be dodged is not a fight, it is a tax: measured at a fifth
      // of that rate it put a third of all runs out. This bends — it does not
      // follow.
      // Gently, and only at the start of its flight. A mark that turns hard
      // enough never misses, and a projectile that cannot be dodged is not a
      // fight but a tax: hers accounted for more lamps than the other nine
      // klipot together. It bends once, early, and then it is committed —
      // which is also what throwing something at somebody is like.
      if (m.life > 95) {
        m.vx += ((dx / at) * 200 - m.vx) * 0.03;
        m.vy += ((dy / at) * 200 - m.vy) * 0.03;
      }
    }

    if (m.mine) {
      for (const husk of world.husks) {
        if (husk.broken || submerged(husk) || !bodiesTouch(m, husk)) continue;
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
    });
  }
  // Named, because the naming is the point: a klipah is a husk *around*
  // something, and the something has a name in the sources.
  say(world, `${spec.name} breaks, and the light in it is yours.`);
}

/** Whether a klipah is inside the ground, where nothing reaches it. */
function submerged(husk: Husk): boolean {
  return husk.kind === "korach" && husk.charging === 0;
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
      // strike it in. Then it never stops.
      case "calf": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        if (husk.shells < spec.shells) {
          if (husk.charging === 0) husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.charging = 30;
          husk.vx = husk.facing * spec.speed;
        } else husk.vx = 0;
        break;
      }

      // **Esau.** A man of the field: he runs you down over open ground and
      // gives up the moment you are above him, having sold the higher thing
      // for the one in front of him and never learned to look up since.
      case "esav": {
        husk.vy = Math.min(husk.vy + GRAVITY * DT, MAX_FALL);
        const above = husk.y - (p.y + p.h);
        const far = Math.abs(husk.x - husk.home.x) > TILE_SIZE * 9;
        if (near < spec.notices && above < TILE_SIZE * 2 && !far) {
          husk.facing = (toward > 0 ? 1 : -1) as 1 | -1;
          husk.vx = husk.facing * spec.speed;
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
        if (Math.abs(toward) < TILE_SIZE && husk.cooldown === 0 && spec.throws) {
          husk.charging = 42;
          husk.cooldown = spec.throws;
          // **Under the feet, not in them.** Surfacing at the Scribe's own
          // height put the two bodies in the same place on the same tick, so
          // the earth opening cost a lamp with nothing to react to — measured,
          // Gevurah put eight runs in ten out. It comes up from below, and the
          // moment of rising is the moment to be somewhere else.
          husk.y = p.y + p.h + TILE_SIZE * 2.5;
        }
        break;
      }

      // **Jezebel.** She never went anywhere: everything she did she did at a
      // distance and by other hands. What she throws bends after you.
      case "izevel": {
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
    }

    moveHusk(world, ctx, husk);

    if (p.veiled === 0 && !world.out && !submerged(husk) && bodiesTouch(husk, p)) {
      // Almost all of them take a lamp, because that is what a husk is.
      // Delilah takes what you gathered instead — nothing you feel at the time.
      if (spec.takes === "light") coax(world, husk);
      else wound(world, ctx, p.x < husk.x ? -1 : 1);
    }
  }
  world.husks = world.husks.filter((h) => !h.broken);
}

/**
 * Walking a ledge and turning at its edge — the oldest of the behaviours, and
 * now shared, because four of the ten do it when they are doing nothing else.
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
