import type { HeraldInputSnapshot, DorotDraw } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import type { HeraldForm } from "../synthesis/deriveHeraldForm";
import { lettersById } from "../../data/letters";
import { festivalsById } from "../../data/festivals";
import { dorotCardsById, dorotHousesById } from "../../data/dorot";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import { computeDivisions, type Division } from "./divisions";

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
            fill={isDominant ? "var(--color-gold)" : isLit ? "var(--color-gold)" : "none"}
            fillOpacity={isDominant ? 1 : isLit ? 0.55 : 1}
            stroke={
              isDominant
                ? "var(--color-gold-bright)"
                : isLit
                  ? "var(--color-gold)"
                  : "var(--color-silver)"
            }
            strokeWidth={isDominant ? 2 : isLit ? 1.5 : 1}
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

function OrnamentalBorder({ density, color }: { density: number; color: string }) {
  const points = shieldBorderPoints(density);
  return (
    <g stroke={color} fill={color} opacity={0.85}>
      {points.map((p, i) => (
        <path
          key={i}
          d={FLOURISH_UNIT_PATH}
          transform={`translate(${p.x}, ${p.y})`}
          strokeWidth={0.75}
          fillOpacity={0.15}
        />
      ))}
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
  shoresh: ShoreshResult;
  /** Sefirot of the Houses whose cards were drawn from Derekh Ha'Dorot — base marks. */
  dorotSefirot?: SefirahId[];
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
    (shoresh.tier === "root" || shoresh.tier === "name") && divisions.length > 1
      ? divisions.slice(1).map((division, i) => [divisions[i], division] as const)
      : [];
  const tentativePairs =
    shoresh.tier === "related"
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
    <g clipPath="url(#herald-shield-clip)">
      <path d={SHIELD_PATH} fill="var(--color-charcoal-raised)" />

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

      {shoresh.tier === "hidden" && <ShoreshNistarMark center={center} />}

      {divisions.map((division) => {
        const letter = lettersById[division.letterId];
        const { center: bandCenter } = bandX(division.band);
        const baseSize = 60 + (2 - division.drawOrder) * 12 + (division.count - 1) * 8;
        const flip = division.orientation === "reversed";
        return (
          <text
            key={division.letterId}
            x={bandCenter}
            y={BAND_TOP}
            textAnchor="middle"
            fontFamily="var(--font-hebrew)"
            fontSize={baseSize}
            fill="var(--color-gold)"
            stroke="var(--color-gold-bright)"
            strokeWidth={0.5}
            transform={flip ? `rotate(180 ${bandCenter} ${BAND_TOP - baseSize / 3})` : undefined}
          >
            {letter?.glyph ?? "?"}
          </text>
        );
      })}

      <DorotBaseMarks sefirot={dorotSefirot} />
      <GeographyAccent mode={geography} />
      {festivalMotifs.map((motif) => (
        <FestivalMotif key={motif} motif={motif} center={center} />
      ))}
      <OrnamentalBorder density={ornamentDensity} color={accentColor} />
      <path d={SHIELD_PATH} fill="none" stroke={accentColor} strokeWidth={2.5} />
    </g>
  );
}

/** Renders one reading's Herald as an SVG group — no ghosting inside; the caller composites history. */
export function HeraldLayerContent({
  input,
  layerCount,
}: {
  input: HeraldInputSnapshot;
  layerCount: number;
}) {
  const festival = festivalsById[input.festivalId] ?? festivalsById.ordinary;
  const motif = festival.heraldAccent?.motif;
  return (
    <HeraldFigure
      divisions={computeDivisions(input.drawnLetters)}
      litSefirot={[input.middah]}
      dominantSefirah={input.middah}
      geography={input.geography.mode}
      festivalMotifs={motif ? [motif] : []}
      accentColor={festival.heraldAccent?.accentColor ?? "var(--color-gold)"}
      ornamentDensity={Math.min(10 + layerCount * 2, 40)}
      shoresh={resolveShoresh(input.drawnLetters.map((d) => d.letterId) as [string, string, string])}
      dorotSefirot={dorotSefirotOf(input.dorotDraws)}
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
export function HeraldSynthesisContent({ form }: { form: HeraldForm }) {
  return (
    <HeraldFigure
      divisions={computeDivisions(form.charges)}
      litSefirot={form.litSefirot}
      dominantSefirah={form.dominantMiddah}
      geography={form.geography}
      festivalMotifs={form.festivalMotifs}
      accentColor={form.accentColor}
      ornamentDensity={form.ornamentDensity}
      shoresh={resolveShoresh(form.charges.map((c) => c.letterId) as [string, string, string])}
      dorotSefirot={form.dorotSefirot}
    />
  );
}

export function HeraldSvgDefs() {
  return (
    <defs>
      <clipPath id="herald-shield-clip">
        <path d={SHIELD_PATH} />
      </clipPath>
    </defs>
  );
}
