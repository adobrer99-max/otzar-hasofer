import { getDb } from "./db";
import { draftKey, type DatasetId } from "../scriptorium/contentRegistry";

/**
 * Local persistence for the Scriptorium's content drafts. Mirrors the shape of
 * the other repos, but deliberately does NOT enqueue sync: drafts are
 * pre-canonical scratch kept only in this browser. The durable artifact is the
 * JSON the author exports (see exportDrafts.ts) and folds into src/data/*.ts.
 */

export interface DraftRecord {
  /** `${datasetId}::${entryId}` — see draftKey(). */
  key: string;
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
  const record: DraftRecord = {
    key: draftKey(datasetId, entryId),
    fields,
    updatedAt: new Date().toISOString(),
  };
  await db.put("contentDrafts", record);
  return record;
}

export async function deleteDraft(datasetId: DatasetId, entryId: string): Promise<void> {
  const db = await getDb();
  await db.delete("contentDrafts", draftKey(datasetId, entryId));
}
