import { describe, expect, it } from "vitest";
import {
  BEASTS,
  GREAT,
  canBeStruck,
  HUSK_CHARS,
  isBeast,
  HUSKS,
  kindForRole,
  IFRAME_TICKS,
  LAMPS,
  markBite,
  markPowers,
  shellsTaken,
  takeHit,
  type HuskKind,
} from "./combat";
import { TILE_CHARS } from "./world/tiles";
import { regions } from "./regions";

/**
 * The rules of the fight, on their own. `world/step.ts` decides when to ask
 * them; nothing here touches a clock, a DOM or a random number, so a hit can
 * be reasoned about without running a game.
 */
describe("the klipot", () => {
  it("names every shell, each with something in it and something inside that", () => {
    const kinds = Object.keys(HUSKS) as HuskKind[];
    // Ten klipot, seven creatures and three great ones. Counted apart rather
    // than together, because they are three claims: the ten are human failures
    // Tanach names, the seven are not failures at all, and the three were made
    // on the fifth day and set aside — see `BEASTS` and `GREAT`.
    expect(kinds.filter((k) => !isBeast(k))).toHaveLength(10);
    expect(BEASTS).toHaveLength(7);
    expect(GREAT).toHaveLength(3);
    expect(kinds).toHaveLength(20);
    for (const kind of kinds) {
      const spec = HUSKS[kind];
      expect(spec.kind, `${kind} is filed under the wrong name`).toBe(kind);
      expect(spec.shells, `${kind} breaks to nothing`).toBeGreaterThan(0);
      expect(spec.light, `${kind} holds no light`).toBeGreaterThan(0);
      expect(spec.hebrew, `${kind} has no name`).toBeTruthy();
      // A klipah is a husk *around* something. The claim that each of these is
      // drawn from somewhere has to be checkable, or the bestiary is just
      // monsters with Hebrew on them.
      expect(spec.name.length, `${kind} has no name to write`).toBeGreaterThan(2);
      expect(spec.source, `${kind} cites nothing`).toMatch(/\d/);
      expect(spec.is.length, `${kind} does not say what it does`).toBeGreaterThan(30);
      expect(spec.reading.length, `${kind} does not say what it means`).toBeGreaterThan(40);
    }
  });

  /**
   * The behaviour **is** the reading, so a klipah whose one line could be
   * swapped with another's has not earned its name. Enumerated rather than
   * asserted by eye.
   */
  it("gives each of them a different way of coming at you", () => {
    const kinds = Object.keys(HUSKS) as HuskKind[];
    const shapes = kinds.map((k) => {
      const s = HUSKS[k];
      return [s.role, s.speed, s.notices, s.throws ?? 0, s.flies ?? false, s.takes ?? "lamp"].join("/");
    });
    expect(new Set(shapes).size, `two klipot move identically: ${shapes.join(", ")}`).toBe(
      kinds.length,
    );
    expect(new Set(kinds.map((k) => HUSKS[k].hebrew)).size).toBe(kinds.length);
  });

  /**
   * The roles are what the chunk library authors, and the rung supplies the
   * klipah — so every role a screen can write must be answerable somewhere,
   * and a rung must never be made *entirely* of the roles a door waits on. A
   * rung whose every klipah holds a door seals every room in it: measured, on
   * a Yesod of Cain and the Brothers alone, not one run of ten got out.
   */
  it("keeps every authored role answerable, and no rung all door-holders", () => {
    const roles = new Set(Object.values(HUSK_CHARS));
    for (const role of roles) {
      expect(
        Object.values(HUSKS).some((s) => s.role === role),
        `no klipah anywhere fills the "${role}" a screen can write`,
      ).toBe(true);
    }
    for (const region of regions) {
      const holds = region.klipot.kinds.filter(
        (k) => HUSKS[k].role === "charger" || (HUSKS[k].role === "pacer" && Number.isFinite(HUSKS[k].notices)),
      );
      expect(
        holds.length,
        `${region.name} is nothing but klipot that hold a door shut`,
      ).toBeLessThan(region.klipot.kinds.length);
    }
  });

  it("fills a spot from the rung's own pool, and never from outside it", () => {
    for (const region of regions) {
      for (const role of Object.values(HUSK_CHARS)) {
        for (let pick = 0; pick < 4; pick += 1) {
          const kind = kindForRole(region.klipot.kinds, role, pick);
          expect(kind, `${region.name} answers nothing for a ${role}`).toBeDefined();
          expect(
            region.klipot.kinds,
            `${region.name} stood a ${kind} that does not belong to it`,
          ).toContain(kind);
        }
      }
      // And where the rung *does* hold the role, it is the one that answers.
      for (const role of Object.values(HUSK_CHARS)) {
        const fitting = region.klipot.kinds.filter((k) => HUSKS[k].role === role);
        if (fitting.length === 0) continue;
        expect(fitting).toContain(kindForRole(region.klipot.kinds, role, 0));
      }
    }
  });

  /**
   * **Nothing sturdier is ever worth less**, which is the claim, and it is
   * stated as a comparison rather than as a sorted list because the sorted list
   * was quietly asserting something else.
   *
   * `sort` is stable, so kinds with equal shells came out in the order they are
   * declared in — and the check then required the *declaration order* of every
   * tie group to be non-decreasing in light. That is a fact about where somebody
   * typed a creature, not about the design. It only ever passed because the
   * shell counts happened to have few ties; giving the small klipot a floor of
   * three made nine of them the same size and the test failed on an ordering
   * nobody had ever chosen.
   */
  it("makes the sturdier shells worth more light", () => {
    const kinds = Object.keys(HUSKS) as HuskKind[];
    for (const a of kinds) {
      for (const b of kinds) {
        if (HUSKS[a].shells <= HUSKS[b].shells) continue;
        expect(
          HUSKS[a].light,
          `${a} has more shells than ${b} and is worth less light`,
        ).toBeGreaterThanOrEqual(HUSKS[b].light);
      }
    }
  });

  it("writes each role with a character no tile already uses", () => {
    for (const ch of Object.keys(HUSK_CHARS)) {
      expect(ch in TILE_CHARS, `"${ch}" is already a tile`).toBe(false);
    }
    expect(new Set(Object.values(HUSK_CHARS)).size).toBe(Object.keys(HUSK_CHARS).length);
  });

  it("stands more of them the higher the Tree is climbed", () => {
    const counts = regions.map((r) => r.klipot.count);
    expect(counts[0], "Malchut should be the emptiest").toBeLessThan(counts[counts.length - 1]);
    for (const region of regions) {
      for (const kind of region.klipot.kinds) {
        expect(HUSKS[kind], `${region.name} names an unknown husk`).toBeDefined();
      }
    }
  });
});

