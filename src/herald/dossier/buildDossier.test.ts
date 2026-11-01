import { describe, expect, it } from "vitest";
import type { HeraldLayer, ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import { buildDossier, PRIVATE_DEFAULTS } from "./buildDossier";

const participant: ParticipantRecord = {
  id: "p1",
  displayName: "Dvora",
  hebrewName: "דבורה",
  path: "brit",
  createdAt: "2026-01-01T00:00:00Z",
  hebrewBirthDate: { year: 5750, month: "Nisan", day: 10 },
};

function layer(index: number, over: Partial<HeraldLayer["input"]> = {}): HeraldLayer {
  return {
    id: `l${index}`,
    participantId: "p1",
    layerIndex: index,
    createdAt: `2026-0${index + 1}-15T12:00:00Z`,
    isOrigin: index === 0,
    input: {
      path: "brit",
      isFirstTime: index === 0,
      drawnLetters: [
        { letterId: "aleph", orientation: "upright" },
        { letterId: "bet", orientation: "reversed" },
        { letterId: "gimel", orientation: "upright" },
      ],
      veiledLetter: { letterId: "shin", orientation: "upright" },
      middah: "tiferet",
      geography: { mode: "galut", place: "Toronto" },
      festivalId: "ordinary",
      reflection: "PRIVATE-REFLECTION",
      palmNotes: "PRIVATE-PALM",
      dorotDraws: [],
      ...over,
    },
  };
}

const conversion: LifeCycleEvent = {
  id: "e1",
  participantId: "p1",
  type: "conversion",
  hebrewDate: { year: 5780, month: "Elul", day: 3 },
  gregorianDateOfEvent: "2020-08-23",
  beitDin: "PRIVATE-BEIT-DIN",
  notes: "PRIVATE-NOTE",
  createdAt: "2020-08-23T00:00:00Z",
};

describe("buildDossier", () => {
  it("leaves out the Sod, reflections, palm notes and event notes by default", () => {
    const dossier = buildDossier(participant, [layer(0), layer(1)], [conversion]);
    const json = JSON.stringify(dossier);
    expect(json).not.toContain("PRIVATE");
    expect(json).not.toContain("Shin");
    expect(dossier.readings.every((r) => r.sod === undefined)).toBe(true);
  });

  it("includes each private part only when it is opted in", () => {
    const dossier = buildDossier(participant, [layer(0)], [conversion], {
      ...PRIVATE_DEFAULTS,
      includeSod: true,
      includeEventNotes: true,
    });
    expect(dossier.readings[0].sod?.name).toBe("Shin");
    expect(dossier.events[0].notes).toContain("PRIVATE-BEIT-DIN");
    expect(JSON.stringify(dossier)).not.toContain("PRIVATE-REFLECTION");
    expect(JSON.stringify(dossier)).not.toContain("PRIVATE-PALM");
  });

  it("orders readings and names their letters, orientation and middah", () => {
    const dossier = buildDossier(participant, [layer(1), layer(0)], []);
    expect(dossier.readings.map((r) => r.title)).toEqual(["The Origin Herald", "Reading 2"]);
    const [first] = dossier.readings;
    expect(first.letters.map((l) => [l.name, l.reversed])).toEqual([
      ["Aleph", false],
      ["Bet", true],
      ["Gimel", false],
    ]);
    expect(first.middah).toBeTruthy();
    expect(first.geography).toBe("In the galut — Toronto");
    expect(dossier.birthday).toBe("10 Nisan 5750");
  });

  it("shows the Yichud spread's fourth openly — there it is paired, not sealed", () => {
    const dossier = buildDossier(participant, [layer(0, { spread: "yichud" })], [], {
      ...PRIVATE_DEFAULTS,
      includeSod: true,
    });
    expect(dossier.readings[0].fourth?.name).toBe("Shin");
    expect(dossier.readings[0].sod).toBeUndefined();
  });
});
