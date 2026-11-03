import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HeraldLayer, ParticipantRecord } from "../../types/herald";
import { buildSharePayload } from "../share/sharePayload";
import { SharedHeraldView } from "../share/SharedHeraldView";

const participant: ParticipantRecord = {
  id: "p1",
  displayName: "Dvora Keepsake",
  path: "brit",
  createdAt: "2026-01-01T00:00:00Z",
};

const layer: HeraldLayer = {
  id: "l1",
  participantId: "p1",
  layerIndex: 0,
  createdAt: "2026-02-01T12:00:00Z",
  isOrigin: true,
  input: {
    path: "brit",
    isFirstTime: true,
    drawnLetters: [
      { letterId: "aleph", orientation: "upright" },
      { letterId: "bet", orientation: "upright" },
      { letterId: "gimel", orientation: "upright" },
    ],
    // The Sod — Tav — must never reach the keepsake.
    veiledLetter: { letterId: "tav", orientation: "upright" },
    middah: "tiferet",
    geography: { mode: "land" },
    festivalId: "ordinary",
    reflection: "PRIVATE-REFLECTION",
    palmNotes: "PRIVATE-PALM",
  },
};

describe("the keepsake", () => {
  it("shows the Herald's name and status, and nothing private", () => {
    const html = renderToStaticMarkup(
      <SharedHeraldView payload={buildSharePayload(participant, [layer])} dateLabel="Given" />,
    );
    expect(html).toContain("Dvora Keepsake");
    expect(html).toContain("The Herald, forming — 1 of 7");
    expect(html).toContain("Given ");
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain("ת"); // the Sod's glyph
    expect(html).not.toContain("Tav");
  });
});
