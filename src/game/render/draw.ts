import { lettersById } from "../../data/letters";
import { rungRule } from "../rungRules";
import { tileAt } from "../world/build";
import { Tile, TILE_SIZE } from "../world/tiles";
import type { Entity, World } from "../world/types";
import { alpha, type Palette } from "./palette";
import { ROOM_H, ROOM_W } from "../world/rooms";
import { opened, unseen } from "../world/step";
import { recordPhase } from "../dev/probe";
import { faceCount, paletteKey, setFaceScale, stamp } from "./faces";
import { HUSKS } from "../combat";
import { paintHusk } from "./husks";

/**
 * The Ascent, drawn.
 *
 * Every mark on this canvas is procedural — there is not a single image
 * asset. That is partly practical (nothing to draw, nothing to load, nothing
 * to keep in sync) and mostly deliberate: the Herald and the Mizbe'ach are
 * both procedural plates in the same gold-on-charcoal canon, and the game had
 * to sit beside them rather than look like something bolted on. Stone is
 * hatched the way an engraver hatches; the letters are set in David Libre,
 * the same face the folio uses; the light the Scribe gathers is the same gold.
 */

export interface Camera {
  x: number;
  y: number;
  /** The room last framed, so a change of room can cut rather than sweep. */
  room?: number;
}

const HATCH_SPACING = 6;

/**
 * How far the held light reaches, in pixels, when the `light` grace is in
 * hand — the lamp's ordinary glow is 62. Four tiles: far enough that a mote
 * answers before the body arrives, near enough that the answering reads as
 * the lamp's doing rather than the world's.
 */
const LIT_REACH = TILE_SIZE * 4;

/**
 * How close the view sits to the Scribe.
 *
 * Drawn one-to-one, a wide canvas shows forty tiles at once and the Scribe is
 * a speck in a diagram. Scaling so that roughly twenty-six tiles span the view
 * puts the body at a size the eye can read — and, because the region is only
 * eighteen tiles tall, it also means the camera has somewhere vertical to go
 * instead of framing the whole map with a field of empty sky above it.
 */
const TILES_ACROSS = 26;

/**
 * The zoom that frames a **room**.
 *
 * A room is two screens across and one tall — 32×18 tiles, 768×432 px — and the
 * frame has to hold all of it, so the zoom is whichever axis is tighter. On a
 * 20:9 canvas that is the height, and the width then shows about forty tiles:
 * the room, with four tiles of its neighbours at each side. That overhang is
 * not slack, it is the whole reason the camera snaps at all — a door you can
 * see closing is worth more than a door you walk into.
 *
 * The old rule scaled to a fixed twenty-six tiles across and let the vertical
 * follow the body, which is right for a corridor and cannot frame a room.
 */
export function zoomFor(viewW: number, viewH?: number): number {
  if (viewH === undefined) return Math.max(1, Math.min(2.6, viewW / (TILES_ACROSS * TILE_SIZE)));
  return Math.max(
    0.6,
    Math.min(viewW / (ROOM_W * TILE_SIZE), viewH / (ROOM_H * TILE_SIZE)),
  );
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  palette: Palette,
  viewW: number,
  viewH: number,
  verbs: readonly string[],
  /**
   * Whether the Scribe holds the `light` grace — Yod's own, David's boon, and
   * the gesture of four festivals.
   *
   * **This parameter is the grace's first consumer.** It was declared, granted
   * and mapped from the day it existed, and nothing in the step, the fight or
   * the draw ever read it — Hanukkah's grace was inert, and David's "your lamp
   * reaches further" was a plate label about nothing. What it does is exactly
   * what both shipped texts promise and nothing more: the carried lamp's glow
   * reaches further, and motes inside that reach answer it. Pure appearance —
   * `step.ts` does not know it exists, so no measured band can move.
   */
  lit = false,
): void {
  const zoom = zoomFor(viewW, viewH);
  // The camera lives in world units, so the visible span shrinks as we zoom.
  const spanW = viewW / zoom;
  const spanH = viewH / zoom;

  ctx.save();
  // The margin arcades are drawn in screen space: they are the page behind the
  // world, not a thing standing in it, and must not scale with the terrain.
  drawBackground(ctx, camera, palette, viewW, viewH);

  ctx.scale(zoom, zoom);
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  const x0 = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
  const x1 = Math.min(world.width - 1, Math.ceil((camera.x + spanW) / TILE_SIZE) + 1);
  const y0 = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
  const y1 = Math.min(world.height - 1, Math.ceil((camera.y + spanH) / TILE_SIZE) + 1);

  // Faces are painted at the scale they will be stamped at, and the transform
  // in hand is the only honest source for it: the canvas has already been
  // scaled by the device pixel ratio, and the line above by the zoom.
  setFaceScale(ctx.getTransform().a);

  const tilesAt = import.meta.env.DEV ? performance.now() : 0;
  let tiles = 0;
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (tileAt(world, tx, ty) !== Tile.Empty) tiles += 1;
      drawTile(ctx, world, tx, ty, palette, verbs);
    }
  }
  if (import.meta.env.DEV) recordPhase("tiles", performance.now() - tilesAt, tiles);
  if (import.meta.env.DEV) recordPhase("faces", 0, faceCount());

  const restAt = import.meta.env.DEV ? performance.now() : 0;
  drawHusks(ctx, world, palette);
  drawMarks(ctx, world, palette);
  for (const entity of world.entities) {
    if (entity.x + TILE_SIZE < camera.x || entity.x > camera.x + spanW) continue;
    // A mote inside the held light's reach answers it — see `LIT_REACH`.
    // Computed here rather than in `drawEntity` because only this loop has
    // both bodies in hand, and only motes answer: a letter or a vessel
    // glowing brighter for a grace would say the grace does something to
    // them, and it does not.
    const glows =
      lit &&
      entity.kind === "mote" &&
      Math.abs(entity.x + TILE_SIZE / 2 - (world.player.x + world.player.w / 2)) < LIT_REACH &&
      Math.abs(entity.y + TILE_SIZE / 2 - (world.player.y + world.player.h / 2)) < LIT_REACH;
    drawEntity(ctx, entity, palette, world.tick, glows);
  }

  drawGrapple(ctx, world, palette);
  drawScribe(ctx, world, palette, lit);
  if (import.meta.env.DEV) recordPhase("bodies", performance.now() - restAt, 0);
  ctx.restore();

  // Last, and in screen space: the room is the lit panel.
  dimBeyondTheRoom(ctx, world, camera, palette, viewW, viewH, zoom);
}

