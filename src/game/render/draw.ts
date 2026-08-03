import { lettersById } from "../../data/letters";
import { tileAt } from "../world/build";
import { Tile, TILE_SIZE } from "../world/tiles";
import type { Entity, World } from "../world/types";
import { alpha, type Palette } from "./palette";
import { ROOM_H, ROOM_W } from "../world/rooms";
import { HUSKS } from "../combat";

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

  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      drawTile(ctx, world, tx, ty, palette, verbs);
    }
  }

  drawHusks(ctx, world, palette);
  drawMarks(ctx, world, palette);
  for (const entity of world.entities) {
    if (entity.x + TILE_SIZE < camera.x || entity.x > camera.x + spanW) continue;
    drawEntity(ctx, entity, palette, world.tick);
  }

  drawGrapple(ctx, world, palette);
  drawScribe(ctx, world, palette);
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

function drawStone(
  ctx: CanvasRenderingContext2D,
  world: World,
  tx: number,
  ty: number,
  x: number,
  y: number,
  palette: Palette,
): void {
  ctx.fillStyle = palette.stone;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  // Engraver's hatching, only where the stone is actually exposed to the air —
  // buried tiles stay flat, which keeps a thick floor from turning into noise.
  const openAbove = tileAt(world, tx, ty - 1) === Tile.Empty;
  if (openAbove) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.clip();
    ctx.strokeStyle = alpha(palette.light ? palette.stoneEdge : palette.gold, palette.light ? 0.55 : 0.16);
    ctx.lineWidth = 1;
    for (let i = -TILE_SIZE; i < TILE_SIZE; i += HATCH_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + TILE_SIZE);
      ctx.lineTo(x + i + TILE_SIZE, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.75);
    ctx.lineTo(x + TILE_SIZE, y + 0.75);
    ctx.stroke();

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

  ctx.strokeStyle = alpha(palette.stoneEdge, 0.85);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

function drawPlacedStone(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
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
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x + TILE_SIZE, y + 3);
  ctx.stroke();

  // The underside tapers away from the standing edge — bark, not masonry.
  ctx.strokeStyle = alpha(palette.gold, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 5.5);
  ctx.quadraticCurveTo(x + TILE_SIZE / 2, y + 7.5, x + TILE_SIZE, y + 5.5);
  ctx.stroke();

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
  ctx.fillStyle = alpha(palette.blue, palette.light ? 0.32 : 0.55);
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

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

function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, palette: Palette, tick: number): void {
  if (e.taken && (e.kind === "mote" || e.kind === "letter" || e.kind === "fragment")) return;
  // The gate's porch is a place, not a thing — nothing is drawn for it; the
  // barrier tiles beside it already say what it is.
  if (e.kind === "word-gate") return;
  const cx = e.x + TILE_SIZE / 2;
  const cy = e.y + TILE_SIZE / 2;

  switch (e.kind) {
    case "mote": {
      const bob = Math.sin(tick / 18 + e.x / 40) * 2.4;
      ctx.fillStyle = alpha(palette.goldBright, 0.16);
      ctx.beginPath();
      ctx.arc(cx, cy + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.goldBright;
      ctx.beginPath();
      ctx.arc(cx, cy + bob, 2.6, 0, Math.PI * 2);
      ctx.fill();
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

function drawScribe(ctx: CanvasRenderingContext2D, world: World, palette: Palette): void {
  const p = world.player;
  // Veiling: the Scribe thins out and returns, rather than dying.
  const fade = p.veiled > 0 ? 0.22 + 0.16 * Math.sin(world.tick / 3) : 1;
  ctx.save();
  ctx.globalAlpha = fade;

  const cx = p.x + p.w / 2;
  const bottom = p.y + p.h;
  const height = p.crouching ? p.h * 0.55 : p.h;
  const top = bottom - height;

  // The lamp the Scribe carries — the reason anything here is visible.
  const lamp = ctx.createRadialGradient(cx, top + height * 0.4, 2, cx, top + height * 0.4, 62);
  lamp.addColorStop(0, alpha(palette.goldBright, 0.2));
  lamp.addColorStop(1, alpha(palette.goldBright, 0));
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(cx, top + height * 0.4, 62, 0, Math.PI * 2);
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
    if (husk.kind === "korach" && husk.charging === 0) continue;
    const spec = HUSKS[husk.kind];
    const cx = husk.x + husk.w / 2;
    const cy = husk.y + husk.h / 2;
    const opened = 1 - husk.shells / spec.shells;

    // What is trapped inside, brighter as the shell gives way.
    ctx.fillStyle = alpha(palette.goldBright, 0.18 + opened * 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, husk.w * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // The shell. White for a moment when struck, so a hit reads.
    ctx.strokeStyle = husk.struck > 0 ? palette.goldBright : alpha(palette.stoneEdge, 0.95);
    ctx.fillStyle = alpha(palette.bgDeep, 0.9 - opened * 0.3);
    ctx.lineWidth = 1.6;
    // The shape says the role, not the name: round for the ones the ground
    // means nothing to, a standing diamond for the ones that commit to a
    // charge, a shouldered slab for the rooted throwers, a plain shell for the
    // pacers. Ten names on four silhouettes, so a screen stays readable at a
    // glance and the name is what the plate is for.
    ctx.beginPath();
    const role = spec.role;
    if (role === "floater") {
      ctx.arc(cx, cy, husk.w / 2, 0, Math.PI * 2);
    } else if (role === "charger") {
      ctx.moveTo(cx, husk.y);
      ctx.lineTo(husk.x + husk.w, cy);
      ctx.lineTo(cx, husk.y + husk.h);
      ctx.lineTo(husk.x, cy);
      ctx.closePath();
    } else {
      const r = 4;
      ctx.roundRect(husk.x, husk.y, husk.w, husk.h, role === "thrower" ? [r, r, 0, 0] : r);
    }
    ctx.fill();
    ctx.stroke();

    // A crack for every shell already taken off.
    ctx.strokeStyle = alpha(palette.goldBright, 0.5 + opened * 0.4);
    ctx.lineWidth = 1;
    for (let i = 0; i < spec.shells - husk.shells; i += 1) {
      const a = (i / spec.shells) * Math.PI * 2 + husk.home.x;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * husk.w * 0.5, cy + Math.sin(a) * husk.h * 0.5);
      ctx.stroke();
    }
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
