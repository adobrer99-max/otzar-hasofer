import { getDb } from "./db";
import type { LifeCycleEvent } from "../types/lifeCycle";
import { hebrewDateFromGregorian } from "../data/hebrewCalendar";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listLifeCycleEvents(participantId: string): Promise<LifeCycleEvent[]> {
  const db = await getDb();
  const events = await db.getAllFromIndex("lifeCycleEvents", "by-participant", participantId);
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
  const db = await getDb();
  const hebrewDate = hebrewDateFromGregorian(new Date(input.gregorianDateOfEvent));
  const event: LifeCycleEvent = {
    id: uuid(),
    participantId,
    type: "yahrzeit",
    relation: input.relation,
    personName: input.personName,
    hebrewDate,
    gregorianDateOfEvent: input.gregorianDateOfEvent,
    adarRule: input.adarRule,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  await db.put("lifeCycleEvents", event);
  return event;
}

export async function deleteLifeCycleEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("lifeCycleEvents", id);
}
