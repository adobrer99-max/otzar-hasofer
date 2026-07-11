/**
 * A cheap, cached probe for whether this browser can give us a WebGL context.
 * The interactive folio renders a three.js scene when it can, and falls back
 * to the flat SVG folio when it can't (old browsers, blocked GPUs, headless
 * test/SSR contexts) — so the 3D layer is always progressive enhancement.
 */
let cached: boolean | undefined;

export function isWebglAvailable(): boolean {
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return (cached = false);
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    cached = Boolean(gl);
  } catch {
    cached = false;
  }
  return cached;
}
