import { useEffect, useRef } from "react";
import { paletteOf, readPalette } from "./render/palette";
import { paintGround, paintScene, type Scene } from "./render/scene";
import styles from "./SceneCanvas.module.css";

/**
 * **A panel that plays a scene**, and deliberately not part of `GameCanvas`.
 *
 * Two reasons it has to be its own surface, and the second is the one that
 * settles it:
 *
 * 1. `GameCanvas` runs a **fixed-timestep simulation** — an accumulator, an
 *    input frame, `step` — and a picture has no business inside that loop. A
 *    scene wants elapsed seconds and nothing else.
 * 2. **`GameCanvas` only mounts when there is a `world`.** The prologue plays on
 *    the Threshold, before any ground exists, so there is no canvas there to
 *    borrow. A scene painter welded into the game's loop could never have drawn
 *    the one moment this phase was asked for.
 *
 * What it *does* copy from `GameCanvas` is the three things every canvas in this
 * project has had to learn: the device-pixel ratio **capped at two** (P6
 * measured the phone and the cap is what makes a scene affordable at three
 * device pixels per CSS pixel), a `ResizeObserver` rather than a window
 * listener, and a `MutationObserver` on `data-theme`, because the theme toggle
 * rewrites an attribute and a canvas cannot inherit a CSS variable.
 *
 * **Reduced motion is a still, not a blank.** Someone who has asked the machine
 * to stop moving things has not asked to be shown an empty box, so the loop is
 * simply not started and one frame is painted at the scene's own authored
 * `still`. The `matchMedia` check is the same one `herald/deck/DealReveal.tsx`
 * uses; it is read once at mount, which is what every other consumer in this
 * repo does and is right for a panel that lives as long as one plate.
 */
export function SceneCanvas({
  scene,
  sefirah,
  label,
}: {
  scene: Scene;
  /**
   * Whose ground to tint toward, for the ten places. Undefined is the plain
   * theme, which is what the prologue wants — the Scribe is nowhere yet.
   */
  sefirah?: string;
  /**
   * What a screen reader is told is here. **Required**, because a canvas is a
   * hole in the document: the words under the panel are the content, and this
   * has to say what the picture adds without repeating them.
   */
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let view = { w: 1, h: 1 };
    const still =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paint = (t: number) => {
      const palette = paletteOf(readPalette(), sefirah);
      context.clearRect(0, 0, view.w, view.h);
      paintGround(context, palette, view.w, view.h);
      paintScene(context, scene, palette, t, view.w, view.h);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view = { w: rect.width, h: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      // A still has no loop to repaint it, so a resize has to.
      if (still) paint(scene.still ?? 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const theme = new MutationObserver(() => paint(still ? (scene.still ?? 0) : 0));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (still) {
      paint(scene.still ?? 0);
      return () => {
        observer.disconnect();
        theme.disconnect();
      };
    }

    // **The clock starts when the panel does**, not at page load. A scene with a
    // `once` drift — the fall — has to run from its beginning every time the
    // page it belongs to is turned to, or a reader who arrived at the fifth
    // paragraph and went back would find the body already on the ground.
    const began = performance.now();
    let frame = 0;
    let running = true;
    const loop = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      paint((now - began) / 1000);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
    };
    // Keyed on the scene's id rather than the object, so an equal scene rebuilt
    // by a render does not restart a `once` drift mid-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id, sefirah]);

  return (
    <div className={styles.panel}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={label} />
    </div>
  );
}
