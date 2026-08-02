import { lettersById } from "../../data/letters";
import { tileAt } from "../world/build";
import { Tile, TILE_SIZE } from "../world/tiles";
import type { Entity, World } from "../world/types";
import { alpha, type Palette } from "./palette";
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

export function zoomFor(viewW: number): number {
  return Math.max(1, Math.min(2.6, viewW / (TILES_ACROSS * TILE_SIZE)));
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
  const zoom = zoomFor(viewW);
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
}

// ---------------------------------------------------------------------------
// ground and sky
// ---------------------------------------------------------------------------

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

  // A manuscript margin: distant arcades, drifting at a fraction of the
  // camera's speed so the region reads as deep rather than flat.
  const drift = camera.x * 0.22;
  ctx.strokeStyle = alpha(palette.gold, palette.light ? 0.28 : 0.075);
  ctx.lineWidth = 1.5;
  const archW = 150;
  const baseY = viewH * 0.82;
  for (let i = -1; i < viewW / archW + 2; i += 1) {
    const ax = i * archW - (drift % archW);
    ctx.beginPath();
    ctx.moveTo(ax, baseY);
    ctx.lineTo(ax, baseY - 78);
    ctx.arc(ax + archW / 2, baseY - 78, archW / 2, Math.PI, 0);
    ctx.lineTo(ax + archW, baseY);
    ctx.stroke();
  }

  // A nearer band of columns, faster, warmer.
  const drift2 = camera.x * 0.45;
  ctx.strokeStyle = alpha(palette.gold, palette.light ? 0.3 : 0.1);
  const colW = 96;
  for (let i = -1; i < viewW / colW + 2; i += 1) {
    const cx = i * colW - (drift2 % colW);
    ctx.beginPath();
    ctx.moveTo(cx, viewH);
    ctx.lineTo(cx, viewH * 0.62);
    ctx.stroke();
  }
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
      drawLedge(ctx, x, y, palette);
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

function drawLedge(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x + TILE_SIZE, y + 3);
  ctx.stroke();
  ctx.strokeStyle = alpha(palette.gold, 0.4);
  ctx.lineWidth = 1;
  for (const dx of [5, 12, 19]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y + 4);
    ctx.lineTo(x + dx, y + 9);
    ctx.stroke();
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
  const zoom = zoomFor(viewW);
  const spanW = viewW / zoom;
  const spanH = viewH / zoom;
  const p = world.player;
  const targetX = p.x + p.w / 2 - spanW * (farsight ? 0.42 : 0.46) + (farsight ? p.facing * 40 : 0);
  const targetY = p.y + p.h / 2 - spanH * 0.55;

  camera.x += (targetX - camera.x) * 0.11;
  camera.y += (targetY - camera.y) * 0.07;

  const maxX = Math.max(0, world.width * TILE_SIZE - spanW);
  const maxY = Math.max(0, world.height * TILE_SIZE - spanH);
  camera.x = Math.max(0, Math.min(maxX, camera.x));
  camera.y = Math.max(0, Math.min(maxY, camera.y));
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
    ctx.beginPath();
    if (husk.kind === "drifter") {
      ctx.arc(cx, cy, husk.w / 2, 0, Math.PI * 2);
    } else if (husk.kind === "sentinel") {
      ctx.moveTo(cx, husk.y);
      ctx.lineTo(husk.x + husk.w, cy);
      ctx.lineTo(cx, husk.y + husk.h);
      ctx.lineTo(husk.x, cy);
      ctx.closePath();
    } else {
      const r = 4;
      ctx.roundRect(husk.x, husk.y, husk.w, husk.h, husk.kind === "spitter" ? [r, r, 0, 0] : r);
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

/** A mark in flight: the Scribe's letter, or the dark a spitter throws. */
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
