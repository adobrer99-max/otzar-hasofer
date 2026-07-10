import { describe, it, expect } from "vitest";
import { emptyReadingState, toSnapshot, type MizbeachReadingState } from "./reading";
import type { LetterDraw } from "../../types/herald";

function d(letterId: string): LetterDraw {
  return { letterId, orientation: "upright" };
}

/** A fully-placed ordinary reading. */
function placed(overrides: Partial<MizbeachReadingState> = {}): MizbeachReadingState {
  return {
    ...emptyReadingState(new Date(2026, 5, 1)), // an ordinary early-Sivan day
    letters: [d("aleph"), d("bet"), d("gimel")],
    veiled: d("tav"),
    middah: "chesed",
    ...overrides,
  };
}

describe("toSnapshot", () => {
  it("reports what is missing on an empty surface", () => {
    const res = toSnapshot(emptyReadingState(new Date(2026, 5, 1)), 0);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => /three drawn letters/i.test(e))).toBe(true);
      expect(res.errors.some((e) => /veiled/i.test(e))).toBe(true);
      expect(res.errors.some((e) => /middah/i.test(e))).toBe(true);
    }
  });

  it("assembles a triadic snapshot from placements", () => {
    const res = toSnapshot(placed(), 0);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.snapshot.drawnLetters.map((l) => l.letterId)).toEqual(["aleph", "bet", "gimel"]);
      expect(res.snapshot.veiledLetter.letterId).toBe("tav");
      expect(res.snapshot.middah).toBe("chesed");
      expect(res.snapshot.spread).toBeUndefined(); // triadic omits the field
      expect(res.snapshot.dorotDraws).toBeUndefined();
      expect(res.snapshot.encounterNumber).toBe(1); // readingIndex 0 -> Encounter 1
    }
  });

  it("requires and includes the fourth card on Tu Bishvat (etz-chaim)", () => {
    // Tu Bishvat 5786 = 2026-02-02.
    const base = placed({ effectiveDate: new Date(2026, 1, 2) });
    const missing = toSnapshot(base, 0);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.some((e) => /Fruit/i.test(e))).toBe(true);

    const complete = toSnapshot({ ...base, fourth: d("dalet") }, 0);
    expect(complete.ok).toBe(true);
    if (complete.ok) {
      expect(complete.snapshot.spread).toBe("etz-chaim");
      expect(complete.snapshot.fourthLetter?.letterId).toBe("dalet");
    }
  });

  it("requires and includes the three beneath cards in Galut", () => {
    const base = placed({ geoMode: "galut" });
    const missing = toSnapshot(base, 0);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.some((e) => /beneath/i.test(e))).toBe(true);

    const complete = toSnapshot(
      { ...base, beneathCards: ["abraham-1", "isaac-1", "jacob-1"] },
      0,
    );
    expect(complete.ok).toBe(true);
    if (complete.ok) {
      const roles = complete.snapshot.dorotDraws?.map((x) => x.role);
      expect(roles).toEqual(["beneath-first", "beneath-second", "beneath-third"]);
    }
  });

  it("forces the Galut beneath draws on Tisha B'Av even in the Land", () => {
    // Tisha B'Av 5786 = 2026-07-23.
    const base = placed({ effectiveDate: new Date(2026, 6, 23), geoMode: "land" });
    const missing = toSnapshot(base, 0);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.some((e) => /beneath/i.test(e))).toBe(true);
    const complete = toSnapshot({ ...base, beneathCards: ["abraham-1", "isaac-1", "jacob-1"] }, 0);
    expect(complete.ok).toBe(true);
    if (complete.ok) expect(complete.snapshot.festivalId).toBe("tishabav");
  });

  it("only sets hebrewName on the brit path", () => {
    const brit = toSnapshot(placed({ hebrewName: "אבִיבָה" }), 0);
    const noach = toSnapshot(placed({ path: "noach", hebrewName: "ignored" }), 0);
    expect(brit.ok && brit.snapshot.hebrewName).toBe("אבִיבָה");
    expect(noach.ok && noach.snapshot.hebrewName).toBeUndefined();
  });
});
