import { forwardRef } from "react";
import type { HeraldInputSnapshot, ReadingPath } from "../../types/herald";
import type { HeraldForm } from "../synthesis/deriveHeraldForm";
import { festivalsById } from "../../data/festivals";
import { VIEWBOX_WIDTH, VIEWBOX_HEIGHT, FIGURE_OFFSET } from "./heraldGeometry";
import { HeraldLayerContent, HeraldSynthesisContent, HeraldSvgDefs, MottoRibbon } from "./buildHeraldSvg";

export interface HeraldCanvasProps {
  /** Single-reading mode: render this reading's snapshot. */
  input?: HeraldInputSnapshot;
  /** Synthesis mode: render the Herald derived from the first seven readings. Takes precedence over `input`. */
  form?: HeraldForm;
  /** The immediately-prior layer (single-reading mode only) — rendered ghosted behind. */
  previous?: HeraldInputSnapshot;
  /** Count of layers before this one (single-reading mode). */
  layerCount?: number;
  displayName?: string;
  /** Participant Hebrew name + path, used for the caption in synthesis mode. */
  hebrewName?: string;
  path?: ReadingPath;
  createdAt?: string;
  /** Status line for synthesis mode, e.g. "The Herald, revealed". */
  status?: string;
  /**
   * The participant's sealed Heraldic Epithet — inscribed on the seventh
   * reading onward. Absent epithet yields output identical to before.
   */
  epithet?: string;
}

export const HeraldCanvas = forwardRef<SVGSVGElement, HeraldCanvasProps>(function HeraldCanvas(
  { input, form, previous, layerCount, displayName, hebrewName, path, createdAt, status, epithet },
  ref,
) {
  const cx = VIEWBOX_WIDTH / 2;
  const isSynthesis = !!form;

  const festival = input ? (festivalsById[input.festivalId] ?? festivalsById.ordinary) : undefined;
  const brit = (isSynthesis ? path : input?.path) === "brit";
  const hName = isSynthesis ? hebrewName : input?.hebrewName;
  const captionName = brit && hName ? hName : displayName;

  const label = [
    captionName ? `Herald of ${captionName}` : "Herald",
    epithet,
    isSynthesis ? status : festival && festival.id !== "ordinary" ? festival.name : undefined,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      data-festival={festival && festival.id !== "ordinary" ? festival.id : undefined}
      style={{ width: "100%", height: "auto", background: "var(--color-charcoal)" }}
    >
      <title>{label}</title>
      <HeraldSvgDefs />
      <rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="var(--color-charcoal)" />

      {/* The figure sits inside the larger frame; the crest rises above it and
          the motto scroll rests below, all shield-relative. */}
      <g transform={`translate(${FIGURE_OFFSET.x}, ${FIGURE_OFFSET.y})`}>
        {isSynthesis ? (
          <HeraldSynthesisContent form={form} />
        ) : input ? (
          <>
            {previous && (
              <g opacity={0.15}>
                <HeraldLayerContent input={previous} layerCount={Math.max((layerCount ?? 0) - 1, 0)} />
              </g>
            )}
            <HeraldLayerContent input={input} layerCount={layerCount ?? 0} />
          </>
        ) : null}

        {epithet && <MottoRibbon text={epithet} />}
      </g>

      {captionName && (
        <text
          x={cx}
          y={VIEWBOX_HEIGHT - 52}
          textAnchor="middle"
          fontFamily={brit ? "var(--font-hebrew)" : "var(--font-latin)"}
          fontSize={22}
          fill="var(--color-silver)"
        >
          {captionName}
        </text>
      )}
      {isSynthesis
        ? status && (
            <text
              x={cx}
              y={VIEWBOX_HEIGHT - 26}
              textAnchor="middle"
              fontFamily="var(--font-latin)"
              fontSize={12}
              fill="var(--text-muted)"
            >
              {status}
            </text>
          )
        : createdAt && (
            <text
              x={cx}
              y={VIEWBOX_HEIGHT - 26}
              textAnchor="middle"
              fontFamily="var(--font-latin)"
              fontSize={12}
              fill="var(--text-muted)"
            >
              {new Date(createdAt).toLocaleDateString()}
              {festival && festival.id !== "ordinary" ? ` · ${festival.name}` : ""}
            </text>
          )}
    </svg>
  );
});
