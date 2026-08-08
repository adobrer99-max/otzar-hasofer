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
 * there are six lessons here, not twenty-two.
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
    // "The keys, below" named a toolbar under the canvas that was taken out
    // when the game stopped being a page. The reference outlived the thing,
    // which is this codebase's own oldest failure — a line claiming what the
    // code no longer does. It is Esc now, and Esc is named in the corner.
    text: "That is the whole of it. The rest is letters — press Esc for the ways of the body whenever you want the scheme again.",
    retiredBy: [],
    retiredAtLetters: 1,
  },
];

export const ALL_LESSON_KEYS: LessonKey[] = LESSONS.map((l) => l.key);

// --- the Tree ---------------------------------------------------------------

/**
 * **The lessons of the map, which is a second game with nothing taught in it.**
 *
 * The porch teaches the body: which key walks, which key writes. Then the Tree
 * rises, and everything a Scribe does *between* rungs — choosing a way, paying
 * for a Sefirah, deciding to face what holds one — was learned by clicking
 * things to find out. The one line at the foot of the overlay said "Choose a
 * way out", which is the first of the three and never the other two: nothing
 * anywhere said that light poured into a Sefirah is the climb, or that the
 * reason there is no Kindle button is that something is holding the place.
 *
 * These are **not a sequence**, and that is the difference from the lessons
 * above. A porch lesson waits its turn because the hands learn in an order. A
 * Tree lesson answers the question the map is putting in front of you right
 * now: standing on a held Sefirah, the guardian is the lesson; standing on a
 * freed and unlit one with light in hand, kindling is. So this is a *choice*
 * over the state rather than a queue, and each is retired by doing the thing
 * once — never by a timer, and never twice.
 */
export type TreeLessonKey = "way" | "guardian" | "kindle";

/** What retires a Tree lesson: the deed itself, done once. */
export type TreeDeed = TreeLessonKey;

export interface TreeLesson {
  key: TreeLessonKey;
  text: string;
}

export const TREE_LESSONS: Record<TreeLessonKey, TreeLesson> = {
  way: {
    key: "way",
    text: "This is the Tree, and you are on it. Every line out of where you stand is a way you can walk, and the letter on it is what that way pays. Choose one.",
    // Tab is named at the foot of the overlay already, so it is not repeated.
  },
  guardian: {
    key: "guardian",
    text: "Something is holding this Sefirah, which is why there is nothing here to kindle. Face it, and the place is yours to light — in this climb and in every one after it.",
  },
  kindle: {
    key: "kindle",
    text: "Light is not a score. Pour it into the Sefirah you are standing on and it stays burning even if you go out — and ten kindled is the whole of the climb.",
  },
};

export const ALL_TREE_LESSON_KEYS: TreeLessonKey[] = Object.keys(TREE_LESSONS) as TreeLessonKey[];

export interface TreeState {
  learned: readonly TreeLessonKey[];
  /** How many paths this Scribe has walked — zero means they have never left. */
  walked: number;
  /** Whether what holds the Sefirah underfoot has been broken. */
  freed: boolean;
  /** Whether the Sefirah underfoot is already burning. */
  lit: boolean;
}

/**
 * The line the map should be saying, or nothing at all. Pure over the state,
 * so the same standing always teaches the same thing.
 */
export function treeLesson(state: TreeState): TreeLesson | undefined {
  const wants = (key: TreeLessonKey) => !state.learned.includes(key);
  /**
   * Walking counts as learning it, whatever the drawer says. A record can
   * arrive with paths behind it and nothing taught — the dev warp writes
   * exactly that, and so does a Scribe who cleared their storage mid-climb —
   * and telling somebody eight rungs up to choose a way is the kind of
   * teaching that reads as a bug.
   */
  const knowsWays = state.learned.includes("way") || state.walked > 0;
  // First, and only ever first: a Scribe who has never left does not yet have
  // a question about kindling.
  if (!knowsWays) return TREE_LESSONS.way;
  if (!state.freed && wants("guardian")) return TREE_LESSONS.guardian;
  if (state.freed && !state.lit && wants("kindle")) return TREE_LESSONS.kindle;
  return undefined;
}

