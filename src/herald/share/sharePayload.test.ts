import { describe, it, expect } from "vitest";
import { buildSharePayload, synthesisStatusText } from "./sharePayload";
import type { ParticipantRecord, HeraldLayer, HeraldInputSnapshot } from "../../types/herald";

function snapshot(letters: [string, string, string], veiled: string): HeraldInputSnapshot {
  return {
    path: "brit",
    isFirstTime: false,
    palmNotes: "PRIVATE PALM NOTES",
    drawnLetters: [
      { letterId: letters[0], orientation: "upright" },
      { letterId: letters[1], orientation: "upright" },
      { letterId: letters[2], orientation: "reversed" },
    ],
    veiledLetter: { letterId: veiled, orientation: "upright" },
    dominantMiddah: "chesed",
    geography: { mode: "land" },
    festivalId: "ordinary",
    reflection: "PRIVATE REFLECTION",
  } as unknown as HeraldInputSnapshot;
}

function layer(i: number, letters: [string, string, string], veiled: string): HeraldLayer {
  return {
    id: `l${i}`,
    participantId: "p1",
    layerIndex: i,
    createdAt: `2026-0${(i % 8) + 1}-01T00:00:00Z`,
    input: snapshot(letters, veiled),
    isOrigin: i === 0,
  };
}

const participant: ParticipantRecord = {
  id: "p1",
  displayName: "Rivka",
  hebrewName: "רבקה",
  path: "brit",
  createdAt: "2026-01-01T00:00:00Z",
  heraldicEpithet: { text: "Keeper of the Open Tent", sealedAt: "2026-06-01" },
} as unknown as ParticipantRecord;

describe("buildSharePayload", () => {
  const sevenLayers = Array.from({ length: 7 }, (_, i) =>
    // "tav" is used ONLY as the veiled letter, never drawn openly — so its id
    // must never appear anywhere in the serialized payload.
    layer(i, ["aleph", "bet", "gimel"], "tav"),
  );

  it("carries only the derived, veil-free Herald — no private fields survive", () => {
    const payload = buildSharePayload(participant, sevenLayers, { device: "glyph" });
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/veiled/i);
    expect(json).not.toMatch(/palm/i);
    expect(json).not.toMatch(/PRIVATE/);
    expect(json).not.toMatch(/reflection/i);
    expect(json).not.toContain("tav");
    expect(json).not.toContain('"input"');
  });

  it("snapshots a revealed status with the sealed epithet", () => {
    const payload = buildSharePayload(participant, sevenLayers);
    expect(payload.heraldForm.revealed).toBe(true);
    expect(payload.status).toBe("The Herald, revealed");
    expect(payload.epithet).toBe("Keeper of the Open Tent");
    expect(payload.publishedAt).toBeTruthy();
  });

  it("snapshots a forming status and withholds the epithet before the seventh", () => {
    const three = sevenLayers.slice(0, 3);
    const payload = buildSharePayload(participant, three);
    expect(payload.status).toBe("The Herald, forming — 3 of 7");
    expect(payload.epithet).toBeUndefined();
    expect(synthesisStatusText(payload.heraldForm)).toBe(payload.status);
  });
});
