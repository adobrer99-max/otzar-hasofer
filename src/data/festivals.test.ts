import { describe, expect, it } from "vitest";
import type { FestivalId } from "../types/festival";
import { festivals, festivalsById } from "./festivals";

/**
 * **The union and the table, held together from both ends.**
 *
 * `FestivalOverride.id` is `FestivalId` now, so an entry authored with an id
 * outside the union fails to compile — that direction is the compiler's. This
 * file holds the other: a member added to the union without an entry here
 * would be a named day the calendar can never produce, invisible to every
 * table keyed by the type, and nothing at build time would say so.
 */
describe("the calendar's names", () => {
  it("authors an entry for every member of FestivalId", () => {
    // A Record over the union is the exhaustiveness proof: a missing member
    // fails to compile, and the values are checked against the table.
    const everyId: Record<FestivalId, true> = {
      ordinary: true,
      shabbat: true,
      pesach: true,
      sukkot: true,
      "high-holy-days": true,
      "rosh-hashanah": true,
      "yom-kippur": true,
      purim: true,
      shavuot: true,
      tishabav: true,
      tubishvat: true,
      tubav: true,
      hanukkah: true,
      "simchat-torah": true,
      "lag-baomer": true,
      "fast-of-gedaliah": true,
      "tenth-of-tevet": true,
      "seventeenth-of-tammuz": true,
      "fast-of-esther": true,
      "yom-hashoah": true,
      "yom-hazikaron": true,
      "yom-haatzmaut": true,
      "yom-yerushalayim": true,
    };
    for (const id of Object.keys(everyId) as FestivalId[]) {
      expect(festivalsById[id], `FestivalId "${id}" has no authored entry`).toBeDefined();
    }
    expect(festivals).toHaveLength(Object.keys(everyId).length);
  });

  it("gives every named day a date rule, except the ordinary one", () => {
    for (const f of festivals) {
      if (f.id === "ordinary") expect(f.dateRule).toBeUndefined();
      else expect(f.dateRule, `${f.id} cannot be detected`).toBeDefined();
    }
  });
});

describe("the calendar's own words", () => {
  /**
   * P10-5 retired two shipped placeholders: nine entries carried the literal
   * string "No ritual override defined yet." and twenty-one of twenty-three
   * had no contemplative question at all. These hold the fills to the same
   * standard the fast-day notes were held to — distinct words for distinct
   * days, never one sentence stamped across a family.
   */
  it("gives every day a question of its own", () => {
    for (const f of festivals) {
      expect(f.contemplativeQuestion, `${f.id} has no question`).toBeDefined();
      expect(f.contemplativeQuestion!.trim().endsWith("?"), `${f.id}'s question does not ask`).toBe(true);
    }
    const all = festivals.map((f) => f.contemplativeQuestion);
    expect(new Set(all).size, "two days share a question").toBe(festivals.length);
  });

  it("leaves no ritual unwritten, and no two fasts with one sentence", () => {
    for (const f of festivals) {
      expect(f.ritualMechanic, `${f.id}`).not.toContain("No ritual override defined yet");
    }
    const fasts = festivals
      .filter((f) => f.id.startsWith("fast-") || f.id === "tenth-of-tevet" || f.id === "seventeenth-of-tammuz")
      .map((f) => f.ritualMechanic);
    expect(new Set(fasts).size, "the fasts share a ritual sentence").toBe(fasts.length);
  });
});

