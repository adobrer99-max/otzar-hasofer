import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_STORES, backupDue, backupFilename, parseBackup, planMerge, type BackupStore } from "./backup";

const empty = () => Object.fromEntries(BACKUP_STORES.map((s) => [s, []])) as unknown as Record<BackupStore, Record<string, unknown>[]>;

function file(stores: Partial<Record<BackupStore, unknown[]>>, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: "2026-11-01T00:00:00Z", stores, ...extra });
}

describe("parseBackup", () => {
  it("accepts a backup and fills missing stores with empty lists", () => {
    const r = parseBackup(file({ participants: [{ id: "p1", displayName: "Dvora" }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.stores.participants).toHaveLength(1);
    expect(r.backup.stores.heraldLayers).toEqual([]);
    expect(r.skipped).toBe(0);
  });

  it("rejects what isn't a Treasury backup", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ hello: 1 })).ok).toBe(false);
    expect(parseBackup(file({}, { version: 99 }))).toMatchObject({ ok: false, error: expect.stringContaining("newer version") });
    expect(parseBackup(file({ participants: "nope" as unknown as unknown[] })).ok).toBe(false);
  });

  it("skips records without their key (drafts are keyed by `key`)", () => {
    const r = parseBackup(
      file({
        participants: [{ id: "p1" }, { displayName: "no id" }, 7],
        contentDrafts: [{ key: "letters::aleph", fields: {} }, { id: "wrong-field" }],
      }),
    );
    expect(r.ok && r.backup.stores.participants.length).toBe(1);
    expect(r.ok && r.backup.stores.contentDrafts.length).toBe(1);
    expect(r.ok && r.skipped).toBe(3);
  });
});

describe("planMerge", () => {
  it("adds what's missing, updates what's newer, and never rolls back", () => {
    const existing = empty();
    existing.participants = [
      { id: "same", createdAt: "2026-01-01" },
      { id: "older-here", createdAt: "2026-01-01", updatedAt: "2026-02-01" },
      { id: "newer-here", createdAt: "2026-01-01", updatedAt: "2026-05-01" },
    ];
    const incoming = empty();
    incoming.participants = [
      { id: "same", createdAt: "2026-01-01" },
      { id: "older-here", createdAt: "2026-01-01", updatedAt: "2026-03-01" },
      { id: "newer-here", createdAt: "2026-01-01", updatedAt: "2026-04-01" },
      { id: "brand-new", createdAt: "2026-06-01" },
    ];
    const { steps, counts } = planMerge(existing, incoming);
    expect(counts.participants).toEqual({ added: 1, updated: 1, unchanged: 2 });
    expect(steps.map((s) => [s.record.id, s.action])).toEqual([
      ["older-here", "update"],
      ["brand-new", "add"],
    ]);
  });

  it("restoring the same backup twice changes nothing the second time", () => {
    const incoming = empty();
    incoming.heraldLayers = [{ id: "l1", createdAt: "2026-01-01" }];
    const first = planMerge(empty(), incoming);
    const after = empty();
    after.heraldLayers = first.steps.map((s) => s.record);
    expect(planMerge(after, incoming).steps).toEqual([]);
  });
});

describe("backup reminder", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  it("stays quiet with nothing to keep", () => {
    expect(backupDue(null, false, now)).toBe(false);
  });
  it("nudges when there are readings and no backup, or an old one", () => {
    expect(backupDue(null, true, now)).toBe(true);
    expect(backupDue("2026-09-01T00:00:00Z", true, now)).toBe(true);
    expect(backupDue("2026-10-20T00:00:00Z", true, now)).toBe(false);
  });
});

describe("backupFilename", () => {
  it("dates the file", () => {
    expect(backupFilename(new Date(2026, 10, 1))).toBe("otzar-treasury-2026-11-01.json");
  });
});
