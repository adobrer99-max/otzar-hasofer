import { describe, expect, it } from "vitest";
import { HUSKS, type HuskKind } from "../combat";
import type { Husk } from "../world/types";
import { alpha, readPalette } from "./palette";
import { CREATURES, gaitOf, paintHusk, type Point } from "./husks";
import { recorder } from "./testCanvas";

/**
 * **A bestiary you can tell apart.**
 *
 * Twenty creatures shipped with their own behaviours, their own sources and
 * their own authored lines, drawn as four shapes chosen by `role` — so the
 * Locust and Leviathan were the same circle. This is a table rather than
 * twenty drawing functions precisely so that it can be checked, and what is
 * checked is the thing that was wrong: that no two of them are the same.
 */
describe("the creatures", () => {
  const kinds = Object.keys(HUSKS) as HuskKind[];
  const partsOf = (kind: HuskKind) => [
    ...CREATURES[kind].masses.map((m) => m.poly),
    ...(CREATURES[kind].limbs ?? []).map((l) => l.poly),
  ];

  it("draws every creature in the game, and nothing that is not one", () => {
    for (const kind of kinds) {
      expect(CREATURES[kind], `${kind} is not drawn`).toBeDefined();
      expect(CREATURES[kind].masses.length, `${kind} has no body`).toBeGreaterThan(0);
    }
    for (const key of Object.keys(CREATURES)) {
      expect(kinds.includes(key as HuskKind), `${key} is not a klipah`).toBe(true);
    }
  });

  /**
   * **The one this file exists for**, restated for the third time because the
   * bug came back twice wearing different clothes. Four shapes for twenty names
   * was the first version. Twenty *convex polygons* was the second, and it
   * passed a test that compared rows while every creature on screen was still a
   * blob. What is asserted now is the thing a blob cannot have: **parts**.
   *
   * A creature with one mass and no limbs is a shape, not an animal. Two of the
   * twenty are allowed to be exactly that — Rahav is a swollen mass with heads
   * coming off it and nothing else, which is the point of Rahav — so the rule
   * is stated as a body plus at least one thing coming out of it.
   */
  it("gives every creature a body and something coming out of it", () => {
    for (const kind of kinds) {
      const creature = CREATURES[kind];
      const parts = creature.masses.length + (creature.limbs ?? []).length;
      expect(parts, `${kind} is a single shape — a blob, not a creature`).toBeGreaterThanOrEqual(3);
      expect((creature.limbs ?? []).length, `${kind} has nothing articulated`).toBeGreaterThan(0);
    }
  });

  it("gives no two creatures the same anatomy", () => {
    const seen = new Map<string, HuskKind>();
    for (const kind of kinds) {
      const key = JSON.stringify(CREATURES[kind]);
      const clash = seen.get(key);
      expect(clash, `${kind} and ${clash} are drawn the same`).toBeUndefined();
      seen.set(key, kind);
    }
  });

  it("stays inside its own draw box, so nothing draws over the creature beside it", () => {
    for (const kind of kinds) {
      const points = [
        ...partsOf(kind).flat(),
        ...(CREATURES[kind].features ?? []).flatMap((f) => [...(f.line ?? []), f.dot].filter(Boolean)),
      ] as Point[];
      for (const [x, y] of points) {
        expect(x, `${kind} runs off the side`).toBeGreaterThanOrEqual(0);
        expect(x, `${kind} runs off the side`).toBeLessThanOrEqual(1);
        expect(y, `${kind} runs off the top or bottom`).toBeGreaterThanOrEqual(0);
        expect(y, `${kind} runs off the top or bottom`).toBeLessThanOrEqual(1);
      }
    }
  });

  /**
   * A creature that used only a corner of its box would read as a smaller
   * creature than it is — and size is load-bearing, since `HuskSpec.size` is
   * what the fight is balanced against.
   */
  it("is drawn about as big as the thing you actually collide with", () => {
    for (const kind of kinds) {
      const points = partsOf(kind).flat() as Point[];
      const [dw, dh] = CREATURES[kind].draw ?? [1, 1];
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      // **Against the hit box, not against the draw box**, which is the only
      // version of this claim that means anything. A creature can fill its own
      // box perfectly and still be half the size of the thing a mark has to
      // land on: Cain filled 48% of his width and the Nefilim 36%, both of them
      // upright figures drawn straight down the middle, and at play zoom they
      // read as smaller creatures than they are. Widened at the stance rather
      // than stretched, because a stretched person is a blob again.
      const wide = (Math.max(...xs) - Math.min(...xs)) * dw;
      const tall = (Math.max(...ys) - Math.min(...ys)) * dh;
      expect(wide, `${kind} is drawn narrower than it can be hit`).toBeGreaterThan(0.75);
      expect(tall, `${kind} is drawn shorter than it can be hit`).toBeGreaterThan(0.7);
    }
  });

  /**
   * **The picture is not the hit box**, and it must not quietly become one.
   * Everything is sixteen by eighteen because that is what the fight was
   * balanced against, and drawing a serpent inside a near-square was most of
   * why the serpents did not look like serpents. But a picture four times the
   * thing you collide with is a lie a player pays for, so the stretch is
   * bounded on both sides.
   */
  it("draws near enough to the size of the thing you actually collide with", () => {
    for (const kind of kinds) {
      const [w, h] = CREATURES[kind].draw ?? [1, 1];
      expect(w, `${kind} is drawn far wider than it can be hit`).toBeLessThanOrEqual(2.4);
      expect(h, `${kind} is drawn far taller than it can be hit`).toBeLessThanOrEqual(1.4);
      expect(Math.min(w, h), `${kind} is drawn smaller than its hit box`).toBeGreaterThanOrEqual(0.85);
    }
  });

  /**
   * **The long ones are drawn long.** Three of these are serpents and one is a
   * whale, and a serpent as tall as it is wide is not a serpent — that was the
   * single largest reason the bestiary read as blobs. Pinned, because a table
   * of numbers will drift back toward square without something saying not to.
   */
  it("draws the serpents and the sea creatures longer than they are tall", () => {
    for (const kind of ["nachash", "tannin", "livyatan"] as HuskKind[]) {
      const [w, h] = CREATURES[kind].draw ?? [1, 1];
      const spec = HUSKS[kind];
      const ratio = (w * spec.size.w) / (h * spec.size.h);
      expect(ratio, `${kind} is drawn as tall as it is long`).toBeGreaterThan(1.4);
    }
  });

  /** One lit point is what makes a shape read as alive. Two is a face. */
  it("lights an eye and very little else", () => {
    for (const kind of kinds) {
      const features = CREATURES[kind].features ?? [];
      expect(features.length, `${kind} has no eye`).toBeGreaterThan(0);
      expect(features.length, `${kind} wears a badge rather than a face`).toBeLessThanOrEqual(3);
    }
  });
});

