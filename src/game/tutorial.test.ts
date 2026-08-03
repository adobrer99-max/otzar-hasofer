import { afterEach, describe, expect, it } from "vitest";
import { CONTROLS } from "./controls";
import {
  allLearned,
  ALL_LESSON_KEYS,
  forgetTaught,
  LESSONS,
  nextLesson,
  readTaught,
  readTaughtTree,
  readTold,
  retire,
  retireTree,
  treeLesson,
  TREE_LESSONS,
  ALL_TREE_LESSON_KEYS,
  writeTaughtTree,
  writeTold,
} from "./tutorial";

const nothing = { learned: [], lettersHeld: 0 } as const;

describe("the opening lessons", () => {
  it("starts by teaching the walk", () => {
    expect(nextLesson(nothing)?.key).toBe("move");
  });

  it("says one thing at a time, in order", () => {
    let learned = [...nothing.learned] as string[];
    const seen: string[] = [];
    for (const lesson of LESSONS) {
      const now = nextLesson({ learned: learned as never, lettersHeld: 1 });
      expect(now?.key).toBe(lesson.key);
      seen.push(lesson.key);
      learned = [...learned, lesson.key];
    }
    expect(seen).toEqual(ALL_LESSON_KEYS);
  });

  it("falls silent once everything has been taught", () => {
    expect(nextLesson({ learned: ALL_LESSON_KEYS, lettersHeld: 3 })).toBeUndefined();
    expect(allLearned(ALL_LESSON_KEYS)).toBe(true);
  });

  it("retires a lesson the moment its key is used", () => {
    const after = retire(nothing, ["right"]);
    expect(after).toEqual(["move"]);
    expect(nextLesson({ learned: after, lettersHeld: 0 })?.key).toBe("leap");
  });

  it("never resurrects a lesson once retired", () => {
    let learned = retire(nothing, ["left"]);
    learned = retire({ learned, lettersHeld: 0 }, ["act"]);
    // "act" does not retire "leap", so the sequence must stall there rather
    // than skipping ahead — and "move" must stay retired.
    expect(learned).toEqual(["move"]);
    learned = retire({ learned, lettersHeld: 0 }, ["jump"]);
    expect(learned).toEqual(["move", "leap"]);
  });

  it("walks the sequence when several keys arrive together", () => {
    // A Scribe who already knows how to play presses everything at once. That
    // is not a reason to keep coaching them.
    const learned = retire(nothing, ["left", "jump", "down", "strike", "act"]);
    expect(learned).toEqual(["move", "leap", "lower", "write", "act"]);
  });

  it("retires the wordless last lesson when a letter is found", () => {
    const learned = retire(
      { learned: ["move", "leap", "lower", "write", "act"], lettersHeld: 1 },
      [],
    );
    expect(allLearned(learned)).toBe(true);
  });

  it("is deterministic", () => {
    const a = retire(nothing, ["right"]);
    const b = retire(nothing, ["right"]);
    expect(a).toEqual(b);
    expect(nextLesson(nothing)).toBe(nextLesson(nothing));
  });

  it("names only real controls, in its text and in what retires it", () => {
    const ids = new Set<string>(CONTROLS.map((c) => c.id));
    for (const lesson of LESSONS) {
      for (const [, token] of lesson.text.matchAll(/\{([a-z]+)\}/g)) {
        expect(ids.has(token), `${lesson.key} names unknown key "${token}"`).toBe(true);
      }
      for (const control of lesson.retiredBy) {
        expect(ids.has(control), `${lesson.key} waits on unknown control "${control}"`).toBe(true);
      }
      // Every lesson must have some way of ending, or it would nag forever.
      const canEnd = lesson.retiredBy.length > 0 || lesson.retiredAtLetters !== undefined;
      expect(canEnd, `${lesson.key} can never be retired`).toBe(true);
    }
  });
});

/**
 * **The telling, which is not a lesson.**
 *
 * The prologue is the one first-run thing no keypress retires, so it needs a
 * flag of its own — and the flag has to survive a browser that refuses
 * storage, because a game that throws on `localStorage` in private mode is a
 * game that does not start. The suite runs under node with no `localStorage`
 * at all, which is exactly that case; the shim below is how the other half is
 * reached.
 */