/**
 * **When a mark counts — the third dial, stated in the table for the first
 * time.**
 *
 * `opened()` used to be a switch over *creatures* with two bespoke cases under
 * a `default: true`, which meant eighteen of the twenty kinds were open at
 * every moment of their lives **by omission**: nothing anywhere said so, and
 * nothing could be asked about it. It is a switch over `Opening` now, so the
 * table states it, two creatures that open the same way share one line, and
 * adding a member to the union is a compile error at the one site that has to
 * answer for it.
 *
 * The dispatch landed first with nothing added and nothing removed — the two
 * conditions that existed, expressed once instead of twice — and the Re'em is
 * the first kind closed on purpose since. It had to be written into the list
 * below by hand, which is exactly what the list is for.
 */
describe("when a klipah is open to a mark", () => {
  it("makes every kind say, rather than letting silence mean always", () => {
    for (const spec of Object.values(HUSKS)) {
      expect(spec.opening, `${spec.kind} does not say when it opens`).toBeTruthy();
    }
  });

  /**
   * **Named rather than counted**, because the eighteen are the subject of the
   * phase and not a background fact. A kind that gains a condition has to be
   * taken out of this list on purpose, with a person deciding it — which is the
   * opposite of how it got here, where a `default:` branch decided it silently
   * for every creature nobody had thought about.
   */
  it("names every kind that is conditional, and the condition it answers to", () => {
    const conditional = Object.values(HUSKS)
      .filter((s) => s.opening !== "always")
      .map((s) => s.kind)
      .sort();
    expect(conditional).toEqual(["behemot", "calf", "izevel", "livyatan", "nefilim", "reem", "saraf"]);
    // For the two great ones the condition is something a letter *arranges in
    // the world* rather than a permission a letter grants — Vav puts Leviathan
    // ashore, Bet stops Behemoth. That is the difference between a puzzle and a
    // check, and it is why the Hook still moves Leviathan on a blow that takes
    // no shell off it.
    expect(HUSKS.livyatan.opening).toBe("landed");
    expect(HUSKS.behemot.opening).toBe("stopped");
    // **And three of the eighteen are closed now**, which is the whole reason
    // this list is written out rather than counted: each had to be added here,
    // by hand, with a person deciding it. All three answer to the same
    // condition — they are shut while committed to the thing they committed to
    // — and each got there from its own line. The Re'em runs one line and will
    // not turn, so the answer is to stand aside and write on what the wall
    // leaves. The Calf never stops coming, so the answer is the moment it has
    // overrun. The Nefilim is all waiting, so the answer is any moment but the
    // fall.
    expect(HUSKS.reem.opening).toBe("spent");
    expect(HUSKS.calf.opening).toBe("spent");
    expect(HUSKS.nefilim.opening).toBe("spent");
    // **Jezebel is the fourth, and the cleanest of them.** *She never went
    // anywhere: everything she did, she did at a distance and by other hands* —
    // `speed: 0`, so she is never in contact with anybody, and her shut phase
    // therefore costs a Scribe nothing by construction. She gathers before she
    // sends, and a Scribe cannot write on her while she is drawing it up.
    expect(HUSKS.izevel.opening).toBe("spent");
    // **And the Saraf is the fifth, and the one whose tell was most owed.** Its
    // fire has no travel — `vx: 0, vy: 0`, it exists on the tick under whatever
    // is standing there — so it was the one attack in the game with no warning
    // of any kind. It is also the only creature on this roster that *paces*, so
    // its shut phase is not out of contact by construction and `unfair()` is
    // what kept it rather than an argument: 0.20 against a band of 0.45.
    expect(HUSKS.saraf.opening).toBe("spent");
  });
});

