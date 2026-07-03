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
