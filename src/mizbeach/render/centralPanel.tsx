import { TREE_OF_LIFE_NODES, TREE_OF_LIFE_PATHS } from "../../herald/render/heraldGeometry";
import { CENTRAL_PANEL } from "./mizbeachGeometry";

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
      <g fill="none" stroke="var(--color-gold)" strokeWidth={2} strokeLinecap="round">
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
      <ellipse cx={cx} cy={cy + 22} rx={30} ry={36} fill="var(--color-charcoal-raised)" stroke="var(--color-gold)" strokeWidth={2} />
      <text
        x={cx}
        y={cy + 90}
        textAnchor="middle"
        fontFamily="var(--font-latin)"
        fontSize={13}
        fill="var(--accent-bright)"
      >
        Hand Anchor
      </text>
      <text
        x={cx}
        y={cy + 108}
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
      <path
        d={`M ${left} ${y} L ${left} ${springLine} A ${width / 2} ${width / 2} 0 0 1 ${right} ${springLine} L ${right} ${y}`}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={2}
      />
      <text
        x={x}
        y={top + width / 2 - 8}
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize={20}
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
      <path
        d={`M ${left} ${top} L ${left} ${y} L ${right} ${y} L ${right} ${top}`}
        fill="none"
        stroke="var(--color-copper)"
        strokeWidth={2}
      />
      <path
        d={`M ${left + 6} ${top + 18} Q ${x - width / 4} ${top + 10}, ${x} ${top + 18} T ${right - 6} ${top + 18}`}
        fill="none"
        stroke="var(--color-blue-bright)"
        strokeWidth={1.5}
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

function VeiledAnchor({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <g stroke="var(--color-silver)" strokeWidth={2} fill="none" opacity={0.5}>
        <line x1={x} y1={y - 45} x2={x} y2={y + 10} />
        <circle cx={x} cy={y - 50} r={6} />
        <line x1={x - 14} y1={y - 30} x2={x + 14} y2={y - 30} />
        <path d={`M ${x - 18} ${y + 5} Q ${x - 20} ${y + 20}, ${x} ${y + 22} Q ${x + 20} ${y + 20}, ${x + 18} ${y + 5}`} />
      </g>
      {/* Draped curtain, partially obscuring the anchor */}
      <g fill="var(--color-charcoal-raised)" opacity={0.75}>
        {[-24, -8, 8, 24].map((dx) => (
          <path
            key={dx}
            d={`M ${x + dx - 10} ${y - 60} Q ${x + dx} ${y - 20}, ${x + dx - 4} ${y + 30} L ${x + dx + 4} ${y + 30} Q ${x + dx + 10} ${y - 20}, ${x + dx + 10} ${y - 60} Z`}
          />
        ))}
      </g>
      <text x={x} y={y + 50} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={11} fill="var(--text)">
        Veiled Anchor
      </text>
      <text x={x} y={y + 64} textAnchor="middle" fontFamily="var(--font-latin)" fontSize={9} fill="var(--text-muted)">
        Revealed in its time
      </text>
    </g>
  );
}

function SmallTreeOfLife({ x, y }: { x: number; y: number }) {
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
        return (
          <circle key={node.id} cx={p.x} cy={p.y} r={5} fill="none" stroke="var(--color-gold)" strokeWidth={1.25} />
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

export function MizbeachCentralPanel() {
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
      <ThreeGates />
      <ThreeWells />
      <VeiledAnchor x={CENTRAL_PANEL.columnX[0] + 60} y={bottomRowY} />
      <SmallTreeOfLife x={CENTRAL_PANEL.columnX[2] - 60} y={bottomRowY} />
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
