import type { LetterDraw } from "../../types/herald";

export interface Division {
  letterId: string;
  orientation: "upright" | "reversed";
  /** How many of the 3 open draws resolved to this letter (1-3). */
  count: number;
  /** 0 = first drawn, 1 = second, 2 = third (by first occurrence). */
  drawOrder: number;
  /** x-band this division occupies, as [start, end] fractions of the shield width. */
  band: [number, number];
}

/**
 * Reduces the three open letter draws to their distinct letters (1-3),
 * ordered by first draw, and assigns each a shield x-band. The first-drawn
 * distinct letter always gets the widest/most central band.
 */
export function computeDivisions(drawnLetters: [LetterDraw, LetterDraw, LetterDraw]): Division[] {
  const seen = new Map<string, Division>();
  drawnLetters.forEach((draw, index) => {
    const existing = seen.get(draw.letterId);
    if (existing) {
      existing.count += 1;
    } else {
      seen.set(draw.letterId, {
        letterId: draw.letterId,
        orientation: draw.orientation,
        count: 1,
        drawOrder: index,
        band: [0, 0],
      });
    }
  });

  const distinct = Array.from(seen.values()).sort((a, b) => a.drawOrder - b.drawOrder);

  if (distinct.length === 1) {
    distinct[0].band = [0, 1];
  } else if (distinct.length === 2) {
    // First-drawn distinct letter gets the larger, more central share.
    distinct[0].band = [0, 0.58];
    distinct[1].band = [0.58, 1];
  } else {
    // Tierced: first-drawn takes the wider center column.
    const [first, second, third] = distinct;
    const sideWidth = (1 - 0.4) / 2;
    return [
      { ...second, band: [0, sideWidth] },
      { ...first, band: [sideWidth, sideWidth + 0.4] },
      { ...third, band: [sideWidth + 0.4, 1] },
    ];
  }

  return distinct;
}
