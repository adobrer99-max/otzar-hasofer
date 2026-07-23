import { describe, it, expect, afterEach } from "vitest";
import { applyCardArt, clearCardArt } from "./applyCardArt";
import { lettersById } from "../data/letters";
import { dorotCardsById } from "../data/dorot";

const SAMPLE_DOROT_ID = Object.keys(dorotCardsById)[0];

afterEach(() => {
  clearCardArt("letter:aleph");
  clearCardArt(`dorot:${SAMPLE_DOROT_ID}`);
});

describe("applyCardArt", () => {
  it("writes art onto a letter and a dorot card", () => {
    applyCardArt([
      { id: "letter:aleph", src: "https://cdn.example/aleph.jpg", alt: "Aleph, the ox", credit: "The Illustrator" },
      { id: `dorot:${SAMPLE_DOROT_ID}`, src: "https://cdn.example/d.jpg", alt: "An episode" },
    ]);
    expect(lettersById.aleph.art).toEqual({
      src: "https://cdn.example/aleph.jpg",
      alt: "Aleph, the ox",
      credit: "The Illustrator",
    });
    expect(dorotCardsById[SAMPLE_DOROT_ID].art).toEqual({
      src: "https://cdn.example/d.jpg",
      alt: "An episode",
      credit: undefined,
    });
  });

  it("ignores unknown ids and null credit becomes undefined", () => {
    applyCardArt([
      { id: "letter:notaletter", src: "x", alt: "x" },
      { id: "weird:aleph", src: "x", alt: "x" },
      { id: "letter:aleph", src: "https://cdn.example/a.jpg", alt: "A", credit: null },
    ]);
    expect(lettersById.notaletter).toBeUndefined();
    expect(lettersById.aleph.art?.credit).toBeUndefined();
  });

  it("is idempotent and clearCardArt removes the art", () => {
    const rows = [{ id: "letter:aleph", src: "https://cdn.example/a.jpg", alt: "A" }];
    applyCardArt(rows);
    applyCardArt(rows);
    expect(lettersById.aleph.art?.src).toBe("https://cdn.example/a.jpg");
    clearCardArt("letter:aleph");
    expect(lettersById.aleph.art).toBeUndefined();
  });
});
