import { describe, expect, it } from "vitest";
import type { FestivalId } from "../types/festival";
import { festivals } from "../data/festivals";
import { GATE_ROOMS } from "./world/chunks";
import { nigunimById } from "./audio/nigunim";
import { FESTIVAL_RULES, festivalKnob } from "./festivalRules";

/**
 * **The one table for what a day does, held to its word.**
 *
 * Exhaustiveness is the compiler's (`Record<FestivalId, …>`); what needs a
 * runtime witness is that every id a rule points at is real — a nigun in the
 * catalogue, a chamber in `GATE_ROOMS` — and that the consolidation of
 * `DAY_EFFECTS` into this table was an absorption and not a balance pass.
 */
describe("the festival rules", () => {
  it("names only nigunim the catalogue holds and rooms the library lays", () => {
    for (const [id, rule] of Object.entries(FESTIVAL_RULES)) {
      if (!rule) continue;
      if (rule.nigun) expect(nigunimById[rule.nigun], `${id} sings nothing`).toBeDefined();
      if (rule.gateRoom) {
        expect(
          GATE_ROOMS.some((c) => c.id === rule.gateRoom),
          `${id} opens onto a room that is not laid`,
        ).toBe(true);
      }
    }
  });

  /**
   * The shipped multipliers, byte for byte — the values every committed band
   * was measured under. A retune is a decision with a band sweep behind it,
   * not a side effect of moving a table; this is what makes that a failure
   * instead of a diff nobody reads.
   */
  it("kept every light multiplier the old table shipped", () => {
    const shipped: Partial<Record<FestivalId, number>> = {
      shabbat: 1.4,
      hanukkah: 1.5,
      tubishvat: 1.3,
      sukkot: 1.3,
      pesach: 1.3,
      shavuot: 1.4,
      "rosh-hashanah": 1.2,
      purim: 1.2,
      "yom-kippur": 0.7,
      tishabav: 0.55,
      "fast-of-gedaliah": 0.75,
      "tenth-of-tevet": 0.75,
      "seventeenth-of-tammuz": 0.75,
      "fast-of-esther": 0.75,
    };
    for (const [id, light] of Object.entries(shipped)) {
      expect(FESTIVAL_RULES[id as FestivalId]?.light, id).toBe(light);
    }
    // And nothing new grew a multiplier in the move.
    for (const [id, rule] of Object.entries(FESTIVAL_RULES)) {
      if (rule?.light !== undefined && !(id in shipped)) {
        throw new Error(`${id} gained a light multiplier the old table never had`);
      }
    }
  });

  /**
   * Per-knob winners, not per-rule: on a Shabbat inside Sukkot the booth is
   * the room and Shabbat is still the tune — a whole-rule winner would have
   * silenced it, and `FESTIVAL_NIGUNIM` never did.
   */
  it("lets each knob find its own first winner", () => {
    const active: FestivalId[] = ["sukkot", "shabbat"];
    expect(festivalKnob(active, "gateRoom")).toBe("word-gate-sukkah");
    expect(festivalKnob(active, "nigun")).toBe("hevenu-shalom-aleichem");
    expect(festivalKnob([], "nigun")).toBeUndefined();
  });

  it("covers every festival the calendar authors, and no more", () => {
    expect(Object.keys(FESTIVAL_RULES).sort()).toEqual(festivals.map((f) => f.id).sort());
  });
});
