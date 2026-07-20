/**
 * Sound + haptics for the ceremonial deal — a soft tick as each card flips,
 * muted by default. The tick is synthesized (one oscillator burst), so no
 * audio assets and nothing the CSP has to admit; haptics are a short
 * `navigator.vibrate` where the device offers it. The preference persists in
 * localStorage (the theme.ts pattern) and the AudioContext is only ever
 * created/resumed from a user gesture (the speaker toggle), satisfying
 * autoplay policies.
 */

const PREF_KEY = "otzar-deal-sound";

export function isDealSoundOn(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

export function setDealSoundOn(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // private mode — the toggle still works for this page view
  }
}

let ctx: AudioContext | undefined;

/** Create/resume the shared AudioContext. Call from a user gesture. */
export function ensureAudio(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // no audio available — haptics may still fire
  }
}

/** One soft tick: a ~60 ms triangle burst, plus a short vibration. */
export function playDealTick(): void {
  try {
    if (ctx && ctx.state === "running") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 880;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  } catch {
    // audio failed — fall through to haptics
  }
  try {
    navigator.vibrate?.(12);
  } catch {
    // no haptics — fine
  }
}

/**
 * Schedule one tick per card at the moment its CSS flip crosses the midpoint
 * (i·stagger + flip/2). Returns a cancel function clearing all timers.
 */
export function scheduleDealFeedback(cardCount: number, staggerMs: number, flipMs: number): () => void {
  const timers: number[] = [];
  for (let i = 0; i < cardCount; i++) {
    timers.push(window.setTimeout(playDealTick, i * staggerMs + flipMs / 2));
  }
  return () => {
    for (const t of timers) window.clearTimeout(t);
  };
}
