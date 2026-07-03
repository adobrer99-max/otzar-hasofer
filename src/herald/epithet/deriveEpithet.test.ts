import { describe, it, expect } from "vitest";
import { deriveEpithet } from "./deriveEpithet";
import type { HeraldLayer, HeraldInputSnapshot, LetterDraw } from "../../types/herald";
import type { SefirahId } from "../../types/letter";

function draw(letterId: string): LetterDraw {
  return { letterId, orientation: "upright" };
}

function layer(
  layerIndex: number,
  letters: [string, string, string],
  middah: SefirahId,
): HeraldLayer {
  const input: HeraldInputSnapshot = {
    path: "brit",
    isFirstTime: layerIndex === 0,
    drawnLetters: [draw(letters[0]), draw(letters[1]), draw(letters[2])],
    veiledLetter: draw("tav"),
    middah,
    geography: { mode: "land" },
    festivalId: "ordinary",
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

const sevenBetHeavy: HeraldLayer[] = [
  layer(0, ["bet", "aleph", "gimel"], "chesed"),
  layer(1, ["bet", "dalet", "heh"], "chesed"),
  layer(2, ["bet", "vav", "zayin"], "gevurah"),
  layer(3, ["chet", "tet", "yod"], "chesed"),
  layer(4, ["kaf", "lamed", "mem"], "tiferet"),
  layer(5, ["nun", "samech", "ayin"], "hod"),
  layer(6, ["peh", "tzadi", "kuf"], "malchut"),
];

describe("deriveEpithet", () => {
  it("derives from the most recurrent letter and dominant middah", () => {
    const result = deriveEpithet(sevenBetHeavy);
    expect(result.dominantLetterId).toBe("bet");
    expect(result.dominantMiddah).toBe("chesed");
    expect(result.text).toBe("Keeper of the Open Tent, under the Sign of the Sheltering House");
  });

  it("is deterministic — identical input yields identical output", () => {
    expect(deriveEpithet(sevenBetHeavy)).toEqual(deriveEpithet(sevenBetHeavy));
  });

  it("breaks ties by which value reached the count first", () => {
    // aleph and bet both appear twice; aleph's 2nd occurrence lands first (layer 1, draw 1)
    // vs. bet's 2nd occurrence (layer 1, draw 2).
    const layers: HeraldLayer[] = [
      layer(0, ["aleph", "bet", "gimel"], "yesod"),
      layer(1, ["aleph", "bet", "dalet"], "netzach"),
      layer(2, ["heh", "vav", "zayin"], "netzach"),
      layer(3, ["chet", "tet", "yod"], "yesod"),
      layer(4, ["kaf", "lamed", "mem"], "tiferet"),
      layer(5, ["nun", "samech", "ayin"], "hod"),
      layer(6, ["peh", "tzadi", "kuf"], "malchut"),
    ];
    const result = deriveEpithet(layers);
    expect(result.dominantLetterId).toBe("aleph");
    // yesod and netzach both appear twice; yesod reached 2 at layer 3, netzach at layer 2.
    expect(result.dominantMiddah).toBe("netzach");
  });

  it("ignores readings beyond the seventh", () => {
    // gimel already appears once in layer 0, so counting this eighth reading
    // would take it to 4 — past bet's 3 — and flip the dominant letter.
    const withEighth = [...sevenBetHeavy, layer(7, ["gimel", "gimel", "gimel"], "gevurah")];
    expect(deriveEpithet(withEighth)).toEqual(deriveEpithet(sevenBetHeavy));
  });

  it("refuses fewer than seven layers", () => {
    expect(() => deriveEpithet(sevenBetHeavy.slice(0, 6))).toThrow();
  });
});