/** What is learned once a deed is done. Idempotent, and it never un-learns. */
export function retireTree(
  learned: readonly TreeLessonKey[],
  deed: TreeDeed,
): TreeLessonKey[] {
  return learned.includes(deed) ? [...learned] : [...learned, deed];
}

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
    localStorage.removeItem(TOLD_KEY);
    localStorage.removeItem(TREE_KEY);
    localStorage.removeItem(SEEN_KEY);
  } catch {
    // Nothing to undo.
  }
}

/**
 * The Tree's own lessons, kept apart from the porch's.
 *
 * A separate entry rather than more keys in the same array, because
 * `allLearned` means "this Scribe knows the controls" and is read by the
 * threshold and by the rung generator — folding the map's lessons into it
 * would make a Scribe who has walked the porch but never seen the Tree count
 * as untaught ground, and quietly change what the generator lays.
 */
const TREE_KEY = "otzar-game-taught-tree";

export function readTaughtTree(): TreeLessonKey[] {
  try {
    const raw = localStorage.getItem(TREE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is TreeLessonKey =>
      ALL_TREE_LESSON_KEYS.includes(k as TreeLessonKey),
    );
  } catch {
    return [];
  }
}

export function writeTaughtTree(learned: readonly TreeLessonKey[]): void {
  try {
    localStorage.setItem(TREE_KEY, JSON.stringify(learned));
  } catch {
    // Taught again next time. No worse.
  }
}

// --- the telling ------------------------------------------------------------

/**
 * **Whether this Scribe has been told why they are climbing.**
 *
 * Separate from the lessons above, and deliberately so. A lesson is about the
 * hands and is retired by using the key; the prologue is about the *reason*,
 * and nothing a player presses can retire it — it is either said or it is not.
 * It lived for the game's whole life in a collapsed `<details>` behind a menu,
 * under a comment on the threshold promising it was "the first thing the game
 * says once they press the button", which it never was.
 *
 * It rides in the same drawer as the lessons because it answers the same
 * question — what does this person already know — and because `forgetTaught`
 * has to clear both or asking for the tutorial again would replay the hands
 * and skip the reason.
 */
const TOLD_KEY = "otzar-game-told";

export function readTold(): boolean {
  try {
    return localStorage.getItem(TOLD_KEY) === "1";
  } catch {
    // Storage denied means the prologue plays every time. Better than a
    // stranger who is never told what they are doing.
    return false;
  }
}

export function writeTold(): void {
  try {
    localStorage.setItem(TOLD_KEY, "1");
  } catch {
    // No worse than being told twice.
  }
}

/**
 * **The places already seen**, which is the third thing in this drawer and
 * belongs here for the reason the prologue does: it answers *what does this
 * person already know*, and `forgetTaught` has to clear it or asking for the
 * teaching again would replay the lessons and skip the ten sights.
 *
 * **Once ever, and not once a climb.** A place is new once. The arrival plate
 * has printed each Sefirah's `teaching` on every single walk into it since the
 * Tree shipped — the tenth arrival at Yesod says exactly what the first did —
 * and a scene repeated that way would be a loading screen rather than a first
 * sight.
 *
 * `localStorage` rather than a fold over sealed records, and the distinction is
 * real: `book.ts` folds facts about the *climbs*, and this is a fact about the
 * *reader*. It is the same drawer, the same shape and the same failure mode as
 * `readTold` — storage denied means a scene plays again, which is a picture
 * seen twice and not a lost one.
 */
const SEEN_KEY = "otzar-game-seen";

export function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function writeSeen(places: readonly string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set(places)]));
  } catch {
    // No worse than being shown a place twice.
  }
}