// ---------------------------------------------------------------------------
// ground and sky
// ---------------------------------------------------------------------------

/**
 * A number in `[0, 1)` from a pair of integers, stable forever.
 *
 * Everything in the margin has to vary and nothing in it may *shimmer*: the
 * background is redrawn sixty times a second and a random leaf is a leaf that
 * is somewhere else on the next frame. So the variation is a hash of where the
 * thing is, which makes the same bough grow the same way every time it drifts
 * past and costs nothing to store.
 */
function jitter(a: number, b: number): number {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/**
 * **The margin is the Tree.**
 *
 * It was an arcade — distant arches and a nearer band of columns, drifting at a
 * fraction of the camera. Good drawing, and it was the wrong subject: a Scribe
 * on this ground is walking a *path of the Tree*, and the thing behind them was
 * a cloister.
 *
 * Nothing about the hand changes. An illuminated margin is full of foliage —
 * vine-scroll, rinceau, acanthus running up a border — so the same thin gold
 * line at the same low alphas draws boughs instead of arches, and the canon and
 * the subject stop pulling against each other.
 *
 * Three layers, slowest first, and the slowest one is the point: **a great limb
 * passes now and again**, far enough back to be almost nothing, and it is what
 * says this ground is up in something rather than out in the open.
 */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  palette: Palette,
  viewW: number,
  viewH: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, palette.bgDeep);
  sky.addColorStop(1, palette.bg);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);

  const ink = (at: number) => alpha(palette.gold, palette.light ? at * 3.6 : at);

  // --- the great limbs, furthest back and slowest ---------------------------
  //
  // One every eleven hundred pixels of world, rising from below the frame and
  // leaning off to one side, with two boughs off it. Drawn thick and nearly
  // invisible, because what it is doing is giving the emptiness a scale.
  const farDrift = camera.x * 0.1;
  const trunkEvery = 1100;
  ctx.strokeStyle = ink(0.075);
  ctx.lineCap = "round";
  for (let i = -1; i < viewW / trunkEvery + 2; i += 1) {
    const base = i * trunkEvery - (farDrift % trunkEvery);
    const seed = Math.floor((farDrift + base) / trunkEvery);
    const lean = (jitter(seed, 3) - 0.5) * viewW * 0.45;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(base, viewH * 1.05);
    ctx.quadraticCurveTo(base + lean * 0.4, viewH * 0.5, base + lean, -viewH * 0.15);
    ctx.stroke();
    ctx.lineWidth = 11;
    for (const side of [-1, 1]) {
      const at = 0.3 + jitter(seed, side) * 0.35;
      const fromX = base + lean * at;
      const fromY = viewH * (1.05 - at * 1.2);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.quadraticCurveTo(
        fromX + side * 150,
        fromY - 40,
        fromX + side * 300,
        fromY - 130 - jitter(seed, side * 7) * 80,
      );
      ctx.stroke();
    }
  }

  // --- boughs across the frame, with leaves ---------------------------------
  //
  // **At any height, not only near the top**, which was the first version and
  // read as a border rather than a place: a Scribe on a three-row rung stood in
  // a bare lower half with a canopy printed above it. Limbs cross a tree at
  // every height, and on the corridors the low ones are simply behind the
  // floor, which is what being inside something looks like.
  const drift = camera.x * 0.24;
  const boughEvery = 260;
  ctx.lineWidth = 3;
  ctx.strokeStyle = ink(0.085);
  for (let i = -1; i < viewW / boughEvery + 2; i += 1) {
    const bx = i * boughEvery - (drift % boughEvery);
    const seed = Math.floor((drift + bx) / boughEvery);
    const top = viewH * (0.04 + jitter(seed, 11) * 0.72);
    const dip = 40 + jitter(seed, 13) * 70;
    ctx.beginPath();
    ctx.moveTo(bx - 30, top);
    ctx.quadraticCurveTo(bx + boughEvery / 2, top + dip, bx + boughEvery + 30, top);
    ctx.stroke();
    // Two leaves on it, on alternating sides, angled with the bough.
    for (const t of [0.34, 0.68]) {
      const lx = bx + boughEvery * t;
      const ly = top + dip * (1 - (2 * t - 1) ** 2);
      leaf(ctx, lx, ly + 6, 9, 4, (jitter(seed, t * 100) - 0.5) * 1.6, ink(0.11));
    }
  }

  // --- tendrils hanging nearer, faster --------------------------------------
  //
  // The vine-scroll of a border: down, then a curl. It is the one element that
  // moves quickly enough to be *felt* rather than seen, which is what a near
  // parallax layer is for.
  const drift2 = camera.x * 0.5;
  const vineEvery = 118;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = ink(0.1);
  for (let i = -1; i < viewW / vineEvery + 2; i += 1) {
    const slot = i * vineEvery - (drift2 % vineEvery);
    const seed = Math.floor((drift2 + slot) / vineEvery);
    // **Off the grid.** Evenly spaced verticals of even length read as rain,
    // which is what the first pass looked like on the vellum ground. A third of
    // a slot of wander and a curl that actually curls make them a scroll.
    const vx = slot + (jitter(seed, 41) - 0.5) * vineEvery * 0.7;
    const drop = viewH * (0.2 + jitter(seed, 5) * 0.5);
    const curl = (jitter(seed, 17) - 0.5) * 96;
    ctx.beginPath();
    ctx.moveTo(vx, 0);
    ctx.bezierCurveTo(
      vx - curl * 0.5,
      drop * 0.35,
      vx + curl,
      drop * 0.7,
      vx + curl * 0.8,
      drop,
    );
    ctx.quadraticCurveTo(vx + curl * 1.5, drop + 26, vx + curl * 0.2, drop + 32);
    ctx.stroke();
    if (jitter(seed, 23) > 0.45) {
      leaf(ctx, vx + curl * 0.85, drop * 0.72, 7, 3, curl > 0 ? 0.7 : -0.7, ink(0.12));
    }
  }

  // --- and what climbs up from below ----------------------------------------
  //
  // The same scroll the other way. Only visible where the ground opens — a
  // shaft, a pit, the gap a Scribe is about to cross — which is exactly where a
  // player is looking down and wondering how far it goes.
  const upEvery = 173;
  ctx.strokeStyle = ink(0.075);
  for (let i = -1; i < viewW / upEvery + 2; i += 1) {
    const slot = i * upEvery - ((drift2 * 0.8) % upEvery);
    const seed = Math.floor((drift2 * 0.8 + slot) / upEvery) + 91;
    const vx = slot + (jitter(seed, 43) - 0.5) * upEvery * 0.7;
    const rise = viewH * (0.25 + jitter(seed, 7) * 0.5);
    const curl = (jitter(seed, 19) - 0.5) * 88;
    ctx.beginPath();
    ctx.moveTo(vx, viewH);
    ctx.bezierCurveTo(
      vx - curl * 0.5,
      viewH - rise * 0.35,
      vx + curl,
      viewH - rise * 0.7,
      vx + curl * 0.8,
      viewH - rise,
    );
    ctx.stroke();
    if (jitter(seed, 29) > 0.5) {
      leaf(ctx, vx + curl * 0.7, viewH - rise * 0.78, 7, 3, curl > 0 ? -0.7 : 0.7, ink(0.1));
    }
  }
  ctx.lineCap = "butt";
}

