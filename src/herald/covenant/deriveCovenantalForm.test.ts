import { describe, it, expect } from "vitest";
import { deriveCovenantalForm } from "./deriveCovenantalForm";
import type { HeraldLayer, HeraldInputSnapshot, LetterDraw } from "../../types/herald";
import type { UnionRecord } from "../../types/union";
import type { SefirahId } from "../../types/letter";

function d(letterId: string): LetterDraw {
  return { letterId, orientation: "upright" };
}

function layer(
  layerIndex: number,
  letters: [string, string, string],
  middah: SefirahId,
  geography: "land" | "galut" = "land",
): HeraldLayer {
  const input: HeraldInputSnapshot = {
    path: "brit",
    isFirstTime: layerIndex === 0,
    drawnLetters: [d(letters[0]), d(letters[1]), d(letters[2])],
    veiledLetter: d("tav"),
    middah,
    geography: { mode: geography },
    festivalId: "ordinary",
  };
  return {
    id: `l-${layerIndex}`,
    participantId: "p",
    layerIndex,
    createdAt: `2026-01-0${layerIndex + 1}T00:00:00.000Z`,
    input,
    isOrigin: layerIndex === 0,
  };
}

function makeUnion(days: number[] = []): UnionRecord {
  return {
    id: "u1",
    partnerAId: "a",
    partnerBId: "b",
    weddingGregorianDate: "2026-06-01",
    weddingHebrewDate: { year: 5786, month: "Sivan", day: 15 },
    shevaBrachot: days.map((day) => ({
      day,
      sefirah: (["chesed", "gevurah", "tiferet", "netzach", "hod", "yesod", "malchut"] as SefirahId[])[
        day - 1
      ],
      recordedAt: `2026-06-0${day}T00:00:00.000Z`,
    })),
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

// Partner A draws bet-heavy readings with chesed middot; B draws shin-heavy with hod.
const layersA = [layer(0, ["bet", "bet", "gimel"], "chesed"), layer(1, ["bet", "dalet", "heh"], "chesed")];
const layersB = [layer(0, ["shin", "shin", "kaf"], "hod"), layer(1, ["shin", "lamed", "mem"], "hod")];

describe("deriveCovenantalForm", () => {
  it("is deterministic", () => {
    expect(deriveCovenantalForm(layersA, layersB, makeUnion())).toEqual(
      deriveCovenantalForm(layersA, layersB, makeUnion()),
    );
  });

  it("impales the partners' dominant letters — A dexter, B sinister", () => {
    const form = deriveCovenantalForm(layersA, layersB, makeUnion());
    expect(form.dexterCharge.letterId).toBe("bet");
    expect(form.sinisterCharge.letterId).toBe("shin");
    // Swapping the partners swaps the sides.
    const swapped = deriveCovenantalForm(layersB, layersA, makeUnion());
    expect(swapped.dexterCharge.letterId).toBe("shin");
    expect(swapped.sinisterCharge.letterId).toBe("bet");
  });

  it("resolves the shared dominant to Tiferet when the partners' middot differ", () => {
    const form = deriveCovenantalForm(layersA, layersB, makeUnion());
    expect(form.dominantMiddah).toBe("tiferet");
    const agreeing = deriveCovenantalForm(layersA, [layer(0, ["shin", "shin", "kaf"], "chesed")], makeUnion());
    expect(agreeing.dominantMiddah).toBe("chesed");
  });

  it("accretes Sheva Brachot marks in day order as blessings are recorded", () => {
    expect(deriveCovenantalForm(layersA, layersB, makeUnion([])).shevaBrachotLit).toEqual([]);
    expect(deriveCovenantalForm(layersA, layersB, makeUnion([2, 1, 3])).shevaBrachotLit).toEqual([
      "chesed",
      "gevurah",
      "tiferet",
    ]);
    const dOne = deriveCovenantalForm(layersA, layersB, makeUnion([1])).ornamentDensity;
    const dThree = deriveCovenantalForm(layersA, layersB, makeUnion([1, 2, 3])).ornamentDensity;
    expect(dThree).toBeGreaterThan(dOne);
  });

  it("throws when a partner has no readings yet", () => {
    expect(() => deriveCovenantalForm([], layersB, makeUnion())).toThrow();
  });
});
