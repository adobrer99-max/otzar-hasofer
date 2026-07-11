import { letterPaths, UNITS_PER_EM } from "./letterPaths.generated";

/**
 * One Hebrew letterform drawn from committed path data (see
 * scripts/build-letterpaths.mjs) instead of a live web font, so the Herald's
 * charges carry the gold-leaf illumination and survive SVG export intact.
 *
 * The generated paths are in font em units, y-up with the baseline at y=0; we
 * scale by `size`, flip the y axis, and centre the glyph's ink on `x` at the
 * given `baselineY` — matching how the previous `<text>` (textAnchor=middle,
 * y=baseline) was placed.
 */

/** Nudges the em scale so path glyphs read at roughly the weight the <text> did. */
const GLYPH_SCALE = 1.16;

export function LetterGlyph({
  letterId,
  size,
  x,
  baselineY,
  fill,
  stroke,
  strokeWidth = 0.5,
  flip = false,
}: {
  letterId: string;
  size: number;
  x: number;
  baselineY: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  flip?: boolean;
}) {
  const glyph = letterPaths[letterId];
  if (!glyph) return null;
  const s = (size / UNITS_PER_EM) * GLYPH_SCALE;
  const inkCenterX = (glyph.bbox.minX + glyph.bbox.maxX) / 2;
  const tx = x - inkCenterX * s;
  const inner = `translate(${tx} ${baselineY}) scale(${s} ${-s})`;
  const path = (
    <path
      d={glyph.d}
      transform={inner}
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? strokeWidth : undefined}
      vectorEffect={stroke ? "non-scaling-stroke" : undefined}
    />
  );
  return (
    <g data-charge={letterId} transform={flip ? `rotate(180 ${x} ${baselineY - size / 3})` : undefined}>
      {path}
    </g>
  );
}