/** One leaf, filled, turned to sit on whatever it grows out of. */
function leaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  fill: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// tiles
// ---------------------------------------------------------------------------

function drawTile(
  ctx: CanvasRenderingContext2D,
  world: World,
  tx: number,
  ty: number,
  palette: Palette,
  verbs: readonly string[],
): void {
  const tile = tileAt(world, tx, ty);
  if (tile === Tile.Empty) return;
  const x = tx * TILE_SIZE;
  const y = ty * TILE_SIZE;

  switch (tile) {
    case Tile.Stone:
      drawStone(ctx, world, tx, ty, x, y, palette);
      break;
    case Tile.Maskit:
      drawMaskit(ctx, world, tx, ty, x, y, palette);
      break;
    case Tile.Placed:
      drawPlacedStone(ctx, x, y, palette);
      break;
    case Tile.Ledge:
      drawLedge(ctx, tx, ty, x, y, palette);
      break;
    case Tile.Water:
      drawWater(ctx, world, tx, ty, x, y, palette);
      break;
    case Tile.Thorn:
      drawThorn(ctx, x, y, palette);
      break;
    case Tile.Growth:
      drawGrowth(ctx, x, y, palette);
      break;
    case Tile.Vine:
      drawVine(ctx, x, y, palette, verbs.includes("climb"));
      break;
    case Tile.Veiled:
      drawVeiled(ctx, x, y, palette, world.revealed);
      break;
    case Tile.Door:
      drawDoor(ctx, x, y, palette);
      break;
    case Tile.Anchor:
      drawAnchor(ctx, x, y, palette, world.tick);
      break;
    case Tile.LowGap:
      drawLowGap(ctx, x, y, palette);
      break;
    case Tile.WordGate:
      drawWordGate(ctx, x, y, palette, world.tick);
      break;
    case Tile.Seal:
      drawSeal(ctx, x, y, palette, world.tick);
      break;
    default:
      break;
  }
}

/**
 * A door that closed behind you. Drawn as light drawn across the opening
 * rather than as stone: it is not masonry, it is the room holding its breath,
 * and it has to read as something that will lift rather than something that
 * was always there.
 */
function drawSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  palette: Palette,
  tick: number,
): void {
  const breathe = 0.55 + Math.sin(tick / 22) * 0.12;
  ctx.fillStyle = alpha(palette.gold, breathe * (palette.light ? 0.22 : 0.16));
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = alpha(palette.gold, breathe);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + TILE_SIZE / 2);
  ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE / 2);
  ctx.stroke();
}

/**
 * **The two inks a stone is marked with**, in one place because the whole of
 * P13e's finding was that on one ground they were the same ink.
 *
 * `hatch` is the engraver's hatching on any stone with air above it. `seam` is
 * the single curved line that says a stone is figured — `Tile.Maskit` — and it
 * is the only thing distinguishing a lie in the floor from the floor.
 *
 * The hatch expression used to be written out twice, once in `drawStone` and
 * once in `drawMaskit`, and the seam was written to sit *beside* one of those
 * copies rather than against it: on vellum both were `stoneEdge`, at 0.75 and
 * 0.55. A line in the same colour and at the same angle as the fifteen around
 * it is not a mark, and measurement agreed — the loudest thing on a figured
 * tile came out quieter than the plain stone beside it.
 *
 * The rule this now has a name for: **the seam runs against the hatch.** Dark
 * where the hatching is pale, so a body that stops and looks can find it.
 */
export function stoneInks(palette: Palette): { hatch: string; seam: string } {
  return {
    hatch: alpha(palette.light ? palette.stoneEdge : palette.gold, palette.light ? 0.55 : 0.16),
    seam: alpha(palette.light ? palette.text : palette.bgDeep, palette.light ? 0.5 : 0.75),
  };
}

function drawStone(
  ctx: CanvasRenderingContext2D,
  world: World,
  tx: number,
  ty: number,
  x: number,
  y: number,
  palette: Palette,
): void {
  // Engraver's hatching, only where the stone is actually exposed to the air —
  // buried tiles stay flat, which keeps a thick floor from turning into noise.
  const openAbove = tileAt(world, tx, ty - 1) === Tile.Empty;

  /**
   * **The face, which is everything that is the same on every stone.** The
   * fill, the hatching, the lit top edge and the border do not know where the
   * tile is — only whether the air is above it — so they are painted once per
   * palette and stamped after that. See `faces.ts` for the measurement that
   * asked for this.
   */
  stamp(ctx, `stone|${paletteKey(palette)}|${openAbove}`, x, y, (c) => {
    c.fillStyle = palette.stone;
    c.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    if (openAbove) {
      c.save();
      c.beginPath();
      c.rect(0, 0, TILE_SIZE, TILE_SIZE);
      c.clip();
      c.strokeStyle = stoneInks(palette).hatch;
      c.lineWidth = 1;
      for (let i = -TILE_SIZE; i < TILE_SIZE; i += HATCH_SPACING) {
        c.beginPath();
        c.moveTo(i, TILE_SIZE);
        c.lineTo(i + TILE_SIZE, 0);
        c.stroke();
      }
      c.restore();

      c.strokeStyle = palette.gold;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(0, 0.75);
      c.lineTo(TILE_SIZE, 0.75);
      c.stroke();
    }
    c.strokeStyle = alpha(palette.stoneEdge, 0.85);
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  });

  if (openAbove) {
    // **What has grown on the lit edge.** Two or three fine blades on about a
    // third of the exposed tiles, seeded off the tile's own coordinates so the
    // same stone is mossed the same way every time it is drawn.
    //
    // Kept fine and kept faint on purpose. Thorn is the one tile in this game
    // that costs a Scribe something on contact and it is drawn as spikes on
    // the floor, so anything standing up off a *safe* floor has to be legibly
    // not that: half the height, a third of the weight, and bent.
    if (jitter(tx, ty) > 0.62) {
      ctx.strokeStyle = alpha(palette.gold, palette.light ? 0.5 : 0.3);
      ctx.lineWidth = 0.9;
      const blades = 2 + Math.floor(jitter(tx, ty + 5) * 2);
      for (let i = 0; i < blades; i += 1) {
        const bx = x + 4 + jitter(tx + i, ty) * (TILE_SIZE - 8);
        const h = 3 + jitter(tx, ty + i * 3) * 3;
        const bend = (jitter(tx + i * 7, ty) - 0.5) * 4;
        ctx.beginPath();
        ctx.moveTo(bx, y + 1);
        ctx.quadraticCurveTo(bx + bend * 0.4, y + 1 - h * 0.6, bx + bend, y + 1 - h);
        ctx.stroke();
      }
    }
  }
}

