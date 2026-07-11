import { associationOf, type PlanetKey } from "./associations";

/** A small four-pointed engraved star (a mullet), centred on (cx,cy). */
function Star({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const w = r * 0.34;
  return (
    <path
      d={`M ${cx} ${cy - r} L ${cx + w} ${cy - w} L ${cx + r} ${cy} L ${cx + w} ${cy + w} L ${cx} ${cy + r} L ${cx - w} ${cy + w} L ${cx - r} ${cy} L ${cx - w} ${cy - w} Z`}
      fill={color}
    />
  );
}

/** The four elements as alchemical triangles. */
function ElementEmblem({ x, y, r, element, color }: { x: number; y: number; r: number; element: string; color: string }) {
  const up = `M ${x} ${y - r} L ${x + r * 0.92} ${y + r * 0.7} L ${x - r * 0.92} ${y + r * 0.7} Z`;
  const down = `M ${x} ${y + r} L ${x + r * 0.92} ${y - r * 0.7} L ${x - r * 0.92} ${y - r * 0.7} Z`;
  const common = { fill: "none", stroke: color, strokeWidth: 1.5, strokeLinejoin: "round" as const };
  if (element === "fire") return <path d={up} {...common} />;
  if (element === "water") return <path d={down} {...common} />;
  if (element === "air")
    return (
      <g {...common}>
        <path d={up} />
        <line x1={x - r * 0.5} y1={y + r * 0.05} x2={x + r * 0.5} y2={y + r * 0.05} />
      </g>
    );
  // earth
  return (
    <g {...common}>
      <path d={down} />
      <line x1={x - r * 0.5} y1={y - r * 0.05} x2={x + r * 0.5} y2={y - r * 0.05} />
    </g>
  );
}

/** The seven classical planets as simplified engraved sigils. */
function PlanetEmblem({ x, y, r, planet, color }: { x: number; y: number; r: number; planet: PlanetKey; color: string }) {
  const s = { fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const };
  const rr = r * 0.55;
  switch (planet) {
    case "sun":
      return (
        <g {...s}>
          <circle cx={x} cy={y} r={rr} />
          <circle cx={x} cy={y} r={1.3} fill={color} stroke="none" />
        </g>
      );
    case "moon":
      return (
        <path
          d={`M ${x + r * 0.15} ${y - r} a ${r} ${r} 0 1 0 0 ${2 * r} a ${r * 0.72} ${r * 0.72} 0 1 1 0 ${-2 * r} z`}
          fill={color}
        />
      );
    case "mars":
      return (
        <g {...s}>
          <circle cx={x - r * 0.25} cy={y + r * 0.25} r={rr} />
          <line x1={x + r * 0.12} y1={y - r * 0.12} x2={x + r * 0.85} y2={y - r * 0.85} />
          <path d={`M ${x + r * 0.4} ${y - r * 0.85} L ${x + r * 0.85} ${y - r * 0.85} L ${x + r * 0.85} ${y - r * 0.4}`} />
        </g>
      );
    case "venus":
      return (
        <g {...s}>
          <circle cx={x} cy={y - r * 0.3} r={rr} />
          <line x1={x} y1={y - r * 0.3 + rr} x2={x} y2={y + r} />
          <line x1={x - r * 0.4} y1={y + r * 0.55} x2={x + r * 0.4} y2={y + r * 0.55} />
        </g>
      );
    case "mercury":
      return (
        <g {...s}>
          <path d={`M ${x - r * 0.42} ${y - r} A ${r * 0.42} ${r * 0.42} 0 0 0 ${x + r * 0.42} ${y - r}`} />
          <circle cx={x} cy={y - r * 0.15} r={rr * 0.8} />
          <line x1={x} y1={y - r * 0.15 + rr * 0.8} x2={x} y2={y + r} />
          <line x1={x - r * 0.4} y1={y + r * 0.5} x2={x + r * 0.4} y2={y + r * 0.5} />
        </g>
      );
    case "jupiter":
      return (
        <g {...s}>
          <path d={`M ${x - r * 0.5} ${y - r * 0.5} q ${-r * 0.2} ${r * 0.6} ${r * 0.5} ${r * 0.6} q ${r * 0.7} 0 ${r * 0.7} ${-r * 0.6}`} />
          <line x1={x + r * 0.7} y1={y - r} x2={x + r * 0.7} y2={y + r} />
          <line x1={x - r * 0.7} y1={y + r * 0.7} x2={x + r} y2={y + r * 0.7} />
        </g>
      );
    case "saturn":
      // The scythe of Saturn — a short high crossbar on a stem that sweeps out
      // into a large sickle, so it reads as a sigil, not a cross.
      return (
        <g {...s}>
          <line x1={x - r * 0.72} y1={y - r * 0.78} x2={x - r * 0.1} y2={y - r * 0.78} />
          <path d={`M ${x - r * 0.4} ${y - r} L ${x - r * 0.4} ${y - r * 0.1} q 0 ${r * 0.9} ${r} ${r * 0.75}`} />
          <path d={`M ${x + r * 0.6} ${y + r * 0.65} q ${r * 0.28} ${-r * 0.2} ${r * 0.1} ${-r * 0.6}`} />
        </g>
      );
  }
}

/**
 * A zodiac sign as a small constellation — a deterministic cluster of engraved
 * stars joined by hairlines, its shape set by the sign's index so each of the
 * twelve reads distinctly. Not the astronomical figure, but a night-sky mark.
 */
function ZodiacConstellation({ x, y, r, index, color }: { x: number; y: number; r: number; index: number; color: string }) {
  const count = 4 + (index % 3);
  const pts: { x: number; y: number }[] = [];
  // A small deterministic spiral-ish scatter, rotated by the sign index.
  for (let i = 0; i < count; i++) {
    const a = (index * 0.7) + i * (2.3 + (index % 2) * 0.5);
    const rad = r * (0.35 + 0.6 * (i / count));
    pts.push({ x: x + Math.cos(a) * rad, y: y + Math.sin(a) * rad * 0.85 });
  }
  return (
    <g>
      <g stroke={color} strokeWidth={0.7} opacity={0.55}>
        {pts.slice(1).map((p, i) => (
          <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} />
        ))}
      </g>
      {pts.map((p, i) => (
        <Star key={i} cx={p.x} cy={p.y} r={i === 0 ? 3 : 2} color={color} />
      ))}
    </g>
  );
}

/** The letter's cosmic association, as a small gold emblem centred on (x,y). */
export function AssociationEmblem({
  letterId,
  x,
  y,
  size,
  color,
}: {
  letterId: string;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const assoc = associationOf(letterId);
  if (!assoc) return null;
  const r = size / 2;
  if (assoc.kind === "element")
    return (
      <g data-emblem={`element-${assoc.key}`}>
        <ElementEmblem x={x} y={y} r={r} element={assoc.key} color={color} />
      </g>
    );
  if (assoc.kind === "planet")
    return (
      <g data-emblem={`planet-${assoc.key}`}>
        <PlanetEmblem x={x} y={y} r={r} planet={assoc.key} color={color} />
      </g>
    );
  return (
    <g data-emblem={`zodiac-${assoc.index}`}>
      <ZodiacConstellation x={x} y={y} r={r} index={assoc.index} color={color} />
    </g>
  );
}
