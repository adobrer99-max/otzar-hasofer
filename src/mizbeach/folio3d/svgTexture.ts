import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as THREE from "three";

/**
 * Renders one of the folio's SVG pieces (the central panel or the ring
 * mandala) to a texture for the 3D surface. The existing SVG components stay
 * the single source of the folio's art — here they are just rasterised onto
 * geometry, so the 3D folio never duplicates any drawing logic.
 *
 * Brand-constant colours are baked in as literal hex (the same values as
 * src/styles/theme.css :root) rather than resolved from the live theme, so the
 * folio keeps its charcoal-and-gold field in both the light and dark page
 * themes — matching the Herald/Mizbe'ach "illuminated plate" rule.
 */
const BRAND: Record<string, string> = {
  "--color-charcoal": "#14171c",
  "--color-charcoal-raised": "#1c2027",
  "--color-charcoal-line": "#2a2f38",
  "--color-gold": "#c9a24b",
  "--color-gold-bright": "#e4c579",
  "--color-blue": "#1f3a5f",
  "--color-blue-bright": "#3f6ea5",
  "--color-silver": "#c7ccd4",
  "--color-copper": "#c98056",
  "--color-parchment": "#ece6d8",
  "--text": "#ece6d8",
  "--text-muted": "#9aa1ad",
  "--accent": "#c9a24b",
  "--accent-bright": "#e4c579",
  "--font-hebrew": "'David Libre','Frank Ruhl Libre',serif",
  "--font-latin": "'Frank Ruhl Libre',Georgia,serif",
};

function inlineBrandVars(svg: string): string {
  return svg.replace(/var\((--[a-z-]+)\)/g, (_, name) => BRAND[name] ?? "#000");
}

/**
 * How much larger than the viewBox to rasterise. The plate can display near the
 * viewBox's own CSS size on a wide screen, and again ×2 on a HiDPI panel, so a
 * 1:1 raster visibly softens. Rasterising at ×2 keeps the gold linework and
 * Hebrew type crisp up to that display size without an unreasonable texture.
 */
const SUPERSAMPLE = 2;

/** Serialise an SVG React element to a self-contained data URL, rasterised above viewBox size so it stays crisp when the plate is displayed large / on HiDPI. */
export function svgElementToDataUrl(element: ReactElement, width: number, height: number): string {
  let markup = renderToStaticMarkup(element);
  // Give the raster explicit intrinsic dimensions (not the 300×150 default), at
  // the supersampled size — the viewBox keeps the coordinate space unchanged, so
  // only the pixel resolution grows.
  markup = markup.replace(/^<svg /, `<svg width="${width * SUPERSAMPLE}" height="${height * SUPERSAMPLE}" `);
  markup = inlineBrandVars(markup);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Load a data URL into a three.js texture, tuned for crisp text on a flat plane. */
export function loadTexture(url: string): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(url).then((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  });
}
