import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Grace, Verb } from "./abilities";
import type { Effect } from "./items";
import type { Keeping } from "./relics";
import { controlById, KEY_MAP, PAD_LAYOUT, type ControlId } from "./controls";
import { drawWorld, trackCamera, type Camera } from "./render/draw";
import { paletteOf, readPalette, type Palette } from "./render/palette";
import { DT, step, type StepContext } from "./world/step";
import { recordFrame } from "./dev/probe";
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
  /** What the Scribe is made of. Zero and the run is over. */
  lamps: number;
  out: boolean;
  /** How far along the region the Scribe has come, in pixels. */
  x: number;
  onGround: boolean;
  /**
   * Which keys have been pressed since the last sample.
   *
   * This is the teaching channel and nothing else: a lesson is retired the
   * moment its key is *used*, so the game stops telling you to press something
   * you have already pressed. Deliberately read from the keyboard rather than
   * from the simulation — pressing Up while standing still is still learning
   * where Up is, and the world would never know.
   */
  used: ControlId[];
  /**
   * The three running totals a vow is judged against — light taken, veilings
   * suffered, marks set, all counted from the start of the rung.
   *
   * Here rather than only at the exit because a vow the Scribe cannot *see* is
   * a vow they cannot keep on purpose: they were told at the House, and then
   * for the length of a whole rung the game said nothing until it announced
   * the verdict. The HUD subtracts the totals at the moment of swearing and
   * asks `vowKept` on the difference, which is the identical question the exit
   * asks — one rule, read twice.
   */
  orGathered: number;
  veilings: number;
  marksSet: number;
}

/**
 * **Every callback the step loop can make, named once and required.**
 *
 * This type exists because of a bug it now makes impossible. `StepContext`
 * declares all six of these optional — rightly, since the fight probes build a
 * context with none of them — and `ctxRef.current` was annotated `StepContext`
 * and assembled by hand. So when `onVessel` was added, it was threaded through
 * the props, stored in `callbacks.current`, and **never assigned onto the
 * context**. `step.ts` calls `ctx.onVessel?.(e.ref)`; `?.` on `undefined` is a
 * no-op; there was no type error and no runtime error, and **no vessel could be
 * picked up in the shipped game at all** — the whole of the twelve-of-twenty
 * daily pool, the six authored behaviours, the plate and the belt, unreachable.
 *
 * Nothing could have caught it. `step.ts` was correct and the suite never
 * renders this component; the fight and economy probes construct a
 * `StepContext` directly and pass `items` in, so they measured a game the
 * player was not playing; and the harness driver cannot climb to a pedestal —
 * `VESSEL_CHUNK` is a shelf two rows up, which is why the `house` script needed
 * a `Probe.house` field to steer by.
 *
 * So the guard is a **type** rather than a test: `Required<Pick<…>>` cannot be
 * satisfied with a key missing, so the forwarding object below fails `tsc` if a
 * callback is ever added and left unwired.
 */
type StepCallbacks = Required<
  Pick<StepContext, "onLetter" | "onFragment" | "onWordGate" | "onHouse" | "onVessel" | "onRelic" | "onFinish">
>;

export interface GameCanvasProps {
  world: World;
  verbs: readonly Verb[];
  graces: readonly Grace[];
  /**
   * The letter the Scribe writes with — the month's ascendant one, so the mark
   * he throws is the mark Sacred Time put in his hand.
   */
  markGlyph: string;
  /** The vessels carried — see `items.ts`. They change numbers, never verbs. */
  items: readonly string[];
  /**
   * What the Scribe has become, from the guardians they have ever broken. The
   * same shape a vessel's effect has, and folded by the same `fold` — see
   * `guardians.ts`. Carried separately because it is not carried at all: it
   * cannot be dropped, spent or declined.
   */
  boons: readonly Effect[];
  /**
   * What the reliquary keeps, minus anything already spent — the three rules
   * `step.ts` reads every tick. See `relics.ts`.
   */
  keeps: Keeping;
  /** Suspends the loop for a plate, a pause, or an end-of-region panel. */
  paused: boolean;
  onLetter: (letterId: string) => void;
  onFragment: (index: number) => void;
  onWordGate: () => void;
  onHouse: (cardId: string) => void;
  onVessel: (keliId: string) => void;
  onRelic: (relicId: string) => void;
  onFinish: () => void;
  onSample: (sample: HudSample) => void;
}

const MAX_FRAME_SECONDS = 0.25;

