import { getDb } from "./db";
import { enqueueSync } from "./syncQueue";
import type { LifeCycleEvent, LifeCycleEventType } from "../types/lifeCycle";
import { hebrewDateFromGregorian } from "../data/hebrewCalendar";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listLifeCycleEvents(participantId: string): Promise<LifeCycleEvent[]> {
  const db = await getDb();
  const events = await db.getAllFromIndex("lifeCycleEvents", "by-participant", participantId);
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export interface LifeCycleEventInput {
  type: LifeCycleEventType;
  relation?: string;
  personName?: string;
  gregorianDateOfEvent: string;
  notes?: string;
  adarRule?: "adarI" | "adarII";
  sponsoringCommunity?: string;
  beitDin?: string;
}

export async function addLifeCycleEvent(
  participantId: string,
  input: LifeCycleEventInput,
): Promise<LifeCycleEvent> {
  const db = await getDb();
  const hebrewDate = hebrewDateFromGregorian(new Date(input.gregorianDateOfEvent));
  const event: LifeCycleEvent = {
    id: uuid(),
    participantId,
    type: input.type,
    relation: input.relation,
    personName: input.personName,
    hebrewDate,
    gregorianDateOfEvent: input.gregorianDateOfEvent,
    adarRule: input.adarRule,
    sponsoringCommunity: input.sponsoringCommunity,
    beitDin: input.beitDin,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  await db.put("lifeCycleEvents", event);
  await enqueueSync("lifeCycleEvents", event.id, "put");
  return event;
}

export async function addYahrzeit(
  participantId: string,
  input: {
    relation: string;
    personName: string;
    gregorianDateOfEvent: string;
    notes?: string;
    adarRule?: "adarI" | "adarII";
  },
): Promise<LifeCycleEvent> {
  return addLifeCycleEvent(participantId, { type: "yahrzeit", ...input });
}

export async function deleteLifeCycleEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("lifeCycleEvents", id);
  await enqueueSync("lifeCycleEvents", id, "delete");
}
