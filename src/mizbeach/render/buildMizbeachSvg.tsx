import type { SacredTimeSnapshot, LunarPhase } from "../../types/sacredTime";
import type { JewishMonthName } from "../../data/hebrewCalendar";
import { mazalotRing } from "../../data/mazalot";
import { festivalsById } from "../../data/festivals";
import {
  TREE_OF_LIFE_NODES,
  TREE_OF_LIFE_PATHS,
  FLOURISH_UNIT_PATH,
} from "../../herald/render/heraldGeometry";
import {
  CENTER,
  RINGS,
  SABBATH_CORE_RADIUS,
  CORNER_POINTS,
  polarToCartesian,
  describeArcPath,
  segmentAngles,
  circlePerimeterPoints,
} from "./mizbeachGeometry";

/** The gold-leaf sheen shared with the central panel, so both leaves of the folio read as one illuminated plate. */
const GOLD = "url(#mizRingGold)";

function MandalaGoldDefs() {
  return (
    <defs>
      <linearGradient id="mizRingGold" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 60) scale(1 640)">
        <stop offset="0" stopColor="#efd48c" />
        <stop offset="0.42" stopColor="#c9a24b" />
        <stop offset="0.72" stopColor="#a8823a" />
        <stop offset="1" stopColor="#e0be6f" />
      </linearGradient>
    </defs>
  );
}

/** Adar splits into AdarI/AdarII in leap years — both fold onto the ring's single "Adar" slice, matching `festivals.ts`'s own `resolveAdar` convention. */
function foldMonth(month: JewishMonthName): JewishMonthName {
  return month === "AdarI" || month === "AdarII" ? "Adar" : month;
}

function RingSegments({
  radius,
  thickness,
  count,
  activeIndex,
  renderLabel,
  fontFamily = "var(--font-latin)",
  rotating = false,
}: {
  radius: number;
  thickness: number;
  count: number;
  activeIndex: number;
  renderLabel: (index: number) => string;
  fontFamily?: string;
  /**
   * On a wheel that physically turns (the interactive folio), labels are
   * inscribed tangentially so their orientation is rotation-invariant — they
   * stay glued to the ring as it turns, instead of floating off.
   */
  rotating?: boolean;
}) {
  const inner = radius - thickness / 2;
  const outer = radius + thickness / 2;
  return (
    <g>
      {/* Solid bands: a raised charcoal for the resting slices, gold-leaf (with a soft glow) for the active one. */}
      {Array.from({ length: count }).map((_, i) => {
        const [start, end] = segmentAngles(count, i);
        const isActive = i === activeIndex;
        return (
          <g key={i}>
            {isActive && (
              <path
                d={describeArcPath(CENTER.x, CENTER.y, radius, start + 0.5, end - 0.5)}
                fill="none"
                stroke={GOLD}
                strokeWidth={thickness + 8}
                opacity={0.16}
              />
            )}
            <path
              d={describeArcPath(CENTER.x, CENTER.y, radius, start + 0.5, end - 0.5)}
              fill="none"
              stroke={isActive ? GOLD : "var(--color-charcoal-raised)"}
              strokeWidth={thickness}
              opacity={isActive ? 1 : 0.6}
            />
          </g>
        );
      })}
      {/* Thin gold spokes marking the slice boundaries. */}
      <g stroke={GOLD} strokeWidth={0.75} opacity={0.32}>
        {Array.from({ length: count }).map((_, i) => {
          const a = segmentAngles(count, i)[0];
          const p1 = polarToCartesian(CENTER.x, CENTER.y, inner, a);
          const p2 = polarToCartesian(CENTER.x, CENTER.y, outer, a);
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
        })}
      </g>
      {/* Labels */}
      {Array.from({ length: count }).map((_, i) => {
        const [start, end] = segmentAngles(count, i);
        const isActive = i === activeIndex;
        const mid = (start + end) / 2;
        const labelPos = polarToCartesian(CENTER.x, CENTER.y, radius, mid);
        return (
          <text
            key={i}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={rotating ? `rotate(${mid} ${labelPos.x} ${labelPos.y})` : undefined}
            fontFamily={fontFamily}
            fontSize={11}
            fontWeight={isActive ? 600 : 400}
            fill={isActive ? "var(--color-charcoal)" : "var(--color-silver)"}
            opacity={isActive ? 1 : 0.72}
          >
            {renderLabel(i)}
          </text>
        );
      })}
    </g>
  );
}

