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
   * Ruled so far: **netzach** (P15-R1 — the shrines are cold) and
   * **gevurah** (P15-R2 — the throws are rationed).
   */
  it("holds every rung at null until a slice fills it on purpose", () => {
    const ruled = Object.entries(RUNG_RULES)
      .filter(([, rule]) => rule !== null)
      .map(([sefirah]) => sefirah)
      .sort();
    expect(ruled).toEqual(["gevurah", "netzach"]);
    for (const region of regions) {
      if (region.sefirah === "netzach" || region.sefirah === "gevurah") continue;
      expect(rungRule(region.sefirah), `${region.name} grew a rule without a slice`).toBeNull();
    }
  });

  it("names every filled rule to the player, and its knobs speak too", () => {
    for (const [sefirah, rule] of Object.entries(RUNG_RULES)) {
      if (!rule) continue;
      expect(rule.says.length, `${sefirah}'s rule has no real line`).toBeGreaterThan(20);
      if (rule.shrinesCold !== undefined) {
        expect(rule.shrinesCold.length, `${sefirah}'s cold shrine says nothing`).toBeGreaterThan(20);
        expect(rule.shrinesCold).not.toBe(rule.says);
      }
      if (rule.marksRationed !== undefined) {
        expect(rule.marksRationed.spent.length, `${sefirah}'s spent ration says nothing`).toBeGreaterThan(20);
        expect(rule.marksRationed.spent).not.toBe(rule.says);
      }
    }
  });

  /**
   * **The ration is generous, held to the measurement it was chosen by.**
   * The fighting probe was run over all three gevurah-bound paths and eight
   * seeds before the number was picked: no run that broke anything needed
   * more than **31** throws, and the only runs past sixty were sprays of
   * 286–389 marks that broke nothing. A retune that brings the ration down
   * near what an honest fight actually costs has to come through here — the
   * floor is half again the dearest honest fight, so a generous ration can
   * be a round number and a mean one cannot pass unnoticed.
   */
  it("rations Gevurah well clear of the dearest honest fight", () => {
    const ration = RUNG_RULES.gevurah?.marksRationed;
    expect(ration).toBeDefined();
    expect(ration!.count).toBeGreaterThanOrEqual(Math.ceil(31 * 1.5));
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

describe("P15-R2 — Gevurah: the throws are rationed", () => {
  /** An empty room to write in — nothing to hit, nothing to interrupt. */
  function penRoom(toward?: "gevurah" | "hod") {
    const world = buildRegion(2, 5);
    world.entities = [];
    world.husks = [];
    world.toward = toward;
    return world;
  }
  const strike = { ...NO_INPUT, strike: true };
  const ctx: StepContext = { verbs: [], graces: [] };
  const ration = RUNG_RULES.gevurah!.marksRationed!;

  it("counts a mark at the moment it flies, and not a press the cooldown eats", () => {
    const world = penRoom("hod");
    step(world, strike, ctx);
    expect(world.marksThrown).toBe(1);
    expect(world.marks.filter((m) => m.mine)).toHaveLength(1);
    // Held through the cooldown: nothing more flies, nothing more counts.
    for (let t = 0; t < 5; t += 1) step(world, strike, ctx);
    expect(world.marksThrown).toBe(1);
  });

  it("says the spent line on the throw that spends the last of the ration", () => {
    const world = penRoom("gevurah");
    world.marksThrown = ration.count - 1;
    step(world, strike, ctx);
    expect(world.marksThrown).toBe(ration.count);
    expect(world.marks.filter((m) => m.mine), "the last rationed mark must still fly").toHaveLength(1);
    expect(world.message?.text).toBe(ration.spent);
  });

  it("refuses the press after the ration — no mark, no cooldown, the reason said", () => {
    const world = penRoom("gevurah");
    world.marksThrown = ration.count;
    step(world, strike, ctx);
    expect(world.marks.filter((m) => m.mine)).toHaveLength(0);
    expect(world.marksThrown).toBe(ration.count);
    expect(world.player.markCooldown, "a refused press must not start the cooldown").toBe(0);
    expect(world.message?.text).toBe(ration.spent);
  });

  it("rations only the road to Gevurah — any other destination writes freely", () => {
    const world = penRoom("hod");
    world.marksThrown = ration.count + 100;
    step(world, strike, ctx);
    expect(world.marks.filter((m) => m.mine)).toHaveLength(1);
  });

  it("never rations an arena — a guardian fight is not a road", () => {
    // Gevurah's own arena, which is the sharpest case: the place named for
    // severity still lets the fight be fought. An arena never sets `toward`.
    const world = buildArena("gevurah");
    world.husks = [];
    world.marksThrown = ration.count + 100;
    step(world, strike, ctx);
    expect(world.toward).toBeUndefined();
    expect(world.marks.filter((m) => m.mine)).toHaveLength(1);
  });
});
