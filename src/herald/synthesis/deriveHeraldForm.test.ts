import { describe, it, expect } from "vitest";
import { deriveHeraldForm } from "./deriveHeraldForm";
import type { HeraldLayer, HeraldInputSnapshot, LetterDraw } from "../../types/herald";
import type { SefirahId } from "../../types/letter";

function d(letterId: string, orientation: LetterDraw["orientation"] = "upright"): LetterDraw {
  return { letterId, orientation };
}

function layer(
  layerIndex: number,
  letters: [string, string, string],
  middah: SefirahId,
  geography: "land" | "galut" = "land",
  festivalId = "ordinary",
): HeraldLayer {
  const input: HeraldInputSnapshot = {
    path: "brit",
    isFirstTime: layerIndex === 0,
    drawnLetters: [d(letters[0]), d(letters[1]), d(letters[2])],
    veiledLetter: d("tav"),
    middah,
    geography: { mode: geography },
    festivalId,
  };
  return {
    id: `layer-${layerIndex}`,
    participantId: "p",
    layerIndex,
    createdAt: `2026-01-0${layerIndex + 1}T00:00:00.000Z`,
    input,
    isOrigin: layerIndex === 0,
  };
}

// bet-heavy seven readings, middah mostly chesed
const seven: HeraldLayer[] = [
  layer(0, ["bet", "aleph", "gimel"], "chesed"),
  layer(1, ["bet", "dalet", "heh"], "chesed"),
  layer(2, ["bet", "vav", "zayin"], "gevurah"),
  layer(3, ["chet", "tet", "yod"], "chesed"),
  layer(4, ["kaf", "lamed", "mem"], "tiferet"),
  layer(5, ["nun", "samech", "ayin"], "hod"),
  layer(6, ["peh", "tzadi", "kuf"], "malchut"),
];

describe("deriveHeraldForm", () => {
  it("is deterministic — identical layers yield a deep-equal form", () => {
    expect(deriveHeraldForm(seven)).toEqual(deriveHeraldForm(seven));
  });

  it("progresses readingCount 1..7 and only reveals at the seventh", () => {
    for (let n = 1; n <= 7; n++) {
      const form = deriveHeraldForm(seven.slice(0, n));
      expect(form.readingCount).toBe(n);
      expect(form.revealed).toBe(n >= 7);
      expect(form.litSefirot).toHaveLength(n);
    }
  });

  it("lights the whole lower Tree in order after seven readings", () => {
    expect(deriveHeraldForm(seven).litSefirot).toEqual([
      "chesed",
      "gevurah",
      "tiferet",
      "netzach",
      "hod",
      "yesod",
      "malchut",
    ]);
  });

  it("takes its dominant letter and middah from the seven readings", () => {
    const form = deriveHeraldForm(seven);
    expect(form.charges[0].letterId).toBe("bet"); // appears 3x, more than any other
    expect(form.dominantMiddah).toBe("chesed"); // 3 of 7
  });

  it("stays fixed after the seventh reading (canon)", () => {
    const withEighth = [...seven, layer(7, ["resh", "resh", "resh"], "gevurah")];
    expect(deriveHeraldForm(withEighth)).toEqual(deriveHeraldForm(seven));
  });

  it("resolves geography by majority, ties to Land", () => {
    const mostlyGalut = seven.map((l, i) =>
      i < 4 ? layer(i, l.input.drawnLetters.map((x) => x.letterId) as [string, string, string], l.input.middah, "galut") : l,
    );
    expect(deriveHeraldForm(mostlyGalut).geography).toBe("galut");
    // exactly half galut → Land
    const half = seven.map((l, i) =>
      layer(i, l.input.drawnLetters.map((x) => x.letterId) as [string, string, string], l.input.middah, i < 3 ? "galut" : "land"),
    ).slice(0, 6);
    expect(deriveHeraldForm(half).geography).toBe("land");
  });

  it("pads charges when fewer than three distinct letters were drawn", () => {
    const sameLetter = [
      layer(0, ["shin", "shin", "shin"], "chesed"),
      layer(1, ["shin", "shin", "shin"], "chesed"),
    ];
    const form = deriveHeraldForm(sameLetter);
    expect(form.charges.every((c) => c.letterId === "shin")).toBe(true);
  });

  it("throws on an empty history", () => {
    expect(() => deriveHeraldForm([])).toThrow();
  });
});
