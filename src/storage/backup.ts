import { getDb } from "./db";
import { enqueueSync } from "./syncQueue";

/**
 * Backup and restore of the whole Treasury as one JSON file — the way a
 * Treasury moves between devices, or survives a cleared browser, when there
 * is no cloud. Restoring *merges*: a record the device lacks is added, one
 * the backup holds a newer copy of is updated, and nothing on the device is
 * ever deleted or rolled back to an older copy.
 */

export const BACKUP_FORMAT = "otzar-hasofer-treasury";
export const BACKUP_VERSION = 1;

/** The stores a backup carries, in the order they are listed to the Scribe. */
export const BACKUP_STORES = [
  "participants",
  "heraldLayers",
  "lifeCycleEvents",
  "commentaries",
  "unions",
  "contentDrafts",
  "ascents",
] as const;
export type BackupStore = (typeof BACKUP_STORES)[number];

export const STORE_LABELS: Record<BackupStore, string> = {
  participants: "participants",
  heraldLayers: "readings",
  lifeCycleEvents: "life-cycle events",
  commentaries: "commentaries",
  unions: "unions",
  contentDrafts: "Scriptorium drafts",
  ascents: "saved ascents",
};

/** The field each store is keyed by. */
const KEY_PATH: Record<BackupStore, string> = {
  participants: "id",
  heraldLayers: "id",
  lifeCycleEvents: "id",
  commentaries: "id",
  unions: "id",
  contentDrafts: "key",
  ascents: "id",
};

/** Stores the cloud sync engine carries (ascents stay on their device). */
const SYNCED: ReadonlySet<BackupStore> = new Set([
  "participants",
  "heraldLayers",
  "lifeCycleEvents",
  "commentaries",
  "unions",
  "contentDrafts",
]);

type AnyRecord = Record<string, unknown>;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  stores: Record<BackupStore, AnyRecord[]>;
}

export type ParseResult = { ok: true; backup: BackupFile; skipped: number } | { ok: false; error: string };

const isObject = (v: unknown): v is AnyRecord => typeof v === "object" && v !== null && !Array.isArray(v);

/** Check a file's shape before anything is written (pure). */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't a Treasury backup (it isn't JSON)." };
  }
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) {
    return { ok: false, error: "This file isn't a Treasury backup." };
  }
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION) {
    return { ok: false, error: "This backup was made by a newer version of the app — update the app, then restore." };
  }
  if (!isObject(raw.stores)) return { ok: false, error: "This backup is damaged (it has no records)." };

  let skipped = 0;
  const stores = {} as Record<BackupStore, AnyRecord[]>;
  for (const store of BACKUP_STORES) {
    const list = raw.stores[store];
    if (list !== undefined && !Array.isArray(list)) {
      return { ok: false, error: `This backup is damaged (its ${STORE_LABELS[store]} aren't a list).` };
    }
    stores[store] = [];
    for (const record of list ?? []) {
      if (isObject(record) && typeof record[KEY_PATH[store]] === "string" && record[KEY_PATH[store]] !== "") {
        stores[store].push(record);
      } else {
        skipped += 1;
      }
    }
  }
  return {
    ok: true,
    backup: { format: BACKUP_FORMAT, version: raw.version, exportedAt: String(raw.exportedAt ?? ""), stores },
    skipped,
  };
}

/** When a record last changed, for deciding which copy is newer. */
function stamp(record: AnyRecord): string {
  const value = record.updatedAt ?? record.createdAt;
  return typeof value === "string" ? value : "";
}

export interface MergeStep {
  store: BackupStore;
  record: AnyRecord;
  action: "add" | "update";
}

export interface MergeCounts {
  added: number;
  updated: number;
  unchanged: number;
}

/** What a restore would write, given what the device already holds (pure). */
export function planMerge(
  existing: Record<BackupStore, AnyRecord[]>,
  incoming: Record<BackupStore, AnyRecord[]>,
): { steps: MergeStep[]; counts: Record<BackupStore, MergeCounts> } {
  const steps: MergeStep[] = [];
  const counts = {} as Record<BackupStore, MergeCounts>;
  for (const store of BACKUP_STORES) {
    const key = KEY_PATH[store];
    const have = new Map((existing[store] ?? []).map((r) => [r[key] as string, r]));
    const c: MergeCounts = { added: 0, updated: 0, unchanged: 0 };
    for (const record of incoming[store] ?? []) {
      const current = have.get(record[key] as string);
      if (!current) {
        steps.push({ store, record, action: "add" });
        c.added += 1;
      } else if (stamp(record) > stamp(current)) {
        steps.push({ store, record, action: "update" });
        c.updated += 1;
      } else {
        c.unchanged += 1;
      }
    }
    counts[store] = c;
  }
  return { steps, counts };
}

async function readAll(): Promise<Record<BackupStore, AnyRecord[]>> {
  const db = await getDb();
  const out = {} as Record<BackupStore, AnyRecord[]>;
  for (const store of BACKUP_STORES) {
    out[store] = (await db.getAll(store)) as unknown as AnyRecord[];
  }
  return out;
}

/** Everything on this device, as a backup file's contents. */
export async function exportTreasury(now: Date = new Date()): Promise<BackupFile> {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), stores: await readAll() };
}

/** What a restore of `backup` would do on this device, without writing. */
export async function previewRestore(backup: BackupFile): Promise<Record<BackupStore, MergeCounts>> {
  return planMerge(await readAll(), backup.stores).counts;
}

/** Merge a parsed backup into this device; returns what changed. */
export async function restoreTreasury(backup: BackupFile): Promise<Record<BackupStore, MergeCounts>> {
  const { steps, counts } = planMerge(await readAll(), backup.stores);
  const db = await getDb();
  const tx = db.transaction([...BACKUP_STORES], "readwrite");
  for (const step of steps) {
    // The stores' value types differ; every record was shape-checked by parseBackup.
    await tx.objectStore(step.store).put(step.record as never);
  }
  await tx.done;
  // With a cloud configured, restored records join the outbox like any write.
  for (const step of steps) {
    if (SYNCED.has(step.store)) {
      await enqueueSync(step.store as Exclude<BackupStore, "ascents">, step.record[KEY_PATH[step.store]] as string, "put");
    }
  }
  return counts;
}

export function backupFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `otzar-treasury-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** How many records a store map holds, for "this backup has …" lines. */
export function countRecords(stores: Record<BackupStore, AnyRecord[]>): Record<BackupStore, number> {
  return Object.fromEntries(BACKUP_STORES.map((s) => [s, stores[s]?.length ?? 0])) as Record<BackupStore, number>;
}

// ——— the last-backup reminder (a per-device convenience) ———

const LAST_BACKUP_KEY = "otz-last-backup";
/** Remind after this many days without a backup. */
export const BACKUP_REMINDER_DAYS = 30;

export function readLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function recordBackup(now: Date = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
  } catch {
    // storage unavailable — the reminder just keeps reminding
  }
}

/** Whether to nudge: there is something worth keeping and no recent backup (pure). */
export function backupDue(lastBackup: string | null, hasReadings: boolean, now: Date = new Date()): boolean {
  if (!hasReadings) return false;
  if (!lastBackup) return true;
  const age = now.getTime() - new Date(lastBackup).getTime();
  return Number.isNaN(age) || age > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