function MazalotRing({ activeMonth, neutral, rotating }: { activeMonth: JewishMonthName; neutral?: boolean; rotating?: boolean }) {
  const activeIndex = neutral ? -1 : mazalotRing.findIndex((e) => e.month === foldMonth(activeMonth));
  return (
    <RingSegments
      radius={RINGS.mazalot.radius}
      thickness={RINGS.mazalot.thickness}
      count={12}
      activeIndex={activeIndex}
      renderLabel={(i) => mazalotRing[i].zodiacHebrew}
      rotating={rotating}
    />
  );
}

/**
 * The traditional eight-phase lunar cycle. Hebrew labels here are a
 * first-draft editorial set (not a verified transcription of any specific
 * source) — flagged for the same reason as other first-draft content in
 * this project (letter meanings, epithet honorifics): meant to be
 * corrected/replaced, not treated as authoritative.
 */
const MOON_PHASES: { id: LunarPhase; label: string; hebrew: string }[] = [
  { id: "new", label: "New", hebrew: "ראש חודש" },
  { id: "waxingCrescent", label: "Waxing Crescent", hebrew: "חידוש" },
  { id: "firstQuarter", label: "First Quarter", hebrew: "רביע ראשון" },
  { id: "waxingGibbous", label: "Waxing Gibbous", hebrew: "גידול" },
  { id: "full", label: "Full", hebrew: "מלא" },
  { id: "waningGibbous", label: "Waning Gibbous", hebrew: "מיעוט" },
  { id: "lastQuarter", label: "Last Quarter", hebrew: "רביע אחרון" },
  { id: "waningCrescent", label: "Waning Crescent", hebrew: "נסתר" },
];

function MoonRing({ phase, neutral, rotating }: { phase: LunarPhase; neutral?: boolean; rotating?: boolean }) {
  const activeIndex = neutral ? -1 : MOON_PHASES.findIndex((p) => p.id === phase);
  return (
    <RingSegments
      radius={RINGS.moon.radius}
      thickness={RINGS.moon.thickness}
      count={MOON_PHASES.length}
      activeIndex={activeIndex}
      renderLabel={(i) => MOON_PHASES[i].hebrew}
      fontFamily="var(--font-hebrew)"
      rotating={rotating}
    />
  );
}

function SolarMonthRing({
  activeMonth,
  activeFestivalIds,
  neutral,
  rotating,
}: {
  activeMonth: JewishMonthName;
  activeFestivalIds: string[];
  neutral?: boolean;
  rotating?: boolean;
}) {
  // Angle-aligned with the Mazalot ring's 12 slices — same month order, so a
  // given slice of the folio always names the same Hebrew month across
  // both rings.
  const months = mazalotRing.map((e) => e.month);
  const activeIndex = neutral ? -1 : months.findIndex((m) => m === foldMonth(activeMonth));
  const primaryFestival = activeFestivalIds
    .map((id) => festivalsById[id])
    .find((f) => f && f.id !== "ordinary" && f.id !== "shabbat");
  return (
    <RingSegments
      radius={RINGS.solarMonth.radius}
      thickness={RINGS.solarMonth.thickness}
      count={12}
      activeIndex={activeIndex}
      renderLabel={(i) => (i === activeIndex && primaryFestival ? primaryFestival.gesture ?? primaryFestival.name : months[i])}
      rotating={rotating}
    />
  );
}

/**
 * The Parsha ring — the Narrative Context. Live: names the week's Torah
 * portion (see `src/data/parsha.ts`); muted when the week's Shabbat carries
 * a festival reading instead.
 */
