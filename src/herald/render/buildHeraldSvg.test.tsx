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

  it("never renders the veiled letter as a charge", () => {
    const markup = render(sampleInput, 0);
    // Shin (veiled) must not appear as a charge; Aleph/Bet/Mem (open) must.
    // Asserted on stable data-charge markers, not font glyphs, so the guarantee
    // survives the letterform-to-path conversion.
    expect(markup).not.toContain('data-charge="shin"');
    expect(markup).toContain('data-charge="aleph"');
    expect(markup).toContain('data-charge="bet"');
    expect(markup).toContain('data-charge="mem"');
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
    expect(markup).toContain('data-spread="etz-chaim"');
    expect(markup).toContain('data-charge="aleph"');
    expect(markup).toContain('data-charge="bet"');
    expect(markup).toContain('data-charge="mem"');
    expect(markup).toContain('data-charge="dalet"'); // the Fruit
    expect(markup).toContain("Atzilut");
    expect(markup).toContain("Assiyah");
  });

  it("keeps the fifth card (Olam Ha'Ba, in the veiled slot) sealed and unrendered", () => {
    const markup = render(etzChaimInput, 0);
    expect(markup).not.toContain('data-charge="shin"');
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

  it("unveils the anchor — its charge is rendered this one spread", () => {
    const markup = render(yichudInput, 0);
    expect(markup).toContain('data-spread="yichud"');
    expect(markup).toContain('data-role="unveiled-anchor"');
    expect(markup).toContain('data-charge="shin"'); // the unveiled anchor
  });

  it("does not change the ordinary triadic render", () => {
    // The same input without the spread field must render as it always has.
    const markup = render(sampleInput, 0);
    expect(markup).not.toContain('data-spread="yichud"');
    expect(markup).not.toContain('data-role="unveiled-anchor"');
    expect(markup).not.toContain('data-charge="shin"');
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

describe("the Word of the Life fess", () => {
  it("bears a fess when the drawn letters spell a root, and none when they don't", () => {
    const rootInput: HeraldInputSnapshot = {
      ...sampleInput,
      drawnLetters: [
        { letterId: "mem", orientation: "upright" },
        { letterId: "lamed", orientation: "upright" },
        { letterId: "kaf", orientation: "upright" },
      ],
      veiledLetter: { letterId: "shin", orientation: "upright" },
    };
    expect(render(rootInput, 0)).toContain('data-role="fess"');
    // The Etz Chaim spread skips Shoresh resolution — no fess.
    const etz: HeraldInputSnapshot = {
      ...rootInput,
      festivalId: "tubishvat",
      spread: "etz-chaim",
      fourthLetter: { letterId: "dalet", orientation: "upright" },
    };
    expect(render(etz, 0)).not.toContain('data-role="fess"');
  });
});

describe("Scribe curation (HeraldStyle)", () => {
  it("is deterministic for the same input + style, and absent style is unchanged", () => {
    const withStyle = renderToStaticMarkup(
      <HeraldLayerContent input={sampleInput} layerCount={0} style={{ metal: "silver", crest: false }} />,
    );
    const again = renderToStaticMarkup(
      <HeraldLayerContent input={sampleInput} layerCount={0} style={{ metal: "silver", crest: false }} />,
    );
    expect(withStyle).toBe(again);
    // No style prop and an all-defaults style yield the same structure.
    const noStyle = render(sampleInput, 0);
    const defaultStyle = renderToStaticMarkup(<HeraldLayerContent input={sampleInput} layerCount={0} style={{}} />);
    expect(noStyle).toBe(defaultStyle);
  });

  it("changes the render when the curation changes", () => {
    const gold = renderToStaticMarkup(<HeraldLayerContent input={sampleInput} layerCount={0} style={{}} />);
    const silvered = renderToStaticMarkup(
      <HeraldLayerContent input={sampleInput} layerCount={0} style={{ metal: "silver" }} />,
    );
    expect(gold).not.toBe(silvered);
  });

  it("strikes each charge in flat gold foil over its letter's tincture, and draws no central tree", () => {
    const markup = render(sampleInput, 0);
    // Every open letter appears as a charge (stable data-charge marker, not a
    // font glyph); the veiled letter never does.
    expect(markup).toContain('data-charge="aleph"');
    expect(markup).toContain('data-charge="mem"');
    expect(markup).not.toContain('data-charge="shin"');
    // The charges are struck in the achievement's flat gold metal (foil-stamp
    // language) — the per-letter colour lives in the field tincture instead.
    expect(markup).toContain("var(--color-gold)");
    // No gradient enamel remains — the material is flat foil.
    expect(markup).not.toContain("url(#herald-glyph-");
    // The Sefirot tree no longer renders in the centre.
    expect(markup).not.toContain('data-role="dominant-node"');
  });

  it("gives different letters a different render (unique per individual)", () => {
    const other: HeraldInputSnapshot = {
      ...sampleInput,
      drawnLetters: [
        { letterId: "shin", orientation: "upright" },
        { letterId: "dalet", orientation: "upright" },
        { letterId: "heh", orientation: "upright" },
      ],
      veiledLetter: { letterId: "tav", orientation: "upright" },
    };
    expect(render(sampleInput, 0)).not.toBe(render(other, 0));
  });

  it("renders the heraldic charge device when curated, and letterforms by default", () => {
    const glyphMode = renderToStaticMarkup(<HeraldLayerContent input={sampleInput} layerCount={0} style={{ device: "glyph" }} />);
    const chargeMode = renderToStaticMarkup(<HeraldLayerContent input={sampleInput} layerCount={0} style={{ device: "charge" }} />);
    expect(glyphMode).not.toContain('data-device="charge"');
    expect(chargeMode).toContain('data-device="charge"');
    // The charge is still marked with its letter and remains deterministic.
    expect(chargeMode).toContain('data-charge="aleph"');
    expect(chargeMode).toBe(
      renderToStaticMarkup(<HeraldLayerContent input={sampleInput} layerCount={0} style={{ device: "charge" }} />),
    );
    // Default (no device) is the letterform, unchanged.
    expect(render(sampleInput, 0)).toBe(glyphMode);
  });

  it("gates the heraldic vocabulary by curation", () => {
    const withCrest = renderToStaticMarkup(<HeraldLayerContent input={sampleInput} layerCount={0} style={{ crest: true }} />);
    const noCrest = renderToStaticMarkup(<HeraldLayerContent input={sampleInput} layerCount={0} style={{ crest: false }} />);
    expect(withCrest).toContain('data-role="crest"');
    expect(noCrest).not.toContain('data-role="crest"');
  });
});

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
