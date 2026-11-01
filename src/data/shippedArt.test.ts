import { describe, expect, it } from "vitest";
import { shippedCardArt } from "./shippedCardArt.generated";
import { toArtRows, unknownArtIds } from "./shippedArt";
import { dorotCards } from "./dorot";

describe("shipped card art", () => {
  it("every committed image names a real letter or Dorot card", () => {
    // A misnamed file in public/art/ would ship but never show — fail here instead.
    expect(unknownArtIds(shippedCardArt)).toEqual([]);
  });

  it("defaults alt text to the card's own name, and keeps a given one", () => {
    const dorotId = dorotCards[0].id;
    const rows = toArtRows([
      { id: "letter:aleph", src: "/art/letters/aleph.jpg?v=1" },
      { id: `dorot:${dorotId}`, src: "/art/dorot/x.jpg?v=1", alt: "Given alt", credit: "R." },
      { id: "letter:nonsense", src: "/art/letters/nonsense.jpg?v=1" },
    ]);
    expect(rows).toEqual([
      { id: "letter:aleph", src: "/art/letters/aleph.jpg?v=1", alt: "Aleph — The Silent Genesis", credit: null },
      { id: `dorot:${dorotId}`, src: "/art/dorot/x.jpg?v=1", alt: "Given alt", credit: "R." },
    ]);
    expect(unknownArtIds([{ id: "letter:nonsense", src: "" }])).toEqual(["letter:nonsense"]);
  });
});