function ParshaRing({ label }: { label?: string }) {
  const topLabel = polarToCartesian(CENTER.x, CENTER.y, RINGS.parsha.radius, 0);
  return (
    <g>
      {/* A solid narrative band; when a portion is read, its rim catches the gold leaf. */}
      <circle cx={CENTER.x} cy={CENTER.y} r={RINGS.parsha.radius} fill="none" stroke="var(--color-charcoal-raised)" strokeWidth={RINGS.parsha.thickness} opacity={0.6} />
      {label && (
        <circle cx={CENTER.x} cy={CENTER.y} r={RINGS.parsha.radius + RINGS.parsha.thickness / 2 - 1.5} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.6} />
      )}
      <text
        x={topLabel.x}
        y={topLabel.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-latin)"
        fontSize={10}
        fontStyle={label ? undefined : "italic"}
        fill={label ? "var(--color-gold-bright)" : "var(--color-silver)"}
        opacity={label ? 1 : 0.7}
      >
        {label ? `Parashat ${label}` : "Parsha — the festival reads this week"}
      </text>
    </g>
  );
}

function SabbathCore({
  isShabbat,
  omerDay,
  roshChodesh,
}: {
  isShabbat: boolean;
  omerDay?: number;
  roshChodesh?: boolean;
}) {
  const supplementary = [omerDay ? `Omer day ${omerDay}` : undefined, roshChodesh ? "Rosh Chodesh" : undefined]
    .filter((x): x is string => Boolean(x))
    .join(" · ");
  return (
    <g>
      {/* An illuminated core: a gold-leaf rim around a still centre — filled gold on Shabbat, a dark recess otherwise. */}
      <circle cx={CENTER.x} cy={CENTER.y} r={SABBATH_CORE_RADIUS + 5} fill="none" stroke={GOLD} strokeWidth={2.5} opacity={0.85} />
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={SABBATH_CORE_RADIUS}
        fill={isShabbat ? GOLD : "#0e1420"}
        stroke={isShabbat ? "var(--color-gold-bright)" : "var(--color-silver)"}
        strokeWidth={1.5}
        opacity={isShabbat ? 1 : 0.85}
      />
      {!isShabbat && (
        <circle cx={CENTER.x} cy={CENTER.y} r={SABBATH_CORE_RADIUS - 8} fill="none" stroke="var(--color-charcoal-line)" strokeWidth={1} />
      )}
      <text
        x={CENTER.x}
        y={CENTER.y - (isShabbat ? 10 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-latin)"
        fontSize={14}
        fill={isShabbat ? "var(--color-charcoal)" : "var(--color-silver)"}
      >
        {isShabbat ? "Shabbat" : "Ordinary Time"}
      </text>
      {isShabbat && (
        <text
          x={CENTER.x}
          y={CENTER.y + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-latin)"
          fontSize={9}
          fill="var(--color-charcoal)"
        >
          Point of Stillness
        </text>
      )}
      {supplementary && (
        <text
          x={CENTER.x}
          y={CENTER.y + (isShabbat ? 24 : 16)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-latin)"
          fontSize={9}
          fill={isShabbat ? "var(--color-charcoal)" : "var(--text-muted)"}
        >
          {supplementary}
        </text>
      )}
    </g>
  );
}

const PARDES_CORNERS: { key: keyof typeof CORNER_POINTS; title: string; subtitle: string }[] = [
  { key: "peshat", title: "Peshat", subtitle: "The Simple" },
  { key: "remez", title: "Remez", subtitle: "The Hinted" },
  { key: "drash", title: "Drash", subtitle: "The Sought" },
  { key: "sod", title: "Sod", subtitle: "The Lived" },
];

function PardesCorners() {
  return (
    <g>
      {PARDES_CORNERS.map(({ key, title, subtitle }) => {
        const point = CORNER_POINTS[key];
        return (
          <g key={key}>
            <text
              x={point.x}
              y={point.y}
              textAnchor="middle"
              fontFamily="var(--font-hebrew)"
              fontSize={18}
              fill={GOLD}
            >
              {title}
            </text>
            <text
              x={point.x}
              y={point.y + 15}
              textAnchor="middle"
              fontFamily="var(--font-latin)"
              fontSize={9}
              fill="var(--color-silver)"
              opacity={0.75}
            >
              {subtitle}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** The seven species of Deuteronomy 8:8 — "the Fruits of the Covenant." */
const SHIVAT_HAMINIM = ["Wheat", "Barley", "Grape", "Fig", "Pomegranate", "Olive", "Date"];

function ShivatHaminimBorder() {
  const speciesPoints = circlePerimeterPoints(7, RINGS.border.radius);
  // 28 = 7 * 4, so every 4th point of this finer ring lands exactly on a
  // species point above — filtering those out leaves 3 plain flourish
  // ticks evenly spaced between each pair of species.
  const flourishPoints = circlePerimeterPoints(28, RINGS.border.radius).filter((_, i) => i % 4 !== 0);
  return (
    <g>
      {/* A gold-leaf double rule frames the seven species. */}
      <circle cx={CENTER.x} cy={CENTER.y} r={RINGS.border.radius + 6} fill="none" stroke={GOLD} strokeWidth={1.5} opacity={0.7} />
      <circle cx={CENTER.x} cy={CENTER.y} r={RINGS.border.radius} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.4} />
      <g stroke={GOLD} fill={GOLD} opacity={0.7}>
        {flourishPoints.map((p, i) => (
          <path
            key={i}
            d={FLOURISH_UNIT_PATH}
            transform={`translate(${p.x}, ${p.y}) rotate(${p.angle})`}
            strokeWidth={0.75}
            fillOpacity={0.15}
          />
        ))}
      </g>
      {speciesPoints.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-latin)"
          fontSize={9}
          fill="var(--color-gold-bright)"
        >
          {SHIVAT_HAMINIM[i]}
        </text>
      ))}
    </g>
  );
}

/**
 * The Or HaGanuz ("hidden light") — UV-etched Sefirot on the physical
 * folio, invisible until revealed. Reuses the Herald's Tree of Life
 * geometry rather than authoring a second layout; absent entirely unless
 * `revealed`, not just dimmed, to match the physical UV-ink concept.
 */
function HiddenSefirotLayer({ revealed, middah }: { revealed: boolean; middah?: string | null }) {
  if (!revealed) return null;
  const boxSize = 2 * (RINGS.parsha.radius - RINGS.parsha.thickness);
  const originX = CENTER.x - boxSize / 2;
  const originY = CENTER.y - boxSize / 2;
  const pos = (id: string) => {
    const node = TREE_OF_LIFE_NODES.find((n) => n.id === id)!;
    return { x: originX + node.x * boxSize, y: originY + node.y * boxSize };
  };
  return (
    <g opacity={0.95}>
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
            stroke="var(--color-blue-bright)"
            strokeWidth={1}
            opacity={0.55}
          />
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
            r={chosen ? 9 : 6}
            fill={chosen ? "var(--color-gold-bright)" : "var(--color-blue-bright)"}
            stroke={chosen ? "var(--color-gold-bright)" : "var(--color-silver)"}
            strokeWidth={chosen ? 2 : 1}
            opacity={chosen ? 1 : 0.85}
          />
        );
      })}
    </g>
  );
}

