import type { SacredTimeSnapshot, LunarPhase } from "../../types/sacredTime";
import type { JewishMonthName, DayOfWeek } from "../../data/hebrewCalendar";
import { mazalotRing } from "../../data/mazalot";
import { festivalsById } from "../../data/festivals";
import { FLOURISH_UNIT_PATH } from "../../herald/render/heraldGeometry";
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
   * True for a wheel that physically turns on the 3D folio (the Month and Moon
   * cyclewheels). Such a wheel is drawn without slice labels — baked into the
   * rotating texture the text would tilt/invert as it turns. Static rings and
   * the flat guide/print render (rotating=false) keep their upright labels.
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
      {/* Labels. Suppressed on a physically-turning wheel (the interactive 3D
          folio's Month/Moon planes): baked into the rotating texture the text
          tilts/inverts as the wheel turns, so it reads as noise. The gold-lit
          active slice plus the readout below carry the value instead. The flat
          guide/print render never spins (rotating=false) → labels shown upright;
          the static Weekday ring never sets `rotating` → always labelled. */}
      {!rotating &&
        Array.from({ length: count }).map((_, i) => {
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

/**
 * The outer Month ring — the twelve Hebrew months. The `mazalotRing` order is
 * reused purely as the canonical month sequence (its zodiac labels are no
 * longer drawn); a given slice always names the same month, angle-aligned with
 * the folio's turnable outer wheel. On the flat guide/print render the month
 * names are inscribed upright; on the turning 3D wheel they are omitted (see
 * `RingSegments`), the gold-lit slice marking the current month instead.
 */
function MonthRing({
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
  const months = mazalotRing.map((e) => e.month);
  const activeIndex = neutral ? -1 : months.findIndex((m) => m === foldMonth(activeMonth));
  const primaryFestival = activeFestivalIds
    .map((id) => festivalsById[id])
    .find((f) => f && f.id !== "ordinary" && f.id !== "shabbat");
  return (
    <RingSegments
      radius={RINGS.month.radius}
      thickness={RINGS.month.thickness}
      count={12}
      activeIndex={activeIndex}
      renderLabel={(i) => (i === activeIndex && primaryFestival ? primaryFestival.gesture ?? primaryFestival.name : months[i])}
      rotating={rotating}
    />
  );
}

/**
 * The seven days of the week, Shabbat crowning the top slice and the week
 * flowing clockwise back up to Erev Shabbat. Live: the current weekday catches
 * the gold leaf; Shabbat always keeps a gold rim so the day of rest reads even
 * mid-week (the mockup's fixed Shabbat wedge). Rendered on the static plane, so
 * its Hebrew labels stay upright.
 */
const WEEKDAYS: { id: DayOfWeek; hebrew: string }[] = [
  { id: "saturday", hebrew: "שבת" },
  { id: "sunday", hebrew: "ראשון" },
  { id: "monday", hebrew: "שני" },
  { id: "tuesday", hebrew: "שלישי" },
  { id: "wednesday", hebrew: "רביעי" },
  { id: "thursday", hebrew: "חמישי" },
  { id: "friday", hebrew: "ששי" },
];

function WeekdayRing({ dayOfWeek, neutral }: { dayOfWeek: DayOfWeek; neutral?: boolean }) {
  const activeIndex = neutral ? -1 : WEEKDAYS.findIndex((d) => d.id === dayOfWeek);
  const { radius, thickness } = RINGS.weekday;
  // Shabbat sits at index 0 (top); keep a persistent gold rim there unless the
  // live day is already Shabbat (then RingSegments' active band covers it).
  const [shabbatStart, shabbatEnd] = segmentAngles(WEEKDAYS.length, 0);
  return (
    <g>
      <RingSegments
        radius={radius}
        thickness={thickness}
        count={WEEKDAYS.length}
        activeIndex={activeIndex}
        renderLabel={(i) => WEEKDAYS[i].hebrew}
        fontFamily="var(--font-hebrew)"
      />
      {activeIndex !== 0 && (
        <path
          d={describeArcPath(CENTER.x, CENTER.y, radius, shabbatStart + 0.5, shabbatEnd - 0.5)}
          fill="none"
          stroke={GOLD}
          strokeWidth={thickness}
          opacity={0.28}
        />
      )}
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

const PARDES_CORNERS: { key: keyof typeof CORNER_POINTS; title: string }[] = [
  { key: "peshat", title: "Peshat" },
  { key: "remez", title: "Remez" },
  { key: "drash", title: "Drash" },
  { key: "sod", title: "Sod" },
];

function PardesCorners() {
  return (
    <g>
      {PARDES_CORNERS.map(({ key, title }) => {
        const point = CORNER_POINTS[key];
        return (
          <text
            key={key}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            fontFamily="var(--font-hebrew)"
            fontSize={18}
            fill={GOLD}
          >
            {title}
          </text>
        );
      })}
    </g>
  );
}

/**
 * The outer gold-leaf border — a double rule with evenly-spaced flourish ticks.
 * (It once carried the seven species names of Deut. 8:8; those Latin labels are
 * dropped to keep the mandala's text Hebrew, but the decorative frame stays.)
 */
function ShivatHaminimBorder() {
  // 28 = 7 * 4: dropping every 4th tick leaves 3 flourishes evenly spaced in
  // each of the seven arcs, keeping the border's sevenfold rhythm.
  const flourishPoints = circlePerimeterPoints(28, RINGS.border.radius).filter((_, i) => i % 4 !== 0);
  return (
    <g>
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
  const y = CENTER.y - RINGS.month.radius - RINGS.month.thickness / 2 - 4;
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
 *   - "outer-wheel": the Month ring (the rigid outer month wheel).
 *   - "moon-wheel": the Moon ring.
 * Omitting `only` draws the whole mandala on one plane (the flat-SVG folio,
 * the guide page, and the print master) — unchanged, so its tests still pass.
 */
export type MandalaSlice = "static" | "outer-wheel" | "moon-wheel";

export function MizbeachSvgContent({
  sacredTime,
  neutral = false,
  only,
}: {
  sacredTime: SacredTimeSnapshot;
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
  // The Month/Moon slices are drawn on turning planes (the 3D volvelle), so they
  // are rendered without labels; the combined flat render (guide/print) is still
  // and keeps its upright labels.
  const wheelRotating = only === "outer-wheel" || only === "moon-wheel";

  const outerWheel = (
    <MonthRing
      activeMonth={sacredTime.hebrewDate.month}
      activeFestivalIds={sacredTime.activeFestivalIds}
      neutral={neutral}
      rotating={wheelRotating}
    />
  );
  const moonWheel = <MoonRing phase={sacredTime.lunarPhase} neutral={neutral} rotating={wheelRotating} />;
  const staticLayer = (
    <>
      <WeekdayRing dayOfWeek={sacredTime.dayOfWeek} neutral={neutral} />
      <SabbathCore
        isShabbat={isShabbat}
        omerDay={neutral ? undefined : sacredTime.omer?.day}
        roshChodesh={!neutral && Boolean(sacredTime.roshChodesh)}
      />
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
