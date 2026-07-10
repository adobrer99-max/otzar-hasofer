import { describe, it, expect } from "vitest";
import { CENTRAL_ZONES, FOURTH_ZONE, zoneById, ringSliceAt, sliceCenterAngle, wedgePath, RING_MONTH_ORDER } from "./zones";

describe("central zones", () => {
  it("defines one hand, three letters, three gates, three wells, a veiled, and a tree zone", () => {
    const byKind = (k: string) => CENTRAL_ZONES.filter((z) => z.kind === k);
    expect(byKind("hand")).toHaveLength(1);
    expect(byKind("letter")).toHaveLength(3);
    expect(byKind("gate")).toHaveLength(3);
    expect(byKind("well")).toHaveLength(3);
    expect(byKind("veiled")).toHaveLength(1);
    expect(byKind("tree")).toHaveLength(1);
  });

  it("gives every zone a unique id resolvable via zoneById", () => {
    const ids = new Set(CENTRAL_ZONES.map((z) => z.id));
    expect(ids.size).toBe(CENTRAL_ZONES.length);
    for (const z of CENTRAL_ZONES) expect(zoneById(z.id)).toBe(z);
    expect(zoneById(FOURTH_ZONE.id)).toBe(FOURTH_ZONE);
    expect(zoneById("nope")).toBeUndefined();
  });

  it("orders the letters left to right", () => {
    const letters = CENTRAL_ZONES.filter((z) => z.kind === "letter").sort((a, b) => a.index! - b.index!);
    expect(letters[0].cx).toBeLessThan(letters[1].cx);
    expect(letters[1].cx).toBeLessThan(letters[2].cx);
  });
});

describe("ring slice math", () => {
  it("maps angles to slices (0deg = top, clockwise)", () => {
    expect(ringSliceAt(0, 12)).toBe(0);
    expect(ringSliceAt(15, 12)).toBe(0);
    expect(ringSliceAt(30, 12)).toBe(1);
    expect(ringSliceAt(359, 12)).toBe(11);
    expect(ringSliceAt(360, 12)).toBe(0);
    expect(ringSliceAt(-30, 12)).toBe(11);
  });

  it("returns the slice center angle", () => {
    expect(sliceCenterAngle(12, 0)).toBe(15);
    expect(sliceCenterAngle(12, 1)).toBe(45);
    expect(sliceCenterAngle(8, 0)).toBe(22.5);
  });

  it("round-trips angle -> slice -> center within the slice", () => {
    for (let i = 0; i < 12; i++) {
      expect(ringSliceAt(sliceCenterAngle(12, i), 12)).toBe(i);
    }
  });

  it("builds a closed wedge path", () => {
    const d = wedgePath(200, 30, 0, 30);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trim().endsWith("Z")).toBe(true);
    expect((d.match(/A /g) ?? []).length).toBe(2); // outer + inner arc
  });
});

describe("ring month order", () => {
  it("has the twelve months aligned with the Mazalot ring, Nisan first", () => {
    expect(RING_MONTH_ORDER).toHaveLength(12);
    expect(RING_MONTH_ORDER[0]).toBe("Nisan");
    expect(RING_MONTH_ORDER).toContain("Adar");
  });
});
