import { describe, expect, it } from "vitest";
import { lettersOnEntering, TOTAL_REGIONS } from "./regions";
import { makeRng } from "./rng";
import {
  chooseTarget,
  clueFrom,
  hintsFor,
  HINT_COST,
  HINT_LOW,
  judge,
  lightFor,
  opens,
  solvableRoots,
  toTarget,
} from "./wordGate";
import { lettersById } from "../data/letters";

/**
 * The Word-Gate's one load-bearing claim is that a gate is never placed
 * unless the Scribe can already spell its answer. These check that claim
 * against the real lexicon rather than trusting it.
 */
describe("the Word-Gate's targets", () => {
  it("reports how many roots each region can spell on arrival", () => {
    const report = Array.from({ length: TOTAL_REGIONS }, (_, i) => {
      const region = i + 1;
      const held = lettersOnEntering(region);
      return `region ${region}: ${held.length} letters → ${solvableRoots(lettersOnEntering(region)).length} roots`;
    });
    console.log(report.join("\n"));
    expect(report.length).toBe(TOTAL_REGIONS);
  });

  it("only ever names a root the Scribe already holds every letter of", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const held = new Set(lettersOnEntering(region));
      for (const entry of solvableRoots(lettersOnEntering(region))) {
        for (const letter of entry.letters) {
          expect(held.has(letter), `region ${region}: ${entry.transliteration} needs ${letter}`).toBe(true);
        }
      }
    }
  });

  it("never names a proper noun, and never a root with a repeated radical", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const entry of solvableRoots(lettersOnEntering(region))) {
        expect(entry.kind).toBe("root");
        const [a, b, c] = entry.letters;
        expect(a === b || b === c || a === c).toBe(false);
      }
    }
  });

  it("gives every target a short, non-empty clue", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const entry of solvableRoots(lettersOnEntering(region)).slice(0, 40)) {
        const target = toTarget(entry);
        expect(target.clue.length).toBeGreaterThan(2);
        expect(target.clue.length).toBeLessThanOrEqual(64);
        expect(target.hebrew.length).toBeGreaterThan(0);
      }
    }
  });

  it("picks deterministically from a seed", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const a = chooseTarget(lettersOnEntering(region), makeRng(4242));
      const b = chooseTarget(lettersOnEntering(region), makeRng(4242));
      expect(a?.letterIds).toEqual(b?.letterIds);
    }
  });
});

describe("trimming a lexicon gloss into a clue", () => {
  it("drops the lexicographer's throat-clearing and keeps the sense", () => {
    expect(clueFrom("properly, to wander away, i.e. lose oneself; by implication to perish"))
      .toBe("to wander away");
    expect(clueFrom("to bind")).toBe("to bind");
    expect(clueFrom("a house; by extension a family")).toBe("a house");
  });

  it("drops the lexicographer's parentheticals rather than cutting mid-word", () => {
    // Seen in the browser truncated to "...(especially to disp".
    expect(clueFrom("to dash in pieces, literally or figuratively (especially to disperse)"))
      .toBe("to dash in pieces");
  });

  it("never returns something too long, and never cuts a word in half", () => {
    const long = "a very long and thoroughly unpunctuated gloss about many things ".repeat(6);
    const clue = clueFrom(long);
    expect(clue.length).toBeLessThanOrEqual(64);
    // A clue that ends mid-word is a bug; the source has no word this long.
    expect(clue.endsWith(" ")).toBe(false);
    expect(long.startsWith(clue)).toBe(true);
    expect(long[clue.length] === " " || clue.length === long.length).toBe(true);
  });

  it("leaves no clue in the whole lexicon ending mid-word", () => {
    for (let region = 3; region <= TOTAL_REGIONS; region += 1) {
      for (const entry of solvableRoots(lettersOnEntering(region))) {
        const clue = clueFrom(entry.gloss);
        const rest = entry.gloss.slice(clue.length);
        // Either the clue consumed the gloss, or it stopped at a boundary.
        const cleanBreak = rest === "" || /^[\s,;:.()]/.test(rest) || clue.length < entry.gloss.length;
        expect(cleanBreak, `${entry.transliteration}: "${clue}"`).toBe(true);
        expect(clue.trim()).toBe(clue);
      }
    }
  });
});