/**
 * **אֶבֶן מַשְׂכִּית** — a stone made to be looked at, and not to be gone down upon.
 *
 * Drawn as stone, because it *is* stone until somebody stands on it, and a trap
 * a player can see from across the room is furniture. What it gets instead is
 * one hairline: a fine seam across it where the grain of the hatching should
 * run and doesn't, and no moss, because nothing has ever grown on it.
 *
 * That is the fair-trap standard and it is worth being exact about. The seam is
 * legible to a player who has already been dropped once and is now *looking*,
 * and invisible to one who is running — which is the difference between a trap
 * that teaches you to read the floor and a trap that teaches you to distrust
 * the game. Being un-mossed is the honest half of the tell: the moss is
 * everywhere else and its absence is a shape.
 */
function drawMaskit(
  ctx: CanvasRenderingContext2D,
  world: World,
  tx: number,
  ty: number,
  x: number,
  y: number,
  palette: Palette,
): void {
  /**
   * **Binah's rule, tier one** (P15-R6): on ground bound for Understanding
   * the lie is *laid bare* — the seam drawn in the palette's truest ink at
   * full strength and double weight, the hatch thinned to a whisper so
   * nothing competes with it, both grounds alike. No letter is needed for
   * this half of the rule: Binah tells the truth about its floor, and the
   * ground still charges a runner who ignores what is shown. Ink only —
   * the tile, its solidity and its spring are exactly what they are
   * everywhere else until the Eye is open.
   */
  const bare = Boolean(world.toward && rungRule(world.toward)?.liesLaidBare);
  ctx.fillStyle = palette.stone;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.clip();
  ctx.strokeStyle = bare
    ? alpha(palette.light ? palette.stoneEdge : palette.gold, palette.light ? 0.28 : 0.08)
    : stoneInks(palette).hatch;
  ctx.lineWidth = 1;
  for (let i = -TILE_SIZE; i < TILE_SIZE; i += HATCH_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + TILE_SIZE);
    ctx.lineTo(x + i + TILE_SIZE, y);
    ctx.stroke();
  }
  /**
   * The seam. One line where the hatch should be, and the only thing on the
   * whole tile that is not what stone looks like.
   *
   * **It has to run against the hatch, not along it.** On charcoal it always
   * did: the hatch is `gold` and the seam is `bgDeep`, a dark line through pale
   * ones, and the tile's loudest mark by a clear margin. On vellum the seam was
   * drawn in `stoneEdge` — *the very colour the hatch is drawn in* — at 0.75
   * against the hatch's 0.55. One line slightly more opaque than the fifteen
   * beside it, in the same ink, at the same angle.
   *
   * Photographed and measured rather than argued: on the vellum ground the
   * strongest departure from the stone anywhere on a figured tile was 1.54,
   * against 1.57 on an ordinary hatched tile beside it. The seam was quieter
   * than the texture it was hiding in — which is not a stone made to be looked
   * at, it is a stone nobody can look at. `Tile.Maskit` asks to be legible to
   * someone who has been dropped once and is now looking; on half the grounds
   * this game ships, there was nothing there to find.
   *
   * So vellum gets true ink, the way charcoal gets true shadow: the darkest
   * thing in the palette, running the other way from the hatch.
   */
  ctx.strokeStyle = bare
    ? alpha(palette.light ? palette.text : palette.bgDeep, 1)
    : stoneInks(palette).seam;
  ctx.lineWidth = bare ? 2.2 : 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 6.5);
  ctx.quadraticCurveTo(x + TILE_SIZE / 2, y + 9, x + TILE_SIZE - 3, y + 5.5);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 0.75);
  ctx.lineTo(x + TILE_SIZE, y + 0.75);
  ctx.stroke();

  ctx.strokeStyle = alpha(palette.stoneEdge, 0.85);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  void world;
  void tx;
  void ty;
}

function drawPlacedStone(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
  // The whole of this tile is a function of the palette, so it is painted
  // once and stamped — see `faces.ts`. The painter is unchanged; it is
  // handed an origin instead of a position.
  stamp(ctx, `placed|${paletteKey(palette)}`, x, y, (c) => paintPlacedStone(c, palette));
}

function paintPlacedStone(ctx: CanvasRenderingContext2D, palette: Palette): void {
  const x = 0;
  const y = 0;

  ctx.fillStyle = alpha(palette.gold, 0.2);
  ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  ctx.strokeStyle = palette.goldBright;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1.5, y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
  glyph(ctx, "ב", x + TILE_SIZE / 2, y + TILE_SIZE / 2, 13, palette.goldBright);
}

/**
 * A ledge — solid from above, passable from below.
 *
 * Drawn as a slender bough rather than a shelf with three brackets under it,
 * which is the same affordance said in the language the rest of the ground now
 * speaks: a line you can stand on, with nothing holding it up, and two leaves
 * to say what it is. The **top edge stays dead straight** and stays the
 * brightest thing on the tile, because that edge is the collision and a bough
 * that visibly sagged would be a bough a Scribe misjudges.
 */
