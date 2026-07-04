import { forwardRef } from "react";
import type { HeraldInputSnapshot } from "../../types/herald";
import { festivalsById } from "../../data/festivals";
import { VIEWBOX_WIDTH, VIEWBOX_HEIGHT, shieldCenter } from "./heraldGeometry";
import { HeraldLayerContent, HeraldSvgDefs } from "./buildHeraldSvg";

export interface HeraldCanvasProps {
  input: HeraldInputSnapshot;
  /** The immediately-prior layer for this participant, if any — rendered ghosted behind the current one. */
  previous?: HeraldInputSnapshot;
  /** Count of layers that existed for this participant before this one (0 for the Origin Herald). */
  layerCount: number;
  displayName?: string;
  createdAt?: string;
  /**
   * The participant's sealed Heraldic Epithet — pass only when the displayed
   * layer is the seventh reading or later; earlier layers show the
   * pre-revelation Herald. Rendering stays deterministic: absent epithet
   * yields output identical to before this prop existed.
   */
  epithet?: string;
}

export const HeraldCanvas = forwardRef<SVGSVGElement, HeraldCanvasProps>(function HeraldCanvas(
  { input, previous, layerCount, displayName, createdAt, epithet },
  ref,
) {
  const festival = festivalsById[input.festivalId] ?? festivalsById.ordinary;
  const center = shieldCenter();
  const captionName = input.path === "brit" && input.hebrewName ? input.hebrewName : displayName;

  const label = [
    captionName ? `Herald of ${captionName}` : "Herald",
    epithet,
    festival.id !== "ordinary" ? festival.name : undefined,
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
      data-festival={festival.id === "ordinary" ? undefined : festival.id}
      style={{ width: "100%", height: "auto", background: "var(--color-charcoal)" }}
    >
      <title>{label}</title>
      <HeraldSvgDefs />
      <rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="var(--color-charcoal)" />

      {previous && (
        <g opacity={0.15}>
          <HeraldLayerContent input={previous} layerCount={Math.max(layerCount - 1, 0)} />
        </g>
      )}

      <HeraldLayerContent input={input} layerCount={layerCount} />

      {epithet && (
        <text
          x={center.x}
          y={VIEWBOX_HEIGHT - 64}
          textAnchor="middle"
          fontFamily="var(--font-latin)"
          fontSize={14}
          fontStyle="italic"
          fill="var(--color-gold)"
        >
          {epithet}
        </text>
      )}
      {captionName && (
        <text
          x={center.x}
          y={VIEWBOX_HEIGHT - 40}
          textAnchor="middle"
          fontFamily={input.path === "brit" ? "var(--font-hebrew)" : "var(--font-latin)"}
          fontSize={22}
          fill="var(--color-silver)"
        >
          {captionName}
        </text>
      )}
      {createdAt && (
        <text
          x={center.x}
          y={VIEWBOX_HEIGHT - 18}
          textAnchor="middle"
          fontFamily="var(--font-latin)"
          fontSize={12}
          fill="var(--text-muted)"
        >
          {new Date(createdAt).toLocaleDateString()}
          {festival.id !== "ordinary" ? ` · ${festival.name}` : ""}
        </text>
      )}
    </svg>
  );
});
