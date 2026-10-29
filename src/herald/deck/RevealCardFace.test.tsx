import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RevealCardFace } from "./RevealCardFace";
import { lettersById } from "../../data/letters";
import { applyCardArt, clearCardArt } from "../../cloud/applyCardArt";

const SRC = "https://x.supabase.co/storage/v1/object/public/card-art/bet.jpg";

describe("RevealCardFace", () => {
  afterEach(() => clearCardArt("letter:bet"));

  it("shows an open card's uploaded art beneath its glyph and name", () => {
    applyCardArt([{ id: "letter:bet", src: SRC, alt: "Bet art", credit: null }]);
    const html = renderToStaticMarkup(
      <RevealCardFace card={{ draw: { letterId: "bet", orientation: "upright" } }} letter={lettersById.bet} />,
    );
    expect(html).toContain(`src="${SRC}"`);
    expect(html).toContain(lettersById.bet.glyph);
    expect(html).toContain(lettersById.bet.name);
    expect(html).toContain("Upright");
  });

  it("never shows art on the sealed Sod card", () => {
    applyCardArt([{ id: "letter:bet", src: SRC, alt: "Bet art", credit: null }]);
    const html = renderToStaticMarkup(
      <RevealCardFace
        card={{ draw: { letterId: "bet", orientation: "upright" }, sealed: true }}
        letter={lettersById.bet}
      />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("The Sod — sealed");
  });

  it("turns a reversed card's glyph, and its art with it", () => {
    const plain = renderToStaticMarkup(
      <RevealCardFace card={{ draw: { letterId: "bet", orientation: "reversed" } }} letter={lettersById.bet} />,
    );
    expect(plain).not.toContain("<img");
    expect(plain).toContain("rotate(180deg)");
    expect(plain).toContain("Reversed — inward");

    applyCardArt([{ id: "letter:bet", src: SRC, alt: "Bet art", credit: null }]);
    const withArt = renderToStaticMarkup(
      <RevealCardFace card={{ draw: { letterId: "bet", orientation: "reversed" } }} letter={lettersById.bet} />,
    );
    expect(withArt).toMatch(/artReversed/);
  });
});
