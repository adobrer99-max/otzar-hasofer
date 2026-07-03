import { getDb } from "./db";
import type {
  ParticipantRecord,
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
  return record;
}

export async function setHebrewBirthDate(
  participantId: string,
  hebrewBirthDate: HebrewDate,
): Promise<ParticipantRecord> {
  const db = await getDb();
  const record = await db.get("participants", participantId);
  if (!record) throw new Error(`Participant ${participantId} not found`);
  const updated: ParticipantRecord = { ...record, hebrewBirthDate };
  await db.put("participants", updated);
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
  };
  await db.put("participants", updated);
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
  return layer;
}
