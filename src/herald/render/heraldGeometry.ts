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
  left: 60,
  right: 540,
  top: 90,
  /** y at which the shoulders start curving into the point */
  shoulder: 470,
  /** y of the shield's lowest point */
  point: 720,
};

/** The fixed heater-shield silhouette, as an SVG path `d` string. */
export const SHIELD_PATH = `
  M ${SHIELD.left} ${SHIELD.top}
  H ${SHIELD.right}
  V ${SHIELD.shoulder}
  C ${SHIELD.right} 610, ${(SHIELD.left + SHIELD.right) / 2 + 90} 690, ${(SHIELD.left + SHIELD.right) / 2} ${SHIELD.point}
  C ${(SHIELD.left + SHIELD.right) / 2 - 90} 690, ${SHIELD.left} 610, ${SHIELD.left} ${SHIELD.shoulder}
  Z
`;

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
