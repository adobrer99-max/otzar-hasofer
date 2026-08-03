import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SefirahId } from "../../types/letter";
import * as fx from "./effects";
import {
  ensureGameAudio,
  isGameSoundAnswered,
  isGameSoundOn,
  setGameSoundOn,
  setDrone,
  setLevel,
  startNigun,
  stopGameAudio,
  stopNigun,
} from "./engine";
import { scoreFor, type Score } from "./score";
import type { World } from "../world/types";

/**
 * Wires the score and the effects to the game.
 *
 * Two different clocks are at work and it matters which is used for what.
 * The HUD sample (`onSample`) arrives about ten times a second — fast enough
 * for ducking and for noticing gathered light, far too slow for a footfall.
 * So this hook holds the world by reference and watches it on its own frame
 * loop for the body's own sounds, and takes the rest from the callbacks
 * `GamePage` already raises.
 *
 * It also owns the preference. **Sound is off until asked for**, and the
 * `AudioContext` is constructed inside the toggle's click and nowhere else —
 * which is what autoplay policy requires and what keeps the page genuinely
 * silent on load rather than silent-but-running.
 */
export interface GameAudio {
  on: boolean;
  toggle: () => void;
  /**
   * Whether this Scribe has ever said either way. The score is the least
   * discoverable thing in the game — a checkbox inside a menu most players
   * never open — so the threshold offers it once to whoever has not answered.
   */
  answered: boolean;
  /** The score currently sounding, for the sound panel. */
  score: Score | undefined;
  onLetter: (letterId: string) => void;
  onFragment: () => void;
  onScrollWhole: () => void;
  onGateOpened: () => void;
  onArrival: () => void;
}

export function useGameAudio(
  worldRef: { current: World | null },
  sefirah: SefirahId | undefined,
  lettersHeld: readonly string[],
  festivalIds: readonly string[] | undefined,
  illumined: boolean,
): GameAudio {
  const [on, setOn] = useState(false);
  const [answered, setAnswered] = useState(() => isGameSoundAnswered());
  const [veiled, setVeiled] = useState(false);

  // The score is pure and cheap, so it is simply recomputed whenever the
  // climb changes — no caching, nothing to invalidate.
  const score = useMemo(
    () =>
      sefirah
        ? scoreFor({ sefirah, lettersHeld, festivalIds, veiled, illumined })
        : undefined,
    [sefirah, lettersHeld, festivalIds, veiled, illumined],
  );

  const scoreRef = useRef<Score | undefined>(undefined);
  scoreRef.current = score;

  const toggle = useCallback(() => {
    setAnswered(true);
    setOn((prev) => {
      const next = !prev;
      setGameSoundOn(next);
      if (next) {
        // Inside the click — the only place a context may be born.
        if (!ensureGameAudio()) return false;
      } else {
        stopNigun();
        stopGameAudio();
      }
      return next;
    });
  }, []);

  // Restore the stored preference as a *label* only. The sound stays off
  // until the Scribe presses the toggle, because a context created outside a
  // gesture would be suspended anyway.
  useEffect(() => {
    if (isGameSoundOn()) setGameSoundOn(true);
  }, []);

  // The nigun runs for as long as the sound is on, always reading the latest
  // score rather than the one it started with.
  useEffect(() => {
    if (!on) return;
    startNigun(() => scoreRef.current);
    return () => stopNigun();
  }, [on]);

  useEffect(() => {
    if (!on || !score) return;
    setDrone(score.droneHz);
    setLevel(score.level);
  }, [on, score]);

  // --- the body's own sounds, on their own loop ---------------------------
  useEffect(() => {
    if (!on) return;
    let frame = 0;
    let wasOnGround = true;
    let wasVeiled = false;
    let lastOr = worldRef.current?.or ?? 0;
    let lastFootfallAt = 0;
    let hadAirJump = false;

    const watch = () => {
      frame = requestAnimationFrame(watch);
      const world = worldRef.current;
      const current = scoreRef.current;
      if (!world || !current) return;
      const p = world.player;

      // Veiling — lift it to React so the score can duck, and sound it once.
      if (p.veiled > 0 !== wasVeiled) {
        wasVeiled = p.veiled > 0;
        setVeiled(wasVeiled);
        if (wasVeiled) fx.veiling(current);
      }

      // Footfall: only while actually walking, and rate-limited so a fast
      // run does not turn into a machine gun.
      const walking = p.onGround && Math.abs(p.vx) > 40;
      const t = performance.now();
      if (walking && t - lastFootfallAt > 260) {
        lastFootfallAt = t;
        fx.footfall(current);
      }

      // A leap — the rising edge of leaving the ground, and the second jump
      // spent in the air.
      if (wasOnGround && !p.onGround && p.vy < 0) fx.leap(current, false);
      if (hadAirJump && !p.airJump && !p.onGround) fx.leap(current, true);
      wasOnGround = p.onGround;
      hadAirJump = p.airJump;

      // Light gathered.
      if (world.or > lastOr) fx.mote(current);
      lastOr = world.or;
    };

    frame = requestAnimationFrame(watch);
    return () => cancelAnimationFrame(frame);
  }, [on, worldRef]);

  const guard = useCallback(
    (play: (score: Score) => void) => () => {
      const current = scoreRef.current;
      if (on && current) play(current);
    },
    [on],
  );

  return {
    on,
    toggle,
    answered,
    score,
    onLetter: useCallback(
      (letterId: string) => {
        const current = scoreRef.current;
        if (on && current) fx.letterFound(current, letterId);
      },
      [on],
    ),
    onFragment: useCallback(() => {
      if (on) fx.fragment();
    }, [on]),
    onScrollWhole: guard(fx.cadence),
    onGateOpened: guard(fx.cadence),
    onArrival: guard(fx.arrival),
  };
}