function drawLedge(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  x: number,
  y: number,
  palette: Palette,
): void {
  // The standing edge and its underside are the same on every ledge; the leaf
  // is seeded from the tile and stays live. See `faces.ts`.
  stamp(ctx, `ledge|${paletteKey(palette)}`, x, y, (c) => {
    c.strokeStyle = palette.gold;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 3);
    c.lineTo(TILE_SIZE, 3);
    c.stroke();

    // The underside tapers away from the standing edge — bark, not masonry.
    c.strokeStyle = alpha(palette.gold, 0.35);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 5.5);
    c.quadraticCurveTo(TILE_SIZE / 2, 7.5, TILE_SIZE, 5.5);
    c.stroke();
  });

  if (jitter(tx, ty + 31) > 0.5) {
    const side = jitter(tx + 3, ty) > 0.5 ? 1 : -1;
    leaf(
      ctx,
      x + TILE_SIZE / 2 + side * 6,
      y + 9,
      6,
      2.6,
      side * 0.6,
      alpha(palette.gold, palette.light ? 0.55 : 0.34),
    );
  }
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  world: World,
  tx: number,
  ty: number,
  x: number,
  y: number,
  palette: Palette,
): void {
  // The body of the water is one flat colour; only the surface moves, and it
  // moves with the tick, so it stays live. See `faces.ts`.
  stamp(ctx, `water|${paletteKey(palette)}`, x, y, (c) => {
    c.fillStyle = alpha(palette.blue, palette.light ? 0.32 : 0.55);
    c.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  });

  if (tileAt(world, tx, ty - 1) !== Tile.Water) {
    // The surface: a slow, drawn wave rather than an animated shimmer.
    ctx.strokeStyle = alpha(palette.blueBright, 0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const phase = (world.tick / 26 + tx * 0.7) % (Math.PI * 2);
    for (let i = 0; i <= TILE_SIZE; i += 3) {
      const wy = y + 3 + Math.sin(phase + i / 7) * 1.6;
      if (i === 0) ctx.moveTo(x + i, wy);
      else ctx.lineTo(x + i, wy);
    }
    ctx.stroke();
  }
}

function drawThorn(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
  // The whole of this tile is a function of the palette, so it is painted
  // once and stamped — see `faces.ts`. The painter is unchanged; it is
  // handed an origin instead of a position.
  stamp(ctx, `thorn|${paletteKey(palette)}`, x, y, (c) => paintThorn(c, palette));
}

function paintThorn(ctx: CanvasRenderingContext2D, palette: Palette): void {
  const x = 0;
  const y = 0;

  ctx.strokeStyle = palette.copper;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + TILE_SIZE / 2, y);
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  for (let i = 3; i < TILE_SIZE; i += 6) {
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE / 2, y + i);
    ctx.lineTo(x + TILE_SIZE / 2 - 7, y + i - 4);
    ctx.moveTo(x + TILE_SIZE / 2, y + i + 3);
    ctx.lineTo(x + TILE_SIZE / 2 + 7, y + i - 1);
    ctx.stroke();
  }
}

function drawGrowth(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
  // The whole of this tile is a function of the palette, so it is painted
  // once and stamped — see `faces.ts`. The painter is unchanged; it is
  // handed an origin instead of a position.
  stamp(ctx, `growth|${paletteKey(palette)}`, x, y, (c) => paintGrowth(c, palette));
}

function paintGrowth(ctx: CanvasRenderingContext2D, palette: Palette): void {
  const x = 0;
  const y = 0;

  ctx.fillStyle = alpha(palette.gold, 0.13);
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = alpha(palette.copper, 0.85);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i += 1) {
    const cx = x + 5 + i * 7;
    ctx.beginPath();
    ctx.arc(cx, y + 8 + (i % 2) * 8, 5, 0.4, 3.6);
    ctx.stroke();
  }
}

function drawVine(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette, live: boolean): void {
  ctx.strokeStyle = live ? palette.gold : alpha(palette.muted, 0.6);
  ctx.lineWidth = live ? 2 : 1.4;
  ctx.beginPath();
  ctx.moveTo(x + TILE_SIZE / 2, y);
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  for (let i = 5; i < TILE_SIZE; i += 9) {
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE / 2, y + i);
    ctx.quadraticCurveTo(x + TILE_SIZE / 2 + 7, y + i - 1, x + TILE_SIZE / 2 + 6, y + i + 5);
    ctx.moveTo(x + TILE_SIZE / 2, y + i + 4);
    ctx.quadraticCurveTo(x + TILE_SIZE / 2 - 7, y + i + 3, x + TILE_SIZE / 2 - 6, y + i + 9);
    ctx.stroke();
  }
}

function drawVeiled(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette, revealed: boolean): void {
  if (revealed) {
    ctx.fillStyle = alpha(palette.gold, 0.18);
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    return;
  }
  // Unseen: only the faintest suggestion, the outline of a thing not yet
  // looked at properly.
  ctx.strokeStyle = alpha(palette.gold, 0.16);
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2.5, y + 2.5, TILE_SIZE - 5, TILE_SIZE - 5);
  ctx.setLineDash([]);
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
  // The whole of this tile is a function of the palette, so it is painted
  // once and stamped — see `faces.ts`. The painter is unchanged; it is
  // handed an origin instead of a position.
  stamp(ctx, `door|${paletteKey(palette)}`, x, y, (c) => paintDoor(c, palette));
}

function paintDoor(ctx: CanvasRenderingContext2D, palette: Palette): void {
  const x = 0;
  const y = 0;

  ctx.fillStyle = alpha(palette.blue, 0.6);
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1.5, y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
  glyph(ctx, "ד", x + TILE_SIZE / 2, y + TILE_SIZE / 2, 14, alpha(palette.goldBright, 0.9));
}

function drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette, tick: number): void {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  const pulse = 1 + Math.sin(tick / 22) * 0.08;
  ctx.strokeStyle = palette.goldBright;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 6.5 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = alpha(palette.gold, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 10.5 * pulse, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLowGap(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
  // The whole of this tile is a function of the palette, so it is painted
  // once and stamped — see `faces.ts`. The painter is unchanged; it is
  // handed an origin instead of a position.
  stamp(ctx, `lowgap|${paletteKey(palette)}`, x, y, (c) => paintLowGap(c, palette));
}

function paintLowGap(ctx: CanvasRenderingContext2D, palette: Palette): void {
  const x = 0;
  const y = 0;

  ctx.fillStyle = alpha(palette.stone, 0.9);
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = alpha(palette.gold, 0.3);
  ctx.lineWidth = 1;
  for (let i = 0; i < TILE_SIZE; i += 5) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x, y + i);
    ctx.stroke();
  }
}

/** The barrier of a Word-Gate: three empty sockets, waiting to be inscribed. */
function drawWordGate(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette, tick: number): void {
  ctx.fillStyle = alpha(palette.blue, palette.light ? 0.4 : 0.62);
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1.5, y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);

  // Three sockets, breathing — the shape of the question the gate asks.
  const pulse = 0.5 + Math.sin(tick / 30 + y / 40) * 0.22;
  ctx.strokeStyle = alpha(palette.goldBright, pulse);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + 6 + i * 6, 2.1, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// entities
