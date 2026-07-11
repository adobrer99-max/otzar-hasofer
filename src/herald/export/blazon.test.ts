import { describe, it, expect } from "vitest";
import type { HeraldInputSnapshot } from "../../types/herald";
import { blazonForSnapshot, blazonToText, blazonToImagePrompt } from "./blazon";

const input: HeraldInputSnapshot = {
  path: "brit",
  hebrewName: "מלך",
  isFirstTime: true,
  drawnLetters: [
    { letterId: "mem", orientation: "upright" }, // water (Mother)
    { letterId: "lamed", orientation: "upright" }, // Libra (zodiac)
    { letterId: "kaf", orientation: "upright" }, // Sun (planet)
  ],
  veiledLetter: { letterId: "shin", orientation: "upright" },
  middah: "tiferet",
  geography: { mode: "land" },
  festivalId: "ordinary",
};

describe("blazonForSnapshot", () => {
  it("is deterministic and derives the drawn achievement", () => {
    const a = blazonForSnapshot(input);
    const b = blazonForSnapshot(input);
    expect(a).toEqual(b);
    expect(a.field.division).toBe("tierced in pale");
    // Water Mother letter casts the field.
    expect(a.field.elementCast?.element).toBe("Water");
    // Zodiac letter rises on the crest; planet letter stands at the base.
    expect(a.crest.kind).toBe("zodiac");
    expect(a.crest.signs).toContain("Libra");
    expect(a.planets.map((p) => p.planet)).toContain("Sun");
    // Tiferet → grape (the winning-Sefirah species).
    expect(a.mantling?.species).toBe("grape");
    // Gematria mem+lamed+kaf = 40+30+20 = 90.
    expect(a.gematria.total).toBe(90);
    // The name is woven but never named; the veiled letter never appears.
    expect(a.hiddenNameWoven).toBe(true);
    expect(a.charges.some((c) => c.letterId === "shin")).toBe(false);
  });

  it("honours a curated metal and species", () => {
    const b = blazonForSnapshot(input, { metal: "silver", mantlingSpecies: "olive" });
    expect(b.metal).toBe("silver");
    expect(b.mantling?.species).toBe("olive");
  });

  it("renders a text brief that never spells the hidden name", () => {
    const text = blazonToText(blazonForSnapshot(input), "מלך");
    expect(text).toContain("HERALD BLAZON");
    expect(text).toContain("blazon.json");
    // The hidden name is woven, not displayed in the arms description body.
    expect(text).toContain("woven into the border");
  });

  it("builds a deterministic image-generation prompt from the blazon", () => {
    const b = blazonForSnapshot(input);
    const p = blazonToImagePrompt(b, "מלך");
    expect(p).toBe(blazonToImagePrompt(b, "מלך"));
    // Illuminated-plate style cues.
    expect(p).toContain("illuminated");
    expect(p).toContain("vellum");
    // Derived elements: crest constellation, colour names (not hex), species, epithet slot.
    expect(p).toContain("Libra");
    expect(p).toContain("deep blue"); // Mem's tincture, named
    expect(p).not.toContain("#"); // no hex codes in the prompt
    expect(p).toContain("grape vines"); // Tiferet → grape mantling, richly phrased
    // Arms stay Hebrew-only; the veiled letter never appears.
    expect(p).toContain("Hebrew only");
    expect(p).not.toContain("Shin");
  });
});
