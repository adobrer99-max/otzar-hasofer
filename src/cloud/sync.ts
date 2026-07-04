import type { SyncQueueEntry } from "../storage/db";
import { getDb } from "../storage/db";
import {
  SYNC_STORES,
  type CloudTransport,
  type RemoteDelete,
  type RemoteRecord,
} from "./transport";

/**
 * The Scribes' Cloud sync engine — local-first. IndexedDB remains the
 * primary store and the app works fully offline; this engine reconciles it
 * with the cloud when a Scribe is signed in:
 *
 * 1. Initial link (first successful sync of a device): full push of every
 *    store — the device's existing Treasury simply becomes the account's.
 * 2. Incremental: drain the outbox (puts push full records, deletes become
 *    soft-delete tombstones), then pull everything the server saw change
 *    after our watermark and apply it locally.
 * 3. Conflicts (rare — the data is append-heavy): a record that is dirty in
 *    the outbox at apply time is skipped by the pull, so local edits win
 *    until pushed; otherwise last-write-wins by server time. Watermarks
 *    advance from server timestamps only — the client clock is never
 *    trusted for ordering.
 */

export interface LocalStoreAdapter {
  getAll(store: SyncQueueEntry["store"]): Promise<Array<{ id: string } & Record<string, unknown>>>;
  put(store: SyncQueueEntry["store"], record: Record<string, unknown>): Promise<void>;
  remove(store: SyncQueueEntry["store"], id: string): Promise<void>;
  /** Returns the queued entries and removes exactly those from the queue. */
  drainQueue(): Promise<SyncQueueEntry[]>;
  /** Ids currently sitting dirty in the queue (consulted at pull-apply time). */
  pendingIds(): Promise<Set<string>>;
  getState(key: string): Promise<unknown>;
  setState(key: string, value: unknown): Promise<void>;
}

export interface SyncSummary {
  pushedRecords: number;
  pushedDeletes: number;
  pulledRecords: number;
  pulledDeletes: number;
  initialPush: boolean;
}

/** Collapses queue entries per (store, id) — the last operation wins. */
function dedupeQueue(entries: SyncQueueEntry[]): SyncQueueEntry[] {
  const byKey = new Map<string, SyncQueueEntry>();
  for (const entry of entries) {
    byKey.set(`${entry.store}:${entry.id}`, entry);
  }
  return Array.from(byKey.values());
}

export async function runSync(
  local: LocalStoreAdapter,
  transport: CloudTransport,
): Promise<SyncSummary> {
  const initialPushDone = (await local.getState("initialPushDone")) === true;
  const queued = dedupeQueue(await local.drainQueue());

  // ——— Push ———
  const toPush: RemoteRecord[] = [];
  const toDelete: RemoteDelete[] = [];

  if (!initialPushDone) {
    // First link: everything local goes up, regardless of the queue.
    for (const store of SYNC_STORES) {
      const all = await local.getAll(store);
      toPush.push(...all.map((record) => ({ store, id: record.id, data: record })));
    }
    for (const entry of queued) {
      if (entry.op === "delete") toDelete.push({ store: entry.store, id: entry.id });
    }
  } else {
    for (const entry of queued) {
      if (entry.op === "delete") {
        toDelete.push({ store: entry.store, id: entry.id });
      } else {
        const all = await local.getAll(entry.store);
        const record = all.find((r) => r.id === entry.id);
        // A queued put whose record has since vanished locally is covered by
        // its own queued delete (deduped above) — nothing to push.
        if (record) toPush.push({ store: entry.store, id: entry.id, data: record });
      }
    }
  }

  if (toPush.length > 0) await transport.pushRecords(toPush);
  if (toDelete.length > 0) await transport.pushDeletes(toDelete);
  if (!initialPushDone) await local.setState("initialPushDone", true);

  // ——— Pull ———
  const lastPullAt = ((await local.getState("lastPullAt")) as string | undefined) ?? null;
  const pulled = await transport.pullSince(lastPullAt);
  // Local wins twice over this pull: records written while we were syncing
  // are dirty in the queue (they push next run), and records we pushed THIS
  // run are the newest by server time — anything the pull carries for them
  // is an echo or an older concurrent copy.
  const dirtyNow = await local.pendingIds();
  const justPushed = new Set(toPush.map((r) => r.id));
  const skip = (id: string) => dirtyNow.has(id) || justPushed.has(id);

  let pulledRecords = 0;
  let pulledDeletes = 0;
  for (const record of pulled.records) {
    if (skip(record.id)) continue;
    await local.put(record.store, record.data);
    pulledRecords += 1;
  }
  for (const del of pulled.deletes) {
    if (skip(del.id)) continue;
    await local.remove(del.store, del.id);
    pulledDeletes += 1;
  }
  await local.setState("lastPullAt", pulled.serverNow);

  return {
    pushedRecords: toPush.length,
    pushedDeletes: toDelete.length,
    pulledRecords,
    pulledDeletes,
    initialPush: !initialPushDone,
  };
}

/** The real adapter over IndexedDB. */
export function createIdbAdapter(): LocalStoreAdapter {
  return {
    async getAll(store) {
      const db = await getDb();
      return (await db.getAll(store)) as unknown as Array<{ id: string } & Record<string, unknown>>;
    },
    async put(store, record) {
      const db = await getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.put(store, record as any);
    },
    async remove(store, id) {
      const db = await getDb();
      await db.delete(store, id);
    },
    async drainQueue() {
      const db = await getDb();
      const tx = db.transaction("syncQueue", "readwrite");
      const keys = await tx.store.getAllKeys();
      const entries = await tx.store.getAll();
      for (const key of keys) await tx.store.delete(key);
      await tx.done;
      return entries;
    },
    async pendingIds() {
      const db = await getDb();
      const entries = await db.getAll("syncQueue");
      return new Set(entries.map((e) => e.id));
    },
    async getState(key) {
      const db = await getDb();
      return db.get("syncState", key);
    },
    async setState(key, value) {
      const db = await getDb();
      await db.put("syncState", value, key);
    },
  };
}

/** Count of outbox entries awaiting a push — for the Account page. */
export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  return db.count("syncQueue");
}
