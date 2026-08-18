import { describe, expect, it } from "vitest";
import { regions } from "./regions";
import { RUNG_RULES, rungRule } from "./rungRules";
import { TREE_PATHS } from "./tree";
import { regionOfPath } from "./world/build";

describe("the question of the rung", () => {
  it("asks ten distinct questions, each actually a question", () => {
    const questions = regions.map((r) => r.question);
    expect(questions).toHaveLength(10);
    for (const [i, q] of questions.entries()) {
      expect(q.length, `${regions[i].name} has no real question`).toBeGreaterThan(20);
      expect(q.endsWith("?"), `${regions[i].name}'s question does not ask`).toBe(true);
    }
    expect(new Set(questions).size, "two rungs ask the same thing").toBe(10);
  });

  /**
   * **The destination's, on every path** — spread after `...lower` in
   * `regionOfPath` so the blend cannot average it away, the `index`
   * precedent: a path's question is where it is going.
   */
  it("surfaces the destination's question on every path of the Tree", () => {
    for (const path of TREE_PATHS) {
      const region = regionOfPath(path);
      const upper = regions.find((r) => r.sefirah === path.ends[1])!;
      expect(region.question, `${path.id} asks the wrong end's question`).toBe(upper.question);
    }
  });
});

describe("the rungs' own rules — the spine, laid empty", () => {
  /**
   * **The named-null list — the conditional-list discipline.** Every rung's
   * rule is null today, and each P15-R slice replaces exactly one by hand,
   * here, with a person deciding it. Malchut's null is load-bearing (the
   * kingdom's rule is the taught opening) and Keter's is likely permanent
   * (the crown's rule is the presentation); when a slice lands, its Sefirah
   * moves from this list to a named assertion of what its rule says.
   */
  it("holds all ten at null until a slice fills one on purpose", () => {
    const ruled = Object.entries(RUNG_RULES)
      .filter(([, rule]) => rule !== null)
      .map(([sefirah]) => sefirah)
      .sort();
    expect(ruled).toEqual([]);
    for (const region of regions) {
      expect(rungRule(region.sefirah), `${region.name} grew a rule without a slice`).toBeNull();
    }
  });
});
