import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardArtImage } from "./CardArtImage";

const art = { src: "/art/aleph.jpg", alt: "Aleph, the breath before speech", credit: "Illustrated by R." };

describe("CardArtImage", () => {
  it("renders the reading-page plate with alt text and credit", () => {
    const html = renderToStaticMarkup(<CardArtImage art={art} variant="figure" maxWidth={360} />);
    expect(html).toContain("<figure");
    expect(html).toContain(`alt="${art.alt}"`);
    expect(html).toContain("Illustrated by R.");
    expect(html).toContain("max-width:360px");
    expect(html).toContain('decoding="async"');
  });

  it("omits the caption when there is no credit", () => {
    const html = renderToStaticMarkup(<CardArtImage art={{ ...art, credit: undefined }} variant="figure" />);
    expect(html).not.toContain("<figcaption");
  });

  it("silences a decorative tile and loads it lazily", () => {
    const html = renderToStaticMarkup(<CardArtImage art={art} variant="tile" decorative />);
    expect(html).toContain('alt=""');
    expect(html).toContain('loading="lazy"');
  });
});
