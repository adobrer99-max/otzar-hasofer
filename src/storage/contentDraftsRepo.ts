import { getDb } from "./db";
import { enqueueSync } from "./syncQueue";
import { draftKey, type DatasetId } from "../scriptorium/contentRegistry";

/**
 * Local persistence for the Scriptorium's content drafts. Mirrors the shape of
 * the other repos and, since IDB v7, enqueues sync like them — an author's
 * edits follow their account across devices. The exported JSON remains the
 * durable artifact (see exportDrafts.ts) that gets folded into src/data/*.ts.
 */

export interface DraftRecord {
  /** `${datasetId}::${entryId}` — see draftKey(). */
  key: string;
  /** Duplicate of `key` — satisfies the sync engine's string-id contract
   *  (every synced record carries `id`); the store's keyPath stays `key`. */
  id: string;
  /** Authored values, keyed by the dataset's field descriptors. */
  fields: Record<string, string>;
  updatedAt: string;
}

export async function listDrafts(): Promise<DraftRecord[]> {
  const db = await getDb();
  return db.getAll("contentDrafts");
}

export async function getDraft(
  datasetId: DatasetId,
  entryId: string,
): Promise<DraftRecord | undefined> {
  const db = await getDb();
  return db.get("contentDrafts", draftKey(datasetId, entryId));
}

export async function putDraft(
  datasetId: DatasetId,
  entryId: string,
  fields: Record<string, string>,
): Promise<DraftRecord> {
  const db = await getDb();
  const key = draftKey(datasetId, entryId);
  const record: DraftRecord = {
    key,
    id: key,
    fields,
    updatedAt: new Date().toISOString(),
  };
  await db.put("contentDrafts", record);
  await enqueueSync("contentDrafts", key, "put");
  return record;
}

export async function deleteDraft(datasetId: DatasetId, entryId: string): Promise<void> {
  const db = await getDb();
  const key = draftKey(datasetId, entryId);
  await db.delete("contentDrafts", key);
  await enqueueSync("contentDrafts", key, "delete");
}
