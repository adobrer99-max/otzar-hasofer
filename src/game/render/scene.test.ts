import { describe, expect, it } from "vitest";
import { regions } from "../regions";
import { PROLOGUE_PAGES } from "../story";
import { readPalette } from "./palette";
import { paintScene, type Scene, type Shape } from "./scene";
import { ALL_SCENES, PLACE_SCENES, PROLOGUE_SCENES } from "./scenes";
import { recorder } from "./testCanvas";

/**
 * **The scenes, enumerated** — the same discipline the silhouettes, the vessels
 * and the relics are held to, and for the same reason: a table can be checked
 * and a hand-drawn picture cannot.
 *
 * What is checked is what has actually gone wrong before in this repo when a
 * table of drawn things was added. P4b's silhouettes passed a test that no two
 * rows matched **while every creature on screen was a blob**, because the test
 * compared the data and never the picture. P8 fixed that with a recording
 * canvas and immediately found `charging` drawn identically to not-charging.
 * So the claims here are about **what is drawn**, through `recorder`, and every
 * one of them is a *difference* rather than a particular picture — a test that
 * pinned a lamp's glow would have to be rewritten whenever the glow changed and
 * would then be pinning whatever it was last rewritten to.
 */

const palette = readPalette();
const draw = (scene: Scene, t: number): string => {
  const { ctx, log } = recorder();
  paintScene(ctx, scene, palette, t, 500, 200);
  return log();
};

const points = (shape: Shape) => [...(shape.poly ?? []), ...(shape.line ?? []), ...(shape.dot ? [shape.dot] : [])];

