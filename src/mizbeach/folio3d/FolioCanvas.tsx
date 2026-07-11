import { cloneElement, useEffect, useRef, type ReactElement } from "react";
import { isWebglAvailable } from "./webglSupport";
import { svgElementToDataUrl, loadTexture } from "./svgTexture";
import { FolioScene } from "./FolioScene";
import styles from "./folio3d.module.css";

export interface FolioLayer {
  /** The SVG piece rendered onto this plane. */
  art: ReactElement;
  /** Changes only when this layer's visible content changes (gates re-rasterisation). */
  textureKey: string;
  /** Radians to turn this plane about its centre (the cyclewheels); omit for static planes. */
  rotation?: number;
}

export interface FolioCanvasProps {
  /** The complete flat SVG folio piece, shown when WebGL is unavailable. */
  fallbackArt: ReactElement;
  /** Stacked art planes for the 3D folio (bottom-first). One for the central panel; three for the mandala. */
  layers: FolioLayer[];
  /** viewBox of the piece — gives the stage its aspect ratio and the textures their pixel size. */
  viewBox: { width: number; height: number };
  /** The interaction/accessibility overlay, layered above the plate. */
  children?: React.ReactNode;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Presents a folio piece as a living 3D "illuminated plate" when WebGL is
 * available — a static base plus, for the mandala, two cyclewheels that turn
 * beneath a fixed pointer — with the interaction overlay layered exactly on
 * top. Falls back to the flat SVG folio (identical geometry, so the overlay
 * still registers). The 3D layer is purely visual; all interaction and
 * accessibility live in the overlay children.
 */
export function FolioCanvas({ fallbackArt, layers, viewBox, children }: FolioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FolioScene | null>(null);
  const use3d = isWebglAvailable();
  const layerCount = layers.length;

  const textureKeys = layers.map((l) => l.textureKey).join("|");
  const rotations = layers.map((l) => l.rotation ?? 0).join(",");

  // Mount the scene once (only in 3D mode). layerCount is stable per usage.
  useEffect(() => {
    if (!use3d || !canvasRef.current) return;
    const scene = new FolioScene(canvasRef.current, {
      aspect: viewBox.width / viewBox.height,
      reducedMotion: prefersReducedMotion(),
      layerCount,
    });
    sceneRef.current = scene;
    const onResize = () => scene.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [use3d, layerCount]);

  // (Re)rasterise each layer's art whenever its content changes.
  useEffect(() => {
    if (!use3d) return;
    let cancelled = false;
    layers.forEach((layer, i) => {
      const url = svgElementToDataUrl(layer.art, viewBox.width, viewBox.height);
      loadTexture(url)
        .then((tex) => {
          if (cancelled) tex.dispose();
          else sceneRef.current?.setTexture(tex, i);
        })
        .catch(() => {
          /* a failed texture is non-fatal — leather + glow remain */
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [use3d, textureKeys]);

  // Turn the cyclewheels when their rotation changes.
  useEffect(() => {
    if (!use3d) return;
    layers.forEach((layer, i) => sceneRef.current?.setLayerRotation(i, layer.rotation ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [use3d, rotations]);

  if (!use3d) {
    return (
      <div className={styles.stage} style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}>
        {cloneElement(fallbackArt as ReactElement<{ className?: string }>, { className: styles.fallback })}
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
