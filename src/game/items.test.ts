import { describe, expect, it } from "vitest";
import { abilities } from "./abilities";
import { keliById, keliFor, KELIM, powersFrom, synergiesIn } from "./items";
import { TOTAL_REGIONS } from "./regions";
import { buildRegion } from "./world/build";

/**
 * The vessels, and the line they must not cross.
 *
 * Twenty-two letters are the progression. A vessel changes numbers — how hard
 * a mark bites, how far it carries, how many lamps you are made of — and never
 * grants a verb, because an object that handed out a thirteenth verb would be
 * competing with the alphabet rather than furnishing it.
 *
 * The other thing asserted here is that a declared synergy *does something*. A
 * pair that reads well on a plate and changes no number is worse than no pair
 * at all, and the only way to know is to enumerate them.
 */

describe("the vessels", () => {
  it("grants no verb, and touches only what it is allowed to", () => {
    const allowed = new Set([
      "bite",
      "reach",
      "cooldown",
      "speed",
      "lamps",
      "iframes",
      "light",
      "pierces",
    ]);
    const verbs = new Set(abilities.filter((a) => a.kind === "verb").map((a) => a.verb));
    for (const keli of KELIM) {
      for (const key of Object.keys(keli.effect)) {
        expect(allowed.has(key), `${keli.id} touches "${key}"`).toBe(true);
        expect(verbs.has(key as never), `${keli.id} grants the verb "${key}"`).toBe(false);
      }
      for (const key of Object.keys(keli.synergy?.effect ?? {})) {
        expect(allowed.has(key), `${keli.id}'s synergy touches "${key}"`).toBe(true);
      }
    }
  });

  it("is a set of distinct objects, each of which says what it is", () => {
    expect(new Set(KELIM.map((k) => k.id)).size).toBe(KELIM.length);
    for (const keli of KELIM) {
      expect(keli.name.length, keli.id).toBeGreaterThan(2);
      expect(keli.hebrew.length, keli.id).toBeGreaterThan(1);
      expect(keli.found.length, `${keli.id} does not say what it is`).toBeGreaterThan(40);
      expect(Object.keys(keli.effect).length, `${keli.id} does nothing`).toBeGreaterThan(0);
    }
  });

  it("changes something for every vessel held", () => {
    for (const keli of KELIM) {
      const alone = powersFrom([keli.id]);
      const nothing = powersFrom([]);
      expect(alone, `${keli.id} held changes nothing`).not.toEqual(nothing);
    }
  });

  /** The reason to have more than one. A pair that reads well and does nothing is worse than no pair. */
  it("makes every declared synergy do something", () => {
    for (const keli of KELIM) {
      if (!keli.synergy) continue;
      const other = keli.synergy.with;
      expect(keliById[other], `${keli.id} pairs with an object that is not there`).toBeDefined();
      const apart = powersFrom([keli.id]);
      const together = powersFrom([keli.id, other]);
      const separately = powersFrom([other]);
      expect(together, `${keli.id} + ${other} is the same as holding them apart`).not.toEqual({
        ...apart,
        ...separately,
      });
      expect(Object.keys(keli.synergy.effect).length, `${keli.id}'s synergy is empty`).toBeGreaterThan(0);
      expect(keli.synergy.line.length, `${keli.id}'s synergy says nothing`).toBeGreaterThan(20);
      expect(synergiesIn([keli.id, other]).map((s) => s.keli.id)).toContain(keli.id);
      expect(synergiesIn([keli.id])).toEqual([]);
    }
  });

  /**
   * Quantities add and rates multiply, and the two must not be confused: a
   * second lamp has to be a second lamp, and two objects that each halve a
   * cooldown must not between them stop time.
   */
  it("adds quantities and multiplies rates", () => {
    const both = powersFrom(["kulmus", "izmel"]);
    expect(both.bite).toBeCloseTo(1.5 * 1.2, 5);
    expect(both.cooldown).toBeCloseTo(0.7, 5);
    expect(powersFrom(["ner"]).lamps).toBe(1);
    expect(powersFrom([]).cooldown).toBe(1);
    // An unknown id is ignored rather than throwing: a saved climb may name a
    // vessel a later version of the game no longer has.
    expect(powersFrom(["kulmus", "not-a-thing"])).toEqual(powersFrom(["kulmus"]));
  });

  it("lays the vessel it names into the rung itself", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      const keli = keliFor(region);
      for (const seed of [3, 91, 555]) {
        const world = buildRegion(region, seed);
        const found = world.entities.filter((e) => e.kind === "vessel");
        expect(found.length, `region ${region} seed ${seed}`).toBe(keli ? 1 : 0);
        if (keli) expect(found[0].ref).toBe(keli.id);
      }
    }
  });

  it("puts one vessel on every rung that can hold one, and none in the kingdom", () => {
    expect(keliFor(1), "the kingdom teaches; it does not furnish").toBeUndefined();
    const placed = new Set<string>();
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      const keli = keliFor(region);
      if (!keli) continue;
      expect(placed.has(keli.id), `${keli.id} is laid twice`).toBe(false);
      placed.add(keli.id);
    }
    expect(placed.size).toBe(KELIM.length);
  });
});
