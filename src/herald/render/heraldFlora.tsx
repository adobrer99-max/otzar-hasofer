import type { SefirahId } from "../../types/letter";
import { SHIELD } from "./heraldGeometry";

/**
 * The Shivat HaMinim — the seven species of the Land (Deut. 8:8) — flank the
 * shield as its mantling. One species is chosen per Herald (derived from the
 * dominant middah, or curated by the Scribe), drawn as a symmetric pair of gold
 * branches cascading from the shoulders.
 */
export const SPECIES = ["wheat", "barley", "grape", "fig", "pomegranate", "olive", "date"] as const;
export type Species = (typeof SPECIES)[number];

/** The seven species set against the seven lower Sefirot (first-draft editorial mapping). */
const SPECIES_BY_SEFIRAH: Record<SefirahId, Species> = {
  keter: "wheat",
  chochmah: "olive",
  binah: "grape",
  chesed: "olive",
  gevurah: "pomegranate",
  tiferet: "wheat",
  netzach: "date",
  hod: "fig",
  yesod: "barley",
  malchut: "grape",
};

/** The default species for a reading: its dominant middah's species, else one keyed off the gematria. */
export function speciesFor(sefirah: SefirahId | undefined, gematria: number): Species {
  if (sefirah && SPECIES_BY_SEFIRAH[sefirah]) return SPECIES_BY_SEFIRAH[sefirah];
  return SPECIES[Math.abs(gematria) % SPECIES.length];
}

interface SideProps {
  dir: 1 | -1;
  fill: string;
  line: string;
}

/** A small almond leaf budding from (bx,by), opening outward. */
function leaf(bx: number, by: number, dir: number, s: number): string {
  return `M ${bx} ${by} Q ${bx + dir * 22 * s} ${by - 6}, ${bx + dir * 26 * s} ${by + 14 * s} Q ${bx + dir * 10 * s} ${by + 6 * s}, ${bx} ${by} Z`;
}

