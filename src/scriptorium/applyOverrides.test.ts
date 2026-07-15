import { describe, it, expect, beforeEach } from "vitest";
import { applyContentOverrides, revertEntry } from "./applyOverrides";
import { draftKey } from "./contentRegistry";
import type { DraftRecord } from "../storage/contentDraftsRepo";
import { lettersById } from "../data/letters";
import { encounters } from "../data/encounters";
import { sefirahHonorifics, getDefaultHonorific } from "../data/epithets";
import { liturgiesById } from "../data/liturgies";
import { dorotCards, dorotHousesById } from "../data/dorot";

const matriarchal = dorotCards.find((c) => dorotHousesById[c.houseId]?.kind === "matriarchal")!;

function draft(datasetId: Parameters<typeof draftKey>[0], entryId: string, fields: Record<string, string>): DraftRecord {
  return { key: draftKey(datasetId, entryId), fields, updatedAt: new Date().toISOString() };
}

describe("applyContentOverrides", () => {
  const shipped = {
    alephKeyword: lettersById.aleph.keyword,
    alephPrinciple: lettersById.aleph.eternalPrinciple,
    chesed: sefirahHonorifics.chesed,
    encounter2: encounters.find((e) => e.number === 2)!.question,
  };

  beforeEach(() => {
    // Restore anything a prior test mutated.
    revertEntry("letters", "aleph");
    revertEntry("epithets", "sefirah:chesed");
    revertEntry("encounters", "2");
    revertEntry("epithets", "default");
  });

  it("writes edited fields onto the live objects", () => {
    applyContentOverrides([
      draft("letters", "aleph", { keyword: "First Breath", eternalPrinciple: "<p>A <b>new</b> gloss.</p>" }),
      draft("epithets", "sefirah:chesed", { phrase: "Warden of the Welcome" }),
      draft("encounters", "2", { question: "<p>What must be divided?</p>" }),
    ]);
    expect(lettersById.aleph.keyword).toBe("First Breath");
    expect(lettersById.aleph.eternalPrinciple).toBe("<p>A <b>new</b> gloss.</p>");
    expect(sefirahHonorifics.chesed).toBe("Warden of the Welcome");
    expect(encounters.find((e) => e.number === 2)!.question).toBe("<p>What must be divided?</p>");
  });

  it("does not clobber base with empty or unchanged fields", () => {
    applyContentOverrides([
      draft("letters", "aleph", { keyword: "", eternalPrinciple: shipped.alephPrinciple }),
    ]);
    // Empty and identical-to-base fields are not emitted by the overlay.
    expect(lettersById.aleph.keyword).toBe(shipped.alephKeyword);
    expect(lettersById.aleph.eternalPrinciple).toBe(shipped.alephPrinciple);
  });

  it("overrides the default honorific and the liturgy + dorot datasets", () => {
    const liturgy = Object.values(liturgiesById)[0];
    applyContentOverrides([
      draft("epithets", "default", { phrase: "Keeper of the Scroll" }),
      draft("liturgy", liturgy.id, { english: "A new English rendering." }),
      draft("dorot-matriarchal", matriarchal.id, { humanPractice: "Offer welcome." }),
    ]);
    expect(getDefaultHonorific()).toBe("Keeper of the Scroll");
    expect(liturgiesById[liturgy.id].english).toBe("A new English rendering.");
    expect(matriarchal.humanPractice).toBe("Offer welcome.");
    // cleanup
    revertEntry("epithets", "default");
    revertEntry("liturgy", liturgy.id);
    revertEntry("dorot-matriarchal", matriarchal.id);
  });

  it("revertEntry restores the shipped values", () => {
    applyContentOverrides([draft("letters", "aleph", { keyword: "Temporary" })]);
    expect(lettersById.aleph.keyword).toBe("Temporary");
    revertEntry("letters", "aleph");
    expect(lettersById.aleph.keyword).toBe(shipped.alephKeyword);
  });
});
