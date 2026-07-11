import { TREE_OF_LIFE_NODES, TREE_OF_LIFE_PATHS } from "../../herald/render/heraldGeometry";
import { CENTRAL_PANEL } from "./mizbeachGeometry";
import type { LetterDraw } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { colorFor, darken } from "../../herald/render/letterColors";
import { letterPaths } from "../../herald/render/letterPaths.generated";

/** The reading's placements, so the folio plate shows real illuminated cards in its slots. */
export interface CentralPlacements {
  letters: [LetterDraw | null, LetterDraw | null, LetterDraw | null];
  veiled: LetterDraw | null;
  middah: SefirahId | null;
}

/** A font-independent Hebrew letterform (David Libre outline), centred in a box, flipped 180° when the card is reversed. */
function PathGlyph({
  letterId,
  cx,
  cy,
  size,
  reversed,
  fill,
}: {
  letterId: string;
  cx: number;
  cy: number;
  size: number;
  reversed: boolean;
  fill: string;
}) {
  const g = letterPaths[letterId];
  if (!g) return null;
  const w = g.bbox.maxX - g.bbox.minX;
  const h = g.bbox.maxY - g.bbox.minY;
  const s = Math.min(size / h, size / w);
  const cxf = (g.bbox.minX + g.bbox.maxX) / 2;
  const cyf = (g.bbox.minY + g.bbox.maxY) / 2;
  const sx = reversed ? -s : s;
  const sy = reversed ? s : -s;
  return <path d={g.d} transform={`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cxf} ${-cyf})`} fill={fill} />;
}

/** The gold-leaf sheen used across the folio's frames and letterforms. */
const GOLD = "url(#mizCentralGold)";

function GoldLeafDefs() {
  return (
    <defs>
      <linearGradient id="mizCentralGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#efd48c" />
        <stop offset="0.42" stopColor="#c9a24b" />
        <stop offset="0.72" stopColor="#a8823a" />
        <stop offset="1" stopColor="#e0be6f" />
      </linearGradient>
    </defs>
  );
}

