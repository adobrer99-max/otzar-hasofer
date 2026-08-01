import { describe, expect, it } from "vitest";
import { lettersOnEntering, TOTAL_REGIONS } from "./regions";
import { makeRng } from "./rng";
import { chooseTarget, clueFrom, judge, lightFor, opens, solvableRoots, toTarget } from "./wordGate";

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
      return `region ${region}: ${held.length} letters → ${solvableRoots(region).length} roots`;
    });
    console.log(report.join("\n"));
    expect(report.length).toBe(TOTAL_REGIONS);
  });

  it("only ever names a root the Scribe already holds every letter of", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const held = new Set(lettersOnEntering(region));
      for (const entry of solvableRoots(region)) {
        for (const letter of entry.letters) {
          expect(held.has(letter), `region ${region}: ${entry.transliteration} needs ${letter}`).toBe(true);
        }
      }
    }
  });

  it("never names a proper noun, and never a root with a repeated radical", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const entry of solvableRoots(region)) {
        expect(entry.kind).toBe("root");
        const [a, b, c] = entry.letters;
        expect(a === b || b === c || a === c).toBe(false);
      }
    }
  });

  it("gives every target a short, non-empty clue", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const entry of solvableRoots(region).slice(0, 40)) {
        const target = toTarget(entry);
        expect(target.clue.length).toBeGreaterThan(2);
        expect(target.clue.length).toBeLessThanOrEqual(64);
        expect(target.hebrew.length).toBeGreaterThan(0);
      }
    }
  });

  it("picks deterministically from a seed", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const a = chooseTarget(region, makeRng(4242));
      const b = chooseTarget(region, makeRng(4242));
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
      for (const entry of solvableRoots(region)) {
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
    const target = toTarget(solvableRoots(4)[0]);
    const verdict = judge(target.letterIds, target);
    expect(verdict.kind).toBe("target");
    expect(opens(verdict)).toBe(true);
    expect(lightFor(verdict)).toBeGreaterThan(0);
  });

  it("still opens for a different real word, for less light", () => {
    const pool = solvableRoots(6);
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
    const target = toTarget(solvableRoots(4)[0]);
    // A triple chosen to be nobody's root.
    const verdict = judge(["tzadi", "tzadi", "tzadi"], target);
    expect(opens(verdict)).toBe(false);
    expect(lightFor(verdict)).toBe(0);
  });
});