describe("the prologue, drawn", () => {
  /**
   * **A page with no picture would be a silent gap.** `story.ts` exports
   * `PROLOGUE_PAGES` as its own array rather than mapping at the call site so
   * that the shape of the telling is a fact a test can hold; this is the other
   * half of that argument. A seventh paragraph added without a scene is a
   * failing test rather than a plate that quietly loses its panel.
   */
  it("has one scene for every page, and no page without one", () => {
    expect(PROLOGUE_SCENES).toHaveLength(PROLOGUE_PAGES.length);
  });

  it("gives every scene an id of its own and something to say about itself", () => {
    expect(new Set(ALL_SCENES.map((s) => s.id)).size).toBe(ALL_SCENES.length);
    for (const scene of ALL_SCENES) {
      // A canvas is a hole in the document. A label that is a word or two is
      // the same hole with a sign on it.
      expect(scene.label.length, `${scene.id} says nothing about itself`).toBeGreaterThan(30);
      expect(scene.shapes.length, `${scene.id} draws nothing`).toBeGreaterThan(0);
    }
    expect(new Set(ALL_SCENES.map((s) => s.label)).size).toBe(ALL_SCENES.length);
  });

  /**
   * **No two scenes are the same picture**, which is the claim P4b's table
   * could not make about its own rows and P8 had to build a canvas to make.
   * Six paragraphs behind six identical panels would be worse than six
   * paragraphs behind none: it would look like the game was showing something.
   */
  it("draws sixteen different pictures", () => {
    const seen = new Map<string, string>();
    for (const scene of ALL_SCENES) {
      const picture = draw(scene, 0);
      const clash = seen.get(picture);
      expect(clash, `${scene.id} is drawn exactly like ${clash}`).toBeUndefined();
      seen.set(picture, scene.id);
    }
  });

  /**
   * And every one of them **moves**, which is the whole of what a scene is for.
   * A still panel is an illustration, and an illustration would not have needed
   * a canvas, a loop or a movement primitive.
   */
  it("leaves nothing standing still", () => {
    for (const scene of ALL_SCENES) {
      expect(draw(scene, 1.3), `${scene.id} is a still picture`).not.toBe(draw(scene, 0));
    }
  });

  /**
   * **The clock is the caller's**, and this is what says so: the same scene at
   * the same `t` is the same picture, every time. Without it a scene could
   * quietly read `Date.now()` or a module-level counter and the reduced-motion
   * still would be a different picture on every mount.
   */
  it("draws the same picture twice for the same moment", () => {
    for (const scene of ALL_SCENES) {
      expect(draw(scene, 2.2)).toBe(draw(scene, 2.2));
    }
  });

  /**
   * A reduced-motion viewer gets **a still, not a blank**, so the frame each
   * scene names has to be one where there is something to see. Compared against
   * an empty scene rather than against a threshold, because "how much is drawn"
   * is not a number this file should be inventing.
   */
  it("names a still frame that has a picture in it", () => {
    const empty = draw({ id: "empty", label: "nothing at all", shapes: [] }, 0);
    for (const scene of ALL_SCENES) {
      expect(draw(scene, scene.still ?? 0), `${scene.id}'s still is blank`).not.toBe(empty);
    }
  });

  /**
   * **Authored inside the box.** A shape at `y: 1.4` is off the bottom of the
   * panel and is simply not there — no error, no warning, and on a wide screen
   * it looks like a composition choice. The slack is deliberate: the ground
   * slabs and the falling letters are authored just past the edge *on purpose*,
   * so that a horizon has no visible end and a stream has somewhere to come
   * from. What this catches is a coordinate off by a whole box.
   */
  it("authors nothing more than a little way outside the frame", () => {
    for (const scene of ALL_SCENES) {
      for (const shape of scene.shapes) {
        for (const [x, y] of points(shape)) {
          expect(x, `${scene.id} authors x = ${x}`).toBeGreaterThan(-0.3);
          expect(x, `${scene.id} authors x = ${x}`).toBeLessThan(1.3);
          expect(y, `${scene.id} authors y = ${y}`).toBeGreaterThan(-0.3);
          expect(y, `${scene.id} authors y = ${y}`).toBeLessThan(1.3);
        }
      }
    }
  });

  /**
   * **No scene names a colour.** Every fill and stroke is an `Ink` — a role —
   * so that one table paints on charcoal, on vellum and under all six festival
   * accents. The type already says this; what the type cannot say is that
   * nothing reached around it, and a `#rrggbb` in a scene would be P8's
   * invisible-klipot bug with better manners.
   */
  it("paints entirely out of the palette in its hand", () => {
    for (const scene of ALL_SCENES) {
      for (const shape of scene.shapes) {
        for (const ink of [shape.fill, shape.stroke]) {
          expect(ink ?? "", `${scene.id} names a colour`).not.toMatch(/#|rgb|hsl/);
        }
      }
    }
  });
});

/**
 * **The fall is the one that happened.** Everything else in the six loops for
 * as long as the page is up; a body that fell has to stop having fallen, or a
 * reader who takes a minute over the paragraph watches it drop five times.
 *
 * `once` is the only thing in the movement primitive that expresses that, so it
 * gets its own claim: at least one scene uses it, and the scene that does is
 * the same picture at four seconds as at forty.
 */
describe("a thing that happened, rather than a thing that repeats", () => {
  it("lets the fall land, and leaves it landed", () => {
    const fall = PROLOGUE_SCENES.find((s) => s.shapes.some((sh) => sh.move?.once));
    expect(fall, "nothing in the prologue happens once").toBeDefined();
    const body = (fall as Scene).shapes.filter((sh) => sh.move?.once);
    // The body alone, so the letters going on streaming past it do not answer
    // the question that was asked.
    const still: Scene = { ...(fall as Scene), shapes: body };
    expect(draw(still, 40)).toBe(draw(still, 8));
    expect(draw(still, 0), "the fall was over before it began").not.toBe(draw(still, 8));
  });
});

/**
 * **The ten places.**
 *
 * A place's scene has one property the prologue's do not, and it is the whole
 * of what makes them worth having: **they carry no colour at all.** Every one is
 * pure form, and the panel is tinted through `paletteOf` from the Sefirah — the
 * same mix the world is tinted with. That is the answer to the question this
 * phase had to ask itself before a single one could be authored, which was what
 * ten pictures say that P4's palettes and P4d's arenas do not: the arenas are
 * met from *inside*, at the twenty-seven screen pixels a body running past is
 * framed at, and this is the only time the game shows a place from outside.
 */
describe("the ten places", () => {
  it("gives a scene to every Sefirah, and none to anywhere else", () => {
    expect(Object.keys(PLACE_SCENES).sort()).toEqual(regions.map((r) => r.sefirah).sort());
  });

  it("counts every scene once in the sweep the whole table is held to", () => {
    // The guard on the guard: `ALL_SCENES` is what the claims above are made
    // over, and a place left out of it would be a picture nothing checks.
    expect(ALL_SCENES).toHaveLength(PROLOGUE_SCENES.length + regions.length);
    for (const scene of Object.values(PLACE_SCENES)) expect(ALL_SCENES).toContain(scene);
  });

  /**
   * **Ten forms, and the palette does the rest.** Held to the same standard as
   * everything else in this file — a difference rather than a picture — but
   * asserted here on the *plain* theme, with no Sefirah tint, so that two places
   * which differ only in colour would fail. Ten identical compositions in ten
   * hues would photograph beautifully and say nothing.
   */
  it("draws ten different shapes, before any of them is given a colour", () => {
    const seen = new Map<string, string>();
    for (const [sefirah, scene] of Object.entries(PLACE_SCENES)) {
      const picture = draw(scene, 0);
      const clash = seen.get(picture);
      expect(clash, `${sefirah} is the same shape as ${clash}, differing only in hue`).toBeUndefined();
      seen.set(picture, sefirah);
    }
  });
});
