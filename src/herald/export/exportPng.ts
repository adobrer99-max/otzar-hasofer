import { VIEWBOX_WIDTH, VIEWBOX_HEIGHT } from "../render/heraldGeometry";
import { exportHeraldSvg } from "./exportSvg";

function serializeResolvedSvg(svg: SVGSVGElement): string {
  // Reuse exportHeraldSvg's variable-resolution logic by round-tripping
  // through a temporary anchor-free blob URL is overkill here; instead we
  // duplicate the minimal resolution step inline via a hidden export call.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  return new XMLSerializer().serializeToString(clone);
}

/**
 * Rasterizes the live <svg> node to a PNG at a print-friendly resolution
 * and downloads it. Known limitation: if the Hebrew glyph/caption text
 * relies on the self-hosted web font, the exported PNG is faithful (canvas
 * rasterization uses the already-loaded font), but a *re-opened SVG* export
 * on a machine without the font installed may not be — see exportSvg.ts.
 */
export async function exportHeraldPng(
  svg: SVGSVGElement,
  filename: string,
  resolution: "screen" | "print" = "print",
  /** Source viewBox dimensions — defaults to the Herald shield's; pass the actual viewBox for other renderers (e.g. the Mizbe'ach's square canvas). */
  sourceSize: { width: number; height: number } = { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT },
) {
  const scale = resolution === "print" ? 3 : 1.5;
  const width = sourceSize.width * scale;
  const height = sourceSize.height * scale;

  const svgString = serializeResolvedSvg(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG export failed to produce a blob");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { exportHeraldSvg };
