import { describe, expect, it } from "vitest";
import { lettersOnEntering, regions } from "./regions";
import { RUNG_RULES, rungRule } from "./rungRules";
import { TREE_PATHS } from "./tree";
import { buildArena, buildPath, buildRegion, regionOfPath } from "./world/build";
import { step, type StepContext } from "./world/step";
import { NO_INPUT } from "./world/types";

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

describe("the rungs' own rules — filled one slice at a time", () => {
  /**
   * **The named list — the conditional-list discipline.** Each P15-R slice
   * replaces exactly one null by hand, here, with a person deciding it.
   * Malchut's null is load-bearing (the kingdom's rule is the taught opening)
   * and Keter's is likely permanent (the crown's rule is the presentation);
   * when a slice lands, its Sefirah moves from the null side of this list to
   * a named assertion of what its rule says.
   *
   * Ruled so far: **netzach** (P15-R1 — the shrines are cold).
   */
  it("holds every rung at null until a slice fills it on purpose", () => {
    const ruled = Object.entries(RUNG_RULES)
      .filter(([, rule]) => rule !== null)
      .map(([sefirah]) => sefirah)
      .sort();
    expect(ruled).toEqual(["netzach"]);
    for (const region of regions) {
      if (region.sefirah === "netzach") continue;
      expect(rungRule(region.sefirah), `${region.name} grew a rule without a slice`).toBeNull();
    }
  });

  it("names every filled rule to the player, and its knob speaks too", () => {
    for (const [sefirah, rule] of Object.entries(RUNG_RULES)) {
      if (!rule) continue;
      expect(rule.says.length, `${sefirah}'s rule has no real line`).toBeGreaterThan(20);
      if (rule.shrinesCold !== undefined) {
        expect(rule.shrinesCold.length, `${sefirah}'s cold shrine says nothing`).toBeGreaterThan(20);
        expect(rule.shrinesCold).not.toBe(rule.says);
      }
    }
  });
});

describe("the rule is keyed to the destination — `World.toward`", () => {
  /**
   * The plumbing pin: `buildPath` writes the walked path's **upper** end onto
   * the world *after* paint, so the generator's draws can never see it — a
   * rule may change behaviour, never a tile. An arena never sets it, which is
   * what keeps a guardian's room outside every rung rule by construction.
   */
  it("every path's world carries its upper end, and an arena carries none", () => {
    for (const path of TREE_PATHS) {
      const world = buildPath(path, 7, lettersOnEntering(regionOfPath(path).index));
      expect(world.toward, `${path.id} does not say where it is going`).toBe(path.ends[1]);
    }
    expect(buildArena("netzach").toward).toBeUndefined();
  });
});

describe("P15-R1 — Netzach: the shrines are cold", () => {
  /** The flat shrine room, in `verbUses.test.ts`'s idiom: Yesod's ground
   * (the kingdom keeps no shrine), with the destination set by hand so the
   * seam is tested directly — the plumbing test above covers `buildPath`
   * setting it. */
  function shrineRoom(toward?: "netzach" | "hod") {
    const world = buildRegion(2, 5);
    world.toward = toward;
    const shrine = world.entities.find((e) => e.kind === "mark");
    expect(shrine).toBeDefined();
    if (shrine) {
      world.player.x = shrine.x;
      world.player.y = shrine.y;
    }
    return { world, shrine };
  }

  const ctx: StepContext = { verbs: ["mark"], graces: [] };

  it("does not answer on netzach-bound ground, whatever the hand holds", () => {
    const { world, shrine } = shrineRoom("netzach");
    const before = { ...world.respawn };
    step(world, NO_INPUT, ctx);
    expect(shrine?.active, "a cold shrine lit up").toBeFalsy();
    expect(world.respawn).toEqual(before);
    expect(world.marksSet).toBe(0);
    expect(world.verbUses.mark, "a refusal spent the verb").toBeUndefined();
    expect(world.message?.text).toBe(RUNG_RULES.netzach?.shrinesCold);
  });

  it("answers on any other road — the rule, not the field, is what is cold", () => {
    const { world, shrine } = shrineRoom("hod");
    step(world, NO_INPUT, ctx);
    expect(shrine?.active).toBe(true);
    expect(world.respawn.x).toBe(shrine?.x);
    expect(world.marksSet).toBe(1);
  });

  it("answers where there is no destination at all — an arena, an old room", () => {
    const { world, shrine } = shrineRoom(undefined);
    step(world, NO_INPUT, ctx);
    expect(shrine?.active).toBe(true);
    expect(world.respawn.x).toBe(shrine?.x);
  });
});