describe("judging an inscription", () => {
  it("knows the root it asked for", () => {
    const target = toTarget(solvableRoots(lettersOnEntering(4))[0]);
    const verdict = judge(target.letterIds, target);
    expect(verdict.kind).toBe("target");
    expect(opens(verdict)).toBe(true);
    expect(lightFor(verdict)).toBeGreaterThan(0);
  });

  it("still opens for a different real word, for less light", () => {
    const pool = solvableRoots(lettersOnEntering(6));
    const target = toTarget(pool[0]);
    const other = pool.find((e) => e.letters.join("-") !== target.letterIds.join("-"));
    expect(other).toBeDefined();
    if (!other) return;
    const verdict = judge(other.letters, target);
    expect(verdict.kind).toBe("other-root");
    expect(opens(verdict)).toBe(true);
    expect(lightFor(verdict)).toBeLessThan(lightFor(judge(target.letterIds, target)));
  });

  it("costs nothing when the root is hidden", () => {
    const target = toTarget(solvableRoots(lettersOnEntering(4))[0]);
    // A triple chosen to be nobody's root.
    const verdict = judge(["tzadi", "tzadi", "tzadi"], target);
    expect(opens(verdict)).toBe(false);
    expect(lightFor(verdict)).toBe(0);
  });
});

/**
 * **The ladder — the gate opened to someone who reads no Hebrew.**
 *
 * The gate asks for a three-letter Semitic root and offers three empty
 * sockets and twenty-two shapes. To a reader that is a puzzle; to everyone
 * else it is a lock with no key, and on an Abyss crossing there is no walking
 * away from it, because there the gate *is* the way out. These hold the three
 * properties that make the ladder a teaching rather than a cheat: it always
 * ends at the answer, it always costs something, and what it costs is never
 * anything but the root's own light.
 */
describe("the hint ladder", () => {
  const name = (id: string) => lettersById[id]?.name ?? id;
  const someTarget = () => toTarget(solvableRoots(lettersOnEntering(6))[0]);

  it("always ends at the word itself, whatever the root", () => {
    // Every gate the game can build, not one of them: a ladder that stopped
    // short on some root would strand exactly the climb that needed it.
    for (let region = 3; region <= TOTAL_REGIONS; region += 1) {
      for (const entry of solvableRoots(lettersOnEntering(region)).slice(0, 40)) {
        const target = toTarget(entry);
        const ladder = hintsFor(target, name);
        expect(ladder.length, `${target.transliteration} has no ladder`).toBeGreaterThanOrEqual(2);
        const last = ladder[ladder.length - 1];
        expect(last.answer, `${target.transliteration} never gives its answer`).toEqual(
          target.letterIds,
        );
        // Numbered in order from one, so the plate can count what was asked.
        expect(ladder.map((h) => h.rung)).toEqual(ladder.map((_, i) => i + 1));
        // And no rung is blank — a hint that says nothing is worse than none.
        for (const hint of ladder) expect(hint.text.length).toBeGreaterThan(3);
      }
    }
  });

  it("names the first letter before it names all three", () => {
    const target = someTarget();
    const ladder = hintsFor(target, name);
    const first = ladder.findIndex((h) => h.text.includes(name(target.letterIds[0])));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(ladder.length - 1);
  });

  it("charges each rung against the root, down to a floor that is still worth having", () => {
    const target = someTarget();
    const cold = lightFor(judge(target.letterIds, target));
    expect(lightFor(judge(target.letterIds, target), 1)).toBe(cold - HINT_COST);
    expect(lightFor(judge(target.letterIds, target), 99)).toBe(HINT_LOW);
    expect(HINT_LOW).toBeGreaterThan(0);
  });

  /**
   * The promise the plate makes in its own words — *"nothing is lost by being
   * wrong"* — and asking is not even wrong. A hint may only ever reduce what
   * the *named* root pays: a wrong-but-true word and a hidden root are what
   * they always were, because the ladder points at the target and cannot have
   * been what found something else.
   */
  it("never touches anything but the light the named root pays", () => {
    const target = someTarget();
    const other = solvableRoots(lettersOnEntering(6)).find(
      (e) => e.letters.join("-") !== target.letterIds.join("-"),
    )!;
    for (const hints of [0, 1, 2, 3, 9]) {
      expect(lightFor(judge(other.letters, target), hints)).toBe(
        lightFor(judge(other.letters, target)),
      );
      expect(lightFor(judge(["tzadi", "tzadi", "tzadi"], target), hints)).toBe(0);
    }
  });
});