/** One branch of the given species, on side `dir` (+1 right, -1 left). */
function Branch({ species, dir, fill, line }: SideProps & { species: Species }) {
  const rx = dir === 1 ? SHIELD.right : SHIELD.left;
  const topY = SHIELD.top;
  // The shared cascading stem, from the shoulder out and down.
  const stem =
    `M ${rx - dir * 2} ${topY + 2}` +
    ` C ${rx + dir * 28} ${topY - 8}, ${rx + dir * 50} ${topY + 22}, ${rx + dir * 44} ${topY + 58}` +
    ` C ${rx + dir * 40} ${topY + 90}, ${rx + dir * 56} ${topY + 110}, ${rx + dir * 48} ${topY + 148}`;
  // Stations along the stem.
  const s0 = { x: rx + dir * 40, y: topY + 34 };
  const s1 = { x: rx + dir * 46, y: topY + 74 };
  const s2 = { x: rx + dir * 50, y: topY + 112 };
  const tip = { x: rx + dir * 50, y: topY + 148 };
  const leafFill = { fill, fillOpacity: 0.85, stroke: line, strokeWidth: 0.6 };

  const stemEl = <path d={stem} fill="none" stroke={line} strokeWidth={1.5} />;

  switch (species) {
    case "olive":
      return (
        <g>
          {stemEl}
          <g {...leafFill}>
            <path d={leaf(s0.x, s0.y, dir, 1)} />
            <path d={leaf(s1.x, s1.y, dir, 0.85)} />
            <path d={leaf(s2.x, s2.y, dir, 0.7)} />
          </g>
          <g fill={fill} stroke={line} strokeWidth={0.4}>
            <ellipse cx={s1.x - dir * 4} cy={s1.y + 10} rx={3} ry={4.5} />
            <ellipse cx={s2.x - dir * 2} cy={s2.y + 8} rx={2.6} ry={4} />
          </g>
        </g>
      );
    case "grape":
      return (
        <g>
          {stemEl}
          <g {...leafFill}>
            <path d={leaf(s0.x, s0.y, dir, 0.95)} />
          </g>
          {/* Hanging cluster of grapes near the tip. */}
          <g fill={fill} stroke={line} strokeWidth={0.4}>
            {[
              [0, 0],
              [-1, 0.5],
              [1, 0.5],
              [-0.5, 1.4],
              [0.5, 1.4],
              [0, 2.3],
            ].map(([gx, gy], i) => (
              <circle key={i} cx={tip.x - dir * 6 + gx * 7} cy={tip.y - 6 + gy * 7} r={3.2} />
            ))}
          </g>
          {/* A curling tendril. */}
          <path
            d={`M ${s1.x} ${s1.y} q ${dir * 12} 4 ${dir * 6} 14 q ${-dir * 5} 6 ${dir * 2} 10`}
            fill="none"
            stroke={line}
            strokeWidth={1}
          />
        </g>
      );
    case "wheat":
    case "barley": {
      // An upright stalk with a grain head near the shoulder; barley's awns are long.
      const headX = s0.x;
      const headY = s0.y - 8;
      const awn = species === "barley" ? 26 : 12;
      return (
        <g>
          {stemEl}
          <g stroke={line} strokeWidth={1.1} fill="none">
            {/* Awns spraying up from the head. */}
            {[-1, 0, 1].map((k) => (
              <line
                key={`awn${k}`}
                x1={headX}
                y1={headY}
                x2={headX + dir * (6 + k * 4)}
                y2={headY - awn - Math.abs(k) * 3}
              />
            ))}
          </g>
          {/* Grains: paired short strokes down the head. */}
          <g stroke={line} strokeWidth={1.4} fill="none" strokeLinecap="round">
            {[0, 1, 2, 3].map((i) => {
              const gy = headY + 6 + i * 8;
              return (
                <g key={i}>
                  <line x1={headX} y1={gy} x2={headX + dir * 8} y2={gy - 3} />
                  <line x1={headX} y1={gy} x2={headX - dir * 8} y2={gy - 3} />
                </g>
              );
            })}
          </g>
        </g>
      );
    }
    case "fig":
      return (
        <g>
          {stemEl}
          {/* A lobed fig leaf. */}
          <path
            d={`M ${s1.x} ${s1.y}
                q ${dir * 10} ${-10} ${dir * 6} ${-20}
                q ${dir * 8} ${8} ${dir * 16} ${2}
                q ${-dir * 4} ${10} ${dir * 2} ${18}
                q ${-dir * 12} ${2} ${-dir * 24} ${0} Z`}
            fill={fill}
            fillOpacity={0.85}
            stroke={line}
            strokeWidth={0.6}
          />
          {/* A hanging fig. */}
          <path
            d={`M ${tip.x - dir * 4} ${tip.y} q ${dir * 8} 2 ${dir * 7} 12 q ${-dir * 3} 8 ${-dir * 10} 6 q ${-dir * 4} -8 ${dir * 3} -18 Z`}
            fill={fill}
            stroke={line}
            strokeWidth={0.5}
          />
        </g>
      );
    case "pomegranate":
      return (
        <g>
          {stemEl}
          <g {...leafFill}>
            <path d={leaf(s0.x, s0.y, dir, 0.9)} />
          </g>
          {/* The fruit with its crown. */}
          <circle cx={tip.x - dir * 4} cy={tip.y} r={10} fill={fill} stroke={line} strokeWidth={0.6} />
          <g stroke={line} strokeWidth={1} fill="none">
            {[-1, 0, 1].map((k) => (
              <line
                key={k}
                x1={tip.x - dir * 4 + k * 3}
                y1={tip.y - 10}
                x2={tip.x - dir * 4 + k * 4}
                y2={tip.y - 16}
              />
            ))}
          </g>
        </g>
      );
    case "date":
      // A palm frond: the stem is the rib; leaflets spray from both sides, with a hanging date cluster.
      return (
        <g>
          {stemEl}
          <g stroke={line} strokeWidth={1} fill="none" strokeLinecap="round">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const t = 0.15 + i * 0.14;
              const px = rx + dir * (36 + i * 2);
              const py = topY + 20 + t * 120;
              return (
                <g key={i}>
                  <path d={`M ${px} ${py} q ${dir * 14} ${-4} ${dir * 20} ${6}`} />
                  <path d={`M ${px} ${py} q ${-dir * 6} ${-6} ${-dir * 4} ${-14}`} />
                </g>
              );
            })}
          </g>
          <g fill={fill} stroke={line} strokeWidth={0.4}>
            {[0, 1, 2].map((i) => (
              <ellipse key={i} cx={rx + dir * 30 + i * 5} cy={topY + 128 + (i % 2) * 6} rx={2.4} ry={4} />
            ))}
          </g>
        </g>
      );
  }
}

/** The mantling as a symmetric pair of Shivat-HaMinim branches. */
export function SpeciesMantling({ species, fill, line }: { species: Species; fill: string; line: string }) {
  return (
    <g data-role="mantling" data-species={species}>
      <Branch species={species} dir={1} fill={fill} line={line} />
      <Branch species={species} dir={-1} fill={fill} line={line} />
    </g>
  );
}
