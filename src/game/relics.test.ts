import { describe, expect, it } from "vitest";
import { KELIM } from "./items";
import { regions } from "./regions";
import { carried, CARRIED, relicAt, relicById, RELICS } from "./relics";

/**
 * **The Reliquary, enumerated.**
 *
 * The same discipline the silhouettes and the vessels are held to, and for the
 * same reason: a table can be checked and twenty hand-written objects cannot.
 * What is checked here is what has actually gone wrong before in this codebase —
 * a collection with a duplicate in it, an id that names nothing reaching a
 * plate, and a name colliding with another system's.
 */
describe("the hidden things", () => {
  it("lies one at every Sefirah that is the lower end of a path, and none at the crown", () => {
    // Malchut through Chochmah. Keter is never the lower end of anything, so
    // there is no path whose ground is the crown's and nothing to hide there —
    // which is also the right answer thematically, since the crown is what the
    // climb is toward rather than through.
    const held = regions.filter((r) => r.sefirah !== "keter");
    expect(RELICS).toHaveLength(held.length);
    for (const region of held) {
      expect(relicAt(region.sefirah), `nothing is hidden at ${region.sefirah}`).toBeDefined();
    }
    expect(relicAt("keter"), "something is hidden at the crown").toBeUndefined();
  });

  it("hides no two things in the same place, and no thing twice", () => {
    expect(new Set(RELICS.map((r) => r.sefirah)).size).toBe(RELICS.length);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length);
  });

  /**
   * **The collision that would undo the phase.** The twenty kelim already
   * include `tzintzenet` "The Jar", whose own `found` line quotes Shemot 16:32
   * and which therefore *is* the jar of manna, along with the Lampstand and the
   * Laver. A relic sharing a name with a vessel would erase the one distinction
   * the Reliquary exists to draw: a vessel is spent within a climb, a relic is
   * kept for good.
   */
  it("never names something the vessels have already taken", () => {
    const taken = new Set(KELIM.flatMap((k) => [k.id, k.name.toLowerCase(), k.hebrew]));
    for (const relic of RELICS) {
      expect(taken.has(relic.id), `${relic.id} is already a vessel`).toBe(false);
      expect(taken.has(relic.name.toLowerCase()), `${relic.name} is already a vessel`).toBe(false);
      expect(taken.has(relic.hebrew), `${relic.hebrew} is already a vessel`).toBe(false);
    }
  });

  /**
   * **Every relic is a bargain**, and both halves are said out loud. A relic
   * that only gave would be a permanent unconditional gain chosen three at a
   * time, which is the failure the guardian tiers were capped against; one
   * whose price was unwritten would be a trap.
   */
  it("gives one thing and takes one thing, and says both", () => {
    for (const relic of RELICS) {
      for (const [what, line] of [
        ["gives", relic.gives],
        ["takes", relic.takes],
        ["hidden", relic.hidden],
        ["source", relic.source],
      ] as const) {
        expect(line.length, `${relic.id} says nothing for ${what}`).toBeGreaterThan(12);
      }
      expect(relic.gives, `${relic.id} gives and takes the same thing`).not.toBe(relic.takes);
    }
    // And no two relics are the same bargain under two names.
    expect(new Set(RELICS.map((r) => r.gives)).size).toBe(RELICS.length);
    expect(new Set(RELICS.map((r) => r.takes)).size).toBe(RELICS.length);
  });

  it("names a source for every one, so the claim can be checked", () => {
    for (const relic of RELICS) {
      expect(relic.source, `${relic.id} cites nothing`).toMatch(/[—-]/);
    }
  });
});

/**
 * **What may actually be carried**, which is a question about storage rather
 * than about design: both of `carried`'s inputs come off a record, and a record
 * can be written by an older build or edited by hand. Neither may be able to
 * put a fourth relic in a Scribe's hand or an id that names nothing.
 */
describe("what a Scribe sets out with", () => {
  const all = RELICS.map((r) => r.id);

  it("carries only what has been found", () => {
    expect(carried(all, [])).toEqual([]);
    expect(carried(["aron"], ["shamir"]), "carried a relic never found").toEqual([]);
    expect(carried(["shamir"], ["shamir"]).map((r) => r.id)).toEqual(["shamir"]);
  });

  it("never carries more than the hand holds", () => {
    expect(carried(all, all)).toHaveLength(CARRIED);
  });

  it("carries nothing it cannot name, and nothing twice", () => {
    expect(carried(["a-thing-that-was-cut", "shamir"], [...all, "a-thing-that-was-cut"]).map((r) => r.id)).toEqual([
      "shamir",
    ]);
    expect(carried(["aron", "aron", "aron"], all).map((r) => r.id)).toEqual(["aron"]);
  });

  it("keeps the order they were chosen in", () => {
    expect(carried(["shamir", "aron", "esh"], all).map((r) => r.id)).toEqual(["shamir", "aron", "esh"]);
  });

  it("knows every id in the table", () => {
    for (const relic of RELICS) expect(relicById[relic.id]).toBe(relic);
  });
});
