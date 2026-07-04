import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HeraldInputSnapshot, HeraldLayer } from "../../types/herald";
import { HeraldLayerContent, HeraldSynthesisContent } from "./buildHeraldSvg";
import { deriveHeraldForm } from "../synthesis/deriveHeraldForm";

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

function layer(layerIndex: number, letters: [string, string, string], middah: string): HeraldLayer {
  return {
    id: `l-${layerIndex}`,
    participantId: "p",
    layerIndex,
    createdAt: `2026-01-0${layerIndex + 1}T00:00:00.000Z`,
    isOrigin: layerIndex === 0,
    input: {
      path: "brit",
      isFirstTime: layerIndex === 0,
      drawnLetters: [
        { letterId: letters[0], orientation: "upright" },
        { letterId: letters[1], orientation: "upright" },
        { letterId: letters[2], orientation: "upright" },
      ],
      veiledLetter: { letterId: "tav", orientation: "upright" },
      middah: middah as HeraldInputSnapshot["middah"],
      geography: { mode: "land" },
      festivalId: "ordinary",
    },
  };
}

const sevenLayers: HeraldLayer[] = [
  layer(0, ["bet", "aleph", "gimel"], "chesed"),
  layer(1, ["bet", "dalet", "heh"], "chesed"),
  layer(2, ["bet", "vav", "zayin"], "gevurah"),
  layer(3, ["chet", "tet", "yod"], "chesed"),
  layer(4, ["kaf", "lamed", "mem"], "tiferet"),
  layer(5, ["nun", "samech", "ayin"], "hod"),
  layer(6, ["peh", "tzadi", "kuf"], "malchut"),
];

describe("HeraldSynthesisContent determinism", () => {
  it("produces identical markup for the same derived form, twice", () => {
    const form = deriveHeraldForm(sevenLayers);
    const once = renderToStaticMarkup(<HeraldSynthesisContent form={form} />);
    const twice = renderToStaticMarkup(<HeraldSynthesisContent form={form} />);
    expect(once).toBe(twice);
  });

  it("differs between a forming (3 readings) and a revealed (7 readings) Herald", () => {
    const forming = renderToStaticMarkup(
      <HeraldSynthesisContent form={deriveHeraldForm(sevenLayers.slice(0, 3))} />,
    );
    const revealed = renderToStaticMarkup(<HeraldSynthesisContent form={deriveHeraldForm(sevenLayers)} />);
    expect(forming).not.toBe(revealed);
  });
});