// ---------------------------------------------------------------------------

/**
 * A husk kind's position in the table, for the freed-mote form above — twenty
 * distinct small integers with no collisions, where a string hash folded
 * three kinds together on its moduli. An index rather than a second authored
 * table: the form only has to be *distinct and stable*, not meaningful, and
 * twenty authored form tuples would be a table nobody could review by
 * reading. Stable because the HUSKS table's order is source order.
 */
const KIND_ORDER = Object.keys(HUSKS);
function kindIndex(kind: string): number {
  const i = KIND_ORDER.indexOf(kind);
  return i < 0 ? 0 : i;
}

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  palette: Palette,
  tick: number,
  glows = false,
): void {
  if (e.taken && (e.kind === "mote" || e.kind === "letter" || e.kind === "fragment")) return;
  // The gate's porch is a place, not a thing — nothing is drawn for it; the
  // barrier tiles beside it already say what it is.
  if (e.kind === "word-gate") return;
  const cx = e.x + TILE_SIZE / 2;
  const cy = e.y + TILE_SIZE / 2;

  switch (e.kind) {
    case "mote": {
      const bob = Math.sin(tick / 18 + e.x / 40) * 2.4;
      /**
       * **Freed light hangs differently by what held it** — birur visible.
       *
       * A mote that came out of a shell (`e.from`) keeps a trace of it in its
       * *form*, never its colour: the corona breathes at that kind's own
       * rate, sits at its own reach, and a small second spark circles at a
       * kind-fixed angle — the shape of the shell remembered by the light
       * for as long as it hangs there. Form rather than hue, deliberately:
       * the shells were twenty but the light is one, twenty tints would
       * fight both grounds and every festival palette, and a shape survives
       * any theme. Scattered day-motes carry no `from` and draw exactly as
       * they always have, to the pixel.
       */
      const held = e.from ? kindIndex(e.from) : undefined;
      const breathe = held !== undefined ? 1 + 0.18 * Math.sin(tick / (12 + held)) : 1;
      const reach = held !== undefined ? 6 + (held % 5) * 0.7 : 7;
      // Inside the held light's reach a mote answers it — the corona widens
      // and warms. Appearance only: nothing about being seen changes what
      // gathering it pays.
      ctx.fillStyle = alpha(palette.goldBright, glows ? 0.3 : 0.16);
      ctx.beginPath();
      ctx.arc(cx, cy + bob, (glows ? 10 : reach) * breathe, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.goldBright;
      ctx.beginPath();
      ctx.arc(cx, cy + bob, glows ? 3.4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (held !== undefined) {
        const angle = held * (Math.PI / 10) + tick / 90;
        const orbit = 4.5 + (held % 4) * 0.8;
        ctx.fillStyle = alpha(palette.goldBright, 0.55);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * orbit, cy + bob + Math.sin(angle) * orbit, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "letter": {
      const letter = e.ref ? lettersById[e.ref] : undefined;
      const bob = Math.sin(tick / 26) * 3;
      ctx.strokeStyle = alpha(palette.gold, 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy + bob, 15 + Math.sin(tick / 20) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = alpha(palette.goldBright, 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy + bob, 13, 0, Math.PI * 2);
      ctx.fill();
      if (letter) glyph(ctx, letter.glyph, cx, cy + bob, 22, palette.goldBright);
      break;
    }
    case "fragment": {
      // A torn scrap of a scroll, standing in its niche: a small rolled sheet
      // with a ragged edge, lit like the letters because it is a piece of one.
      const bob = Math.sin(tick / 24 + e.x / 60) * 2.2;
      const top = cy + bob - 9;
      ctx.fillStyle = alpha(palette.goldBright, 0.14);
      ctx.beginPath();
      ctx.arc(cx, cy + bob, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.light ? alpha(palette.stone, 0.9) : alpha(palette.text, 0.14);
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 6, top);
      ctx.lineTo(cx + 6, top);
      ctx.lineTo(cx + 6, top + 14);
      // The tear along the foot — never a clean edge.
      ctx.lineTo(cx + 3, top + 11);
      ctx.lineTo(cx, top + 15);
      ctx.lineTo(cx - 3, top + 11);
      ctx.lineTo(cx - 6, top + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ruled lines of writing, too small to read — as a fragment should be.
      ctx.strokeStyle = alpha(palette.gold, 0.6);
      ctx.lineWidth = 0.9;
      for (const dy of [3.5, 6.5, 9.5]) {
        ctx.beginPath();
        ctx.moveTo(cx - 4, top + dy);
        ctx.lineTo(cx + 4, top + dy);
        ctx.stroke();
      }
      break;
    }
    case "fork": {
      // Where the road divides — Resh's landmark. A slender Y standing in the
      // ground, lit once it has been passed, because after that it is
      // somewhere you can be returned to.
      const passed = Boolean(e.active);
      ctx.strokeStyle = passed ? palette.goldBright : alpha(palette.muted, 0.65);
      ctx.lineWidth = passed ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, e.y + TILE_SIZE);
      ctx.lineTo(cx, e.y + 2);
      ctx.moveTo(cx, e.y + 2);
      ctx.lineTo(cx - 8, e.y - 10);
      ctx.moveTo(cx, e.y + 2);
      ctx.lineTo(cx + 8, e.y - 10);
      ctx.stroke();
      glyph(ctx, "ר", cx, e.y - 20, 15, passed ? palette.goldBright : alpha(palette.muted, 0.7));
      break;
    }
    case "mark": {
      // The Tav shrine — dark until set, lit gold once it is yours.
      const on = Boolean(e.active);
      ctx.strokeStyle = on ? palette.goldBright : alpha(palette.muted, 0.7);
      ctx.lineWidth = on ? 2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(cx, e.y + TILE_SIZE);
      ctx.lineTo(cx, e.y - 10);
      ctx.stroke();
      glyph(ctx, "ת", cx, e.y - 20, 19, on ? palette.goldBright : alpha(palette.muted, 0.75));
      if (on) {
        ctx.fillStyle = alpha(palette.goldBright, 0.1);
        ctx.beginPath();
        ctx.arc(cx, e.y - 18, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "vessel": {
      // An object on a pedestal, lit from beneath — the shape says "taken up"
      // rather than "walked into", which is the difference between a vessel
      // and everything else lying about a rung.
      if (e.taken) break;
      const lift = Math.sin(tick / 26) * 2;
      ctx.fillStyle = alpha(palette.goldBright, 0.16);
      ctx.beginPath();
      ctx.ellipse(cx, e.y + TILE_SIZE, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.goldBright;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 6, e.y + 12 + lift);
      ctx.lineTo(cx + 6, e.y + 12 + lift);
      ctx.lineTo(cx + 3, e.y + 2 + lift);
      ctx.lineTo(cx - 3, e.y + 2 + lift);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = alpha(palette.goldBright, 0.3);
      ctx.fill();
      break;
    }
    case "relic": {
      // A hidden thing in its niche. Drawn as a *wrapped* object rather than
      // as itself — a bound bundle standing on end, sealed with a cord — for
      // the reason the collection is named after: these were put away, not
      // displayed. What it is, the plate says; what the room says is only that
      // something is here.
      //
      // Read against the vessel, which is the only other thing in the game
      // offered rather than walked into: the pedestal is lit from *beneath*
      // and this is lit from *behind*, so the two are told apart at the
      // twenty-odd pixels a room is actually framed at, before either plate
      // rises.
      if (e.taken) break;
      const breathe = 0.42 + Math.sin(tick / 34) * 0.14;
      const top = e.y + 3;
      const foot = e.y + TILE_SIZE;

      // The light behind it, in the recess.
      const back = ctx.createRadialGradient(cx, cy, 1, cx, cy, 22);
      back.addColorStop(0, alpha(palette.goldBright, breathe * 0.55));
      back.addColorStop(1, alpha(palette.goldBright, 0));
      ctx.fillStyle = back;
      ctx.fillRect(cx - 22, cy - 22, 44, 44);

      // The bundle: narrower at the head, where the wrapping is gathered.
      //
      // **One fill for both grounds, and it is gold rather than ink.** The
      // first pass took the klipot's rule — the darkest value the palette has —
      // and on vellum a wrapped bundle at seventy per cent ink is a black wedge
      // standing in a niche: it read as a hole in the wall rather than as a
      // thing in it. The klipot are dark because they are the dark; a relic is
      // treasure, and belongs to the same gold as the letters, the motes and
      // the vessel. What separates it from the pedestal is the silhouette and
      // where the light comes from, not the colour.
      ctx.fillStyle = alpha(palette.gold, 0.3);
      ctx.strokeStyle = palette.goldBright;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 3, top);
      ctx.lineTo(cx + 3, top);
      ctx.lineTo(cx + 7, foot);
      ctx.lineTo(cx - 7, foot);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Two turns of cord, which is the whole of what says "bound".
      ctx.strokeStyle = alpha(palette.goldBright, 0.85);
      ctx.lineWidth = 1;
      for (const dy of [7, 13]) {
        ctx.beginPath();
        ctx.moveTo(cx - 4.2 - dy * 0.16, top + dy);
        ctx.lineTo(cx + 4.2 + dy * 0.16, top + dy);
        ctx.stroke();
      }
      break;
    }
    case "house": {
      // A figure standing in the region: a robed silhouette, no face. The
      // Houses are met, not depicted.
      ctx.fillStyle = alpha(palette.gold, e.taken ? 0.5 : 0.28);
      ctx.beginPath();
      ctx.moveTo(cx, e.y - 16);
      ctx.lineTo(cx + 13, e.y + TILE_SIZE);
      ctx.lineTo(cx - 13, e.y + TILE_SIZE);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, e.y - 21, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "exit": {
      // An arch of light: the way up out of this Sefirah.
      const glow = 0.5 + Math.sin(tick / 30) * 0.16;
      ctx.strokeStyle = alpha(palette.goldBright, glow);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 17, e.y + TILE_SIZE);
      ctx.lineTo(cx - 17, e.y - 8);
      ctx.arc(cx, e.y - 8, 17, Math.PI, 0);
      ctx.lineTo(cx + 17, e.y + TILE_SIZE);
      ctx.stroke();
      const beam = ctx.createLinearGradient(0, e.y - 30, 0, e.y + TILE_SIZE);
      beam.addColorStop(0, alpha(palette.goldBright, 0.28));
      beam.addColorStop(1, alpha(palette.goldBright, 0));
      ctx.fillStyle = beam;
      ctx.fillRect(cx - 16, e.y - 25, 32, TILE_SIZE + 25);
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// the Scribe
// ---------------------------------------------------------------------------

function drawScribe(ctx: CanvasRenderingContext2D, world: World, palette: Palette, lit = false): void {
  const p = world.player;
  // Veiling: the Scribe thins out and returns, rather than dying.
  const fade = p.veiled > 0 ? 0.22 + 0.16 * Math.sin(world.tick / 3) : 1;
  ctx.save();
  ctx.globalAlpha = fade;

  const cx = p.x + p.w / 2;
  const bottom = p.y + p.h;
  const height = p.crouching ? p.h * 0.55 : p.h;
  const top = bottom - height;

  // The lamp the Scribe carries — the reason anything here is visible. With
  // the `light` grace in hand it reaches further, which is the whole of what
  // Yod's plate and David's boon have promised since they shipped.
  const reach = lit ? LIT_REACH : 62;
  const lamp = ctx.createRadialGradient(cx, top + height * 0.4, 2, cx, top + height * 0.4, reach);
  lamp.addColorStop(0, alpha(palette.goldBright, lit ? 0.26 : 0.2));
  lamp.addColorStop(1, alpha(palette.goldBright, 0));
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(cx, top + height * 0.4, reach, 0, Math.PI * 2);
  ctx.fill();

  // A robe: one drawn shape, gold-limned, leaning the way it moves.
  const lean = Math.max(-3, Math.min(3, p.vx / 70)) * (p.onGround ? 1 : 0.5);
  ctx.beginPath();
  ctx.moveTo(cx + lean, top);
  ctx.lineTo(cx + p.w / 2 + 2, bottom);
  ctx.lineTo(cx - p.w / 2 - 2, bottom);
  ctx.closePath();
  ctx.fillStyle = alpha(palette.blue, palette.light ? 0.5 : 0.8);
  ctx.fill();
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // The head, and the direction of attention.
  ctx.beginPath();
  ctx.arc(cx + lean, top - 1, 5.2, 0, Math.PI * 2);
  ctx.fillStyle = palette.stone;
  ctx.fill();
  ctx.strokeStyle = palette.goldBright;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + lean + p.facing * 2.4, top - 1.5, 1.1, 0, Math.PI * 2);
  ctx.fillStyle = palette.goldBright;
  ctx.fill();

  // Clinging, dashing, swimming — each says so without a word.
  if (p.clinging !== 0) {
    ctx.strokeStyle = alpha(palette.goldBright, 0.75);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + p.clinging * (p.w / 2 + 3), top + 4);
    ctx.lineTo(cx + p.clinging * (p.w / 2 + 3), bottom - 4);
    ctx.stroke();
  }
  if (p.dash > 0) {
    ctx.strokeStyle = alpha(palette.goldBright, 0.5);
    ctx.lineWidth = 1.4;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - p.facing * (i * 9), top + 6 + i * 3);
      ctx.lineTo(cx - p.facing * (i * 9 + 11), top + 6 + i * 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGrapple(ctx: CanvasRenderingContext2D, world: World, palette: Palette): void {
  const p = world.player;
  if (!p.grappleTo) return;
  ctx.strokeStyle = palette.goldBright;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(p.x + p.w / 2, p.y + p.h / 2);
  ctx.lineTo(p.grappleTo.x * TILE_SIZE + TILE_SIZE / 2, p.grappleTo.y * TILE_SIZE + TILE_SIZE / 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------

/** A Hebrew glyph, centred, in the Visual Canon's own face. */
function glyph(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): void {
  ctx.save();
  ctx.font = `${size}px "David Libre", "Frank Ruhl Libre", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Follows the Scribe with a dead zone and an easing, so small hops do not
 * shake the page. The vertical follow is looser than the horizontal — this is
 * a side-scroller, and the eye wants the horizon steady.
 */
export function trackCamera(
  camera: Camera,
  world: World,
  viewW: number,
  viewH: number,
  farsight: boolean,
): void {
  const zoom = zoomFor(viewW, viewH);
  const spanW = viewW / zoom;
  const spanH = viewH / zoom;
  const room = world.rooms[world.roomIndex];
  const p = world.player;

  // **The room is the frame, not the body.** The camera settles on the room
  // the Scribe is standing in and cuts when they cross into the next one, so
  // each screen arrives as a composed thing rather than sliding past. Farsight
  // still leans it a little the way he is facing — the one grace that changes
  // what can be seen should still change what is seen.
  const lean = farsight ? p.facing * TILE_SIZE * 2 : 0;
  const targetX = room
    ? (room.x + room.w / 2) * TILE_SIZE - spanW / 2 + lean
    : p.x + p.w / 2 - spanW * 0.46;
  const targetY = room
    ? (room.y + room.h / 2) * TILE_SIZE - spanH / 2
    : p.y + p.h / 2 - spanH * 0.55;

  if (camera.room !== world.roomIndex) {
    // A cut, not a sweep. Easing between rooms reads as the map sliding under
    // a fixed eye, which is the corridor feeling this is meant to replace.
    camera.room = world.roomIndex;
    camera.x = targetX;
    camera.y = targetY;
  } else {
    camera.x += (targetX - camera.x) * 0.18;
    camera.y += (targetY - camera.y) * 0.18;
  }

  const maxX = Math.max(0, world.width * TILE_SIZE - spanW);
  const maxY = Math.max(0, world.height * TILE_SIZE - spanH);
  camera.x = Math.max(0, Math.min(maxX, camera.x));
  camera.y = Math.max(0, Math.min(maxY, camera.y));
}

/**
 * Everything outside the room is turned down.
 *
 * Drawn in screen space over the finished world, as four rectangles around the
 * room's own box — which is both the cheapest way to do it and, in this game's
 * idiom, the right image: the room you are standing in is the illuminated
 * panel and the rest of the leaf is ground.
 */
function dimBeyondTheRoom(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  palette: Palette,
  viewW: number,
  viewH: number,
  zoom: number,
): void {
  const room = world.rooms[world.roomIndex];
  if (!room) return;
  const x = (room.x * TILE_SIZE - camera.x) * zoom;
  const y = (room.y * TILE_SIZE - camera.y) * zoom;
  const w = room.w * TILE_SIZE * zoom;
  const h = room.h * TILE_SIZE * zoom;
  ctx.save();
  ctx.fillStyle = alpha(palette.light ? palette.bg : palette.bgDeep, 0.72);
  ctx.fillRect(0, 0, viewW, Math.max(0, y));
  ctx.fillRect(0, y + h, viewW, Math.max(0, viewH - (y + h)));
  ctx.fillRect(0, y, Math.max(0, x), h);
  ctx.fillRect(x + w, y, Math.max(0, viewW - (x + w)), h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// the klipot
// ---------------------------------------------------------------------------

/**
 * A husk is drawn as what it is: a shell with something bright shut inside it.
 * The light shows through the cracks, and shows through more as the shells come
 * off — so how close a husk is to breaking is legible without a health bar.
 */
function drawHusks(ctx: CanvasRenderingContext2D, world: World, palette: Palette): void {
  for (const husk of world.husks) {
    if (husk.broken) continue;
    // Korach inside the ground is not drawn at all. It is not hidden by a
    // trick of the light — it is not there yet.
    //
    // **`unseen`, not `outOfReach`**, and the difference cost the Tannin its
    // visibility for a whole phase. This asked the marks' own rule, on the
    // argument that what can be hit must be visible — right about Korach,
    // whose two answers coincide, and wrong the moment a second creature had a
    // reason to be unreachable. The Tannin holds the water, so `outOfReach`
    // says no mark may follow it there, so this stopped painting it there:
    // fifty-eight per cent of its life on screen, and the missing forty-two
    // were exactly the ticks a player needs to see it coming. `unseen` asks
    // the question a renderer actually has — is there anything there.
    //
    // This, the tick and **whether a mark would take a shell off it** are the
    // whole of what a klipah's picture needs from the world; the rest is the
    // creature itself, and lives in `husks.ts` beside its shape. Keeping the
    // two apart is what let the silhouettes be enumerated by a test while the
    // painting around them could not be.
    //
    // `opened` is the third and it is new, and it was missing for the whole
    // life of the two conditions that already ship: a blow on a submerged
    // Leviathan or an un-stopped Behemoth takes no shell and looked exactly
    // like a blow that did. Both are questions about the *room* rather than
    // about the creature, which is why they are asked here and not there.
    if (unseen(husk)) continue;
    paintHusk(ctx, husk, palette, world.tick, !opened(world, husk));
  }
}

/** A mark in flight: the Scribe's letter, or the dark Jezebel sent. */
function drawMarks(ctx: CanvasRenderingContext2D, world: World, palette: Palette): void {
  for (const m of world.marks) {
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    if (m.mine) {
      ctx.fillStyle = alpha(palette.goldBright, 0.2);
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      glyph(ctx, m.glyph, cx, cy + 5, 15, palette.goldBright);
    } else {
      ctx.fillStyle = alpha(palette.stoneEdge, 0.9);
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
