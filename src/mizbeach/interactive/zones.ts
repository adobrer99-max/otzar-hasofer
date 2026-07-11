import { CENTRAL_PANEL, CENTER, RINGS, polarToCartesian, segmentAngles } from "../render/mizbeachGeometry";
import { mazalotRing } from "../../data/mazalot";
import type { JewishMonthName } from "../../data/hebrewCalendar";

/**
 * The interactive geometry of the operable Mizbe'ach — pure data + helpers,
 * built on the existing render geometry (`mizbeachGeometry.ts`). The central
 * panel's zones live in its own 620×870 coordinate space; the ring wedges
 * live in the 760×760 mandala space. Nothing here renders — the surface
 * component overlays focusable targets at these coordinates.
 */

export type ZoneKind = "hand" | "letter" | "fourth" | "veiled" | "tree" | "gate" | "well";

export interface Zone {
  id: string;
  kind: ZoneKind;
  /** 0-based position among same-kind zones (letters 0..2, gates 0..2, wells 0..2). */
  index?: number;
  /** Center + box in central-panel coordinates. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  label: string;
}

const { columnX, handY, lettersY, gatesY, wellsY, bottomRowY, width } = CENTRAL_PANEL;
/** The three openly-drawn letters sit in their own row between the Hand Anchor and the Gates, clear of the arch tops. */
const LETTERS_Y = lettersY;

const GATE_LABELS = ["Peshat — the Simple", "Remez — the Hinted", "Drash — the Sought"];
const WELL_LABELS = ["Torah", "Nevi'im", "Ketuvim"];
const LETTER_LABELS = ["First drawn", "Second drawn", "Third drawn"];

/** All central-panel interactive zones. Coordinates match centralPanel.tsx's layout. */
export const CENTRAL_ZONES: Zone[] = [
  { id: "hand", kind: "hand", cx: width / 2, cy: handY, w: 180, h: 150, label: "Hand Anchor" },
  ...([0, 1, 2] as const).map(
    (i): Zone => ({
      id: `letter-${i}`,
      kind: "letter",
      index: i,
      cx: columnX[i],
      cy: LETTERS_Y,
      w: 88,
      h: 88,
      label: LETTER_LABELS[i],
    }),
  ),
  ...([0, 1, 2] as const).map(
    (i): Zone => ({
      id: `gate-${i}`,
      kind: "gate",
      index: i,
      cx: columnX[i],
      cy: gatesY,
      w: 120,
      h: 120,
      label: GATE_LABELS[i],
    }),
  ),
  ...([0, 1, 2] as const).map(
    (i): Zone => ({
      id: `well-${i}`,
      kind: "well",
      index: i,
      cx: columnX[i],
      cy: wellsY,
      w: 108,
      h: 84,
      label: WELL_LABELS[i],
    }),
  ),
  { id: "veiled", kind: "veiled", cx: columnX[0] + 60, cy: bottomRowY, w: 140, h: 150, label: "Veiled Anchor" },
  { id: "tree", kind: "tree", cx: columnX[2] - 60, cy: bottomRowY, w: 140, h: 170, label: "Tree of Life — dominant middah" },
];

/** The Etz Chaim fourth card (the Fruit) sits beside the letter row; used only on Tu Bishvat. */
export const FOURTH_ZONE: Zone = {
  id: "fourth",
  kind: "fourth",
  cx: width / 2,
  cy: LETTERS_Y + 130,
  w: 96,
  h: 110,
  label: "The Fruit — Atzilut",
};

export function zoneById(id: string): Zone | undefined {
  return id === FOURTH_ZONE.id ? FOURTH_ZONE : CENTRAL_ZONES.find((z) => z.id === id);
}

/**
 * A filled annular-sector path for a ring slice — the rings render as
 * stroked arcs (no fill), so an operable ring needs real wedge hit-areas.
 * Uses the same 0°-at-top, clockwise convention as the rest of the geometry.
 */
export function wedgePath(radius: number, thickness: number, startAngle: number, endAngle: number): string {
  const outer = radius + thickness / 2;
  const inner = radius - thickness / 2;
  const p1 = polarToCartesian(CENTER.x, CENTER.y, outer, startAngle);
  const p2 = polarToCartesian(CENTER.x, CENTER.y, outer, endAngle);
  const p3 = polarToCartesian(CENTER.x, CENTER.y, inner, endAngle);
  const p4 = polarToCartesian(CENTER.x, CENTER.y, inner, startAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${p1.x} ${p1.y} A ${outer} ${outer} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${inner} ${inner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

/** Which of `count` equal slices (0°=top, clockwise) a given angle falls in. */
export function ringSliceAt(angleDeg: number, count: number): number {
  const norm = ((angleDeg % 360) + 360) % 360;
  return Math.floor(norm / (360 / count)) % count;
}

/** The mid-angle (degrees) of the `index`-th of `count` equal slices. */
export function sliceCenterAngle(count: number, index: number): number {
  const [start, end] = segmentAngles(count, index);
  return (start + end) / 2;
}

/** Month order shared by the Mazalot and Solar-Month rings — slice i is the same month in both. */
export const RING_MONTH_ORDER: JewishMonthName[] = mazalotRing.map((e) => e.month);

/** Ring radii/thickness re-exported for the interaction overlay. */
export { RINGS };