/**
 * **The movement, and the one claim about it that a picture cannot check.**
 *
 * A gait can be keyed to two things, and only one of them is right. Keyed to
 * the **clock** it looks almost correct — and then a klipah that has walked to
 * the edge of its ground and stopped goes on jogging on the spot for the rest
 * of the climb, and a room full of pacers marches in perfect unison because
 * they all read the same tick. Keyed to **where the creature is**, a leg swings
 * because ground went past under it, stops when the creature stops, and two
 * klipot at different places are at different points of a step without anything
 * being stored anywhere.
 *
 * That is a claim about an argument list as much as about arithmetic — note
 * that `gaitOf` cannot see the tick — so it is asserted here rather than looked
 * for on a contact sheet, which could not show it.
 */
describe("the walk", () => {
  const walker = (x: number, vx: number): Husk => ({
    id: "cain",
    kind: "cain",
    x,
    y: 0,
    w: 16,
    h: 18,
    vx,
    vy: 0,
    shells: 2,
    facing: 1,
    home: { x: 3, y: 0 },
    cooldown: 0,
    charging: 0,
    struck: 0,
  });

  it("is driven by the ground covered rather than by the clock", () => {
    // The same creature in the same place is at the same point of its step,
    // whatever the tick — which is what makes the legs stop when it does.
    expect(gaitOf(walker(100, 40))).toBe(gaitOf(walker(100, 40)));
    // And a quarter of a stride later the leg is at the far end of its swing.
    // Measured at a *quarter* deliberately: half a cycle from a zero crossing
    // is another zero crossing, and the first version of this test compared
    // 0 with 0 and would have passed against a gait that never moved at all.
    const stride = 16 * 1.5;
    expect(Math.abs(gaitOf(walker(0, 40))), "the cycle does not start at rest").toBeLessThan(0.01);
    expect(
      Math.abs(gaitOf(walker(stride / 4, 40))),
      "a quarter of a stride on and the leg has not moved",
    ).toBeGreaterThan(0.9);
  });

  it("stands still when the creature does", () => {
    // Not merely small — nothing. A klipah at rest with a leg frozen mid-swing
    // is the pose it happened to stop in, which reads as a statue of a walk.
    expect(Math.abs(gaitOf(walker(37, 0)))).toBe(0);
    expect(Math.abs(gaitOf(walker(37, 3))), "a creature barely drifting is striding").toBeLessThan(
      0.2,
    );
  });

  /**
   * Two legs in the same phase are a pair of scissors rather than a walk, and
   * it is the single easiest thing to get wrong when the movement is authored
   * as a table: the rows look right and the creature hops.
   */
  it("never swings a creature's legs together", () => {
    for (const kind of Object.keys(HUSKS) as HuskKind[]) {
      const strides = (CREATURES[kind].limbs ?? []).filter((l) => l.move?.on === "stride");
      if (strides.length < 2) continue;
      const phases = new Set(strides.map((l) => l.move?.phase ?? 0));
      expect(phases.size, `${kind} moves every limb on the same beat — it hops`).toBeGreaterThan(1);
    }
  });

  /** Nothing in the bestiary is a statue. */
  it("leaves nothing entirely still", () => {
    for (const kind of Object.keys(HUSKS) as HuskKind[]) {
      const creature = CREATURES[kind];
      const moving = [...creature.masses, ...(creature.limbs ?? [])].filter((p) => p.move);
      expect(moving.length, `${kind} never moves at all`).toBeGreaterThan(0);
    }
  });

  /**
   * And the thing that walks must **look different when it has walked**, which
   * is the end-to-end version of all of the above: the table can be right and
   * the painter can still be ignoring it.
   */
  it("draws a creature mid-stride differently from one standing still", () => {
    for (const kind of Object.keys(HUSKS) as HuskKind[]) {
      if (!(CREATURES[kind].limbs ?? []).some((l) => l.move?.on === "stride")) continue;
      const at = (x: number, vx: number) => {
        const { ctx, log } = recorder();
        const husk = { ...walker(x, vx), kind, w: HUSKS[kind].size.w, h: HUSKS[kind].size.h };
        paintHusk(ctx, husk as Husk, readPalette(), 0);
        return log();
      };
      const stride = HUSKS[kind].size.w * 1.5;
      expect(
        at(stride * 0.25, 60),
        `a ${kind} in mid-step is drawn exactly like one standing still`,
      ).not.toBe(at(stride * 0.25, 0));
    }
  });
});

