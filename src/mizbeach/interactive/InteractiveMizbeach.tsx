import { useState } from "react";
import type { LetterDraw } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { lettersById } from "../../data/letters";
import { middot } from "../../data/middot";
import { dorotCardsById } from "../../data/dorot";
import { computeSacredTime } from "../../data/sacredTime";
import { formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { resolveSpread } from "../../herald/spreads/resolveSpread";
import { resolveDorotMechanic } from "../../herald/dorot/dorotMechanics";
import { resolveShoresh } from "../../herald/shoresh/resolveShoresh";
import { drawLetters } from "../../herald/deck/deck";
import { MizbeachCentralPanel, TREE_ON_PANEL } from "../render/centralPanel";
import { MizbeachSvgContent, type MandalaSlice } from "../render/buildMizbeachSvg";
import { FolioCanvas } from "../folio3d/FolioCanvas";
import { CENTRAL_PANEL, RINGS, CENTER, VIEWBOX_SIZE, segmentAngles, polarToCartesian } from "../render/mizbeachGeometry";
import { sliceCenterAngle } from "./zones";
import { CENTRAL_ZONES, FOURTH_ZONE, wedgePath, type Zone } from "./zones";
import { setMonthSlice, setDayOfMonth, monthSliceIndex } from "./ringDate";
import type { MizbeachReadingState } from "./reading";
import { resolvedFestivalId } from "./reading";
import { PlacementPopover, type PopoverTarget } from "./PlacementPopover";
import { hebrewDateFromGregorian } from "../../data/hebrewCalendar";
import styles from "./interactive.module.css";

export interface InteractiveMizbeachProps {
  state: MizbeachReadingState;
  onChange: (patch: Partial<MizbeachReadingState>) => void;
  readingIndex: number;
}

/** 0° at top, clockwise, from a point in the 760-viewbox space. */
function angleFromPoint(x: number, y: number): number {
  const deg = (Math.atan2(x - CENTER.x, -(y - CENTER.y)) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEWBOX_SIZE,
    y: ((clientY - rect.top) / rect.height) * VIEWBOX_SIZE,
  };
}

export function InteractiveMizbeach({ state, onChange, readingIndex }: InteractiveMizbeachProps) {
  const [openZoneId, setOpenZoneId] = useState<string>();
  // The Tree of Life is hidden (the Or HaGanuz) until revealed on the rings —
  // it links the folio's dimensions, and its lower Sefirot are the middah picker.
  const [treeRevealed, setTreeRevealed] = useState(false);

  const festivalId = resolvedFestivalId(state);
  const sacredTime = computeSacredTime(state.effectiveDate, state.geoMode);
  const spread = resolveSpread(festivalId);
  const mechanic = resolveDorotMechanic(festivalId, state.geoMode);
  const showFourth = spread === "etz-chaim";
  const needsBeneath = mechanic.beneath === "forced-tishabav" || mechanic.beneath === "galut";

  // ——— central-panel placements ———
  const placedGlyph = (draw: LetterDraw | null) =>
    draw ? (lettersById[draw.letterId]?.glyph ?? "?") : undefined;

  // Deal the whole reading from the deck — a true random draw of distinct cards
  // into the three (or four) placement zones and the veiled anchor. Each card
  // may fall upright or reversed; any can be re-placed by hand afterward.
  function dealTheCards() {
    const cards = drawLetters(showFourth ? 5 : 4);
    const patch: Partial<MizbeachReadingState> = {
      letters: [cards[0], cards[1], cards[2]],
      veiled: cards[cards.length - 1],
    };
    if (showFourth) patch.fourth = cards[3];
    onChange(patch);
  }

  function openZone(id: string) {
    setOpenZoneId(id);
  }

  const popoverTarget = ((): PopoverTarget | undefined => {
    if (!openZoneId) return undefined;
    if (openZoneId === "hand") return { kind: "hand", label: "Hand Anchor", value: state.palmNotes };
    if (openZoneId === "veiled")
      return { kind: "veiled", label: "The Veiled Anchor", value: state.veiled };
    if (openZoneId === "fourth")
      return { kind: "fourth", label: "The Fruit — Atzilut", value: state.fourth };
    if (openZoneId.startsWith("letter-")) {
      const i = Number(openZoneId.slice(-1));
      return { kind: "letter", label: `${["First", "Second", "Third"][i]} drawn letter`, value: state.letters[i] };
    }
    if (openZoneId.startsWith("beneath-")) {
      const i = Number(openZoneId.slice(-1));
      return {
        kind: "beneath",
        label: `Beneath the ${["First", "Second", "Third"][i]} drawn`,
        value: state.beneathCards[i],
        readingIndex,
      };
    }
    if (openZoneId === "council")
      return { kind: "council", label: "The Council of Sefirot", value: state.councilCard, readingIndex };
    return undefined;
  })();

  function commit(value: LetterDraw | SefirahId | string) {
    const id = openZoneId!;
    if (id === "hand") onChange({ palmNotes: value as string });
    else if (id === "veiled") onChange({ veiled: value as LetterDraw });
    else if (id === "fourth") onChange({ fourth: value as LetterDraw });
    else if (id.startsWith("letter-")) {
      const i = Number(id.slice(-1));
      const next = [...state.letters] as MizbeachReadingState["letters"];
      next[i] = value as LetterDraw;
      onChange({ letters: next });
    } else if (id.startsWith("beneath-")) {
      const i = Number(id.slice(-1));
      const next = [...state.beneathCards] as MizbeachReadingState["beneathCards"];
      next[i] = value as string;
      onChange({ beneathCards: next });
    } else if (id === "council") onChange({ councilCard: value as string });
  }

  function clear() {
    const id = openZoneId!;
    if (id === "veiled") onChange({ veiled: null });
    else if (id === "fourth") onChange({ fourth: null });
    else if (id.startsWith("letter-")) {
      const i = Number(id.slice(-1));
      const next = [...state.letters] as MizbeachReadingState["letters"];
      next[i] = null;
      onChange({ letters: next });
    }
  }

  // ——— turnable rings ———
  const monthSlice = monthSliceIndex(hebrewDateFromGregorian(state.effectiveDate));
  const dayNow = hebrewDateFromGregorian(state.effectiveDate).day;

  // The two cyclewheels physically turn on the 3D folio so the selected slice
  // sits under the fixed top pointer (a volvelle). These are the wheels'
  // rotation angles, in degrees clockwise-from-top; the plane rotation and the
  // rotation-aware drag hit-test both derive from them, so visual and
  // interaction stay in sync.
  const DEG2RAD = Math.PI / 180;
  const outerWheelDeg = sliceCenterAngle(12, monthSlice);
  const moonWheelDeg = ((dayNow - 1) / 29) * 360;

  function ringPointer(kind: "month" | "day", e: React.PointerEvent<SVGGElement>) {
    if (e.buttons === 0 && e.type !== "pointerdown") return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const { x, y } = svgPoint(svg, e.clientX, e.clientY);
    const screenAngle = angleFromPoint(x, y);
    if (kind === "month") {
      // Undo the wheel's current rotation to find the slice actually under the cursor.
      const textureAngle = (((screenAngle + outerWheelDeg) % 360) + 360) % 360;
      const slice = Math.floor(textureAngle / 30) % 12;
      onChange({ effectiveDate: setMonthSlice(state.effectiveDate, slice) });
    } else {
      const textureAngle = (((screenAngle + moonWheelDeg) % 360) + 360) % 360;
      const day = Math.min(29, Math.max(1, Math.round((textureAngle / 360) * 29) + 1));
      onChange({ effectiveDate: setDayOfMonth(state.effectiveDate, day) });
    }
  }

  // The plate itself shows the placed cards, so it re-rasterises when a
  // placement changes (keyed below), not on every render.
  const centralPlacements = { letters: state.letters, veiled: state.veiled, middah: state.middah };
  const drawKey = (d: LetterDraw | null) => (d ? `${d.letterId}${d.orientation[0]}` : "_");
  const centralKey = `central-${state.letters.map(drawKey).join("")}-${drawKey(state.veiled)}-${state.middah ?? "_"}-${treeRevealed ? "t" : "_"}`;

  const dateKey = `${state.effectiveDate.getTime()}-${state.geoMode}`;
  // Build one mandala plane. The static base and the flat fallback carry the
  // charcoal ground; the two cyclewheels are drawn on transparent planes so
  // they read as separate discs turning above the base.
  const mandalaSvg = (only?: MandalaSlice) => (
    <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} xmlns="http://www.w3.org/2000/svg">
      {(!only || only === "static") && (
        <rect x={0} y={0} width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="var(--color-charcoal)" />
      )}
      <MizbeachSvgContent sacredTime={sacredTime} only={only} />
    </svg>
  );

  return (
    <div className={styles.surface}>
      {/* Central panel (3D plate, or SVG fallback) + interaction overlay */}
      <div className={styles.panelWrap}>
        <FolioCanvas
          fallbackArt={<MizbeachCentralPanel placements={centralPlacements} revealTree={treeRevealed} />}
          layers={[
            { art: <MizbeachCentralPanel placements={centralPlacements} revealTree={treeRevealed} />, textureKey: centralKey },
          ]}
          viewBox={{ width: CENTRAL_PANEL.width, height: CENTRAL_PANEL.height }}
        >
        <svg
          className={styles.overlay}
          viewBox={`0 0 ${CENTRAL_PANEL.width} ${CENTRAL_PANEL.height}`}
          role="group"
          aria-label="Reading placements"
        >
          {/* The hand / letter / veiled / tree slots are drawn on the folio
              plate itself, so their overlay targets are bare (an invisible
              hit-area with a focus/hover frame) rather than a schematic box. */}
          {CENTRAL_ZONES.filter((z) => z.kind !== "gate" && z.kind !== "well").map((zone) => (
            <ZoneTarget
              key={zone.id}
              zone={zone}
              bare
              filled={isZoneFilled(zone, state)}
              onActivate={() => openZone(zone.id)}
            />
          ))}
          {showFourth && (
            <ZoneTarget
              zone={FOURTH_ZONE}
              filled={!!state.fourth}
              glyph={placedGlyph(state.fourth)}
              onActivate={() => openZone("fourth")}
            />
          )}
          {needsBeneath &&
            [0, 1, 2].map((i) => {
              const z = CENTRAL_ZONES.find((zz) => zz.id === `letter-${i}`)!;
              const card = state.beneathCards[i] ? dorotCardsById[state.beneathCards[i]!] : undefined;
              return (
                <ZoneTarget
                  key={`beneath-${i}`}
                  zone={{ ...z, id: `beneath-${i}`, cy: z.cy + 74, w: 80, h: 40, kind: "well", label: `Beneath ${i + 1}` }}
                  filled={!!card}
                  sublabel={card ? card.title : "Galut card"}
                  onActivate={() => openZone(`beneath-${i}`)}
                />
              );
            })}
          {mechanic.council && (
            <ZoneTarget
              zone={{ id: "council", kind: "well", cx: CENTRAL_PANEL.width / 2, cy: CENTRAL_PANEL.gatesY, w: 120, h: 44, label: "Council of Sefirot" }}
              filled={!!state.councilCard}
              sublabel={state.councilCard ? dorotCardsById[state.councilCard]?.title : "Council card"}
              onActivate={() => openZone("council")}
            />
          )}
          {/* The revealed Or HaGanuz — the folio's own elements as the Tree of
              Life; its lower Sefirot (the gates, the wells, the veiled anchor)
              are the dominant-middah picker. */}
          {treeRevealed &&
            Object.entries(TREE_ON_PANEL).map(([id, p]) => {
              const m = middot.find((mm) => mm.id === id);
              if (!m) return null;
              const chosen = state.middah === id;
              const pick = () => onChange({ middah: id as SefirahId });
              return (
                <circle
                  key={id}
                  cx={p.x}
                  cy={p.y}
                  r={22}
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.label}${chosen ? " (chosen)" : ""}`}
                  aria-pressed={chosen}
                  className={`${styles.treeNode} ${chosen ? styles.treeNodeChosen : ""}`}
                  onClick={pick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick();
                    }
                  }}
                />
              );
            })}
        </svg>
        </FolioCanvas>
      </div>

      {/* Ring mandala (3D volvelle, or SVG fallback) + turnable overlay */}
      <div className={styles.ringsWrap}>
        <FolioCanvas
          fallbackArt={mandalaSvg()}
          layers={[
            { art: mandalaSvg("static"), textureKey: `static-${dateKey}` },
            { art: mandalaSvg("outer-wheel"), textureKey: `outer-${dateKey}`, rotation: outerWheelDeg * DEG2RAD },
            { art: mandalaSvg("moon-wheel"), textureKey: `moon-${dateKey}`, rotation: moonWheelDeg * DEG2RAD },
          ]}
          viewBox={{ width: VIEWBOX_SIZE, height: VIEWBOX_SIZE }}
        >
        <svg className={styles.overlay} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} role="group" aria-label="Turnable rings">
          <TurnableRing
            label="Turn to a Hebrew month"
            radius={RINGS.month.radius}
            thickness={RINGS.month.thickness}
            count={12}
            valueNow={monthSlice}
            valueText={formatHebrewDateEnglish(sacredTime.hebrewDate)}
            knobAngle={0}
            onPointer={(e) => ringPointer("month", e)}
            onStep={(delta) => onChange({ effectiveDate: setMonthSlice(state.effectiveDate, monthSlice + delta) })}
          />
          <TurnableRing
            label="Turn to a day of the moon"
            radius={RINGS.moon.radius}
            thickness={RINGS.moon.thickness}
            count={8}
            valueNow={dayNow - 1}
            valueMax={29}
            valueText={`Day ${dayNow} of the moon`}
            knobAngle={0}
            onPointer={(e) => ringPointer("day", e)}
            onStep={(delta) => onChange({ effectiveDate: setDayOfMonth(state.effectiveDate, dayNow + delta) })}
          />
        </svg>
        </FolioCanvas>
      </div>

      {/* Resolved sacred time + interpretation */}
      <div className={styles.readout}>
        <div className={styles.timeLine}>
          {formatHebrewDateEnglish(sacredTime.hebrewDate)}
          {sacredTime.omer && ` · Omer ${sacredTime.omer.day}`}
          {festivalId !== "ordinary" && ` · ${festivalId}`}
          {sacredTime.parsha &&
            (sacredTime.parsha.festival
              ? ` · ${sacredTime.parsha.label}`
              : ` · Parashat ${sacredTime.parsha.label}`)}
          {spread !== "triadic" && ` · ${spread === "etz-chaim" ? "Etz Chaim spread" : "Yichud spread"}`}
        </div>
        <div className={styles.treeControl}>
          <button type="button" className={styles.revealBtn} onClick={dealTheCards}>
            ✦ Deal the cards
          </button>
          <button
            type="button"
            className={styles.revealBtn}
            aria-pressed={treeRevealed}
            onClick={() => setTreeRevealed((v) => !v)}
          >
            {treeRevealed ? "Conceal the Tree of Life" : "Reveal the Tree of Life (Or HaGanuz)"}
          </button>
          {treeRevealed && (
            <span className={styles.treeHint}>
              {state.middah
                ? `Dominant middah — ${middot.find((m) => m.id === state.middah)?.label.split(" — ")[0]}`
                : "Choose the dominant middah: click a lit Sefirah."}
            </span>
          )}
        </div>
        <Interpretation letters={state.letters} />
      </div>

      {popoverTarget && (
        <PlacementPopover target={popoverTarget} onCommit={commit} onClear={clear} onClose={() => setOpenZoneId(undefined)} />
      )}
    </div>
  );
}

function Interpretation({ letters }: { letters: MizbeachReadingState["letters"] }) {
  if (letters.some((l) => l === null)) {
    return <p className={styles.interpretHint}>Place all three letters to reveal the Word of the Reading.</p>;
  }
  const ids = letters.map((l) => l!.letterId) as [string, string, string];
  const shoresh = resolveShoresh(ids);
  if (shoresh.tier === "root") {
    return (
      <p className={styles.interpret}>
        <strong>Word of the Reading:</strong> {shoresh.word} — {shoresh.gloss}
      </p>
    );
  }
  if (shoresh.tier === "name") {
    return (
      <p className={styles.interpret}>
        <strong>Recognized as:</strong> {shoresh.name} — {shoresh.gloss}
      </p>
    );
  }
  if (shoresh.tier === "related") {
    return <p className={styles.interpret}>Avenues of contemplation open through the three Gates.</p>;
  }
  return <p className={styles.interpret}>Shoresh Nistar — the Hidden Root. The letters are recorded as received.</p>;
}

function ZoneTarget({
  zone,
  filled,
  glyph,
  sublabel,
  onActivate,
  bare = false,
}: {
  zone: Zone;
  filled: boolean;
  glyph?: string;
  sublabel?: string;
  onActivate: () => void;
  /** The slot is drawn on the folio plate itself, so the target is an invisible hit-area (frame on hover/focus only). */
  bare?: boolean;
}) {
  return (
    <g
      className={`${styles.zone} ${filled ? styles.zoneFilled : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${zone.label}${filled ? " (placed)" : " (empty)"}`}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <rect
        x={zone.cx - zone.w / 2}
        y={zone.cy - zone.h / 2}
        width={zone.w}
        height={zone.h}
        rx={8}
        className={bare ? styles.zoneRectBare : styles.zoneRect}
      />
      {!bare && glyph && (
        <text x={zone.cx} y={zone.cy + 18} textAnchor="middle" fontFamily="var(--font-hebrew)" fontSize={52} fill="var(--color-gold)">
          {glyph}
        </text>
      )}
      {!bare && !glyph && !filled && (
        <text x={zone.cx} y={zone.cy + 8} textAnchor="middle" fontSize={26} fill="var(--color-gold)" opacity={0.5}>
          +
        </text>
      )}
      {!bare && sublabel && (
        <text x={zone.cx} y={zone.cy + zone.h / 2 - 6} textAnchor="middle" fontSize={11} fill="var(--color-silver)">
          {sublabel}
        </text>
      )}
    </g>
  );
}

function TurnableRing({
  label,
  radius,
  thickness,
  count,
  valueNow,
  valueMax,
  valueText,
  knobAngle,
  onPointer,
  onStep,
}: {
  label: string;
  radius: number;
  thickness: number;
  count: number;
  valueNow: number;
  valueMax?: number;
  valueText?: string;
  knobAngle: number;
  onPointer: (e: React.PointerEvent<SVGGElement>) => void;
  onStep: (delta: number) => void;
}) {
  const knob = polarToCartesian(CENTER.x, CENTER.y, radius, knobAngle);
  return (
    <g
      className={styles.ring}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={valueNow}
      aria-valuemin={0}
      aria-valuemax={valueMax ?? count - 1}
      aria-valuetext={valueText}
      onPointerDown={(e) => {
        (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
        onPointer(e);
      }}
      onPointerMove={onPointer}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onStep(1); }
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onStep(-1); }
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <path key={i} d={wedgePath(radius, thickness, ...segmentAngles(count, i))} className={styles.ringWedge} />
      ))}
      <circle cx={knob.x} cy={knob.y} r={7} className={styles.ringKnob} />
    </g>
  );
}

// ——— small placement helpers ———
function isZoneFilled(zone: Zone, state: MizbeachReadingState): boolean {
  if (zone.kind === "hand") return state.palmNotes.trim().length > 0;
  if (zone.kind === "tree") return state.middah !== null;
  if (zone.kind === "veiled") return state.veiled !== null;
  if (zone.kind === "letter") return state.letters[zone.index!] !== null;
  return false;
}
