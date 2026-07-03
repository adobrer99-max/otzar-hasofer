import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ParticipantRecord, HeraldLayer } from "../types/herald";
import type { LifeCycleEvent } from "../types/lifeCycle";

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
}

let dbPromise: Promise<IDBPDatabase<OtzarHaSoferDB>> | undefined;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OtzarHaSoferDB>("otzar-hasofer", 2, {
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
      },
    });
  }
  return dbPromise;
}
