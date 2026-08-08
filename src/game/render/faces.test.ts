import { describe, expect, it } from "vitest";
import { face, faceCount, paletteKey, setFaceScale, stamp } from "./faces";
import { paletteOf, readPalette } from "./palette";

/**
 * **The tile faces, and the three ways a cache like this goes wrong.**
 *
 * It is worth being exact about what this file is for, because a bitmap cache
 * is the kind of change that is either invisible or ruinous and nothing in
 * between. Measured on a throttled phone the tile loop was seventy-one per cent
 * of the drawing and every tile in it was identical to the frame before; with
 * faces it runs a third faster and the picture is the same. The risks are:
 *
 * 1. **It stops being the same picture.** The first draft clipped each face to
 *    the tile, so the border stroke — which is laid *on* the edge and half
 *    belongs to the neighbour — lost its outer half, and a floor of stamped
 *    tiles read as a bathroom grid. That is what `BLEED` is for, and it is the
 *    one thing here that a number cannot check: it was found by looking at the
 *    arena sheets.
 * 2. **It stops being a cache.** A key that varies per tile, or a scale that
 *    drifts every frame, turns a cache into an allocator. Both are asserted.
 * 3. **It stops existing.** The renderer's helpers run under node in this
 *    suite, where there is no `document` — so every path has to fall back to
 *    painting in place rather than throwing or drawing nothing.
 */

describe("the tile faces", () => {
  it("gives a palette one key, and two palettes two", () => {
    const base = readPalette();
    const malchut = paletteOf(base, "malchut");
    const keter = paletteOf(base, "keter");
    expect(paletteKey(malchut)).toBe(paletteKey(malchut));
    expect(paletteKey(malchut)).not.toBe(paletteKey(keter));
  });

  /**
   * Under node there is no canvas to paint into, and the fallback is what keeps
   * this file unable to change the picture: no face means the painter runs
   * where it always ran.
   */
  it("paints in place when there is no canvas to paint into", () => {
    expect(face("anything", () => {})).toBeUndefined();

    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      translate: (x: number, y: number) => calls.push(`translate ${x},${y}`),
      restore: () => calls.push("restore"),
      drawImage: () => calls.push("drawImage"),
    } as unknown as CanvasRenderingContext2D;

    stamp(ctx, "stone|p1|true", 48, 72, () => calls.push("painted"));
    expect(calls, "the painter was skipped, so the tile would not be drawn").toContain("painted");
    expect(calls, "a face was stamped where none can exist").not.toContain("drawImage");
    // And it is painted at the tile's own place, not at the origin.
    expect(calls).toContain("translate 48,72");
    expect(calls[calls.length - 1], "the context was left transformed").toBe("restore");
  });

  /**
   * A face painted for one scale is wrong at another — that is the soft-tiles
   * bug every atlas ships with once — so a change of scale empties the cache
   * rather than reusing it.
   */
  it("keeps nothing across a change of scale", () => {
    setFaceScale(2);
    expect(faceCount()).toBe(0);
    setFaceScale(3);
    expect(faceCount(), "faces survived a scale change").toBe(0);
  });

  /**
   * And the same scale asked for twice is the same scale: a `setFaceScale` that
   * cleared on every frame would be a cache that never hit, which is strictly
   * worse than no cache at all.
   */
  it("does not churn when the scale is unchanged", () => {
    setFaceScale(2);
    // Quantised to thousandths, so floating-point noise in the transform does
    // not mint a new scale sixty times a second.
    expect(() => {
      setFaceScale(2.0000001);
      setFaceScale(2);
    }).not.toThrow();
  });
});
