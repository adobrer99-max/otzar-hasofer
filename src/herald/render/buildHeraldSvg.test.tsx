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

describe("the hidden Hebrew-name geometry", () => {
  const named = sampleInput; // carries hebrewName "דוד"
  const unnamed: HeraldInputSnapshot = { ...sampleInput, hebrewName: undefined };

  it("renders deterministically with a name present", () => {
    expect(render(named, 0)).toBe(render(named, 0));
  });

  it("weaves the name into the border — different names, stably different output", () => {
    const otherName: HeraldInputSnapshot = { ...sampleInput, hebrewName: "רות" };
    expect(render(named, 0)).not.toBe(render(otherName, 0));
    expect(render(otherName, 0)).toBe(render(otherName, 0));
  });

  it("leaves the border untouched when there is no name (output as before the feature)", () => {
    // Border flourishes must carry translate-only transforms — the name's
    // rotation phase appears only when a name is present.
    const unnamedFlourishes = render(unnamed, 0).match(/translate\([^"]*\) rotate/g) ?? [];
    expect(unnamedFlourishes).toHaveLength(0);
    const namedFlourishes = render(named, 0).match(/translate\([^"]*\) rotate/g) ?? [];
    expect(namedFlourishes.length).toBeGreaterThan(0);
  });

  it("never displays the name itself", () => {
    expect(render(named, 0)).not.toContain("דוד");
  });
});

describe("the Etz Chaim spread (Tu Bishvat)", () => {
  const etzChaimInput: HeraldInputSnapshot = {
    ...sampleInput,
    festivalId: "tubishvat",
    spread: "etz-chaim",
    fourthLetter: { letterId: "dalet", orientation: "upright" },
  };

  it("renders deterministically", () => {
    expect(render(etzChaimInput, 0)).toBe(render(etzChaimInput, 0));
  });

  it("renders all four open letters, stacked as the Four Worlds", () => {
    const markup = render(etzChaimInput, 0);
    expect(markup).toContain("א");
    expect(markup).toContain("ב");
    expect(markup).toContain("מ");
    expect(markup).toContain("ד"); // the Fruit
    expect(markup).toContain("Atzilut");
    expect(markup).toContain("Assiyah");
  });

  it("keeps the fifth card (Olam Ha'Ba, in the veiled slot) sealed and unrendered", () => {
    const markup = render(etzChaimInput, 0);
    expect(markup).not.toContain("ש");
  });
});

describe("the Yichud spread (Tu B'Av)", () => {
  const yichudInput: HeraldInputSnapshot = {
    ...sampleInput,
    festivalId: "tubav",
    spread: "yichud",
  };

  it("renders deterministically", () => {
    expect(render(yichudInput, 0)).toBe(render(yichudInput, 0));
  });

  it("unveils the anchor — its glyph is rendered this one spread", () => {
    const markup = render(yichudInput, 0);
    expect(markup).toContain("ש"); // the unveiled anchor
    expect(markup).toContain("The Unveiled Anchor");
  });

  it("does not change the ordinary triadic render", () => {
    // The same input without the spread field must render as it always has.
    const markup = render(sampleInput, 0);
    expect(markup).not.toContain("ש");
    expect(markup).not.toContain("The Unveiled Anchor");
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
