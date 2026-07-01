import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HeraldInputSnapshot } from "../../types/herald";
import { HeraldLayerContent } from "./buildHeraldSvg";

const sampleInput: HeraldInputSnapshot = {
  path: "brit",
  hebrewName: "דוד",
  isFirstTime: true,
  drawnLetters: [
    { letterId: "aleph", orientation: "upright" },
    { letterId: "bet", orientation: "reversed" },
    { letterId: "mem", orientation: "upright" },
  ],
  veiledLetter: { letterId: "shin", orientation: "upright" },
  middah: "chesed",
  geography: { mode: "land" },
  festivalId: "ordinary",
};

function render(input: HeraldInputSnapshot, layerCount: number) {
  return renderToStaticMarkup(<HeraldLayerContent input={input} layerCount={layerCount} />);
}

describe("HeraldLayerContent determinism", () => {
  it("produces identical markup for identical input, called twice", () => {
    expect(render(sampleInput, 0)).toBe(render(sampleInput, 0));
  });

  it("produces different markup when a meaningful input changes", () => {
    const changed: HeraldInputSnapshot = {
      ...sampleInput,
      geography: { mode: "galut" },
    };
    expect(render(sampleInput, 0)).not.toBe(render(changed, 0));
  });

  it("never renders the veiled letter's glyph", () => {
    const markup = render(sampleInput, 0);
    // Shin (veiled) must not appear; Aleph/Bet/Mem (open) must.
    expect(markup).not.toContain("ש");
    expect(markup).toContain("א");
    expect(markup).toContain("ב");
    expect(markup).toContain("מ");
  });
});