/** Fixed reference symbol — not a computed compass bearing (would need geolocation, out of scope). */
function MizrachVector() {
  const tipY = CENTER.y - RINGS.border.radius - 8;
  const baseY = tipY + 16;
  return (
    <g>
      <path
        d={`M ${CENTER.x} ${baseY} L ${CENTER.x} ${tipY} M ${CENTER.x - 6} ${tipY + 6} L ${CENTER.x} ${tipY} L ${CENTER.x + 6} ${tipY + 6}`}
        stroke="var(--color-copper)"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={CENTER.x}
        y={tipY - 8}
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize={16}
        fill="var(--color-copper)"
      >
        מזרח
      </text>
    </g>
  );
}

/**
 * The gold pointer at twelve o'clock. On the 3D folio the two cyclewheels turn
 * beneath it like a volvelle, so this marks the selected month / lunar day.
 */
function SelectionPointer() {
  const y = CENTER.y - RINGS.mazalot.radius - RINGS.mazalot.thickness / 2 - 4;
  return (
    <path
      d={`M ${CENTER.x - 7} ${y - 12} L ${CENTER.x + 7} ${y - 12} L ${CENTER.x} ${y} Z`}
      fill="var(--color-gold-bright)"
      stroke="var(--color-charcoal)"
      strokeWidth={1}
    />
  );
}

