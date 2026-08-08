import { TILE_SIZE } from "../world/tiles";
import type { Palette } from "./palette";

/**
 * **The tile faces, drawn once and then stamped.**
 *
 * The renderer re-synthesized every visible tile from vector primitives sixty
 * times a second, and the roadmap had that down as the likely mid-phone cliff
 * on suspicion. It is no longer suspicion. Measured on a 390×844 phone viewport
 * with the main thread throttled eight times — the shape of a low-end handset
 * against this machine — a frame of the upper Tree spent **2.03 ms in the tile
 * loop against 0.84 ms on everything with a body in it**: seventy-one per cent
 * of the drawing, on 558 tiles, none of which had changed since the frame
 * before.
 *
 * An exposed stone tile alone is a fill, a clip, eight hatching strokes, a lit
 * top edge and a border — thirteen or so path operations, repeated for every
 * stone on screen, every frame, forever.
 *
 * So a face is painted once into a small offscreen canvas and stamped after
 * that. What makes this safe is the split: **only the part of a tile that does
 * not depend on where it is** goes into the face. The moss on a stone's lit
 * edge is seeded from the tile's own coordinates — deliberately, so the same
 * stone is mossed the same way every time it is drawn — and it stays live,
 * drawn over the stamp. Nothing about the picture changes; what changes is how
 * often the expensive half of it is computed.
 *
 * **And painted with a margin of bleed**, which is the difference between this
 * working and this looking like a tiled floor in a bathroom. A tile's border is
 * stroked *on* its edge, so half of that stroke belongs to the neighbour. Paint
 * it into a canvas cut exactly to the tile and the outer half is clipped away
 * against nothing; stamp a field of those and every seam reads as a pale line
 * and the masonry turns into a grid. Measured against the arena sheets, that
 * was four per cent of pixels changed against a one per cent run-to-run floor —
 * and, looked at, unmistakable. So the face is a tile plus a ring, and it is
 * stamped back over the ring it came from.
 *
 * **Rendered at the scale it will be shown at**, which is the whole reason this
 * is not a naive sprite sheet: the canvas is scaled by the device pixel ratio
 * and again by the zoom, and a face painted at one and blown up to two is the
 * soft-tiles bug every atlas ships with once. The scale is part of the key, and
 * a change of scale — a resize, a rotation — simply asks for faces that are not
 * there yet.
 */

/** One painted face, and the scale it was painted for. */
const FACES = new Map<string, HTMLCanvasElement>();

/**
 * **A way to turn it off**, because the phase's own verification asks for a
 * before and an after and the only honest way to get one is the same scene
 * twice. `?faces=0` on the game's URL paints every tile the long way, exactly
 * as the renderer did before this file existed — which makes it a fair
 * comparison and also the first thing to try if a tile ever looks wrong.
 */
function askedOff(): boolean {
  if (typeof location === "undefined") return false;
  // **The query lives after the hash.** This is a hash-routed game, so a URL is
  // `/#/game?faces=0` and `location.search` is empty — reading it instead of
  // the hash made both arms of the first A/B run with the cache on and report
  // the same number, which read as "the cache does not pay" and was really
  // "the switch was never thrown".
  const hash = location.hash.indexOf("?");
  const query = hash === -1 ? location.search : location.hash.slice(hash);
  return new URLSearchParams(query).get("faces") === "0";
}

const OFF = askedOff();

/**
 * A palette is a stable object per Sefirah, so its identity is its key — but
 * identity is not a string, and the key has to be. Memoised on the object
 * rather than recomputed per tile, which would put a string concatenation back
 * into the loop this file exists to empty.
 */
const PALETTE_KEYS = new WeakMap<Palette, string>();
let nextPalette = 0;

export function paletteKey(palette: Palette): string {
  let key = PALETTE_KEYS.get(palette);
  if (key === undefined) {
    key = `p${(nextPalette += 1)}`;
    PALETTE_KEYS.set(palette, key);
  }
  return key;
}

/**
 * The scale faces are painted at — device pixels per world unit.
 *
 * Module state, set once a frame by `drawWorld` before the tile loop. Drawing
 * is synchronous and single-threaded, so this is a parameter that would
 * otherwise be threaded through six call sites that care about nothing else;
 * it is rounded to thousandths, which is enough to keep floating-point noise in
 * the transform from minting a new face sixty times a second and no more: the
 * scale itself only changes when the window does.
 */
let faceScale = 1;

export function setFaceScale(scale: number): void {
  // **Exactly the scale it will be stamped at.** Rounded only enough to keep
  // floating-point noise from minting a new face every frame: a face painted at
  // 2.5 and stamped at 2.4 is resampled on every tile, which costs about what
  // the vector work cost in the first place.
  const wanted = Math.min(4, Math.max(1, Math.round(scale * 1000) / 1000));
  if (wanted !== faceScale) {
    faceScale = wanted;
    // Everything in the cache was painted for the old scale. Nothing in it is
    // worth keeping: a face at the wrong scale is exactly the soft stamp this
    // is built to avoid.
    FACES.clear();
  }
}

/**
 * How many faces may be held. Each is one tile square at the face scale — at
 * three device pixels to the world unit that is 72×72, about twenty kilobytes,
 * so a hundred and sixty of them is three megabytes at worst. The cap is
 * a backstop against a key that turns out to vary more than its author thought:
 * an unbounded cache on a phone is a slower bug than the one it replaced.
 */
const MAX_FACES = 160;

/**
 * The ring of bleed around a face, in world units. One unit is enough: the
 * widest stroke a tile lays on its own edge is a hair over one, so half of it
 * is half a unit, and a whole one leaves room for the antialiasing.
 */
const BLEED = 1;

/**
 * The face for a key, painting it if this is the first time it has been asked
 * for. `paint` draws in ordinary tile coordinates — 0,0 to `TILE_SIZE` — and
 * knows nothing about the scale.
 */
export function face(
  key: string,
  paint: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement | undefined {
  if (OFF) return undefined;
  const full = `${key}@${faceScale}`;
  const had = FACES.get(full);
  if (had) return had;

  // A document is not a given — the suite runs the renderer's helpers under
  // node. Without one there is no face, and every caller falls back to drawing
  // itself, which is what it did before this file existed.
  if (typeof document === "undefined") return undefined;

  const canvas = document.createElement("canvas");
  const side = Math.ceil((TILE_SIZE + BLEED * 2) * faceScale);
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.scale(faceScale, faceScale);
  // The painter draws a tile at the origin and knows nothing about the ring.
  ctx.translate(BLEED, BLEED);
  paint(ctx);

  if (FACES.size >= MAX_FACES) FACES.clear();
  FACES.set(full, canvas);
  return canvas;
}

/**
 * Stamp a face, or paint it in place if there is no canvas to be had. The
 * fallback is not a nicety — it is what keeps this file from being able to
 * change the picture.
 */
export function stamp(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  paint: (c: CanvasRenderingContext2D) => void,
): void {
  const bitmap = face(key, paint);
  if (!bitmap) {
    ctx.save();
    ctx.translate(x, y);
    paint(ctx);
    ctx.restore();
    return;
  }
  ctx.drawImage(
    bitmap,
    x - BLEED,
    y - BLEED,
    TILE_SIZE + BLEED * 2,
    TILE_SIZE + BLEED * 2,
  );
}

/** For the tests: how many distinct faces have been painted. */
export function faceCount(): number {
  return FACES.size;
}
