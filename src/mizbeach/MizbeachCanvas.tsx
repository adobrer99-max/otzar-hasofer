import { forwardRef } from "react";
import type { SacredTimeSnapshot } from "../types/sacredTime";
import { formatHebrewDateEnglish } from "../data/hebrewCalendar";
import { VIEWBOX_SIZE } from "./render/mizbeachGeometry";
import { MizbeachSvgContent } from "./render/buildMizbeachSvg";

export interface MizbeachCanvasProps {
  sacredTime: SacredTimeSnapshot;
}

export const MizbeachCanvas = forwardRef<SVGSVGElement, MizbeachCanvasProps>(function MizbeachCanvas(
  { sacredTime },
  ref,
) {
  const label = `The Mizbe'ach ring mandala for ${formatHebrewDateEnglish(sacredTime.hebrewDate)} — the Mazalot, Moon, Solar Month, and Parsha rings around the Sabbath Core.`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      style={{ width: "100%", height: "auto", background: "var(--color-charcoal)" }}
    >
      <title>{label}</title>
      <rect x={0} y={0} width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="var(--color-charcoal)" />
      <MizbeachSvgContent sacredTime={sacredTime} />
    </svg>
  );
});
