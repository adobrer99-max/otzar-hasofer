import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ParticipantRecord, HeraldLayer } from "../types/herald";
import type { LifeCycleEvent } from "../types/lifeCycle";
import type { CommentaryRecord } from "../types/commentary";

/** One pending outbox entry for the Scribes' Cloud sync (see src/cloud/sync.ts). */
export interface SyncQueueEntry {
  store: "participants" | "heraldLayers" | "lifeCycleEvents" | "commentaries";
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
    dbPromise = openDB<OtzarHaSoferDB>("otzar-hasofer", 4, {
      upgrade(db, oldVersion) {
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
      },
    });
  }
  return dbPromise;
}