export function GameCanvas({
  world,
  verbs,
  graces,
  boons,
  keeps,
  markGlyph,
  items,
  paused,
  onLetter,
  onFragment,
  onWordGate,
  onHouse,
  onVessel,
  onRelic,
  onFinish,
  onSample,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const held = useRef<Set<keyof Input>>(new Set());
  const pressed = useRef<Set<keyof Input>>(new Set());
  const used = useRef<Set<ControlId>>(new Set());
  const camera = useRef<Camera>({ x: 0, y: 0 });
  const palette = useRef<Palette>(readPalette());
  /**
   * The theme palette tinted for the ground underfoot, recomputed when either
   * of its two inputs changes rather than every frame — the mixing is cheap
   * but it is exactly the kind of per-frame work P6 exists to stop adding.
   */
  const here = useRef<Palette>(paletteOf(palette.current, world.sefirah));
  const view = useRef({ w: 960, h: 432 });
  const pausedRef = useRef(paused);
  const callbacks = useRef({ onLetter, onFragment, onWordGate, onHouse, onVessel, onRelic, onFinish, onSample });

  pausedRef.current = paused;
  callbacks.current = { onLetter, onFragment, onWordGate, onHouse, onVessel, onRelic, onFinish, onSample };

  /**
   * The forwarding half, annotated so that every callback must be here. Each
   * reads through `callbacks.current` rather than closing over the prop, so a
   * handler that changes identity between renders is still the one the loop
   * calls — the loop is started once and never restarted.
   */
  const forward: StepCallbacks = {
    onLetter: (id) => callbacks.current.onLetter(id),
    onFragment: (i) => callbacks.current.onFragment(i),
    onWordGate: () => callbacks.current.onWordGate(),
    onHouse: (id) => callbacks.current.onHouse(id),
    onVessel: (id) => callbacks.current.onVessel(id),
    onRelic: (id) => callbacks.current.onRelic(id),
    onFinish: () => callbacks.current.onFinish(),
  };

  const ctxRef = useRef<StepContext>({ verbs, graces });
  ctxRef.current = { verbs, graces, items, boons, keeps, markGlyph, ...forward };

  // --- input --------------------------------------------------------------

  const setKey = useCallback((code: string, down: boolean) => {
    const action = KEY_MAP[code];
    if (!action) return false;
    if (down) {
      // Edge-triggered actions must fire once per press, not once per repeat.
      if (!held.current.has(action)) pressed.current.add(action);
      held.current.add(action);
      used.current.add(action);
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
    () => (action: ControlId, down: boolean) => {
      if (down) {
        if (!held.current.has(action)) pressed.current.add(action);
        held.current.add(action);
        used.current.add(action);
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
      here.current = paletteOf(palette.current, world.sefirah);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // The theme toggle rewrites `data-theme`; the canvas has to re-read it.
    const themeWatcher = new MutationObserver(() => {
      palette.current = readPalette();
      here.current = paletteOf(palette.current, world.sefirah);
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
            strike: pressed.current.has("strike"),
          };
          pressed.current.clear();
          step(world, input, ctxRef.current);
          accumulator -= DT;
        }
      }

      trackCamera(camera.current, world, view.current.w, view.current.h, farsight);
      // Timed around the draw alone, because the draw is what P6 is about —
      // the step is a fixed-timestep loop and its cost is already bounded by
      // `MAX_FRAME_SECONDS`. DEV only, and `recordFrame` is a push onto a
      // capped array, so the instrument costs about what it measures.
      const drawnAt = import.meta.env.DEV ? performance.now() : 0;
      drawWorld(
        context,
        world,
        camera.current,
        // **Where the Scribe is, in colour.** The theme decides charcoal or
        // vellum; the place decides which way its stone leans. `world.sefirah`
        // was already on the world and the renderer never asked.
        here.current,
        view.current.w,
        view.current.h,
        verbs as readonly string[],
      );
      if (import.meta.env.DEV) recordFrame(performance.now() - drawnAt);

      if (now - sampleAt > 100) {
        sampleAt = now;
        callbacks.current.onSample({
          or: world.or,
          message: world.message?.text,
          veiled: world.player.veiled > 0,
          lamps: world.player.lamps,
          out: Boolean(world.out),
          x: world.player.x,
          onGround: world.player.onGround,
          used: [...used.current],
          orGathered: world.orGathered,
          veilings: world.veilings,
          marksSet: world.marksSet,
        });
        used.current.clear();
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
    // A new rung arrives already framed on the room the Scribe stands in —
    // `trackCamera` cuts on the first tick because the remembered room is
    // undefined, so there is nothing to sweep from.
    camera.current = { x: 0, y: 0, room: undefined };
  }, [world]);

  const pad = (id: ControlId) => {
    const control = controlById[id];
    return (
      <button
        key={id}
        type="button"
        className={`${styles.padKey} ${styles[`pad_${id}`] ?? ""}`}
        aria-label={control.name}
        title={control.does}
        onPointerDown={(e) => {
          e.preventDefault();
          /**
           * **Let go of the pointer, so a thumb can slide.**
           *
           * A touch pointer is *implicitly captured* by the element it starts
           * on, which means a thumb dragged from Left onto Right keeps firing
           * at Left and the Scribe walks the wrong way — the pad behaves as
           * seven separate buttons rather than one surface, and moving from
           * walking to leaping means lifting off and landing again. Releasing
           * the capture hands the events back to whatever is actually under
           * the thumb, and `onPointerEnter` below picks them up.
           */
          // Guarded, not optional-chained: the method exists everywhere and
          // *throws* when there is no active pointer with that id — which a
          // synthetic event does, and which surfaced immediately as a page
          // error the first time this was driven from a test.
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // Nothing was captured. Sliding already works.
          }
          touch(id, true);
        }}
        // Slid onto, with the thumb still down. `buttons` is 1 for a touch
        // that is in contact and 0 for a pointer merely passing over, so a
        // mouse hovering the pad presses nothing.
        onPointerEnter={(e) => {
          if (e.buttons !== 0) touch(id, true);
        }}
        onPointerUp={() => touch(id, false)}
        onPointerLeave={() => touch(id, false)}
        onPointerCancel={() => touch(id, false)}
      >
        {control.pad}
      </button>
    );
  };

  return (
    <div className={styles.stage}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="The Ascent of the Tree" />
      {/* Every control gets a button — see `PAD_LAYOUT`. The pad is generated
          rather than written out, which is what keeps a thumb able to reach
          everything a keyboard can. */}
      <div className={styles.pad} aria-hidden={false}>
        {PAD_LAYOUT.map(({ cluster, ids }) => (
          <div key={cluster} className={`${styles.padCluster} ${styles[cluster]}`}>
            {ids.map(pad)}
          </div>
        ))}
      </div>
    </div>
  );
}
