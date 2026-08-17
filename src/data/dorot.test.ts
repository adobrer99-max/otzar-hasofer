import { describe, it, expect } from "vitest";
import { dorotHouses, dorotCards, dorotHousesById, cardsByHouse } from "./dorot";

describe("Derekh Ha'Dorot data integrity", () => {
  it("has 14 houses: one patriarchal and one matriarchal per lower sefirah", () => {
    expect(dorotHouses).toHaveLength(14);
    const sefirot = ["chesed", "gevurah", "tiferet", "netzach", "hod", "yesod", "malchut"];
    for (const sefirah of sefirot) {
      const houses = dorotHouses.filter((h) => h.sefirah === sefirah);
      expect(houses.map((h) => h.kind).sort()).toEqual(["matriarchal", "patriarchal"]);
    }
  });

  it("has 168 cards: 8 per patriarchal house, 16 per matriarchal house", () => {
    expect(dorotCards).toHaveLength(168);
    for (const house of dorotHouses) {
      const cards = cardsByHouse(house.id);
      expect(cards).toHaveLength(house.kind === "patriarchal" ? 8 : 16);
      expect(cards.map((c) => c.index)).toEqual(cards.map((_, i) => i + 1));
    }
  });

  it("has globally unique card ids that all resolve to a real house", () => {
    const ids = new Set(dorotCards.map((c) => c.id));
    expect(ids.size).toBe(dorotCards.length);
    for (const card of dorotCards) {
      expect(dorotHousesById[card.houseId]).toBeDefined();
    }
  });

  /**
   * **The Houses made whole — P10-7.** Every matriarchal card now carries the
   * patriarchal shape (title, practice, question) on top of its core energy.
   * The lints here are the batch gates the enrichment shipped through: a
   * title that merely repeats its episode is the exact thinness this pass
   * retired, and it must not creep back one card at a time.
   */
  it("gives every card a title of its own, a practice, and a question that asks", () => {
    for (const card of dorotCards) {
      expect(card.title.trim().length, card.id).toBeGreaterThan(0);
      expect(card.title, `${card.id} titles itself with its episode`).not.toBe(card.episode);
      expect(card.humanPractice?.trim(), `${card.id} has no practice`).toBeTruthy();
      expect(card.question?.trim().endsWith("?"), `${card.id}'s question does not ask`).toBe(true);
    }
    // Distinct titles within each House — sixteen cards may not share a name.
    for (const house of dorotHouses) {
      const titles = dorotCards.filter((c) => c.houseId === house.id).map((c) => c.title);
      expect(new Set(titles).size, `${house.id} repeats a title`).toBe(titles.length);
    }
    // And the matriarchal cards keep the line they always had.
    for (const card of dorotCards) {
      const house = dorotHouses.find((h) => h.id === card.houseId);
      if (house?.kind === "matriarchal") {
        expect(card.coreEnergy?.trim(), `${card.id} lost its core energy`).toBeTruthy();
      }
    }
  });

  it("gives every patriarchal card a practice + question, every matriarchal card a core energy", () => {
    for (const card of dorotCards) {
      const house = dorotHousesById[card.houseId];
      if (house.kind === "patriarchal") {
        expect(card.humanPractice, card.id).toBeTruthy();
        expect(card.question, card.id).toBeTruthy();
      } else {
        expect(card.coreEnergy, card.id).toBeTruthy();
      }
    }
  });
});
