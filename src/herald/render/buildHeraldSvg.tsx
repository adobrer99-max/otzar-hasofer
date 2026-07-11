import type { HeraldInputSnapshot, DorotDraw, LetterDraw, HeraldStyle } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import type { HeraldForm } from "../synthesis/deriveHeraldForm";
import type { CovenantalForm } from "../covenant/deriveCovenantalForm";
import { lettersById } from "../../data/letters";
import { festivalsById } from "../../data/festivals";
import { dorotCardsById, dorotHousesById } from "../../data/dorot";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import { computeDivisions, type Division } from "./divisions";
import { nameSeedOf, flourishRotation } from "./nameGeometry";
import { LetterGlyph } from "./LetterGlyph";
import { LetterCharge, hasCharge } from "./letterCharges";
import { colorFor, darken } from "./letterColors";

type ShoreshResult = ReturnType<typeof resolveShoresh>;
import {
  SHIELD,
  SHIELD_PATH,
  shieldCenter,
  shieldBorderPoints,
} from "./heraldGeometry";

// The charges sit at the shield's centre now that the Tree no longer occupies it.
const BAND_TOP = SHIELD.top + 310;

/**
 * Foil-stamp palette. The Herald is a real gold-foil emblem on the back of a
 * card, so the metal is flat gold, its linework a slightly deeper gold for
 * crispness — no gradients or highlights. Individuality lives in the flat
 * heraldic tinctures of the field, never in the metal.
 */
const GOLD = "var(--color-gold)";
const GOLD_LINE = "#8a6a2c";

/**
 * The metal of the whole achievement (frame, charges, ornament). Gold by
 * default; the Scribe may seal it to another canonical metal. There is no
 * "natural" letter-coloured metal any more — a foil stamp is one flat metal.
 */
function metalAccent(metal: HeraldStyle["metal"] | undefined): { fill: string; line: string } {
  if (metal === "silver") return { fill: "var(--color-silver)", line: "#8b9099" };
  if (metal === "antique") return { fill: "#b58a37", line: "#7a5b22" };
  return { fill: GOLD, line: GOLD_LINE };
}

/** Heraldic-vocabulary toggles from the Scribe's curation; defaults keep the richer illuminated frame. */
function vocab(style?: HeraldStyle): {
  crest: boolean;
  mantling: boolean;
  compartment: boolean;
  supporters: boolean;
} {
  return {
    crest: style?.crest ?? true,
    mantling: style?.mantling ?? true,
    compartment: style?.compartment ?? true,
    supporters: style?.supporters ?? false,
  };
}

function bandX(band: [number, number]): { start: number; end: number; center: number } {
  const width = SHIELD.right - SHIELD.left;
  const start = SHIELD.left + band[0] * width;
  const end = SHIELD.left + band[1] * width;
  return { start, end, center: (start + end) / 2 };
}

