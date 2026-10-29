import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { LetterTile } from "./LetterTile";
import { lettersById } from "../../data/letters";
import { applyCardArt, clearCardArt } from "../../cloud/applyCardArt";

function render() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LetterTile letter={lettersById.aleph} />
    </MemoryRouter>,
  );
}

describe("LetterTile", () => {
  afterEach(() => clearCardArt("letter:aleph"));

  it("draws the glyph alone when the letter has no art", () => {
    const html = render();
    expect(html).toContain("otz-letter__glyph");
    expect(html).not.toContain("<img");
    expect(html).toContain(lettersById.aleph.name);
  });

  it("carries uploaded art as a decorative face with the glyph as a badge", () => {
    applyCardArt([{ id: "letter:aleph", src: "https://x.supabase.co/a.jpg", alt: "Aleph art", credit: null }]);
    const html = render();
    expect(html).toContain('src="https://x.supabase.co/a.jpg"');
    // The name and keyword already name the card, so the image is silent.
    expect(html).toContain('alt=""');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("otz-letter__badge");
    expect(html).not.toContain("otz-letter__glyph");
    expect(html).toContain(lettersById.aleph.keyword);
  });
});