/** A permanent card pocket on the folio — a recessed gold-ruled frame with corner ticks that a card seats into. */
function CardSlotFrame({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const half = size / 2;
  const t = 12; // corner tick length
  const corners = [
    [cx - half, cy - half, 1, 1],
    [cx + half, cy - half, -1, 1],
    [cx - half, cy + half, 1, -1],
    [cx + half, cy + half, -1, -1],
  ] as const;
  return (
    <g>
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={12} fill="#0d1014" stroke={GOLD} strokeWidth={2} />
      <rect x={cx - half + 4.5} y={cy - half + 4.5} width={size - 9} height={size - 9} rx={9} fill="none" stroke="var(--color-gold)" strokeWidth={0.75} opacity={0.4} />
      <g stroke="var(--color-gold-bright)" strokeWidth={1.5} opacity={0.85} strokeLinecap="round">
        {corners.map(([px, py, sx, sy], i) => (
          <g key={i}>
            <line x1={px + sx * 8} y1={py + sy * 8} x2={px + sx * (8 + t)} y2={py + sy * 8} />
            <line x1={px + sx * 8} y1={py + sy * 8} x2={px + sx * 8} y2={py + sy * (8 + t)} />
          </g>
        ))}
      </g>
    </g>
  );
}

/** A placed letter, drawn as an illuminated card seated in its pocket: its own tincture field, a double gold frame, the gold letterform. */
function LetterCard({ draw, cx, cy, size }: { draw: LetterDraw; cx: number; cy: number; size: number }) {
  const field = darken(colorFor(draw.letterId), 0.15);
  const highlight = colorFor(draw.letterId);
  const half = size / 2;
  return (
    <g>
      {/* soft seat shadow under the card */}
      <rect x={cx - half + 2} y={cy - half + 4} width={size} height={size} rx={9} fill="#000000" opacity={0.35} />
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={9} fill={field} stroke={GOLD} strokeWidth={2.25} />
      {/* a lit top edge on the tincture, for a little dimensional warmth */}
      <rect x={cx - half + 3} y={cy - half + 3} width={size - 6} height={(size - 6) * 0.4} rx={6} fill={highlight} opacity={0.18} />
      <rect x={cx - half + 4.5} y={cy - half + 4.5} width={size - 9} height={size - 9} rx={6} fill="none" stroke="var(--color-gold-bright)" strokeWidth={0.75} opacity={0.55} />
      <PathGlyph letterId={draw.letterId} cx={cx} cy={cy - 3} size={size * 0.56} reversed={draw.orientation === "reversed"} fill={GOLD} />
      {draw.orientation === "reversed" && (
        <text x={cx} y={cy + half - 7} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={8} fill="var(--color-gold)" opacity={0.75}>
          reversed
        </text>
      )}
    </g>
  );
}

/** The quiet estoile shown in an empty pocket. */
function SlotEmptyMark({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g stroke="var(--color-gold)" fill="none" opacity={0.32}>
      <path d={`M ${cx} ${cy - 11} L ${cx + 3} ${cy - 3} L ${cx + 11} ${cy} L ${cx + 3} ${cy + 3} L ${cx} ${cy + 11} L ${cx - 3} ${cy + 3} L ${cx - 11} ${cy} L ${cx - 3} ${cy - 3} Z`} strokeWidth={0.75} />
    </g>
  );
}

/**
 * The Mizbe'ach's central panel — Hand Anchor, Three Gates, Three Wells,
 * Veiled Anchor, and Tree of Life, in that layout order — a separate
 * rectangular composition from the circular ring mandala, matching the
 * physical folio's own reference design. Rendered as simplified procedural
 * icons (plain shapes/lines), consistent with the rest of this app's
 * approach — not an attempt to reproduce illustrated artwork.
 */

function HandAnchor() {
  const cx = CENTRAL_PANEL.width / 2;
  const cy = CENTRAL_PANEL.handY;
  const fingerAngles = [-40, -20, 0, 20, 40];
  return (
    <g>
      {/* Radiating sunburst behind the hand */}
      <g stroke="var(--color-charcoal-line)" strokeWidth={1} opacity={0.6}>
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * 360;
          const rad = (angle * Math.PI) / 180;
          const inner = 60;
          const outer = 92;
          return (
            <line
              key={i}
              x1={cx + inner * Math.cos(rad)}
              y1={cy + inner * Math.sin(rad)}
              x2={cx + outer * Math.cos(rad)}
              y2={cy + outer * Math.sin(rad)}
            />
          );
        })}
      </g>
      {/* Fingers */}
      <g fill="none" stroke={GOLD} strokeWidth={2.5} strokeLinecap="round">
        {fingerAngles.map((angle) => (
          <line
            key={angle}
            x1={cx}
            y1={cy - 5}
            x2={cx}
            y2={cy - 55}
            transform={`rotate(${angle} ${cx} ${cy - 5})`}
          />
        ))}
      </g>
      {/* Palm */}
      <ellipse cx={cx} cy={cy + 22} rx={30} ry={36} fill="#141a24" stroke={GOLD} strokeWidth={2.5} />
      <circle cx={cx} cy={cy + 22} r={6} fill={GOLD} opacity={0.8} />
      <text
        x={cx}
        y={cy + 66}
        textAnchor="middle"
        fontFamily="var(--font-latin)"
        fontSize={13}
        fill="var(--accent-bright)"
      >
        Hand Anchor
      </text>
      <text
        x={cx}
        y={cy + 82}
        textAnchor="middle"
        fontFamily="var(--font-latin)"
        fontSize={10}
        fill="var(--text-muted)"
      >
        The neshama's point of embodiment
      </text>
    </g>
  );
}

const GATES = [
  { hebrew: "פשט", title: "Peshat", subtitle: "The Simple" },
  { hebrew: "רמז", title: "Remez", subtitle: "The Hinted" },
  { hebrew: "דרש", title: "Drash", subtitle: "The Sought" },
];

