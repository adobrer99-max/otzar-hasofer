import { describe, it, expect } from "vitest";
import { DATASETS, datasetsById, draftKey, parseDraftKey, type DatasetId } from "./contentRegistry";
import { overlayForDataset, serializeAll, draftedCount } from "./exportDrafts";
import type { DraftRecord } from "../storage/contentDraftsRepo";

describe("content registry", () => {
  it("has the expected structural entry counts per dataset", () => {
    const count = (id: DatasetId) => datasetsById[id].entries.length;
    // These are structural (the size of each deck), not gap counts.
    expect(count("festivals")).toBe(22); // 23 overrides minus "ordinary"
    expect(count("dorot-matriarchal")).toBe(112); // 7 matriarchal Houses × 16
    expect(count("liturgy")).toBe(14);
    expect(count("encounters")).toBe(7);
    expect(count("epithets")).toBe(30); // 7 honorifics + default + 22 emblems
    expect(count("letters")).toBe(22);
  });

  it("uses unique entry ids within each dataset", () => {
    for (const dataset of DATASETS) {
      const ids = dataset.entries.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("flags festival gaps exactly where the contemplative question is empty", () => {
    const festivals = datasetsById.festivals;
    for (const entry of festivals.entries) {
      expect(entry.isGap).toBe(entry.base.contemplativeQuestion.trim() === "");
    }
    // A real gap exists today, and it is the documented count.
    const gaps = festivals.entries.filter((e) => e.isGap).length;
    expect(gaps).toBe(20);
  });

  it("flags a matriarchal card as a gap when it lacks a practice or question", () => {
    const dorot = datasetsById["dorot-matriarchal"];
    // Every matriarchal card ships thin (no practice, no question) → all gaps.
    expect(dorot.entries.every((e) => e.isGap)).toBe(true);
  });

  it("round-trips draft keys", () => {
    const key = draftKey("liturgy", "havdalah");
    expect(key).toBe("liturgy::havdalah");
    expect(parseDraftKey(key)).toEqual({ datasetId: "liturgy", entryId: "havdalah" });
    expect(parseDraftKey("nonsense")).toBeUndefined();
    expect(parseDraftKey("bogus::x")).toBeUndefined();
  });
});

describe("export overlay", () => {
  const draft = (key: string, fields: Record<string, string>): DraftRecord => ({
    key,
    fields,
    updatedAt: "2026-07-11T00:00:00.000Z",
  });

  it("emits only non-empty fields that differ from the shipped value", () => {
    const shabbat = datasetsById.festivals.entries.find((e) => e.id === "shabbat")!;
    const drafts: DraftRecord[] = [
      // pesach: a brand-new question (a real edit) plus a gesture unchanged from base
      draft(draftKey("festivals", "pesach"), {
        gesture: "Depart", // equals the shipped value → dropped
        contemplativeQuestion: "What am I ready to leave behind?",
      }),
      // shabbat: re-typing the shipped question verbatim → nothing to export
      draft(draftKey("festivals", "shabbat"), {
        gesture: shabbat.base.gesture,
        contemplativeQuestion: shabbat.base.contemplativeQuestion,
      }),
      // whitespace-only → dropped
      draft(draftKey("festivals", "purim"), { contemplativeQuestion: "   " }),
    ];

    const overlay = overlayForDataset("festivals", drafts);
    expect(overlay).toEqual({
      pesach: { contemplativeQuestion: "What am I ready to leave behind?" },
    });
    expect(draftedCount("festivals", drafts)).toBe(1);
  });

  it("ignores drafts belonging to another dataset", () => {
    const drafts: DraftRecord[] = [
      draft(draftKey("liturgy", "havdalah"), { english: "A wholly new rendering." }),
    ];
    expect(overlayForDataset("festivals", drafts)).toEqual({});
    expect(overlayForDataset("liturgy", drafts)).toEqual({
      havdalah: { english: "A wholly new rendering." },
    });
  });

  it("combines datasets and stays valid, sorted JSON", () => {
    const drafts: DraftRecord[] = [
      draft(draftKey("festivals", "sukkot"), { contemplativeQuestion: "Where will I dwell?" }),
      draft(draftKey("letters", "aleph"), { keyword: "Breath" }),
    ];
    const parsed = JSON.parse(serializeAll(drafts));
    expect(parsed.festivals.sukkot).toEqual({ contemplativeQuestion: "Where will I dwell?" });
    expect(parsed.letters.aleph).toEqual({ keyword: "Breath" });
    expect(typeof parsed._note).toBe("string");
  });
});