describe("whether the Scribe has been told why they are climbing", () => {
  const install = () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    return store;
  };

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("says no before anything has been written", () => {
    install();
    expect(readTold()).toBe(false);
  });

  it("remembers the telling once", () => {
    install();
    writeTold();
    expect(readTold()).toBe(true);
  });

  it("is forgotten alongside the lessons, or asking for the tutorial again would skip it", () => {
    install();
    writeTold();
    forgetTaught();
    expect(readTold()).toBe(false);
  });

  /**
   * The guarantee that matters more than remembering: **a denied store must
   * never take the game down.** With no `localStorage` on the global at all,
   * reading is false — the prologue plays, which is the safe side of the
   * failure — and writing is silent.
   */
  it("survives a browser with no storage at all", () => {
    expect(readTold()).toBe(false);
    expect(() => writeTold()).not.toThrow();
    expect(() => forgetTaught()).not.toThrow();
  });
});

/**
 * **The Tree's own three.** The porch taught the body and then the map rose
 * with one line under it — "Choose a way out" — which is the first of three
 * things a Scribe has to learn on that surface and never the other two.
 *
 * These lessons are a *choice over the state* rather than a queue, which is
 * the whole difference from the porch's: the map answers the question it is
 * putting in front of you now. So what is tested is the choosing.
 */
describe("what the Tree teaches, and when", () => {
  const standing = (over: Partial<Parameters<typeof treeLesson>[0]> = {}) => ({
    learned: [] as never[],
    walked: 0,
    freed: false,
    lit: false,
    ...over,
  });

  it("starts with the ways, because a Scribe who has never left has no other question", () => {
    // Even standing on a held Sefirah, which is otherwise the guardian's case.
    expect(treeLesson(standing())?.key).toBe("way");
  });

  it("names what holds the place once the Scribe has walked somewhere", () => {
    expect(treeLesson(standing({ walked: 2 }))?.key).toBe("guardian");
  });

  it("teaches kindling on ground that is freed and dark, and nowhere else", () => {
    expect(treeLesson(standing({ walked: 2, freed: true }))?.key).toBe("kindle");
    // Already burning: there is nothing here to say.
    expect(treeLesson(standing({ walked: 2, freed: true, lit: true }))).toBeUndefined();
  });

  /**
   * Walking counts as having learned to choose, whatever the drawer says: the
   * dev warp writes a record with paths behind it and nothing taught, and so
   * does clearing storage mid-climb. Telling somebody eight rungs up to choose
   * a way reads as a bug, not a lesson.
   */
  it("takes a walked path as proof the ways are understood", () => {
    expect(treeLesson(standing({ walked: 3, freed: true, lit: true }))).toBeUndefined();
    expect(treeLesson(standing({ walked: 0, freed: true, lit: true }))?.key).toBe("way");
  });

  it("falls silent once all three deeds are done", () => {
    const learned = ALL_TREE_LESSON_KEYS;
    for (const walked of [0, 5]) {
      for (const freed of [true, false]) {
        for (const lit of [true, false]) {
          expect(treeLesson({ learned, walked, freed, lit })).toBeUndefined();
        }
      }
    }
  });

  /**
   * A lesson is retired by *doing the thing*, once, and never comes back —
   * the same rule the porch's lessons keep, enforced against a different
   * mechanism. Nothing here is on a timer.
   */
  it("retires a lesson on the deed, and never twice", () => {
    let learned = retireTree([], "kindle");
    expect(learned).toEqual(["kindle"]);
    learned = retireTree(learned, "kindle");
    expect(learned).toEqual(["kindle"]);
    expect(treeLesson({ learned, walked: 2, freed: true, lit: false })).toBeUndefined();
    // And retiring one does not retire another.
    expect(treeLesson({ learned, walked: 2, freed: false, lit: false })?.key).toBe("guardian");
  });

  it("says something worth reading in every one of them", () => {
    for (const key of ALL_TREE_LESSON_KEYS) {
      const lesson = TREE_LESSONS[key];
      expect(lesson.key).toBe(key);
      expect(lesson.text.length).toBeGreaterThan(40);
    }
  });

  it("is kept apart from the porch's lessons, so neither can be mistaken for the other", () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    try {
      writeTaughtTree(["way"]);
      expect(readTaughtTree()).toEqual(["way"]);
      // The porch's drawer is untouched by the map's, and `allLearned` — which
      // the threshold and the rung generator both read — must not move.
      expect(readTaught()).toEqual([]);
      expect(allLearned(readTaught())).toBe(false);
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});