function Arch({ x, y, hebrew, title, subtitle }: { x: number; y: number; hebrew: string; title: string; subtitle: string }) {
  const width = 120;
  const height = 110;
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y - height;
  const springLine = top + width / 2;
  return (
    <g>
      {/* A solid, illuminated gateway — a dark tincture within a gold-leaf arch, with a keystone. */}
      <path
        d={`M ${left} ${y} L ${left} ${springLine} A ${width / 2} ${width / 2} 0 0 1 ${right} ${springLine} L ${right} ${y} Z`}
        fill="#111826"
        stroke={GOLD}
        strokeWidth={2.5}
      />
      <path
        d={`M ${left + 7} ${y} L ${left + 7} ${springLine} A ${width / 2 - 7} ${width / 2 - 7} 0 0 1 ${right - 7} ${springLine} L ${right - 7} ${y}`}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={0.75}
        opacity={0.4}
      />
      <path d={`M ${x} ${top - 7} L ${x + 8} ${top + 7} L ${x - 8} ${top + 7} Z`} fill={GOLD} stroke="var(--color-charcoal)" strokeWidth={0.5} />
      <text
        x={x}
        y={top + width / 2 - 4}
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize={22}
        fill="var(--color-gold-bright)"
      >
        {hebrew}
      </text>
      <text x={x} y={y + 20} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={12} fill="var(--text)">
        {title}
      </text>
      <text x={x} y={y + 36} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={9} fill="var(--text-muted)">
        {subtitle}
      </text>
    </g>
  );
}

function ThreeGates() {
  return (
    <g>
      {GATES.map((gate, i) => (
        <Arch key={gate.title} x={CENTRAL_PANEL.columnX[i]} y={CENTRAL_PANEL.gatesY} {...gate} />
      ))}
    </g>
  );
}

const WELLS = [
  { hebrew: "תורה", title: "Torah", subtitle: "Teaching" },
  { hebrew: "נביאים", title: "Nevi'im", subtitle: "Prophets" },
  { hebrew: "כתובים", title: "Ketuvim", subtitle: "Writings" },
];

function Well({ x, y, hebrew, title, subtitle }: { x: number; y: number; hebrew: string; title: string; subtitle: string }) {
  const width = 100;
  const height = 60;
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y - height;
  return (
    <g>
      {/* A vessel with a gold-leaf rim holding still water. */}
      <path
        d={`M ${left} ${top} L ${left} ${y} Q ${left} ${y + 8} ${left + 8} ${y + 8} L ${right - 8} ${y + 8} Q ${right} ${y + 8} ${right} ${y} L ${right} ${top} Z`}
        fill="#0e1622"
        stroke={GOLD}
        strokeWidth={2.5}
      />
      <ellipse cx={x} cy={top} rx={width / 2} ry={7} fill="#0b1220" stroke={GOLD} strokeWidth={2} />
      <path
        d={`M ${left + 10} ${top + 20} Q ${x - width / 4} ${top + 12}, ${x} ${top + 20} T ${right - 10} ${top + 20}`}
        fill="none"
        stroke="var(--color-blue-bright)"
        strokeWidth={1.5}
        opacity={0.85}
      />
      <text
        x={x}
        y={top - 10}
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize={16}
        fill="var(--color-gold-bright)"
      >
        {hebrew}
      </text>
      <text x={x} y={y + 18} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={11} fill="var(--text)">
        {title}
      </text>
      <text x={x} y={y + 32} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={9} fill="var(--text-muted)">
        {subtitle}
      </text>
    </g>
  );
}

function ThreeWells() {
  return (
    <g>
      {WELLS.map((well, i) => (
        <Well key={well.title} x={CENTRAL_PANEL.columnX[i]} y={CENTRAL_PANEL.wellsY} {...well} />
      ))}
    </g>
  );
}

function VeiledAnchor({ x, y, placed = false }: { x: number; y: number; placed?: boolean }) {
  return (
    <g>
      <g stroke="var(--color-silver)" strokeWidth={2} fill="none" opacity={0.5}>
        <line x1={x} y1={y - 45} x2={x} y2={y + 10} />
        <circle cx={x} cy={y - 50} r={6} />
        <line x1={x - 14} y1={y - 30} x2={x + 14} y2={y - 30} />
        <path d={`M ${x - 18} ${y + 5} Q ${x - 20} ${y + 20}, ${x} ${y + 22} Q ${x + 20} ${y + 20}, ${x + 18} ${y + 5}`} />
      </g>
      {/* Draped curtain, obscuring the anchor — heavier once a veiled card is sealed within. */}
      <g fill="var(--color-charcoal-raised)" opacity={placed ? 0.95 : 0.75}>
        {[-24, -8, 8, 24].map((dx) => (
          <path
            key={dx}
            d={`M ${x + dx - 10} ${y - 60} Q ${x + dx} ${y - 20}, ${x + dx - 4} ${y + 30} L ${x + dx + 4} ${y + 30} Q ${x + dx + 10} ${y - 20}, ${x + dx + 10} ${y - 60} Z`}
          />
        ))}
      </g>
      {placed && (
        <g>
          {/* A wax seal over the drawn curtain — the card is set, but stays hidden. */}
          <circle cx={x} cy={y - 12} r={11} fill="var(--color-copper)" stroke="var(--color-gold-bright)" strokeWidth={1.5} />
          <path d={`M ${x} ${y - 20} L ${x + 5} ${y - 12} L ${x} ${y - 4} L ${x - 5} ${y - 12} Z`} fill="var(--color-gold-bright)" />
        </g>
      )}
      <text x={x} y={y + 50} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={11} fill="var(--text)">
        Veiled Anchor
      </text>
      <text x={x} y={y + 64} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={9} fill="var(--text-muted)">
        {placed ? "Sealed — revealed in its time" : "Revealed in its time"}
      </text>
    </g>
  );
}

