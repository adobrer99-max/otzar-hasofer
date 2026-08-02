import type { ControlId } from "./controls";

/**
 * The teaching, as data.
 *
 * A game whose entire instruction was one line under the canvas — a line that
 * never mentioned Up or Down and never named what the act key did — needs
 * teaching in the place teaching actually works: in front of the thing being
 * taught, while the hands are on the keys. This module decides *what to say
 * next*, and nothing else. It touches no DOM, no storage, no clock; given the
 * same state it always returns the same lesson, which is what lets the whole
 * thing be tested rather than eyeballed.
 *
 * The rule that makes it bearable rather than nagging: **a lesson is retired
 * the moment its key is used, not on a timer.** The game stops telling you to
 * press something you have already pressed, and it never tells you twice.
 *
 * Only the porch is scripted. Every other control belongs to a letter, and a
 * letter teaches itself the moment it is found — `abilities.ts` now carries a
 * `press` line for all twenty-two, and the acquisition plate prints it. So
 * there are five lessons here, not twenty-two.
 */

export type LessonKey = "move" | "leap" | "lower" | "write" | "act" | "ways";

export interface Lesson {
  key: LessonKey;
  /**
   * The line to show. `{left}`, `{jump}` and the rest are control ids, filled
   * in at render with the key *and* the pad glyph — so the same lesson reads
   * correctly at a desk and on a phone, where "press Space" would be a lie.
   */
  text: string;
  /** Using any of these keys retires the lesson. */
  retiredBy: ControlId[];
  /** Or holding this many letters does — for the lessons no key answers. */
  retiredAtLetters?: number;
}

/**
 * In order. Each waits for the one before it to be retired, so a Scribe is
 * never handed two instructions at once — and the order matches the porch:
 * flat ground, then a step, then a gap.
 */
export const LESSONS: Lesson[] = [
  {
    key: "move",
    text: "Walk with {left} and {right}. The way up the Tree is to the right.",
    retiredBy: ["left", "right"],
  },
  {
    key: "leap",
    text: "Press {jump} to leap, and hold it to rise higher. {up} leaps too.",
    retiredBy: ["jump", "up"],
  },
  {
    key: "lower",
    text: "{down} takes you down: through a ledge you are standing on, and — once you carry the letters for it — down a vine, into deep water, or folded small into a low passage.",
    retiredBy: ["down"],
  },
  {
    key: "write",
    text: "{strike} writes. The mark flies the way you are facing — hold {up} or {down} to angle it — and it is what breaks a husk. You are a scribe; this is the only weapon you were ever given.",
    retiredBy: ["strike"],
  },
  {
    key: "act",
    text: "{act} is the one key that changes. It does nothing yet: every letter you find gives it something more to do.",
    retiredBy: ["act"],
  },
  {
    key: "ways",
    text: "That is the whole of it. The rest is letters — open The keys, below, whenever you want the scheme again.",
    retiredBy: [],
    retiredAtLetters: 1,
  },
];

export const ALL_LESSON_KEYS: LessonKey[] = LESSONS.map((l) => l.key);

export interface TeachingState {
  learned: readonly LessonKey[];
  /** How many letters the Scribe holds — what retires the wordless lessons. */
  lettersHeld: number;
}

/** The line to show now, or nothing at all once the porch is behind them. */
export function nextLesson(state: TeachingState): Lesson | undefined {
  return LESSONS.find((l) => !state.learned.includes(l.key));
}

/**
 * What is learned after a sample. Lessons only retire in order, so pressing
 * every key at once on the first screen does not skip the sequence — it walks
 * through it, which is the honest reading of "you already know this".
 */
export function retire(
  state: TeachingState,
  used: readonly ControlId[],
): LessonKey[] {
  const learned = [...state.learned];
  for (;;) {
    const lesson = LESSONS.find((l) => !learned.includes(l.key));
    if (!lesson) return learned;
    const byKey = lesson.retiredBy.some((c) => used.includes(c));
    const byLetters =
      lesson.retiredAtLetters !== undefined && state.lettersHeld >= lesson.retiredAtLetters;
    if (!byKey && !byLetters) return learned;
    learned.push(lesson.key);
  }
}

export function allLearned(learned: readonly LessonKey[]): boolean {
  return ALL_LESSON_KEYS.every((k) => learned.includes(k));
}

// --- the preference ---------------------------------------------------------

/**
 * What a Scribe has already been taught, per Scribe rather than per ascent —
 * so `localStorage`, the same shape as the sound preference and `theme.ts`,
 * and wrapped because a locked-down browser must not take the game down with
 * it. A tutorial that cannot be asked for again is a bug, so `forget` is part
 * of the interface rather than a debugging aid.
 */
const STORAGE_KEY = "otzar-game-taught";

export function readTaught(): LessonKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is LessonKey => ALL_LESSON_KEYS.includes(k as LessonKey));
  } catch {
    return [];
  }
}

export function writeTaught(learned: readonly LessonKey[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learned));
  } catch {
    // A Scribe with storage denied simply gets taught again. No worse.
  }
}

export function forgetTaught(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to undo.
  }
}
