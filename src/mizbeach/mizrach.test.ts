import { describe, it, expect } from "vitest";
import { bearingToJerusalem, compassPoint, JERUSALEM } from "./mizrach";

describe("bearingToJerusalem", () => {
  const cases: [string, number, number, number][] = [
    ["New York", 40.7128, -74.006, 54.06],
    ["London", 51.5074, -0.1278, 113.59],
    ["Tel Aviv", 32.0853, 34.7818, 128.45],
    ["Sydney", -33.8688, 151.2093, 286.73],
    ["Johannesburg", -26.2041, 28.0473, 7.18],
    ["Moscow", 55.7558, 37.6173, 184.98],
  ];

  it.each(cases)("from %s ≈ %f°", (_name, lat, lon, expected) => {
    const bearing = bearingToJerusalem(lat, lon);
    expect(Math.abs(bearing - cases.find(([n]) => n === _name)![3])).toBeLessThan(2);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
    void expected;
  });

  it("from Jerusalem itself returns 0", () => {
    expect(bearingToJerusalem(JERUSALEM.lat, JERUSALEM.lon)).toBe(0);
  });

  it("stays finite and in range at the poles", () => {
    for (const lat of [90, -90]) {
      const b = bearingToJerusalem(lat, 0);
      expect(Number.isFinite(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });
});

describe("compassPoint", () => {
  it("names the cardinal and intermediate winds", () => {
    expect(compassPoint(0)).toBe("north");
    expect(compassPoint(90)).toBe("east");
    expect(compassPoint(128)).toBe("southeast");
    expect(compassPoint(113.59)).toBe("east-southeast");
    expect(compassPoint(225)).toBe("southwest");
  });
  it("wraps near north", () => {
    expect(compassPoint(353)).toBe("north");
    expect(compassPoint(340)).toBe("north-northwest");
    expect(compassPoint(-7)).toBe("north");
  });
});
