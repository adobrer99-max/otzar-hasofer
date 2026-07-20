import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ParticipantRecord, HeraldLayer } from "../types/herald";
import type { LifeCycleEvent } from "../types/lifeCycle";
import type { CommentaryRecord } from "../types/commentary";
import type { UnionRecord } from "../types/union";
import { isCloudConfigured } from "../cloud/config";

/** One pending outbox entry for the Scribes' Cloud sync (see src/cloud/sync.ts). */
export interface SyncQueueEntry {
  store:
    | "participants"
    | "heraldLayers"
    | "lifeCycleEvents"
    | "commentaries"
    | "unions"
    | "contentDrafts";
  id: string;
  op: "put" | "delete";
}

interface OtzarHaSoferDB extends DBSchema {
  participants: {
    key: string;
    value: ParticipantRecord;
  };
  heraldLayers: {
    key: string;
    value: HeraldLayer;
    indexes: { "by-participant": string };
  };
  lifeCycleEvents: {
    key: string;
    value: LifeCycleEvent;
    indexes: { "by-participant": string };
  };
  commentaries: {
    key: string;
    value: CommentaryRecord;
    indexes: { "by-subject": string };
  };
  /** Marriages — each links two participants; see the Covenantal Herald. */
  unions: {
    key: string;
    value: UnionRecord;
  };
  /**
   * Pre-canonical content drafts authored in the Scriptorium (/scriptorium).
   * Synced to the Scribes' Cloud since v7 so an author's edits follow their
   * account across devices; the exported JSON remains the durable artifact
   * that gets folded into src/data/*.ts.
   */
  contentDrafts: {
    key: string;
    value: import("./contentDraftsRepo").DraftRecord;
  };
  /** Outbox of local changes awaiting a push to the Scribes' Cloud. */
  syncQueue: {
    key: number;
    value: SyncQueueEntry;
  };
  /** Small KV store for sync bookkeeping (watermarks, initial-push flag). */
  syncState: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<OtzarHaSoferDB>> | undefined;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OtzarHaSoferDB>("otzar-hasofer", 7, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore("participants", { keyPath: "id" });
          const layers = db.createObjectStore("heraldLayers", { keyPath: "id" });
          layers.createIndex("by-participant", "participantId");
        }
        if (oldVersion < 2) {
          const events = db.createObjectStore("lifeCycleEvents", { keyPath: "id" });
          events.createIndex("by-participant", "participantId");
        }
        if (oldVersion < 3) {
          const commentaries = db.createObjectStore("commentaries", { keyPath: "id" });
          commentaries.createIndex("by-subject", "subjectKey");
        }
        if (oldVersion < 4) {
          db.createObjectStore("syncQueue", { autoIncrement: true });
          db.createObjectStore("syncState");
        }
        if (oldVersion < 5) {
          db.createObjectStore("unions", { keyPath: "id" });
        }
        if (oldVersion < 6) {
          db.createObjectStore("contentDrafts", { keyPath: "key" });
        }
        if (oldVersion < 7 && oldVersion >= 6) {
          // Drafts join the Scribes' Cloud: backfill the sync engine's id
          // (a duplicate of key), and — when a cloud is configured — enqueue
          // existing drafts so an already-linked device (whose initial full
          // push has long finished) still pushes them.
          const drafts = tx.objectStore("contentDrafts");
          let cursor = await drafts.openCursor();
          while (cursor) {
            await cursor.update({ ...cursor.value, id: cursor.value.key });
            if (isCloudConfigured()) {
              await tx.objectStore("syncQueue").add({
                store: "contentDrafts",
                id: cursor.value.key,
                op: "put",
              });
            }
            cursor = await cursor.continue();
          }
        }
      },
    });
  }
  return dbPromise;
}
