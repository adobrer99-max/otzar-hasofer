import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ParticipantRecord, HeraldLayer } from "../types/herald";

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
}

let dbPromise: Promise<IDBPDatabase<OtzarHaSoferDB>> | undefined;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OtzarHaSoferDB>("otzar-hasofer", 1, {
      upgrade(db) {
        db.createObjectStore("participants", { keyPath: "id" });
        const layers = db.createObjectStore("heraldLayers", { keyPath: "id" });
        layers.createIndex("by-participant", "participantId");
      },
    });
  }
  return dbPromise;
}
