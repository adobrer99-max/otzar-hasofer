import { getDb } from "./db";
import { enqueueSync } from "./syncQueue";
import type {
  ParticipantRecord,
  HeraldStyle,
  HeraldLayer,
  HeraldInputSnapshot,
  ReadingPath,
} from "../types/herald";
import type { HebrewDate } from "../data/hebrewCalendar";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listParticipants(): Promise<ParticipantRecord[]> {
  const db = await getDb();
  const all = await db.getAll("participants");
  return all.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function createParticipant(
  displayName: string,
  path: ReadingPath,
  hebrewName?: string,
): Promise<ParticipantRecord> {
  const db = await getDb();
  const record: ParticipantRecord = {
    id: uuid(),
    displayName,
    hebrewName,
    path,
    createdAt: new Date().toISOString(),
  };
  await db.put("participants", record);
  await enqueueSync("participants", record.id, "put");
  return record;
}

export async function setHebrewBirthDate(
  participantId: string,
  hebrewBirthDate: HebrewDate,
): Promise<ParticipantRecord> {
  const db = await getDb();
  const record = await db.get("participants", participantId);
  if (!record) throw new Error(`Participant ${participantId} not found`);
  const updated: ParticipantRecord = { ...record, hebrewBirthDate, updatedAt: new Date().toISOString() };
  await db.put("participants", updated);
  await enqueueSync("participants", updated.id, "put");
  return updated;
}

/**
 * Records a Hebrew name the participant received — most often at
 * conversion, where "the Herald is grafted. Like Ruth. Nothing erased":
 * the name is added, never replacing what came before, and existing
 * readings/layers stay exactly as they were.
 */
export async function setHebrewName(
  participantId: string,
  hebrewName: string,
): Promise<ParticipantRecord> {
  const db = await getDb();
  const record = await db.get("participants", participantId);
  if (!record) throw new Error(`Participant ${participantId} not found`);
  const updated: ParticipantRecord = { ...record, hebrewName, updatedAt: new Date().toISOString() };
  await db.put("participants", updated);
  await enqueueSync("participants", updated.id, "put");
  return updated;
}

export async function setHeraldicEpithet(
  participantId: string,
  text: string,
  derivedText: string,
): Promise<ParticipantRecord> {
  const db = await getDb();
  const record = await db.get("participants", participantId);
  if (!record) throw new Error(`Participant ${participantId} not found`);
  if (record.heraldicEpithet) return record; // sealing is permanent — never overwrite
  const updated: ParticipantRecord = {
    ...record,
    heraldicEpithet: { text, derivedText, sealedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  await db.put("participants", updated);
  await enqueueSync("participants", updated.id, "put");
  return updated;
}

export async function setHeraldStyle(
  participantId: string,
  heraldStyle: HeraldStyle,
): Promise<ParticipantRecord> {
  const db = await getDb();
  const record = await db.get("participants", participantId);
  if (!record) throw new Error(`Participant ${participantId} not found`);
  const updated: ParticipantRecord = {
    ...record,
    heraldStyle,
    updatedAt: new Date().toISOString(),
  };
  await db.put("participants", updated);
  await enqueueSync("participants", updated.id, "put");
  return updated;
}

export async function getLayers(participantId: string): Promise<HeraldLayer[]> {
  const db = await getDb();
  const layers = await db.getAllFromIndex("heraldLayers", "by-participant", participantId);
  return layers.sort((a, b) => a.layerIndex - b.layerIndex);
}

export async function getLatestLayer(participantId: string): Promise<HeraldLayer | undefined> {
  const layers = await getLayers(participantId);
  return layers[layers.length - 1];
}

export async function addLayer(
  participantId: string,
  input: HeraldInputSnapshot,
): Promise<HeraldLayer> {
  const db = await getDb();
  const existing = await getLayers(participantId);
  const layerIndex = existing.length;
  const layer: HeraldLayer = {
    id: uuid(),
    participantId,
    layerIndex,
    createdAt: new Date().toISOString(),
    input,
    isOrigin: layerIndex === 0,
  };
  await db.put("heraldLayers", layer);
  await enqueueSync("heraldLayers", layer.id, "put");
  return layer;
}

/**
 * Deletes a single reading (Herald layer), then renumbers the participant's
 * remaining layers in `createdAt` order so `layerIndex` stays contiguous and
 * exactly the earliest carries `isOrigin` — keeping Encounter numbering, the
 * ghosted-previous-layer step, and `layerCount` correct after a mid-history
 * deletion.
 */
export async function deleteLayer(participantId: string, layerId: string): Promise<void> {
  const db = await getDb();
  await db.delete("heraldLayers", layerId);
  await enqueueSync("heraldLayers", layerId, "delete");
  const remaining = (await db.getAllFromIndex("heraldLayers", "by-participant", participantId)).sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
  for (let i = 0; i < remaining.length; i++) {
    const l = remaining[i];
    const isOrigin = i === 0;
    if (l.layerIndex !== i || l.isOrigin !== isOrigin) {
      const updated: HeraldLayer = { ...l, layerIndex: i, isOrigin };
      await db.put("heraldLayers", updated);
      await enqueueSync("heraldLayers", l.id, "put");
    }
  }
}

/**
 * Deletes a participant and everything belonging to them — all their Herald
 * layers, their life-cycle events, and any union (marriage) that references
 * them — so no orphaned records survive. Sync tombstones are enqueued for each
 * (a no-op when no cloud is configured).
 */
export async function deleteParticipant(participantId: string): Promise<void> {
  const db = await getDb();
  const layers = await db.getAllFromIndex("heraldLayers", "by-participant", participantId);
  for (const l of layers) {
    await db.delete("heraldLayers", l.id);
    await enqueueSync("heraldLayers", l.id, "delete");
  }
  const events = await db.getAllFromIndex("lifeCycleEvents", "by-participant", participantId);
  for (const e of events) {
    await db.delete("lifeCycleEvents", e.id);
    await enqueueSync("lifeCycleEvents", e.id, "delete");
  }
  const unions = await db.getAll("unions");
  for (const u of unions) {
    if (u.partnerAId === participantId || u.partnerBId === participantId) {
      await db.delete("unions", u.id);
      await enqueueSync("unions", u.id, "delete");
    }
  }
  await db.delete("participants", participantId);
  await enqueueSync("participants", participantId, "delete");
}
