import { describe, expect, it } from "vitest";
import { HUSKS } from "../combat";
import { buildRegion } from "../world/build";
import { drawEntity, drawWorld, stoneInks } from "./draw";
import { paletteOf, PLACES, readPalette, type Palette } from "./palette";
import { recorder } from "./testCanvas";

const DARK: Palette = readPalette();
const VELLUM: Palette = { ...DARK, stone: "#cbbb90", stoneEdge: "#9c8955", bg: "#f4efe2", light: true };

/** The rgb of an `rgba(...)` string, without its alpha. */
const hue = (ink: string) => ink.replace(/,\s*[\d.]+\)$/, ")");

/**
 * **A figured stone has to be findable, and on one ground it was not.**
 *
 * `Tile.Maskit` is a piece of floor that gives way, and it sets itself a
 * standard no unit test had ever been pointed at: legible to a player who has
 * already been dropped once and is now looking, invisible to one who is
 * running. Everything else about it was proved — solid until stood on, empties,
 * mends as hewn stone, something comes up — and all of that can be true of a
 * tile nobody can see.
 *
 * It was not. The hatch expression was written out twice, and the seam was
 * written to sit beside one of the copies rather than against it: on vellum
 * both were `stoneEdge`, one at 0.75 and the other at 0.55. A line in the same
 * colour, at the same angle, among fifteen others. Photographed through the
 * `maskit` playtest script and measured off the picture: the strongest mark
 * anywhere on a figured tile came out at 1.54 contrast against its own stone,
 * where an ordinary hatched tile beside it reached 1.57. **The tell was quieter
 * than the texture it was hiding in.**
 *
 * These are the claims that would have caught it. They are about a difference
 * rather than a particular colour, in the discipline `testCanvas` sets out: a
 * test that pinned the seam to an exact ink would have to be rewritten every
 * time the ink changed, and would then be pinning whatever it was last
 * rewritten to.
 */
describe("the ink a stone is marked with", () => {
  it("does not draw the seam in the hatch's own colour, on either ground", () => {
    for (const [ground, palette] of [
      ["charcoal", DARK],
      ["vellum", VELLUM],
    ] as const) {
      const { hatch, seam } = stoneInks(palette);
      expect(seam, `the seam is the hatch exactly on ${ground}`).not.toBe(hatch);
      // And not the same ink at another opacity, which is what it was: a mark
      // has to differ in colour, or it is the texture again slightly harder.
      expect(hue(seam), `the seam is the hatch's colour on ${ground}`).not.toBe(hue(hatch));
    }
  });

  /**
   * And on **every Sefirah's palette**, not only the two the themes ship.
   *
   * `paletteOf` tints all ten places off the ground's base, so a seam and a
   * hatch that part company on charcoal can meet again somewhere up the Tree —
   * and a stone nobody can read in Binah is exactly as bad as one nobody can
   * read anywhere, while being far easier to miss.
   *
   * Deliberately a claim about **hue and not about strength**. The obvious
   * numeric rule — the seam must depart from its stone further than the hatch
   * does — is one this very bug would have passed: `stoneEdge` at 0.75 does
   * depart further than `stoneEdge` at 0.55, and it was still invisible,
   * because a darker line of the same colour at the same angle among fifteen
   * others reads as one of the fifteen. What makes a mark a mark here is that
   * it is not made of what surrounds it.
   */
  it("keeps them apart on all ten places, on both grounds", () => {
    for (const base of [DARK, VELLUM]) {
      for (const sefirah of Object.keys(PLACES)) {
        const { hatch, seam } = stoneInks(paletteOf(base, sefirah));
        const where = `${sefirah} on ${base.light ? "vellum" : "charcoal"}`;
        expect(hue(seam), `the seam is drawn in the hatch's colour at ${where}`).not.toBe(hue(hatch));
      }
    }
  });
});

/**
 * **The `light` grace, finally read.** It was declared in the `Grace` union,
 * granted by Yod, by David's bargain and by four festival gestures — and had
 * no consumer anywhere: Hanukkah's grace did nothing, and nothing failed. The
 * claim here is the `testCanvas` discipline: a *difference*, never a pinned
 * picture — the whole class of bug was that with and without were the same
 * frame, so the guard is that they can never be again.
 */
describe("the held light", () => {
  const frame = (lit: boolean) => {
    const world = buildRegion(1, 3, 1, false, 1);
    const { ctx, log } = recorder();
    drawWorld(ctx, world, { x: world.player.x - 200, y: 0 }, DARK, 800, 450, [], lit);
    return log();
  };

  it("draws a different frame when the grace is held", () => {
    expect(frame(true)).not.toBe(frame(false));
  });

  it("changes nothing when it is not held — the default is the old picture", () => {
    // Drawn with the argument omitted entirely, as every caller that predates
    // the grace draws: byte-identical to an explicit `false`.
    const world = buildRegion(1, 3, 1, false, 1);
    const { ctx, log } = recorder();
    drawWorld(ctx, world, { x: world.player.x - 200, y: 0 }, DARK, 800, 450, []);
    expect(log()).toBe(frame(false));
  });
});

describe("freed light remembers its shell", () => {
  /**
   * **Birur visible — the P15-1 claim, held as pictures.**
   *
   * A mote spawned by a break carries `from: HuskKind` and the painter varies
   * its *form* by it — corona reach, breathing rate, a small circling spark —
   * never its colour: the shells were twenty but the light is one, and a
   * shape survives both grounds and every festival palette where a tint would
   * not. Asserted as differences through the recording canvas rather than as
   * particular pictures (the P8 rule), so a retune of the form survives this
   * test and only sameness fails it.
   */
  const KINDS = Object.keys(HUSKS) as (keyof typeof HUSKS)[];
  const mote = (from?: (typeof KINDS)[number]) => {
    const { ctx, log } = recorder();
    drawEntity(ctx, { id: "m", kind: "mote", x: 96, y: 96, ...(from ? { from } : {}) }, DARK, 30);
    return log();
  };

  it("draws twenty freed motes as twenty pictures, and none as the plain one", () => {
    const plain = mote();
    const pictures = KINDS.map((k) => mote(k));
    expect(new Set(pictures).size, "two shells free identical light").toBe(KINDS.length);
    for (const [i, p] of pictures.entries()) {
      expect(p, `${KINDS[i]}'s freed mote is the scattered day-mote`).not.toBe(plain);
    }
  });

  it("leaves the scattered day-mote exactly as it always drew", () => {
    // No `from`, no change — the day's own light is not from a shell, and the
    // field must stay a renderer's fact about freed light only.
    expect(mote()).toBe(mote());
  });
});