function DivisionDividers({ bands, color }: { bands: [number, number][]; color: string }) {
  const boundaries = new Set<number>();
  bands.forEach(([, end]) => {
    if (end < 1) boundaries.add(end);
  });
  return (
    <>
      {Array.from(boundaries).map((frac) => {
        const x = SHIELD.left + frac * (SHIELD.right - SHIELD.left);
        // A thin gold line of partition between tinctures, the full height of the field.
        return (
          <line
            key={frac}
            x1={x}
            y1={SHIELD.top}
            x2={x}
            y2={SHIELD.point}
            stroke={color}
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}
    </>
  );
}

function GeographyAccent({ mode }: { mode: "land" | "galut" }) {
  const center = shieldCenter();
  const baseY = SHIELD.point - 40;
  if (mode === "land") {
    return (
      <g stroke="var(--color-copper)" strokeWidth={2} fill="none">
        <line x1={center.x} y1={baseY} x2={center.x} y2={baseY + 24} />
        <line x1={center.x} y1={baseY + 10} x2={center.x - 16} y2={baseY + 26} />
        <line x1={center.x} y1={baseY + 10} x2={center.x + 16} y2={baseY + 26} />
      </g>
    );
  }
  return (
    <g stroke="var(--color-copper)" strokeWidth={2} fill="none">
      <path
        d={`M ${center.x - 20} ${baseY + 10} Q ${center.x} ${baseY - 6}, ${center.x + 20} ${baseY + 12} T ${center.x + 40} ${baseY + 8}`}
      />
    </g>
  );
}

function FestivalMotif({ motif, center }: { motif?: string; center: { x: number; y: number } }) {
  if (!motif) return null;
  switch (motif) {
    case "twin-flame":
      return (
        <g stroke="var(--accent-bright)" strokeWidth={1.5} fill="none">
          <path d={`M ${center.x - 8} ${SHIELD.top + 30} q -4 -14 0 -22 q 4 8 0 22`} />
          <path d={`M ${center.x + 8} ${SHIELD.top + 30} q -4 -14 0 -22 q 4 8 0 22`} />
        </g>
      );
    case "broken-vessel":
      return (
        <line
          x1={center.x - 60}
          y1={SHIELD.top + 20}
          x2={center.x + 55}
          y2={SHIELD.top + 60}
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
      );
    case "seal":
      return (
        <circle
          cx={center.x}
          cy={SHIELD.top + 30}
          r={14}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
        />
      );
    case "veil":
      return (
        <rect
          x={center.x - 40}
          y={SHIELD.top + 10}
          width={80}
          height={28}
          fill="var(--accent)"
          opacity={0.18}
        />
      );
    case "unveiled":
      return (
        <path
          d={`M ${center.x - 40} ${SHIELD.top + 15} L ${center.x + 40} ${SHIELD.top + 15}`}
          stroke="var(--accent-bright)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
      );
    case "cracked":
      return (
        <path
          d={`M ${SHIELD.left + 20} ${SHIELD.top} L ${center.x - 10} ${SHIELD.shoulder / 2} L ${center.x + 15} ${SHIELD.shoulder}`}
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="none"
        />
      );
    case "rooted":
      return (
        <path
          d={`M ${center.x} ${SHIELD.top + 40} q 0 -20 0 -30`}
          stroke="var(--accent)"
          strokeWidth={2}
          fill="none"
        />
      );
    case "synthesis":
      return (
        <circle
          cx={center.x}
          cy={SHIELD.top + 30}
          r={10}
          fill="var(--accent-bright)"
          opacity={0.5}
        />
      );
    case "ushpizin":
      return (
        <g fill="var(--accent-bright)">
          {Array.from({ length: 7 }).map((_, i) => (
            <circle key={i} cx={center.x - 60 + i * 20} cy={SHIELD.top + 25} r={3} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** The seven lower Pillars, Chesed→Malchut, giving each Dorot mark its slot on the base axis. */
const PILLAR_SLOTS: SefirahId[] = ["chesed", "gevurah", "tiferet", "netzach", "hod", "yesod", "malchut"];

/** Maps drawn Derekh Ha'Dorot cards to their Houses' Sefirot (draw order preserved). */
export function dorotSefirotOf(draws: DorotDraw[] | undefined): SefirahId[] {
  return (draws ?? [])
    .map((d) => {
      const card = dorotCardsById[d.cardId];
      return card ? dorotHousesById[card.houseId]?.sefirah : undefined;
    })
    .filter((s): s is SefirahId => s !== undefined);
}

/**
 * Small copper marks near the shield's base — one diamond per Derekh
 * Ha'Dorot card drawn, placed on a 7-slot Chesed→Malchut axis by its
 * House's Pillar, stacking upward when several cards share a Pillar.
 * "No decorative element is arbitrary; every mark reflects a lived
 * relationship within the Treasury."
 */
function DorotBaseMarks({ sefirot }: { sefirot: SefirahId[] }) {
  if (sefirot.length === 0) return null;
  const center = shieldCenter();
  const baseY = SHIELD.shoulder + 90;
  const slotSpacing = 38;
  const seen = new Map<SefirahId, number>();
  return (
    <g stroke="var(--color-copper)" strokeWidth={1.25} fill="var(--color-copper)" fillOpacity={0.35}>
      {sefirot.map((sefirah, i) => {
        const slot = PILLAR_SLOTS.indexOf(sefirah);
        if (slot < 0) return null;
        const stack = seen.get(sefirah) ?? 0;
        seen.set(sefirah, stack + 1);
        const x = center.x + (slot - 3) * slotSpacing;
        const y = baseY - stack * 14;
        return (
          <path key={`${sefirah}-${i}`} d={`M ${x} ${y - 5} L ${x + 5} ${y} L ${x} ${y + 5} L ${x - 5} ${y} Z`} />
        );
      })}
    </g>
  );
}

/** Tier IV (Shoresh Nistar) treatment — a deliberate, distinct mark, not an empty result. */
function ShoreshNistarMark({ center }: { center: { x: number; y: number } }) {
  return (
    <g stroke="var(--color-silver)" strokeWidth={1.25} fill="none" opacity={0.6}>
      <path d={`M ${center.x - 14} ${center.y - 40} L ${center.x - 4} ${center.y - 30}`} strokeDasharray="2 4" />
      <path d={`M ${center.x + 14} ${center.y - 40} L ${center.x + 4} ${center.y - 30}`} strokeDasharray="2 4" />
      <circle cx={center.x} cy={center.y - 20} r={3} fill="var(--color-silver)" stroke="none" />
    </g>
  );
}

/** A single engraved lozenge (a slim upright diamond), centred on its origin. */
const LOZENGE_PATH = "M 0 -7 L 4 0 L 0 7 L -4 0 Z";

/**
 * The border — an engraved orle (a hairline that follows the escutcheon just
 * inside its edge) studded with evenly-spaced gold lozenges. Crisp and regular,
 * the way a foil-stamped border reads, rather than scattered flourishes. The
 * lozenge count grows with the ornament density so a completed Herald is more
 * richly bordered; the hidden Hebrew-name encoding survives as a subtle
 * per-lozenge rotation (absent name ⇒ translate-only, byte-identical to before).
 */
function OrnamentalBorder({
  density,
  metalFill,
  metalLine,
  nameSeed,
}: {
  density: number;
  metalFill: string;
  metalLine: string;
  /** The hidden Hebrew-name encoding — a subtle per-lozenge rotation phase. Absent: byte-identical to before. */
  nameSeed?: number;
}) {
  const orle = shieldBorderPoints(density, 20);
  const studs = shieldBorderPoints(Math.max(8, Math.round(density * 0.7)), 20);
  const orleD =
    orle.length > 0
      ? `M ${orle[0].x} ${orle[0].y} ` + orle.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") + " Z"
      : "";
  return (
    <g data-role="border">
      {/* The orle: a continuous hairline just inside the shield edge. */}
      <path d={orleD} fill="none" stroke={metalLine} strokeWidth={0.9} opacity={0.7} />
      {/* Evenly-spaced engraved lozenges riding the orle. */}
      <g fill={metalFill} stroke={metalLine} strokeWidth={0.5}>
        {studs.map((p, i) => (
          <path
            key={i}
            d={LOZENGE_PATH}
            transform={
              nameSeed === undefined
                ? `translate(${p.x}, ${p.y})`
                : `translate(${p.x}, ${p.y}) rotate(${flourishRotation(nameSeed, i)})`
            }
          />
        ))}
      </g>
    </g>
  );
}

/**
 * The crest — a torse (twisted wreath) resting on the shield's chief, from
 * which a small gold flame rises. Above the arms in real heraldry; here it
 * marks the Herald's summit. Kept deliberately simple and always gold.
 */
function Crest({ metalFill, metalLine }: { metalFill: string; metalLine: string }) {
  const center = shieldCenter();
  const torseY = SHIELD.top - 6;
  const half = 58;
  const bandH = 11;
  const twists = 7;
  const step = (half * 2) / twists;
  return (
    <g data-role="crest">
      {/* Torse: a solid gold rope-band with diagonal cross-hatching — the
          classic twisted wreath, reading as a rope rather than a fence. */}
      <path
        d={`M ${center.x - half} ${torseY} Q ${center.x} ${torseY - bandH}, ${center.x + half} ${torseY} Q ${center.x} ${torseY + bandH}, ${center.x - half} ${torseY} Z`}
        fill={metalFill}
        stroke={metalLine}
        strokeWidth={0.75}
      />
      <g stroke={metalLine} strokeWidth={0.9} opacity={0.7}>
        {Array.from({ length: twists - 1 }).map((_, i) => {
          const x = center.x - half + (i + 1) * step;
          return <line key={i} x1={x - 4} y1={torseY - bandH * 0.6} x2={x + 4} y2={torseY + bandH * 0.6} />;
        })}
      </g>
      {/* A single upright flame rising from the wreath — the neshama, the light. */}
      <path
        d={`M ${center.x} ${torseY - 62}
            C ${center.x - 15} ${torseY - 38}, ${center.x - 13} ${torseY - 16}, ${center.x} ${torseY - 11}
            C ${center.x + 13} ${torseY - 16}, ${center.x + 15} ${torseY - 38}, ${center.x} ${torseY - 62} Z`}
        fill={metalFill}
        stroke={metalLine}
        strokeWidth={0.75}
      />
      {/* Inner tongue of flame, cut from the deep ground for a crisp engraved read. */}
      <path
        d={`M ${center.x} ${torseY - 44}
            C ${center.x - 6} ${torseY - 30}, ${center.x - 5} ${torseY - 18}, ${center.x} ${torseY - 15}
            C ${center.x + 5} ${torseY - 18}, ${center.x + 6} ${torseY - 30}, ${center.x} ${torseY - 44} Z`}
        fill="var(--color-charcoal)"
      />
    </g>
  );
}

/**
 * Mantling — foliate scrollwork flanking the shield, the cloth-and-leaf mantle
 * of a coat of arms. Curl count grows with the ornament density so a completed
 * Herald is more richly framed. Drawn on both sides by mirroring.
 */
function Mantling({ density, metalFill, metalLine }: { density: number; metalFill: string; metalLine: string }) {
  // A little richer as the Herald completes, but always the same clean scroll.
  const extend = Math.min(1, 0.65 + density / 90);
  const side = (dir: 1 | -1) => {
    const rx = dir === 1 ? SHIELD.right : SHIELD.left;
    const topY = SHIELD.top;
    // One continuous acanthus vine sweeping from behind the torse, out over the
    // corner, and down the shoulder — a single crisp stroke, not scattered leaves.
    const vine =
      `M ${rx - dir * 2} ${topY + 2}` +
      ` C ${rx + dir * 30} ${topY - 10}, ${rx + dir * 52} ${topY + 22}, ${rx + dir * 44} ${topY + 60}` +
      ` C ${rx + dir * 38} ${topY + 92}, ${rx + dir * 60} ${topY + 108}, ${rx + dir * 50} ${topY + 150 * extend}`;
    // Three leaf cusps budding off the vine at set stations.
    const leaf = (bx: number, by: number, s: number) =>
      `M ${bx} ${by}` +
      ` Q ${bx + dir * 22 * s} ${by - 6}, ${bx + dir * 26 * s} ${by + 14 * s}` +
      ` Q ${bx + dir * 10 * s} ${by + 6 * s}, ${bx} ${by} Z`;
    return (
      <g key={dir}>
        <path d={vine} fill="none" stroke={metalLine} strokeWidth={1.5} />
        <g fill={metalFill} fillOpacity={0.85} stroke={metalLine} strokeWidth={0.6}>
          <path d={leaf(rx + dir * 46, topY + 42, 1)} />
          <path d={leaf(rx + dir * 44, topY + 92, 0.85)} />
          <path d={leaf(rx + dir * 52, topY + 138 * extend, 0.7)} />
        </g>
      </g>
    );
  };
  return (
    <g data-role="mantling">
      {side(1)}
      {side(-1)}
    </g>
  );
}

/**
 * The compartment — the ground on which the shield stands, just below the
 * point. Rooted earth in the Land; water in Galut (the same vocabulary as the
 * small GeographyAccent, enlarged to seat the whole shield).
 */
function Compartment({ geography, metalFill, metalLine }: { geography: "land" | "galut"; metalFill: string; metalLine: string }) {
  const center = shieldCenter();
  const y = SHIELD.point + 16;
  const span = 110;
  if (geography === "galut") {
    // Water — three engraved wave lines, the exile's shifting ground.
    return (
      <g data-role="compartment" stroke={metalLine} strokeWidth={1.5} fill="none">
        {[0, 9, 18].map((dy, k) => (
          <path
            key={k}
            d={`M ${center.x - span} ${y + dy} q ${span / 4} -8 ${span / 2} 0 t ${span / 2} 0 t ${span / 2} 0 t ${span / 2} 0`}
            opacity={0.9 - k * 0.2}
          />
        ))}
      </g>
    );
  }
  // Rooted earth — a solid engraved mound with upright grasses.
  return (
    <g data-role="compartment">
      <path
        d={`M ${center.x - span} ${y + 10} Q ${center.x} ${y - 12}, ${center.x + span} ${y + 10} L ${center.x + span} ${y + 16} Q ${center.x} ${y - 6}, ${center.x - span} ${y + 16} Z`}
        fill={metalFill}
        fillOpacity={0.85}
        stroke={metalLine}
        strokeWidth={0.75}
      />
      <g stroke={metalLine} strokeWidth={1.25} fill="none">
        {[-2, -1, 0, 1, 2].map((k) => (
          <path key={k} d={`M ${center.x + k * 34} ${y + 4} q ${k >= 0 ? 4 : -4} -10 0 -22`} />
        ))}
      </g>
    </g>
  );
}

/**
 * Supporters — two slender olive branches flanking the shield. Restrained by
 * design (not full heraldic beasts); off by default, an opt-in curation.
 */
function Supporters({ metalFill, metalLine }: { metalFill: string; metalLine: string }) {
  const branch = (dir: 1 | -1) => {
    const baseX = (dir === 1 ? SHIELD.right : SHIELD.left) + dir * 28;
    const topY = SHIELD.top + 40;
    const botY = SHIELD.point - 30;
    const leaves = 6;
    return (
      <g key={dir}>
        <path
          d={`M ${baseX} ${botY} C ${baseX - dir * 18} ${botY - 60}, ${baseX - dir * 18} ${topY + 60}, ${baseX} ${topY}`}
          fill="none"
          stroke={metalLine}
          strokeWidth={1.5}
        />
        {Array.from({ length: leaves }).map((_, i) => {
          const t = (i + 0.5) / leaves;
          const y = botY + t * (topY - botY);
          const x = baseX - dir * 18 * Math.sin(t * Math.PI);
          return (
            <ellipse
              key={i}
              cx={x - dir * 8}
              cy={y}
              rx={9}
              ry={3.5}
              fill={metalFill}
              fillOpacity={0.85}
              stroke={metalLine}
              strokeWidth={0.5}
              transform={`rotate(${dir * (t < 0.5 ? -35 : 35)} ${x - dir * 8} ${y})`}
            />
          );
        })}
      </g>
    );
  };
  return (
    <g data-role="supporters">
      {branch(1)}
      {branch(-1)}
    </g>
  );
}

/**
 * The motto scroll — a ribbon banner bearing the participant's sealed Heraldic
 * Epithet, beneath the shield in the heraldic manner. Rendered by the canvas
 * (which holds the epithet), positioned just below the point.
 */
export function MottoRibbon({ text }: { text: string }) {
  const center = shieldCenter();
  const y = SHIELD.point + 52;
  const w = Math.min(300, 120 + text.length * 6);
  const half = w / 2;
  const h = 15;
  return (
    <g data-role="motto">
      {/* End scrolls. */}
      {[-1, 1].map((dir) => (
        <path
          key={dir}
          d={`M ${center.x + dir * half} ${y - h} q ${dir * 20} ${h}, 0 ${2 * h} q ${-dir * 12} ${-h}, 0 ${-2 * h} Z`}
          fill="var(--color-charcoal-raised)"
          stroke="var(--color-gold)"
          strokeWidth={1.25}
        />
      ))}
      {/* Central band. */}
      <path
        d={`M ${center.x - half} ${y - h} L ${center.x + half} ${y - h} L ${center.x + half} ${y + h} L ${center.x - half} ${y + h} Z`}
        fill="var(--color-charcoal-raised)"
        stroke="var(--color-gold)"
        strokeWidth={1.25}
      />
      <text
        x={center.x}
        y={y + 5}
        textAnchor="middle"
        fontFamily="var(--font-latin)"
        fontSize={14}
        fontStyle="italic"
        fill="var(--color-gold-bright)"
      >
        {text}
      </text>
    </g>
  );
}

/**
 * The field's tincture, divided heraldically by how many letters dominate:
 * one letter → a plain field of its colour; two → per pale; three → tierced in
 * pale. Each region is a whisper of the letter's colour over the charcoal, so
 * the ground itself tells the reading's shape. Drawn inside the shield clip.
 */
/** Perceived luminance (0..1) of a #rrggbb colour. */
function hexLuminance(hex: string): number {
  const m = hex.replace("#", "");
  if (m.length < 6) return 0.5;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function FieldTincture({ letterIds }: { letterIds: string[] }) {
  const distinct = [...new Set(letterIds)];
  // Deep, flat heraldic tinctures — each field the letter's own colour, taken
  // to a rich jewel tone so a gold charge reads crisply over it (metal on
  // colour, the rule of tincture). No wash: these are the field, not a tint.
  // Light, metal-family colours (gold, yellow, silver) are darkened harder so
  // a gold charge never sits gold-on-gold.
  const tincture = (id: string) => {
    const c = colorFor(id);
    return darken(c, Math.min(0.52 + 0.38 * hexLuminance(c), 0.82));
  };
  const colors = distinct.map(tincture);
  const L = 66;
  const R = 534;
  const Y = 86;
  const H = 638;
  const op = 0.95;
  if (colors.length >= 3) {
    const w = (R - L) / 3;
    return (
      <>
        {colors.slice(0, 3).map((c, i) => (
          <rect key={i} x={L + i * w} y={Y} width={w} height={H} fill={c} opacity={op} />
        ))}
      </>
    );
  }
  if (colors.length === 2) {
    const mid = (L + R) / 2;
    return (
      <>
        <rect x={L} y={Y} width={mid - L} height={H} fill={colors[0]} opacity={op} />
        <rect x={mid} y={Y} width={R - mid} height={H} fill={colors[1]} opacity={op} />
      </>
    );
  }
  return <rect x={L} y={Y} width={R - L} height={H} fill={colors[0] ?? "#33343f"} opacity={op} />;
}

/**
 * The fess of the Word of the Life — when the dominant three letters resolve
 * to a Hebrew root or name, a horizontal band crosses the shield beneath the
 * charges, inscribed with the Word they spell. The letters are the Word; the
 * fess unites and names it.
 */
function WordFess({ color, word }: { color: string; word: string }) {
  const center = shieldCenter();
  const top = BAND_TOP - 64;
  const bottom = BAND_TOP + 48;
  return (
    <g data-role="fess">
      <rect x={SHIELD.left} y={top} width={SHIELD.right - SHIELD.left} height={bottom - top} fill={color} opacity={0.1} />
      <line x1={SHIELD.left} y1={top} x2={SHIELD.right} y2={top} stroke={color} strokeWidth={2.5} />
      <line x1={SHIELD.left} y1={bottom} x2={SHIELD.right} y2={bottom} stroke={color} strokeWidth={2.5} />
      <text
        x={center.x}
        y={BAND_TOP + 38}
        textAnchor="middle"
        direction="rtl"
        fontFamily="var(--font-hebrew)"
        fontSize={26}
        letterSpacing="0.1em"
        fill="var(--color-gold-bright)"
      >
        {word}
      </text>
    </g>
  );
}

interface HeraldFigureProps {
  divisions: Division[];
  geography: "land" | "galut";
  /** Zero or more accreted festival accent motifs. */
  festivalMotifs: string[];
  /** The achievement's metal: flat fill + its slightly deeper linework colour. */
  metalFill: string;
  metalLine: string;
  ornamentDensity: number;
  /** Omit to draw no root chains and no Shoresh Nistar mark (the Etz Chaim spread, where PaRDeS takes precedence). */
  shoresh?: ShoreshResult;
  /** Sefirot of the Houses whose cards were drawn from Derekh Ha'Dorot — base marks. */
  dorotSefirot?: SefirahId[];
  /** The hidden Hebrew-name encoding, woven into the border. See nameGeometry.ts. */
  nameSeed?: number;
  /** How each drawn letter is depicted: its enamelled letterform, or its heraldic charge. */
  device?: "glyph" | "charge";
  /** Heraldic vocabulary toggles (Scribe curation). Defaults keep the richer illuminated frame. */
  crest?: boolean;
  mantling?: boolean;
  compartment?: boolean;
  supporters?: boolean;
}

/**
 * The shared low-level Herald figure. Both a single reading and the
 * synthesis-of-seven render through this, differing only in the derived
 * inputs above — so the shield, dividers, Tree, Shoresh chains, glyphs,
 * accents, and border geometry stay identical across both paths.
 */
function HeraldFigure({
  divisions,
  geography,
  festivalMotifs,
  metalFill,
  metalLine,
  ornamentDensity,
  shoresh,
  dorotSefirot = [],
  nameSeed,
  device = "glyph",
  crest = true,
  mantling = true,
  compartment = true,
  supporters = false,
}: HeraldFigureProps) {
  const center = shieldCenter();

  function findDivision(letterId: string): Division | undefined {
    return divisions.find((d) => d.letterId === letterId);
  }

  // Tier I/II ("root"/"name"): the Word of the Life is borne on a fess across
  // the charges. Tier III ("related"): only the specific two-letter-root
  // correspondences get a lighter, tentative bezier (reordered-root and
  // gematria signals aren't tied to visual positions, so they're
  // caption-only). Tier IV: no fess — see ShoreshNistarMark instead.
  // The fess bears the Word itself, in Hebrew — the three root letters in draw
  // order (no transliteration; the meaning stays in the caption). In the
  // heraldic-charge device this is the one place the written word appears.
  const fessWord =
    shoresh?.tier === "root" || shoresh?.tier === "name"
      ? [...divisions]
          .sort((a, b) => a.drawOrder - b.drawOrder)
          .map((d) => lettersById[d.letterId]?.glyph ?? "")
          .join("")
      : undefined;
  const tentativePairs =
    shoresh?.tier === "related"
      ? shoresh.correspondences
          .filter((c) => c.kind === "two-letter-root")
          .map((c) => {
            const a = findDivision(c.letters[0]);
            const b = findDivision(c.letters[1]);
            return a && b ? { a, b, key: c.label } : undefined;
          })
          .filter((x): x is { a: Division; b: Division; key: string } => x !== undefined)
      : [];

  return (
    <>
      {/* The frame behind the shield: mantling, supporters, and the compartment. */}
      {mantling && <Mantling density={ornamentDensity} metalFill={metalFill} metalLine={metalLine} />}
      {supporters && <Supporters metalFill={metalFill} metalLine={metalLine} />}
      {compartment && <Compartment geography={geography} metalFill={metalFill} metalLine={metalLine} />}
      <g clipPath="url(#herald-shield-clip)">
        {/* Flat deep ground, then the flat tincture division — no gradient, glow, or texture. */}
        <path d={SHIELD_PATH} fill="var(--color-charcoal)" />
        <FieldTincture letterIds={divisions.map((d) => d.letterId)} />

        <DivisionDividers bands={divisions.map((d) => d.band)} color={metalLine} />

        {/* The Word of the Life, borne on a fess beneath the charges. */}
        {fessWord && <WordFess color={metalFill} word={fessWord} />}
        {tentativePairs.map(({ a, b, key }) => {
          const ax = bandX(a.band).center;
          const bx = bandX(b.band).center;
          const y = BAND_TOP - 62;
          return (
            <path
              key={key}
              d={`M ${ax} ${y} Q ${(ax + bx) / 2} ${y - 30}, ${bx} ${y}`}
              fill="none"
              stroke={metalFill}
              strokeWidth={1.5}
              strokeDasharray="1 5"
              strokeLinecap="round"
              opacity={0.8}
            />
          );
        })}
        {shoresh?.tier === "hidden" && <ShoreshNistarMark center={center} />}

        {/* Everything that frames the charges is drawn first — the base marks,
            geography, festival motifs, and the border — so that nothing is ever
            laid opaquely over a letter. */}
        <DorotBaseMarks sefirot={dorotSefirot} />
        <GeographyAccent mode={geography} />
        {festivalMotifs.map((motif) => (
          <FestivalMotif key={motif} motif={motif} center={center} />
        ))}
        <OrnamentalBorder density={ornamentDensity} metalFill={metalFill} metalLine={metalLine} nameSeed={nameSeed} />

        {/* The charges last — each enamelled in its letter's own colour, drawn
            as the letterform or, in the heraldic-charge device, as the letter's
            pictographic symbol (falling back to the letterform if that charge
            is not yet designed). */}
        {divisions.map((division) => {
          const band = bandX(division.band);
          const bandCenter = band.center;
          // Size each charge to fill its own division so the shield is full,
          // not a small mark in a wide field — capped so a lone charge stays sane.
          const baseSize = Math.min((band.end - band.start) * 0.82, 210);
          // The charges are struck in the achievement's metal — a gold-foil
          // charge on its letter's flat tincture (metal on colour). The letter's
          // own colour lives in the field behind it, not in the charge.
          const flip = division.orientation === "reversed";
          if (device === "charge" && hasCharge(division.letterId)) {
            return (
              <LetterCharge
                key={division.letterId}
                letterId={division.letterId}
                size={baseSize}
                x={bandCenter}
                y={BAND_TOP - baseSize * 0.32}
                fill={metalFill}
                stroke={metalLine}
                flip={flip}
              />
            );
          }
          return (
            <LetterGlyph
              key={division.letterId}
              letterId={division.letterId}
              size={baseSize}
              x={bandCenter}
              baselineY={BAND_TOP}
              fill={metalFill}
              stroke={metalLine}
              flip={flip}
            />
          );
        })}
      </g>
      {/* The escutcheon edge, outside the clip so the full stroke reads — a
          crisp struck gold edge. */}
      <path d={SHIELD_PATH} fill="none" stroke={metalFill} strokeWidth={3} />
      {crest && <Crest metalFill={metalFill} metalLine={metalLine} />}
    </>
  );
}

/** The Four Worlds, bottom to top, as the Etz Chaim spread stacks them. */
const ETZ_CHAIM_ROWS = [
  { world: "Assiyah", station: "the Roots", y: 590 },
  { world: "Yetzirah", station: "the Trunk", y: 460 },
  { world: "Briyah", station: "the Branches", y: 330 },
  { world: "Atzilut", station: "the Fruit", y: 195 },
] as const;

/**
 * Tu Bishvat's Vertical Four-Card Draw: the four open letters stacked as a
 * tree — roots at the base, fruit at the chief — one per World of existence.
 * Draw order grows upward: first drawn = the Roots (Assiyah), fourth = the
 * Fruit (Atzilut). The fifth card (Olam Ha'Ba) stays sealed and unrendered,
 * exactly as the veiled anchor always has.
 */
function EtzChaimCharges({ draws }: { draws: LetterDraw[] }) {
  const center = shieldCenter();
  return (
    <g clipPath="url(#herald-shield-clip)" data-spread="etz-chaim">
      <line
        x1={center.x}
        y1={ETZ_CHAIM_ROWS[0].y + 12}
        x2={center.x}
        y2={ETZ_CHAIM_ROWS[Math.min(draws.length, ETZ_CHAIM_ROWS.length) - 1].y - 46}
        stroke="var(--color-gold)"
        strokeWidth={1}
        opacity={0.5}
      />
      {draws.slice(0, ETZ_CHAIM_ROWS.length).map((draw, index) => {
        const row = ETZ_CHAIM_ROWS[index];
        return (
          <g key={`${row.world}-${draw.letterId}`}>
            <LetterGlyph
              letterId={draw.letterId}
              size={54}
              x={center.x}
              baselineY={row.y}
              fill={GOLD}
              stroke={GOLD_LINE}
              flip={draw.orientation === "reversed"}
            />
            <text
              x={center.x + 52}
              y={row.y - 14}
              fontSize={13}
              fill="var(--color-silver)"
              opacity={0.85}
            >
              {row.world} — {row.station}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Tu B'Av's Yichud: the veiled anchor is unveiled and drawn openly at the
 * shield's heart-point, and the four letters are read as two pairs — the
 * first and second drawn; the third drawn and the unveiled — with soft
 * ligatures binding each pair and the pairs to each other. Synthesis, not
 * tension.
 */
function YichudOverlay({
  drawnLetters,
  unveiled,
}: {
  drawnLetters: [LetterDraw, LetterDraw, LetterDraw];
  unveiled: LetterDraw;
}) {
  const center = shieldCenter();
  const divisions = computeDivisions(drawnLetters);
  const centerOf = (letterId: string) => {
    const d = divisions.find((div) => div.letterId === letterId);
    return d ? bandX(d.band).center : center.x;
  };
  const unveiledY = 520;
  const pairY = BAND_TOP + 42;
  const firstPair = { a: centerOf(drawnLetters[0].letterId), b: centerOf(drawnLetters[1].letterId) };
  const thirdX = centerOf(drawnLetters[2].letterId);
  return (
    <g clipPath="url(#herald-shield-clip)" data-spread="yichud">
      {/* First pair: first + second drawn. */}
      <path
        d={`M ${firstPair.a} ${pairY} Q ${(firstPair.a + firstPair.b) / 2} ${pairY + 26}, ${firstPair.b} ${pairY}`}
        fill="none"
        stroke="var(--color-gold-bright)"
        strokeWidth={1.75}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Second pair: third drawn + the unveiled anchor. */}
      <path
        d={`M ${thirdX} ${pairY} Q ${(thirdX + center.x) / 2} ${(pairY + unveiledY) / 2}, ${center.x} ${unveiledY - 44}`}
        fill="none"
        stroke="var(--color-gold-bright)"
        strokeWidth={1.75}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Pair to pair: the unification itself. */}
      <path
        d={`M ${(firstPair.a + firstPair.b) / 2} ${pairY + 26} Q ${center.x} ${(pairY + unveiledY) / 2 + 20}, ${center.x} ${unveiledY - 44}`}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={1}
        strokeDasharray="1 3"
        strokeLinecap="round"
        opacity={0.8}
      />
      <g data-role="unveiled-anchor">
        <LetterGlyph
          letterId={unveiled.letterId}
          size={48}
          x={center.x}
          baselineY={unveiledY}
          fill={GOLD}
          stroke={GOLD_LINE}
          flip={unveiled.orientation === "reversed"}
        />
      </g>
      <text x={center.x} y={unveiledY + 22} textAnchor="middle" fontSize={12} fill="var(--color-silver)" opacity={0.85}>
        The Unveiled Anchor
      </text>
    </g>
  );
}

/** Renders one reading's Herald as an SVG group — no ghosting inside; the caller composites history. */
export function HeraldLayerContent({
  input,
  layerCount,
  style,
}: {
  input: HeraldInputSnapshot;
  layerCount: number;
  style?: HeraldStyle;
}) {
  const festival = festivalsById[input.festivalId] ?? festivalsById.ordinary;
  const motif = festival.heraldAccent?.motif;
  const spread = input.spread ?? "triadic";
  const metal = metalAccent(style?.metal);
  const shared = {
    geography: input.geography.mode,
    festivalMotifs: motif ? [motif] : [],
    metalFill: metal.fill,
    metalLine: metal.line,
    ornamentDensity: Math.min(10 + layerCount * 2, 40),
    dorotSefirot: dorotSefirotOf(input.dorotDraws),
    nameSeed: nameSeedOf(input.hebrewName),
    device: style?.device ?? "glyph",
    ...vocab(style),
  };

  if (spread === "etz-chaim") {
    // PaRDeS takes absolute precedence on Tu Bishvat: no Shoresh resolution,
    // no divisions — the four open letters stack vertically as the Tree.
    const draws = input.fourthLetter
      ? [...input.drawnLetters, input.fourthLetter]
      : [...input.drawnLetters];
    return (
      <>
        <HeraldFigure divisions={[]} {...shared} />
        <EtzChaimCharges draws={draws} />
      </>
    );
  }

  const shoresh = resolveShoresh(
    input.drawnLetters.map((d) => d.letterId) as [string, string, string],
  );

  if (spread === "yichud") {
    return (
      <>
        <HeraldFigure
          divisions={computeDivisions(input.drawnLetters)}
          {...shared}
          shoresh={shoresh}
        />
        <YichudOverlay drawnLetters={input.drawnLetters} unveiled={input.veiledLetter} />
      </>
    );
  }

  return (
    <HeraldFigure
      divisions={computeDivisions(input.drawnLetters)}
      {...shared}
      shoresh={shoresh}
    />
  );
}

/**
 * Renders the Herald as the synthesis of a participant's first seven
 * readings (see `deriveHeraldForm`) — the dominant letters as charges, the
 * completing Tree of Life, and accreted accents. The dominant three letters
 * are resolved as a Shoresh too, so a confident chain draws when they spell
 * a root — the word the seven readings together speak.
 */
export function HeraldSynthesisContent({ form, style }: { form: HeraldForm; style?: HeraldStyle }) {
  const metal = metalAccent(style?.metal);
  return (
    <HeraldFigure
      divisions={computeDivisions(form.charges)}
      geography={form.geography}
      festivalMotifs={form.festivalMotifs}
      metalFill={metal.fill}
      metalLine={metal.line}
      ornamentDensity={form.ornamentDensity}
      shoresh={resolveShoresh(form.charges.map((c) => c.letterId) as [string, string, string])}
      dorotSefirot={form.dorotSefirot}
      device={style?.device ?? "glyph"}
      {...vocab(style)}
    />
  );
}

/**
 * The Covenantal Herald — the marriage impalement. Per pale, the heraldic
 * convention for a married couple's arms: partner A's dominant letter on
 * the dexter half, partner B's on the sinister. The Tree lights both
 * partners' Sefirot, and the recorded Sheva Brachot days accrete as base
 * marks on the same Chesed→Malchut axis the Dorot draws use.
 */
export function HeraldCovenantContent({ form }: { form: CovenantalForm }) {
  const divisions: Division[] = [
    { letterId: form.dexterCharge.letterId, orientation: form.dexterCharge.orientation, count: 1, drawOrder: 0, band: [0, 0.5] },
    { letterId: form.sinisterCharge.letterId, orientation: form.sinisterCharge.orientation, count: 1, drawOrder: 1, band: [0.5, 1] },
  ];
  const metal = metalAccent(undefined);
  return (
    <HeraldFigure
      divisions={divisions}
      geography={form.geography}
      festivalMotifs={[]}
      metalFill={metal.fill}
      metalLine={metal.line}
      ornamentDensity={form.ornamentDensity}
      dorotSefirot={form.shevaBrachotLit}
    />
  );
}

/**
 * Foil-stamp language: the Herald is drawn as flat metal and flat tinctures —
 * no gradients, glows, shadows, or texture, so it reproduces as a real
 * foil-stamped / printed emblem on the back of a card, not a screen graphic.
 * The only def is the shield clip.
 */
export function HeraldSvgDefs() {
  return (
    <defs>
      <clipPath id="herald-shield-clip">
        <path d={SHIELD_PATH} />
      </clipPath>
    </defs>
  );
}
