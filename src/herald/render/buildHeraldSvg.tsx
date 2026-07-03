import type { HeraldInputSnapshot } from "../../types/herald";
import { lettersById } from "../../data/letters";
import { festivalsById } from "../../data/festivals";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import { computeDivisions, type Division } from "./divisions";
import {
  SHIELD,
  SHIELD_PATH,
  TREE_OF_LIFE_NODES,
  TREE_OF_LIFE_PATHS,
  FLOURISH_UNIT_PATH,
  shieldCenter,
} from "./heraldGeometry";

const BAND_TOP = SHIELD.top + 150;

function bandX(band: [number, number]): { start: number; end: number; center: number } {
  const width = SHIELD.right - SHIELD.left;
  const start = SHIELD.left + band[0] * width;
  const end = SHIELD.left + band[1] * width;
  return { start, end, center: (start + end) / 2 };
}

function perimeterPoints(count: number) {
  const left = SHIELD.left + 15;
  const right = SHIELD.right - 15;
  const top = SHIELD.top + 15;
  const bottom = SHIELD.point - 25;
  const width = right - left;
  const height = bottom - top;
  const perimeter = 2 * (width + height);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = (i / count) * perimeter;
    let x: number;
    let y: number;
    if (d < width) {
      x = left + d;
      y = top;
    } else if (d < width + height) {
      x = right;
      y = top + (d - width);
    } else if (d < 2 * width + height) {
      x = right - (d - width - height);
      y = bottom;
    } else {
      x = left;
      y = bottom - (d - 2 * width - height);
    }
    points.push({ x, y });
  }
  return points;
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

function TreeOfLife({ middah }: { middah: string }) {
  const center = shieldCenter();
  const boxWidth = 170;
  const boxHeight = 210;
  const originX = center.x - boxWidth / 2;
  const originY = SHIELD.shoulder - boxHeight - 10;

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
        const isActive = node.id === middah;
        return (
          <circle
            key={node.id}
            cx={p.x}
            cy={p.y}
            r={isActive ? 8 : 4}
            fill={isActive ? "var(--color-gold)" : "none"}
            stroke={isActive ? "var(--color-gold-bright)" : "var(--color-silver)"}
            strokeWidth={isActive ? 2 : 1}
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

function OrnamentalBorder({ layerCount, color }: { layerCount: number; color: string }) {
  const density = Math.min(10 + layerCount * 2, 40);
  const points = perimeterPoints(density);
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

/** Renders one Herald "layer" as an SVG group — no ghosting inside; the caller composites history. */
export function HeraldLayerContent({
  input,
  layerCount,
}: {
  input: HeraldInputSnapshot;
  layerCount: number;
}) {
  const divisions = computeDivisions(input.drawnLetters);
  const festival = festivalsById[input.festivalId] ?? festivalsById.ordinary;
  const accentColor = festival.heraldAccent?.accentColor ?? "var(--color-gold)";
  const center = shieldCenter();

  const shoresh = resolveShoresh(input.drawnLetters.map((d) => d.letterId) as [string, string, string]);

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

      <TreeOfLife middah={input.middah} />

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

      <GeographyAccent mode={input.geography.mode} />
      <FestivalMotif motif={festival.heraldAccent?.motif} center={center} />
      <OrnamentalBorder layerCount={layerCount} color={accentColor} />
      <path d={SHIELD_PATH} fill="none" stroke={accentColor} strokeWidth={2.5} />
    </g>
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