/**
 * Which slice of the mandala to draw. The 3D folio renders the pieces as
 * separate stacked planes so the two cyclewheels can physically turn:
 *   - "static": everything that never rotates (border, Parsha, Sabbath Core,
 *     PaRDeS corners, Mizrach) plus the fixed selection pointer.
 *   - "outer-wheel": the Mazalot + Solar-Month rings (one rigid month wheel).
 *   - "moon-wheel": the Moon ring.
 * Omitting `only` draws the whole mandala on one plane (the flat-SVG folio,
 * the guide page, and the print master) — unchanged, so its tests still pass.
 */
export type MandalaSlice = "static" | "outer-wheel" | "moon-wheel";

export function MizbeachSvgContent({
  sacredTime,
  revealHidden,
  neutral = false,
  only,
  middah,
}: {
  sacredTime: SacredTimeSnapshot;
  revealHidden: boolean;
  /** When the Tree of Life is revealed, the dominant middah's Sefirah lights gold. */
  middah?: string | null;
  /**
   * A printable "master" folio: render every ring in its resting state with
   * nothing gold-highlighted, since the live date/festival highlight is a
   * digital-only affordance that shouldn't be baked into a physical print.
   * Default false — the on-screen renderer and its determinism tests are
   * unchanged.
   */
  neutral?: boolean;
  only?: MandalaSlice;
}) {
  const isShabbat = !neutral && sacredTime.activeFestivalIds.includes("shabbat");
  // Only the interactive slices are drawn on turning planes, so their labels are
  // inscribed tangentially; the combined flat render (guide/print) keeps them upright.
  const wheelRotating = only === "outer-wheel" || only === "moon-wheel";

  const outerWheel = (
    <>
      <MazalotRing activeMonth={sacredTime.hebrewDate.month} neutral={neutral} rotating={wheelRotating} />
      <SolarMonthRing
        activeMonth={sacredTime.hebrewDate.month}
        activeFestivalIds={sacredTime.activeFestivalIds}
        neutral={neutral}
        rotating={wheelRotating}
      />
    </>
  );
  const moonWheel = <MoonRing phase={sacredTime.lunarPhase} neutral={neutral} rotating={wheelRotating} />;
  const staticLayer = (
    <>
      <ParshaRing label={neutral ? undefined : sacredTime.parsha?.label} />
      <SabbathCore
        isShabbat={isShabbat}
        omerDay={neutral ? undefined : sacredTime.omer?.day}
        roshChodesh={!neutral && Boolean(sacredTime.roshChodesh)}
      />
      <HiddenSefirotLayer revealed={revealHidden} middah={middah} />
      <ShivatHaminimBorder />
      <PardesCorners />
      <MizrachVector />
    </>
  );

  // Each slice is rasterised to its own texture, so each carries the gold-leaf
  // gradient definition it references.
  if (only === "outer-wheel")
    return (
      <g>
        <MandalaGoldDefs />
        {outerWheel}
      </g>
    );
  if (only === "moon-wheel")
    return (
      <g>
        <MandalaGoldDefs />
        {moonWheel}
      </g>
    );
  // The pointer only appears on the 3D folio's static plane (the wheels turn
  // beneath it); the flat whole-mandala render below is unchanged apart from
  // the shared gold-leaf definition.
  if (only === "static")
    return (
      <g>
        <MandalaGoldDefs />
        {staticLayer}
        <SelectionPointer />
      </g>
    );

  return (
    <g>
      <MandalaGoldDefs />
      {outerWheel}
      {moonWheel}
      {staticLayer}
    </g>
  );
}
