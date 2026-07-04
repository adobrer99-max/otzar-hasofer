import { getDb, type SyncQueueEntry } from "./db";
import { isCloudConfigured } from "../cloud/config";

/**
 * Records a local write in the sync outbox and hints the sync engine.
 * A no-op when the deployment has no cloud configured — nothing is lost by
 * that: a device's first sign-in performs a full push of every store, so
 * history written before the queue existed (or before configuration) still
 * reaches the account.
 */
export async function enqueueSync(
  store: SyncQueueEntry["store"],
  id: string,
  op: SyncQueueEntry["op"],
): Promise<void> {
  if (!isCloudConfigured()) return;
  const db = await getDb();
  await db.add("syncQueue", { store, id, op });
  // Decoupled hint — the cloud module listens when configured and signed in.
  window.dispatchEvent(new CustomEvent("otzar:sync-hint"));
}
