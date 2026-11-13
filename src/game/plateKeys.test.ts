import { describe, expect, it } from "vitest";
import { PLATE_MANNERS, PLATE_NAMES, plateKeyAction, type PlateKind } from "./plateKeys";

const KINDS = Object.keys(PLATE_MANNERS) as PlateKind[];

describe("what a key does to a plate", () => {
  it("leaves Enter and Space to the buttons of every plate that asks something", () => {
    const asking = KINDS.filter((k) => PLATE_MANNERS[k].is === "answer");
    // Named, so a plate quietly reclassified as a dismissal fails here.
    expect(asking.sort()).toEqual(["abyss", "house", "relic", "sealed", "vessel", "word-gate"]);
    for (const kind of asking) {
      expect(plateKeyAction(kind, "Enter")).toBe("none");
      expect(plateKeyAction(kind, "Space")).toBe("none");
    }
  });

  it("never seals, falls or walks on from an answer plate by Escape", () => {
    for (const kind of KINDS) {
      if (PLATE_MANNERS[kind].is !== "answer") continue;
      expect(["close", "none"]).toContain(plateKeyAction(kind, "Escape"));
    }
    // The seal is irreversible: Escape is the way out of it, not through it.
    expect(plateKeyAction("sealed", "Escape")).toBe("close");
    // The guest is spent on contact: no key leaves a House unanswered.
    expect(plateKeyAction("house", "Escape")).toBe("none");
  });

  it("makes the last lamp a fall on every key", () => {
    for (const key of ["Enter", "Escape", "Space"] as const) {
      expect(plateKeyAction("out", key)).toBe("fall");
    }
  });

  it("names every plate", () => {
    for (const kind of KINDS) expect(PLATE_NAMES[kind].length).toBeGreaterThan(0);
  });
});
