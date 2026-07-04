import { describe, it, expect } from "vitest";
import { polarToCartesian, segmentAngles, circlePerimeterPoints, CENTER } from "./mizbeachGeometry";

describe("mizbeachGeometry", () => {
  it("polarToCartesian places known angles correctly (0=top, clockwise)", () => {
    const top = polarToCartesian(0, 0, 10, 0);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-10);

    const right = polarToCartesian(0, 0, 10, 90);
    expect(right.x).toBeCloseTo(10);
    expect(right.y).toBeCloseTo(0);

    const bottom = polarToCartesian(0, 0, 10, 180);
    expect(bottom.x).toBeCloseTo(0);
    expect(bottom.y).toBeCloseTo(10);

    const left = polarToCartesian(0, 0, 10, 270);
    expect(left.x).toBeCloseTo(-10);
    expect(left.y).toBeCloseTo(0);
  });

  it("segmentAngles divides the circle into equal, contiguous, non-overlapping segments", () => {
    const count = 12;
    const segments = Array.from({ length: count }, (_, i) => segmentAngles(count, i));
    expect(segments[0]).toEqual([0, 30]);
    expect(segments[11]).toEqual([330, 360]);
    for (let i = 1; i < count; i++) {
      expect(segments[i][0]).toBe(segments[i - 1][1]);
    }
  });

  it("circlePerimeterPoints returns the requested count, evenly spaced, centered on CENTER", () => {
    const points = circlePerimeterPoints(7, 100);
    expect(points).toHaveLength(7);
    expect(points[0].angle).toBe(0);
    expect(points[0].x).toBeCloseTo(CENTER.x);
    expect(points[0].y).toBeCloseTo(CENTER.y - 100);
  });

  it("is deterministic", () => {
    expect(circlePerimeterPoints(12, 200)).toEqual(circlePerimeterPoints(12, 200));
  });
});
