/**
 * Shared geometry constants for the Herald renderer. Reused identically by
 * every render call so every Herald's overall silhouette stays consistent —
 * variety comes from what's drawn inside these fixed shapes, echoing real
 * heraldry where the shield shape is conventional and the charges carry
 * the meaning.
 */

export const VIEWBOX_WIDTH = 600;
export const VIEWBOX_HEIGHT = 800;

export const SHIELD = {
  left: 70,
  right: 530,
  top: 90,
  /** y roughly where the sides stop bowing out and begin sweeping toward the point — used for internal layout. */
  shoulder: 470,
  /** y of the shield's lowest point */
  point: 720,
};

/**
 * Control points for the escutcheon's ogee (S-curved) sides. Each side runs
 * from a flat-top corner down to the central bottom point: the first control
 * pulls the curve outward (a slight bulge below the corner), the second pulls
 * it back in, giving the classic heraldic coat-of-arms silhouette.
 */
export const SHIELD_OGEE = {
  pointX: (70 + 530) / 2,
  rightC1: { x: 562, y: 325 },
  rightC2: { x: 428, y: 675 },
  leftC1: { x: 172, y: 675 },
  leftC2: { x: 38, y: 325 },
};

/** The fixed escutcheon silhouette (flat top, ogee sides to a point), as an SVG path `d` string. */
export const SHIELD_PATH = `
  M ${SHIELD.left} ${SHIELD.top}
  L ${SHIELD.right} ${SHIELD.top}
  C ${SHIELD_OGEE.rightC1.x} ${SHIELD_OGEE.rightC1.y}, ${SHIELD_OGEE.rightC2.x} ${SHIELD_OGEE.rightC2.y}, ${SHIELD_OGEE.pointX} ${SHIELD.point}
  C ${SHIELD_OGEE.leftC1.x} ${SHIELD_OGEE.leftC1.y}, ${SHIELD_OGEE.leftC2.x} ${SHIELD_OGEE.leftC2.y}, ${SHIELD.left} ${SHIELD.top}
  Z
`;

interface Pt {
  x: number;
  y: number;
}

function cubicAt(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

/**
 * Points evenly distributed around the escutcheon outline (flat top, then the
 * two ogee sides), each nudged inward toward the shield's centre by `inset` so
 * the ornamental border-flourishes hug the curve instead of tracing a box.
 */
export function shieldBorderPoints(count: number, inset = 13): Pt[] {
  const topL: Pt = { x: SHIELD.left, y: SHIELD.top };
  const topR: Pt = { x: SHIELD.right, y: SHIELD.top };
  const point: Pt = { x: SHIELD_OGEE.pointX, y: SHIELD.point };
  const cx = (SHIELD.left + SHIELD.right) / 2;
  const cy = (SHIELD.top + SHIELD.point) / 2;
  const topShare = 0.22; // fraction of the perimeter given to the flat top edge
  const sideShare = (1 - topShare) / 2;

  const points: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const f = i / count;
    let p: Pt;
    if (f < topShare) {
      const t = f / topShare;
      p = { x: topL.x + (topR.x - topL.x) * t, y: SHIELD.top };
    } else if (f < topShare + sideShare) {
      const t = (f - topShare) / sideShare;
      p = cubicAt(topR, SHIELD_OGEE.rightC1, SHIELD_OGEE.rightC2, point, t);
    } else {
      const t = (f - topShare - sideShare) / sideShare;
      p = cubicAt(point, SHIELD_OGEE.leftC1, SHIELD_OGEE.leftC2, topL, t);
    }
    const dx = cx - p.x;
    const dy = cy - p.y;
    const d = Math.hypot(dx, dy) || 1;
    points.push({ x: p.x + (dx / d) * inset, y: p.y + (dy / d) * inset });
  }
  return points;
}

/**
 * A simplified 10-node Tree of Life, normalized to a 0..1 box that callers
 * position within the shield. Three columns (Severity / Mercy / Balance),
 * top to bottom: Keter; Chochmah/Binah; Chesed/Gevurah; Tiferet;
 * Netzach/Hod; Yesod; Malchut.
 */
export const TREE_OF_LIFE_NODES: { id: string; x: number; y: number }[] = [
  { id: "keter", x: 0.5, y: 0.02 },
  { id: "chochmah", x: 0.82, y: 0.14 },
  { id: "binah", x: 0.18, y: 0.14 },
  { id: "chesed", x: 0.82, y: 0.38 },
  { id: "gevurah", x: 0.18, y: 0.38 },
  { id: "tiferet", x: 0.5, y: 0.5 },
  { id: "netzach", x: 0.82, y: 0.64 },
  { id: "hod", x: 0.18, y: 0.64 },
  { id: "yesod", x: 0.5, y: 0.8 },
  { id: "malchut", x: 0.5, y: 0.98 },
];

export const TREE_OF_LIFE_PATHS: [string, string][] = [
  ["keter", "chochmah"],
  ["keter", "binah"],
  ["keter", "tiferet"],
  ["chochmah", "binah"],
  ["chochmah", "chesed"],
  ["chochmah", "tiferet"],
  ["binah", "gevurah"],
  ["binah", "tiferet"],
  ["chesed", "gevurah"],
  ["chesed", "tiferet"],
  ["chesed", "netzach"],
  ["gevurah", "tiferet"],
  ["gevurah", "hod"],
  ["tiferet", "netzach"],
  ["tiferet", "hod"],
  ["tiferet", "yesod"],
  ["netzach", "hod"],
  ["netzach", "yesod"],
  ["hod", "yesod"],
  ["yesod", "malchut"],
];

/** A single repeatable border-flourish unit, centered on its own origin. */
export const FLOURISH_UNIT_PATH =
  "M 0 -6 C 3 -6 5 -3 5 0 C 5 3 3 6 0 6 C -3 6 -5 3 -5 0 C -5 -3 -3 -6 0 -6 Z M 0 -10 L 0 -14 M 0 10 L 0 14";

export function shieldCenter() {
  return {
    x: (SHIELD.left + SHIELD.right) / 2,
    y: (SHIELD.top + SHIELD.point) / 2,
  };
}