function SmallTreeOfLife({ x, y, middah }: { x: number; y: number; middah?: SefirahId | null }) {
  const boxSize = 90;
  const originX = x - boxSize / 2;
  const originY = y - 70;
  const pos = (id: string) => {
    const node = TREE_OF_LIFE_NODES.find((n) => n.id === id)!;
    return { x: originX + node.x * boxSize, y: originY + node.y * boxSize };
  };
  return (
    <g>
      {TREE_OF_LIFE_PATHS.map(([a, b]) => {
        const pa = pos(a);
        const pb = pos(b);
        return (
          <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="var(--color-silver)" strokeWidth={0.75} opacity={0.5} />
        );
      })}
      {TREE_OF_LIFE_NODES.map((node) => {
        const p = pos(node.id);
        const chosen = middah != null && node.id === middah;
        return (
          <circle
            key={node.id}
            cx={p.x}
            cy={p.y}
            r={chosen ? 7 : 5}
            fill={chosen ? "var(--color-gold-bright)" : "none"}
            stroke={chosen ? "var(--color-gold-bright)" : "var(--color-gold)"}
            strokeWidth={chosen ? 2 : 1.25}
          />
        );
      })}
      <text x={x} y={y + 50} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={11} fill="var(--text)">
        Tree of Life
      </text>
      <text x={x} y={y + 64} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={9} fill="var(--text-muted)">
        All paths return here
      </text>
    </g>
  );
}

/** The three letter positions between the Hand Anchor and the Gates — each a card pocket seating a card once drawn. */
function LetterSlots({ placements }: { placements?: CentralPlacements }) {
  const { columnX, lettersY } = CENTRAL_PANEL;
  return (
    <g>
      {columnX.map((x, i) => {
        const draw = placements?.letters[i] ?? null;
        return (
          <g key={i}>
            <CardSlotFrame cx={x} cy={lettersY} size={100} />
            {draw ? <LetterCard draw={draw} cx={x} cy={lettersY} size={84} /> : <SlotEmptyMark cx={x} cy={lettersY} />}
          </g>
        );
      })}
    </g>
  );
}

export function MizbeachCentralPanel({ placements }: { placements?: CentralPlacements }) {
  const { width, height, topBanner, bottomRowY, bottomBanner } = CENTRAL_PANEL;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="The Mizbe'ach central panel — the Hand Anchor, the Three Gates (Peshat, Remez, Drash), the Three Wells (Torah, Nevi'im, Ketuvim), the Veiled Anchor, and the Tree of Life."
      style={{ width: "100%", height: "auto", background: "var(--color-charcoal)" }}
    >
      <title>The Mizbe'ach central panel</title>
      <GoldLeafDefs />
      <rect x={0} y={0} width={width} height={height} fill="var(--color-charcoal)" />
      <text
        x={width / 2}
        y={topBanner}
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize={18}
        fill="var(--color-gold)"
      >
        דע לפני מי אתה עומד
      </text>
      <HandAnchor />
      <LetterSlots placements={placements} />
      <ThreeGates />
      <ThreeWells />
      <VeiledAnchor x={CENTRAL_PANEL.columnX[0] + 60} y={bottomRowY} placed={!!placements?.veiled} />
      <SmallTreeOfLife x={CENTRAL_PANEL.columnX[2] - 60} y={bottomRowY} middah={placements?.middah} />
      <text
        x={width / 2}
        y={bottomBanner}
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize={16}
        fill="var(--color-gold)"
      >
        כי נר מצוה ותורה אור
      </text>
    </svg>
  );
}
