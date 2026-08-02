import { describe, expect, it } from "vitest";
import { CONTROLS } from "./controls";
import { allLearned, ALL_LESSON_KEYS, LESSONS, nextLesson, retire } from "./tutorial";

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