describe("the Scribe's mark", () => {
  it("takes one shell bare, and two once the Flame is carried", () => {
    expect(markBite(markPowers([], []))).toBe(1);
    expect(markBite(markPowers(["flame"], []))).toBe(2);
  });

  it("passes through the first husk once the Edge is carried", () => {
    expect(markPowers([], []).pierces).toBe(false);
    expect(markPowers(["cut"], []).pierces).toBe(true);
  });

  it("draws rather than pushes once the Hook is carried", () => {
    expect(markPowers([], []).draws).toBe(false);
    expect(markPowers(["grapple"], []).draws).toBe(true);
  });

  it("is thrown further by the Staff", () => {
    expect(markPowers([], ["high-jump"]).reach).toBeGreaterThan(markPowers([], []).reach);
  });

  /**
   * The one place a letter decides whether a fight is possible at all rather
   * than how it goes: a husk standing in veiled stone is no more visible than
   * the stone is.
   */
  it("cannot touch what the Eye has not opened", () => {
    expect(canBeStruck(true, [])).toBe(false);
    expect(canBeStruck(true, ["reveal"])).toBe(true);
    expect(canBeStruck(false, [])).toBe(true);
  });
});

describe("lamps, and going out", () => {
  it("costs exactly one lamp, and buys a moment of grace", () => {
    const hit = takeHit(LAMPS, 0);
    expect(hit.lamps).toBe(LAMPS - 1);
    expect(hit.iframes).toBe(IFRAME_TICKS);
    expect(hit.out).toBe(false);
  });

  /** During the grace nothing happens at all — not a reduced hit, no hit. */
  it("cannot be hit twice inside one grace", () => {
    const first = takeHit(LAMPS, 0);
    const second = takeHit(first.lamps, first.iframes);
    expect(second.lamps).toBe(first.lamps);
    expect(second.out).toBe(false);
  });

  it("goes out on the last lamp, and stays out", () => {
    expect(takeHit(1, 0).out).toBe(true);
    expect(takeHit(1, 0).lamps).toBe(0);
    expect(takeHit(0, 0).out).toBe(true);
  });

  it("starts with more than one, so a mistake is not the run", () => {
    expect(LAMPS).toBeGreaterThan(1);
  });
});

