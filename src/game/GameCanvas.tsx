import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Grace, Verb } from "./abilities";
import { drawWorld, trackCamera, zoomFor, type Camera } from "./render/draw";
import { readPalette, type Palette } from "./render/palette";
import { DT, step, type StepContext } from "./world/step";
import { NO_INPUT, type Input, type World } from "./world/types";
import styles from "./GameCanvas.module.css";

/**
 * The only impure part of the game: a requestAnimationFrame loop, a keyboard,
 * and a canvas.
 *
 * The world is held in a ref and mutated in place — not React state. At sixty
 * ticks a second, routing the simulation through `setState` would re-render
 * the tree sixty times a second for no benefit; instead the loop owns the
 * world, and only the handful of values the HUD actually shows are lifted out,
 * a few times a second, through `onSample`.
 *
 * The simulation runs on a fixed timestep with an accumulator, so physics is
 * identical at 60 Hz, 120 Hz, or on a stuttering tab, and a long stall is
 * clamped rather than simulated all at once.
 */

export interface HudSample {
  or: number;
  message?: string;
  veiled: boolean;
}

export interface GameCanvasProps {
  world: World;
  verbs: readonly Verb[];
  graces: readonly Grace[];
  /** Suspends the loop for a plate, a pause, or an end-of-region panel. */
  paused: boolean;
  onLetter: (letterId: string) => void;
  onFragment: (index: number) => void;
  onHouse: (cardId: string) => void;
  onFinish: () => void;
  onSample: (sample: HudSample) => void;
}

/** Which keys mean what. Arrows and WASD both, because both are expected. */
const KEY_MAP: Record<string, keyof Input> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  KeyA: "left",
  KeyD: "right",
  KeyW: "up",
  KeyS: "down",
  Space: "jump",
  KeyZ: "jump",
  KeyK: "jump",
  KeyX: "act",
  KeyJ: "act",
  KeyE: "act",
  KeyC: "dash",
  KeyL: "dash",
  ShiftLeft: "dash",
  ShiftRight: "dash",
};

const MAX_FRAME_SECONDS = 0.25;

export function GameCanvas({
  world,
  verbs,
  graces,
  paused,
  onLetter,
  onFragment,
  onHouse,
  onFinish,
  onSample,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const held = useRef<Set<keyof Input>>(new Set());
  const pressed = useRef<Set<keyof Input>>(new Set());
  const camera = useRef<Camera>({ x: 0, y: 0 });
  const palette = useRef<Palette>(readPalette());
  const view = useRef({ w: 960, h: 432 });
  const pausedRef = useRef(paused);
  const callbacks = useRef({ onLetter, onFragment, onHouse, onFinish, onSample });

  pausedRef.current = paused;
  callbacks.current = { onLetter, onFragment, onHouse, onFinish, onSample };

  const ctxRef = useRef<StepContext>({ verbs, graces });
  ctxRef.current = {
    verbs,
    graces,
    onLetter: (id) => callbacks.current.onLetter(id),
    onFragment: (i) => callbacks.current.onFragment(i),
    onHouse: (id) => callbacks.current.onHouse(id),
    onFinish: () => callbacks.current.onFinish(),
  };

  // --- input --------------------------------------------------------------

  const setKey = useCallback((code: string, down: boolean) => {
    const action = KEY_MAP[code];
    if (!action) return false;
    if (down) {
      // Edge-triggered actions must fire once per press, not once per repeat.
      if (!held.current.has(action)) pressed.current.add(action);
      held.current.add(action);
    } else {
      held.current.delete(action);
    }
    return true;
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (setKey(e.code, true)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (setKey(e.code, false)) e.preventDefault();
    };
    // Losing focus mid-run must not leave a key stuck down.
    const clear = () => {
      held.current.clear();
      pressed.current.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [setKey]);

  /** Touch controls: the same actions, pressed with a thumb. */
  const touch = useMemo(
    () => (action: keyof Input, down: boolean) => {
      if (down) {
        if (!held.current.has(action)) pressed.current.add(action);
        held.current.add(action);
      } else {
        held.current.delete(action);
      }
    },
    [],
  );

  // --- the loop -----------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    let sampleAt = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view.current = { w: rect.width, h: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
      palette.current = readPalette();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // The theme toggle rewrites `data-theme`; the canvas has to re-read it.
    const themeWatcher = new MutationObserver(() => {
      palette.current = readPalette();
    });
    themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const farsight = graces.includes("farsight");

    const loop = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);

      const elapsed = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
      last = now;

      if (!pausedRef.current) {
        accumulator += elapsed;
        while (accumulator >= DT) {
          const input: Input = {
            ...NO_INPUT,
            left: held.current.has("left"),
            right: held.current.has("right"),
            up: held.current.has("up"),
            down: held.current.has("down"),
            // Up is also a jump, as every platformer's players expect — while
            // still meaning "up" to a Scribe on a vine or in water.
            jump: pressed.current.has("jump") || pressed.current.has("up"),
            jumpHeld: held.current.has("jump") || held.current.has("up"),
            act: pressed.current.has("act"),
            dash: pressed.current.has("dash"),
          };
          pressed.current.clear();
          step(world, input, ctxRef.current);
          accumulator -= DT;
        }
      }

      trackCamera(camera.current, world, view.current.w, view.current.h, farsight);
      drawWorld(
        context,
        world,
        camera.current,
        palette.current,
        view.current.w,
        view.current.h,
        verbs as readonly string[],
      );

      if (now - sampleAt > 100) {
        sampleAt = now;
        callbacks.current.onSample({
          or: world.or,
          message: world.message?.text,
          veiled: world.player.veiled > 0,
        });
      }
    };

    frame = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeWatcher.disconnect();
    };
  }, [world, verbs, graces]);

  // Snap the camera onto the Scribe whenever a new region is entered, so it
  // does not sweep across the whole map on the first frame.
  useEffect(() => {
    const zoom = zoomFor(view.current.w);
    camera.current = {
      x: Math.max(0, world.player.x - (view.current.w / zoom) * 0.46),
      y: Math.max(0, world.player.y - (view.current.h / zoom) * 0.55),
    };
  }, [world]);

  const pad = (action: keyof Input, label: string, hint: string) => (
    <button
      type="button"
      className={styles.padKey}
      aria-label={hint}
      onPointerDown={(e) => {
        e.preventDefault();
        touch(action, true);
      }}
      onPointerUp={() => touch(action, false)}
      onPointerLeave={() => touch(action, false)}
      onPointerCancel={() => touch(action, false)}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.stage}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="The Ascent of the Tree" />
      <div className={styles.pad} aria-hidden={false}>
        <div className={styles.padCluster}>
          {pad("left", "←", "Move left")}
          {pad("right", "→", "Move right")}
        </div>
        <div className={styles.padCluster}>
          {pad("act", "✶", "Act — hook, cut, burn, open, reveal, set a stone")}
          {pad("dash", "»", "Dash")}
          {pad("jump", "▲", "Jump")}
        </div>
      </div>
    </div>
  );
}
