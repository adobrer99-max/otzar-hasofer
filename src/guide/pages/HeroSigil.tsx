import {
  SHIELD_PATH,
  shieldBorderPoints,
  shieldCenter,
  FLOURISH_UNIT_PATH,
  TREE_OF_LIFE_NODES,
  TREE_OF_LIFE_PATHS,
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
} from "../../herald/render/heraldGeometry";

/**
 * The landing sigil — a static, decorative escutcheon drawn from the real
 * Herald geometry (so it is authentically on-brand, "no decorative element
 * is arbitrary"). It always sits on its own charcoal field with gold
 * linework, an illuminated plate that reads the same on the vellum ground
 * or the charcoal one. Data-free; never confused with a participant's Herald.
 */
export function HeroSigil() {
  const center = shieldCenter();
  const border = shieldBorderPoints(28);
  const treeBox = { w: 150, h: 190 };
  const treeOrigin = { x: center.x - treeBox.w / 2, y: center.y - treeBox.h / 2 - 30 };
  const nodePos = (id: string) => {
    const n = TREE_OF_LIFE_NODES.find((node) => node.id === id)!;
    return { x: treeOrigin.x + n.x * treeBox.w, y: treeOrigin.y + n.y * treeBox.h };
  };

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label="The Treasury's heraldic sigil"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Otzar Ha'Sofer — the sigil of the Treasury</title>
      <rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx={14} fill="var(--color-charcoal)" />
      <path d={SHIELD_PATH} fill="var(--color-charcoal-raised)" />

      {/* Tree of Life watermark */}
      <g opacity={0.5}>
        {TREE_OF_LIFE_PATHS.map(([a, b]) => {
          const pa = nodePos(a);
          const pb = nodePos(b);
          return (
            <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="var(--color-silver)" strokeWidth={0.75} opacity={0.4} />
          );
        })}
        {TREE_OF_LIFE_NODES.map((n) => {
          const p = nodePos(n.id);
          const keter = n.id === "keter";
          return (
            <circle key={n.id} cx={p.x} cy={p.y} r={keter ? 6 : 4} fill={keter ? "var(--color-gold)" : "none"} stroke={keter ? "var(--color-gold-bright)" : "var(--color-silver)"} strokeWidth={1} />
          );
        })}
      </g>

      {/* The aleph, centered */}
      <text
        x={center.x}
        y={center.y + 100}
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize={190}
        fill="var(--color-gold)"
        stroke="var(--color-gold-bright)"
        strokeWidth={1}
      >
        א
      </text>

      {/* Border flourishes */}
      <g stroke="var(--color-gold)" fill="var(--color-gold)" opacity={0.85}>
        {border.map((p, i) => (
          <path key={i} d={FLOURISH_UNIT_PATH} transform={`translate(${p.x}, ${p.y})`} strokeWidth={0.75} fillOpacity={0.15} />
        ))}
      </g>

      <path d={SHIELD_PATH} fill="none" stroke="var(--color-gold)" strokeWidth={2.5} />
    </svg>
  );
}