/**
 * **No state may look like another** — which is the fault this phase was built
 * to find, and it could only be found by looking.
 *
 * `charging` was drawn exactly as not-charging. Every kind that commits to a
 * charge rendered the identical picture whether it was winding up or standing
 * there, so the one moment a player has something to do about a creature was
 * the one moment the game did not say so. Nothing caught it because nothing in
 * this repo drew a klipah outside a running game, and inside one a wind-up
 * lasts a few frames.
 *
 * Asserted as a *difference* rather than as a particular picture, deliberately:
 * a test that pinned the halo would have to be rewritten every time the halo
 * changed, and would then be pinning whatever it was last rewritten to. What
 * must stay true is that the four states are four pictures.
 */
describe("the states a klipah can be in", () => {
  const kinds = Object.keys(HUSKS) as HuskKind[];
  const STATES = ["whole", "struck", "opened", "charging"] as const;

  const stand = (kind: HuskKind, state: (typeof STATES)[number]): Husk => {
    const spec = HUSKS[kind];
    return {
      id: kind,
      kind,
      x: 0,
      y: 0,
      w: spec.size.w,
      h: spec.size.h,
      vx: 0,
      vy: 0,
      shells: state === "opened" ? Math.max(1, spec.shells - 1) : spec.shells,
      facing: 1,
      home: { x: 3, y: 0 },
      cooldown: 0,
      charging: state === "charging" ? 20 : 0,
      struck: state === "struck" ? 6 : 0,
    };
  };

  it("draws a different picture for each of them, for every creature", () => {
    for (const kind of kinds) {
      const drawn = new Map<string, string>();
      for (const state of STATES) {
        // **A one-shell creature cannot be half broken** — the next mark is the
        // one that disperses it. The first draft of this test asked for an
        // `opened` Brothers anyway, got a whole one back, and reported the
        // painter as drawing two states alike. The fixture was wrong, not the
        // picture: there is no such state to draw.
        if (state === "opened" && HUSKS[kind].shells < 2) continue;
        const { ctx, log } = recorder();
        paintHusk(ctx, stand(kind, state), readPalette(), 0);
        const picture = log();
        expect(picture.length, `${kind} drew nothing at all when ${state}`).toBeGreaterThan(0);
        for (const [other, seen] of drawn) {
          expect(picture, `a ${kind} that is ${state} looks exactly like one that is ${other}`).not.toBe(
            seen,
          );
        }
        drawn.set(state, picture);
      }
    }
  });

  /**
   * And a klipah must be **dark on both grounds**. The shell was filled from
   * `bgDeep`, which is a near-black on charcoal and a pale cream on vellum, so
   * on the light theme the creatures were very nearly not there — pale shapes
   * with paler edges laid on tan stone. The QA pass that checked "both themes
   * paint their own ground" was telling the truth about the ground.
   */
  it("is darker than the ground it stands on, in either theme", () => {
    /**
     * Under node there is no document, so `readPalette` hands back the charcoal
     * fallback and there is no vellum one to ask for. Rather than copy the
     * shipped colours into the suite — where they would drift from the CSS that
     * actually defines them — the two grounds are described by their *shape*,
     * which is the whole of what the bug was about: on charcoal the deep
     * background is the dark value and the text is the pale one, and on vellum
     * they are the other way round. A painter that reaches for `bgDeep` without
     * asking is right on one ground and invisible on the other.
     */
    const grounds = [
      { name: "charcoal", light: false, bgDeep: "#0f1216", text: "#ece6d8", stone: "#1c2027" },
      { name: "vellum", light: true, bgDeep: "#e4dcc6", text: "#2a2318", stone: "#cbbb90" },
    ];
    for (const ground of grounds) {
      const palette = { ...readPalette(), ...ground };
      const { ctx, log } = recorder();
      paintHusk(ctx, stand("cain", "whole"), palette, 0);
      const body = alpha(ground.light ? ground.text : ground.bgDeep, 0.9);
      expect(
        log(),
        `on the ${ground.name} ground the shell is not filled with the dark value — a klipah that ` +
          "cannot be picked out of the stone it stands on",
      ).toContain(`fillStyle=${body}`);
    }
  });
});