/**
 * **What the nib comes to when the satchel is full — the case no band measures.**
 *
 * Reported from play as *too easy to kill in certain cases*, and the certain
 * case turned out to be arithmetic rather than a creature. `powersFrom` folds
 * the vessels **multiplicatively** and `markBite` folds Shin's doubling on top
 * of the result, so the three that sharpen the nib come to six shells a word
 * together — more than anything in the bestiary is made of.
 *
 * The reason it survived four phases of measurement is that **every probe in
 * this suite fights with an empty satchel.** `fight.test.ts`, `curve.test.ts`,
 * `climb.test.ts` and the bench all build their context out of the letters
 * alone, so the entire measured economy is the un-furnished Scribe at bite one
 * or two. The hand a player actually holds for the back half of a climb was
 * never in a room with anything, which is the same shape as `onVessel` going
 * missing for the whole life of P5b: not a wrong number, an unasked question.
 */
describe("a satchel is not a skeleton key", () => {
  /** The sharpest nib the game can put in a hand: the three that bite, and the Flame. */
  const SHARP = ["kulmus", "izmel", "mishkolet"];
  const sharpest = markBite(markPowers(["flame"], [], SHARP));
  const shells = Object.values(HUSKS).map((h) => h.shells);

  /**
   * Stated as the two numbers side by side rather than as a constant, because
   * the claim is the *relation*. A full-health husk is left standing with one
   * shell by `strikeHusk`'s first-blow rule, so the fight is two words long
   * whenever one word can take **half** of what the thing is made of — and at
   * six, one word takes half of the largest thing in the game with three to
   * spare. That is the ceiling's whole reason for existing, and any retune of
   * either side has to come back here.
   */
  it("reaches six shells a word, which is half again of the largest thing there is", () => {
    expect(sharpest).toBe(6);
    expect(Math.max(...shells)).toBeLessThanOrEqual(sharpest * 2);
  });

  /**
   * **The floor of two is what keeps every committed band exactly where it is**,
   * and it is asserted rather than reasoned about, because the whole value of
   * the ceiling is that it is invisible to the instruments. If this ever fails,
   * every measured number in `fight`, `curve`, `economy` and `climb` was taken
   * on different ground than the one they were drawn on.
   */
  it("cannot bind on a Scribe carrying nothing, which is every probe there is", () => {
    for (const spec of Object.values(HUSKS)) {
      expect(shellsTaken(1, spec.shells), spec.kind).toBe(1);
      expect(shellsTaken(2, spec.shells), spec.kind).toBe(2);
    }
  });

  /**
   * And the consequence, as a difference rather than a table: at the sharpest
   * the nib gets, the biggest things in the game still cost more than one word
   * than the smallest do. Without the ceiling every shell count from two to
   * eight collapses to the same two words and the size of a creature stops
   * meaning anything.
   */
  it("keeps a great one dearer than an Arbeh however sharp the nib", () => {
    const small = shellsTaken(sharpest, Math.min(...shells));
    for (const spec of Object.values(HUSKS)) {
      const words = Math.ceil((spec.shells - 1) / shellsTaken(sharpest, spec.shells)) + 1;
      expect(words, `${spec.kind} of ${spec.shells} shells`).toBeGreaterThanOrEqual(2);
    }
    const biggest = Object.values(HUSKS).find((h) => h.shells === Math.max(...shells))!;
    expect(
      shellsTaken(sharpest, biggest.shells) / biggest.shells,
      `${biggest.kind} loses as large a share to one word as the smallest does`,
    ).toBeLessThan(small / Math.min(...shells));
  });
});
