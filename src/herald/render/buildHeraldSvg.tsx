import type { HeraldInputSnapshot, DorotDraw, LetterDraw, HeraldStyle } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import type { HeraldForm } from "../synthesis/deriveHeraldForm";
import type { CovenantalForm } from "../covenant/deriveCovenantalForm";
import { festivalsById } from "../../data/festivals";
import { dorotCardsById, dorotHousesById } from "../../data/dorot";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import { computeDivisions, type Division } from "./divisions";
import { nameSeedOf, flourishRotation } from "./nameGeometry";
import { LetterGlyph } from "./LetterGlyph";

type ShoreshResult = ReturnType<typeof resolveShoresh>;
import {
  SHIELD,
  SHIELD_PATH,
  TREE_OF_LIFE_NODES,
  TREE_OF_LIFE_PATHS,
  FLOURISH_UNIT_PATH,
  shieldCenter,
  shieldBorderPoints,
} from "./heraldGeometry";

const BAND_TOP = SHIELD.top + 150;

/** The metal of the frame (outline/border/dividers) from the Scribe's curation. Gold-leaf letters are unchanged. */
function metalAccent(metal: HeraldStyle["metal"] | undefined, fallback: string): string {
  if (metal === "silver") return "var(--color-silver)";
  if (metal === "antique") return "#b58a37";
  return fallback;
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

function DivisionDividers({ bands }: { bands: [number, number][] }) {
  const boundaries = new Set<number>();
  bands.forEach(([, end]) => {
    if (end < 1) boundaries.add(end);
  });
  return (
    <>
      {Array.from(boundaries).map((frac) => {
        const x = SHIELD.left + frac * (SHIELD.right - SHIELD.left);
        return (
          <line
            key={frac}
            x1={x}
            y1={SHIELD.top}
            x2={x}
            y2={SHIELD.shoulder}
            stroke="var(--color-charcoal-line)"
            strokeWidth={1.5}
          />
        );
      })}
    </>
  );
}

/**
 * The Tree of Life. `dominant` is the brightest/largest node; every id in
 * `lit` glows gold (smaller than the dominant); the rest stay hollow silver.
 * A single reading passes `lit=[middah], dominant=middah` (one lit node);
 * the synthesis lights one node per Encounter, completing the lower Tree.
 */
function TreeOfLife({ lit, dominant }: { lit: string[]; dominant: string }) {
  const center = shieldCenter();
  const boxWidth = 170;
  const boxHeight = 210;
  const originX = center.x - boxWidth / 2;
  const originY = SHIELD.shoulder - boxHeight - 10;
  const litSet = new Set(lit);

  const pos = (id: string) => {
    const node = TREE_OF_LIFE_NODES.find((n) => n.id === id)!;
    return { x: originX + node.x * boxWidth, y: originY + node.y * boxHeight };
  };

  return (
    <g opacity={0.85}>
      {TREE_OF_LIFE_PATHS.map(([a, b]) => {
        const pa = pos(a);
        const pb = pos(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke="var(--color-silver)"
            strokeWidth={0.75}
            opacity={0.4}
          />
        );
      })}
      {TREE_OF_LIFE_NODES.map((node) => {
        const p = pos(node.id);
        const isDominant = node.id === dominant;
        const isLit = litSet.has(node.id);
        return (
          <circle
            key={node.id}
            cx={p.x}
            cy={p.y}
            r={isDominant ? 8 : isLit ? 6 : 4}
            fill={isDominant ? "url(#herald-gold-leaf)" : isLit ? "var(--color-gold)" : "none"}
            fillOpacity={isDominant ? 1 : isLit ? 0.55 : 1}
            stroke={
              isDominant
                ? "var(--color-gold-bright)"
                : isLit
                  ? "var(--color-gold)"
                  : "var(--color-silver)"
            }
            strokeWidth={isDominant ? 2 : isLit ? 1.5 : 1}
            filter={isDominant ? "url(#herald-glow)" : undefined}
          />
        );
      })}
    </g>
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

function OrnamentalBorder({
  density,
  color,
  nameSeed,
}: {
  density: number;
  color: string;
  /** The hidden Hebrew-name encoding — a subtle per-flourish rotation phase. Absent: byte-identical to before. */
  nameSeed?: number;
}) {
  const points = shieldBorderPoints(density);
  return (
    <g stroke={color} fill={color} opacity={0.85}>
      {points.map((p, i) => (
        <path
          key={i}
          d={FLOURISH_UNIT_PATH}
          transform={
            nameSeed === undefined
              ? `translate(${p.x}, ${p.y})`
              : `translate(${p.x}, ${p.y}) rotate(${flourishRotation(nameSeed, i)})`
          }
          strokeWidth={0.75}
          fillOpacity={0.15}
        />
      ))}
    </g>
  );
}

/**
 * The crest — a torse (twisted wreath) resting on the shield's chief, from
 * which a small gold flame rises. Above the arms in real heraldry; here it
 * marks the Herald's summit. Kept deliberately simple and always gold.
 */
function Crest() {
  const center = shieldCenter();
  const torseY = SHIELD.top - 7;
  const half = 66;
  const twists = 8;
  const step = (half * 2) / twists;
  return (
    <g data-role="crest">
      {/* Torse: a row of alternating over/under twists. */}
      <g stroke="var(--color-gold)" strokeWidth={2} fill="none">
        {Array.from({ length: twists }).map((_, i) => {
          const x0 = center.x - half + i * step;
          const up = i % 2 === 0;
          return (
            <path
              key={i}
              d={`M ${x0} ${torseY} Q ${x0 + step / 2} ${torseY + (up ? -9 : 9)}, ${x0 + step} ${torseY}`}
              stroke={up ? "url(#herald-gold-leaf-soft)" : "var(--color-gold)"}
            />
          );
        })}
      </g>
      {/* Flame emblem rising from the torse. */}
      <path
        d={`M ${center.x} ${torseY - 58}
            C ${center.x - 16} ${torseY - 34}, ${center.x - 12} ${torseY - 10}, ${center.x} ${torseY - 6}
            C ${center.x + 12} ${torseY - 10}, ${center.x + 16} ${torseY - 34}, ${center.x} ${torseY - 58} Z`}
        fill="url(#herald-gold-leaf)"
        stroke="var(--color-gold-bright)"
        strokeWidth={1}
        filter="url(#herald-glow)"
      />
      <path
        d={`M ${center.x} ${torseY - 40} C ${center.x - 6} ${torseY - 26}, ${center.x - 5} ${torseY - 14}, ${center.x} ${torseY - 10} C ${center.x + 5} ${torseY - 14}, ${center.x + 6} ${torseY - 26}, ${center.x} ${torseY - 40} Z`}
        fill="var(--color-charcoal-raised)"
        opacity={0.55}
      />
    </g>
  );
}

/**
 * Mantling — foliate scrollwork flanking the shield, the cloth-and-leaf mantle
 * of a coat of arms. Curl count grows with the ornament density so a completed
 * Herald is more richly framed. Drawn on both sides by mirroring.
 */
function Mantling({ density }: { density: number }) {
  const lobes = Math.max(3, Math.min(5, Math.round(density / 9)));
  const side = (dir: 1 | -1) => {
    const rootX = dir === 1 ? SHIELD.right : SHIELD.left;
    return Array.from({ length: lobes }).map((_, i) => {
      const t = i / Math.max(lobes - 1, 1);
      // Cascade from the top corner down the shield's shoulder, bulging out midway.
      const cy = SHIELD.top + 4 + t * 168;
      const cx = rootX + dir * (8 + 28 * Math.sin(t * Math.PI * 0.9));
      const L = 30 * (1 - 0.4 * t);
      const W = L * 0.62;
      // An acanthus leaf: base at (cx,cy), tip at (cx, cy-L), then rotated to hang down-and-out.
      const d = `M ${cx} ${cy} Q ${cx - W / 2} ${cy - L / 2}, ${cx} ${cy - L} Q ${cx + W / 2} ${cy - L / 2}, ${cx} ${cy} Z`;
      return (
        <path
          key={`${dir}-${i}`}
          d={d}
          transform={`rotate(${dir * 138} ${cx} ${cy})`}
          fill="url(#herald-gold-leaf-soft)"
          fillOpacity={0.5}
          stroke="var(--color-gold)"
          strokeWidth={0.75}
          strokeOpacity={0.6}
        />
      );
    });
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
function Compartment({ geography }: { geography: "land" | "galut" }) {
  const center = shieldCenter();
  const y = SHIELD.point + 18;
  const span = 96;
  if (geography === "galut") {
    return (
      <g data-role="compartment" stroke="var(--color-copper)" strokeWidth={2} fill="none" opacity={0.8}>
        <path d={`M ${center.x - span} ${y} Q ${center.x - span / 2} ${y - 10}, ${center.x} ${y} T ${center.x + span} ${y}`} />
        <path d={`M ${center.x - span + 12} ${y + 12} Q ${center.x - span / 2} ${y + 2}, ${center.x} ${y + 12} T ${center.x + span - 12} ${y + 12}`} opacity={0.6} />
      </g>
    );
  }
  return (
    <g data-role="compartment" stroke="var(--color-copper)" strokeWidth={2} fill="none" opacity={0.85}>
      <path d={`M ${center.x - span} ${y} Q ${center.x} ${y + 14}, ${center.x + span} ${y}`} />
      {[-1, 0, 1].map((k) => (
        <line key={k} x1={center.x + k * 30} y1={y + 4} x2={center.x + k * 30} y2={y + 22} />
      ))}
    </g>
  );
}

/**
 * Supporters — two slender olive branches flanking the shield. Restrained by
 * design (not full heraldic beasts); off by default, an opt-in curation.
 */
function Supporters() {
  const branch = (dir: 1 | -1) => {
    const baseX = (dir === 1 ? SHIELD.right : SHIELD.left) + dir * 26;
    const topY = SHIELD.top + 40;
    const botY = SHIELD.point - 30;
    const leaves = 6;
    return (
      <g key={dir}>
        <path
          d={`M ${baseX} ${botY} C ${baseX - dir * 18} ${botY - 60}, ${baseX - dir * 18} ${topY + 60}, ${baseX} ${topY}`}
          fill="none"
          stroke="url(#herald-gold-leaf-soft)"
          strokeWidth={1.75}
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
              fill="url(#herald-gold-leaf)"
              opacity={0.75}
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
          stroke="url(#herald-gold-leaf-soft)"
          strokeWidth={1.25}
        />
      ))}
      {/* Central band. */}
      <path
        d={`M ${center.x - half} ${y - h} L ${center.x + half} ${y - h} L ${center.x + half} ${y + h} L ${center.x - half} ${y + h} Z`}
        fill="var(--color-charcoal-raised)"
        stroke="url(#herald-gold-leaf-soft)"
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

interface HeraldFigureProps {
  divisions: Division[];
  /** Tree nodes that glow; empty for none. */
  litSefirot: string[];
  /** The brightest/largest Tree node. */
  dominantSefirah: string;
  geography: "land" | "galut";
  /** Zero or more accreted festival accent motifs. */
  festivalMotifs: string[];
  accentColor: string;
  ornamentDensity: number;
  /** Omit to draw no root chains and no Shoresh Nistar mark (the Etz Chaim spread, where PaRDeS takes precedence). */
  shoresh?: ShoreshResult;
  /** Sefirot of the Houses whose cards were drawn from Derekh Ha'Dorot — base marks. */
  dorotSefirot?: SefirahId[];
  /** The hidden Hebrew-name encoding, woven into the border. See nameGeometry.ts. */
  nameSeed?: number;
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
  litSefirot,
  dominantSefirah,
  geography,
  festivalMotifs,
  accentColor,
  ornamentDensity,
  shoresh,
  dorotSefirot = [],
  nameSeed,
  crest = true,
  mantling = true,
  compartment = true,
  supporters = false,
}: HeraldFigureProps) {
  const center = shieldCenter();

  function findDivision(letterId: string): Division | undefined {
    return divisions.find((d) => d.letterId === letterId);
  }

  // Tier I/II ("root"/"name"): a solid, confident chain connecting every
  // division. Tier III ("related"): only the specific two-letter-root
  // correspondences get the lighter, tentative bezier (reordered-root and
  // gematria signals aren't tied to visual positions, so they're
  // caption-only). Tier IV: no lines — see ShoreshNistarMark instead.
  const confidentChain =
    (shoresh?.tier === "root" || shoresh?.tier === "name") && divisions.length > 1
      ? divisions.slice(1).map((division, i) => [divisions[i], division] as const)
      : [];
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
      {mantling && <Mantling density={ornamentDensity} />}
      {supporters && <Supporters />}
      {compartment && <Compartment geography={geography} />}
      {/* A faint gold halo, and a soft shadow so the plate rests upon the field. */}
      <rect x={0} y={40} width={600} height={740} fill="url(#herald-field-glow)" />
      <path d={SHIELD_PATH} fill="var(--color-charcoal)" filter="url(#herald-emboss)" />
      <g clipPath="url(#herald-shield-clip)">
        <path d={SHIELD_PATH} fill="url(#herald-shield-fill)" />
        {/* Parchment tooth over the charcoal interior. */}
        <rect x={66} y={86} width={468} height={638} fill="#c9a24b" filter="url(#herald-vellum)" opacity={0.32} />

        <DivisionDividers bands={divisions.map((d) => d.band)} />

      <TreeOfLife lit={litSefirot} dominant={dominantSefirah} />

      {confidentChain.map(([a, b]) => {
        const ax = bandX(a.band).center;
        const bx = bandX(b.band).center;
        const y = BAND_TOP - 30;
        return (
          <path
            key={`${a.letterId}-${b.letterId}`}
            d={`M ${ax} ${y} Q ${(ax + bx) / 2} ${y - 30}, ${bx} ${y}`}
            fill="none"
            stroke="var(--color-gold-bright)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        );
      })}

      {tentativePairs.map(({ a, b, key }) => {
        const ax = bandX(a.band).center;
        const bx = bandX(b.band).center;
        const y = BAND_TOP - 30;
        return (
          <path
            key={key}
            d={`M ${ax} ${y} Q ${(ax + bx) / 2} ${y - 30}, ${bx} ${y}`}
            fill="none"
            stroke="var(--color-gold-bright)"
            strokeWidth={1.5}
            strokeDasharray="1 5"
            strokeLinecap="round"
          />
        );
      })}

      {shoresh?.tier === "hidden" && <ShoreshNistarMark center={center} />}

      {divisions.map((division) => {
        const { center: bandCenter } = bandX(division.band);
        const baseSize = 60 + (2 - division.drawOrder) * 12 + (division.count - 1) * 8;
        return (
          <LetterGlyph
            key={division.letterId}
            letterId={division.letterId}
            size={baseSize}
            x={bandCenter}
            baselineY={BAND_TOP}
            fill="url(#herald-gold-leaf)"
            stroke="var(--color-gold-bright)"
            flip={division.orientation === "reversed"}
          />
        );
      })}

      <DorotBaseMarks sefirot={dorotSefirot} />
      <GeographyAccent mode={geography} />
      {festivalMotifs.map((motif) => (
        <FestivalMotif key={motif} motif={motif} center={center} />
      ))}
        <OrnamentalBorder density={ornamentDensity} color={accentColor} nameSeed={nameSeed} />
      </g>
      {/* The escutcheon edge, outside the clip so the full stroke reads. */}
      <path d={SHIELD_PATH} fill="none" stroke={accentColor} strokeWidth={2.5} />
      {crest && <Crest />}
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
              fill="url(#herald-gold-leaf)"
              stroke="var(--color-gold-bright)"
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
          fill="url(#herald-gold-leaf)"
          stroke="var(--color-gold-bright)"
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
  const shared = {
    litSefirot: [input.middah],
    dominantSefirah: input.middah,
    geography: input.geography.mode,
    festivalMotifs: motif ? [motif] : [],
    accentColor: metalAccent(style?.metal, festival.heraldAccent?.accentColor ?? "var(--color-gold)"),
    ornamentDensity: Math.min(10 + layerCount * 2, 40),
    dorotSefirot: dorotSefirotOf(input.dorotDraws),
    nameSeed: nameSeedOf(input.hebrewName),
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
  return (
    <HeraldFigure
      divisions={computeDivisions(form.charges)}
      litSefirot={form.litSefirot}
      dominantSefirah={form.dominantMiddah}
      geography={form.geography}
      festivalMotifs={form.festivalMotifs}
      accentColor={metalAccent(style?.metal, form.accentColor)}
      ornamentDensity={form.ornamentDensity}
      shoresh={resolveShoresh(form.charges.map((c) => c.letterId) as [string, string, string])}
      dorotSefirot={form.dorotSefirot}
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
  return (
    <HeraldFigure
      divisions={divisions}
      litSefirot={form.litSefirot}
      dominantSefirah={form.dominantMiddah}
      geography={form.geography}
      festivalMotifs={[]}
      accentColor={form.bothRevealed ? "var(--color-gold-bright)" : "var(--color-gold)"}
      ornamentDensity={form.ornamentDensity}
      dorotSefirot={form.shevaBrachotLit}
    />
  );
}

/**
 * The illumination layer — gradients, filters, and a texture that turn the
 * flat linework into an illuminated plate. All defs are static (determinism
 * preserved) and live inside the exported `<svg>`, so SVG export clones them
 * and PNG rasterizes them. Gradient/texture stop-colours are written as
 * literal hex (mirroring the brand constants in theme.css) — NOT `var(--…)` —
 * because the SVG-export var-resolver walks fill/stroke/style, not stop-color.
 */
export function HeraldSvgDefs() {
  return (
    <defs>
      <clipPath id="herald-shield-clip">
        <path d={SHIELD_PATH} />
      </clipPath>

      {/* Beaten gold-leaf: a pale highlight sweeping to a deep shadow. */}
      <linearGradient id="herald-gold-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f4e4b0" />
        <stop offset="34%" stopColor="#e4c579" />
        <stop offset="66%" stopColor="#c9a24b" />
        <stop offset="100%" stopColor="#9c7a35" />
      </linearGradient>

      {/* A softer, near-vertical gold for strokes/flourishes. */}
      <linearGradient id="herald-gold-leaf-soft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ecd291" />
        <stop offset="55%" stopColor="#c9a24b" />
        <stop offset="100%" stopColor="#a9853a" />
      </linearGradient>

      {/* Shield interior: a raised centre falling to the charcoal edge (depth). */}
      <radialGradient id="herald-shield-fill" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0%" stopColor="#232833" />
        <stop offset="70%" stopColor="#1a1e25" />
        <stop offset="100%" stopColor="#14171c" />
      </radialGradient>

      {/* A faint gold halo behind the shield. */}
      <radialGradient id="herald-field-glow" cx="0.5" cy="0.42" r="0.5">
        <stop offset="0%" stopColor="#c9a24b" stopOpacity="0.14" />
        <stop offset="60%" stopColor="#c9a24b" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#c9a24b" stopOpacity="0" />
      </radialGradient>

      {/* Soft outer shadow so the plate sits upon the field, not floats on it. */}
      <filter id="herald-emboss" x="-12%" y="-12%" width="124%" height="124%">
        <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.45" />
      </filter>

      {/* A gentle glow for the dominant emblems (crest, dominant Tree node). */}
      <filter id="herald-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Parchment tooth: a whisper of fractal texture over the charcoal field. */}
      <filter id="herald-vellum" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" stitchTiles="stitch" result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0.86  0 0 0 0 0.79  0 0 0 0 0.6  0 0 0 0.5 0"
        />
      </filter>
    </defs>
  );
}
