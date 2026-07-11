import { cloneElement, useEffect, useRef, type ReactElement, type ReactNode } from "react";
import { isWebglAvailable } from "./webglSupport";
import { svgElementToDataUrl, loadTexture } from "./svgTexture";
import { FolioScene } from "./FolioScene";
import styles from "./folio3d.module.css";

export interface FolioCanvasProps {
  /** The folio SVG piece to show — textured onto the 3D plate, or rendered directly as the fallback. */
  art: ReactElement;
  /** viewBox of `art`, giving the stage its aspect ratio and the texture its pixel size. */
  viewBox: { width: number; height: number };
  /**
   * Changes only when `art`'s visible content changes, so the texture is
   * re-rasterised on real changes (a placement, a turned ring) rather than on
   * every React render.
   */
  textureKey: string;
  /** The interaction/accessibility overlay, layered above the plate. */
  children?: ReactNode;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Presents a folio piece as a living 3D "illuminated plate" when WebGL is
 * available, with the interaction overlay layered exactly on top; otherwise
 * falls back to the flat SVG folio (identical geometry, so the overlay still
 * registers). The 3D layer is purely visual — all interaction and
 * accessibility live in the overlay children.
 */
export function FolioCanvas({ art, viewBox, textureKey, children }: FolioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FolioScene | null>(null);
  const use3d = isWebglAvailable();

  // Mount the scene once (only in 3D mode).
  useEffect(() => {
    if (!use3d || !canvasRef.current) return;
    const scene = new FolioScene(canvasRef.current, {
      aspect: viewBox.width / viewBox.height,
      reducedMotion: prefersReducedMotion(),
    });
    sceneRef.current = scene;
    const onResize = () => scene.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      sceneRef.current = null;
    };
    // aspect is stable for a given piece; mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [use3d]);

  // (Re)rasterise the art to a texture whenever its content changes.
  useEffect(() => {
    if (!use3d) return;
    let cancelled = false;
    const url = svgElementToDataUrl(art, viewBox.width, viewBox.height);
    loadTexture(url)
      .then((tex) => {
        if (cancelled) tex.dispose();
        else sceneRef.current?.setTexture(tex);
      })
      .catch(() => {
        /* leave the leather + glow; a failed texture is non-fatal */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [use3d, textureKey]);

  if (!use3d) {
    return (
      <div className={styles.stage} style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}>
        {cloneElement(art as ReactElement<{ className?: string }>, { className: styles.fallback })}
        {children}
      </div>
    );
  }

  return (
    <div
      className={styles.stage}
      style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        sceneRef.current?.setPointer({
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: -(((e.clientY - r.top) / r.height) * 2 - 1),
        });
      }}
      onPointerLeave={() => sceneRef.current?.setPointer(null)}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {children}
    </div>
  );
}
