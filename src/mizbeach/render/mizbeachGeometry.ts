/**
 * Shared geometry for the Mizbe'ach renderer — the circular counterpart to
 * the Herald's `heraldGeometry.ts`. Every ring is drawn as a set of thick-
 * stroked arc segments (not true annular "donut slice" paths) at a fixed
 * radius — simpler geometry that still reads as a banded ring, and avoids
 * duplicating the Herald's shield-specific conventions for a fundamentally
 * different (circular, concentric) silhouette.
 *
 * Angle convention: 0° is straight up (12 o'clock), increasing clockwise —
 * matches a clock face / compass reading, which is the natural frame for a
 * folio meant to be read while facing Mizrach (east, toward Jerusalem).
 */

/** Larger than the ring system strictly needs, to leave margin for the Mizrach vector above the circle and the PaRDeS corners outside it. */
export const VIEWBOX_SIZE = 760;

export const CENTER = { x: VIEWBOX_SIZE / 2, y: VIEWBOX_SIZE / 2 };

/** Ring radii, outer to inner. Each ring is stroked at its radius with `thickness` as strokeWidth. */
export const RINGS = {
  border: { radius: 330, thickness: 14 },
  month: { radius: 292, thickness: 34 },
  moon: { radius: 240, thickness: 28 },
  weekday: { radius: 186, thickness: 30 },
} as const;

export const SABBATH_CORE_RADIUS = 70;

/** The four PaRDeS corner positions, just outside the circle. */
export const CORNER_POINTS = {
  peshat: { x: 55, y: 55 },
  remez: { x: VIEWBOX_SIZE - 55, y: 55 },
  drash: { x: VIEWBOX_SIZE - 55, y: VIEWBOX_SIZE - 55 },
  sod: { x: 55, y: VIEWBOX_SIZE - 55 },
} as const;

export function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

/** An SVG path `d` string for the arc from `startAngle` to `endAngle` (degrees) at `radius`, meant to be stroked rather than filled. */
export function describeArcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

/** The [start, end] angle in degrees of the `index`-th of `count` equal segments, starting at 0° (top), clockwise. */
export function segmentAngles(count: number, index: number): [number, number] {
  const step = 360 / count;
  return [index * step, (index + 1) * step];
}

/** `count` points evenly spaced around a circle of `radius`, starting at 0° (top), clockwise — for border ticks/labels. */
/**
 * The central panel — Hand Anchor / Three Gates / Three Wells / Veiled
 * Anchor + Tree of Life — is a separate rectangular composition (not part
 * of the circular ring mandala), matching the reference design's layout of
 * a standalone central illustrated panel beside the cyclewheels.
 */
export const CENTRAL_PANEL = {
  width: 620,
  height: 900,
  topBanner: 34,
  handY: 156,
  lettersY: 300,
  gatesY: 480,
  wellsY: 620,
  bottomRowY: 762,
  bottomBanner: 858,
  columnX: [140, 310, 480] as [number, number, number],
};

export function circlePerimeterPoints(count: number, radius: number): { x: number; y: number; angle: number }[] {
  const points: { x: number; y: number; angle: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    const { x, y } = polarToCartesian(CENTER.x, CENTER.y, radius, angle);
    points.push({ x, y, angle });
  }
  return points;
}
