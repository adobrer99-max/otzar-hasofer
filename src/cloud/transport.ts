import type { SyncQueueEntry } from "../storage/db";

/** Local IDB store name → remote table name. */
export const REMOTE_TABLES: Record<SyncQueueEntry["store"], string> = {
  participants: "participants",
  heraldLayers: "herald_layers",
  lifeCycleEvents: "life_cycle_events",
  commentaries: "commentaries",
  unions: "unions",
};

export const SYNC_STORES = Object.keys(REMOTE_TABLES) as SyncQueueEntry["store"][];

export interface RemoteRecord {
  store: SyncQueueEntry["store"];
  id: string;
  /** The full local record, as stored in IndexedDB. */
  data: Record<string, unknown>;
}

export interface RemoteDelete {
  store: SyncQueueEntry["store"];
  id: string;
}

export interface PullResult {
  records: RemoteRecord[];
  deletes: RemoteDelete[];
  /** Server-clock watermark to persist as `lastPullAt` — never the client clock. */
  serverNow: string;
}

/**
 * The narrow surface the sync engine speaks. Implemented by Supabase below
 * and by an in-memory fake in the tests — the engine itself never touches
 * the SDK.
 */
export interface CloudTransport {
  pushRecords(records: RemoteRecord[]): Promise<void>;
  pushDeletes(deletes: RemoteDelete[]): Promise<void>;
  /** Everything changed (upserts + soft-deletes) strictly after `sinceIso` (null = everything). */
  pullSince(sinceIso: string | null): Promise<PullResult>;
}
