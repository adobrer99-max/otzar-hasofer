import { getDb } from "./db";
import { enqueueSync } from "./syncQueue";
import type { UnionRecord, ShevaBrachotDay } from "../types/union";
import type { LetterDraw } from "../types/herald";
import type { SefirahId } from "../types/letter";
import { hebrewDateFromGregorian } from "../data/hebrewCalendar";

function uuid(): string {
  return crypto.randomUUID();
}

/** Day k of the Sheva Brachot illuminates the kth lower Sefirah. */
export const SHEVA_BRACHOT_SEFIROT: SefirahId[] = [
  "chesed",
  "gevurah",
  "tiferet",
  "netzach",
  "hod",
  "yesod",
  "malchut",
];

export async function listUnions(): Promise<UnionRecord[]> {
  const db = await getDb();
  const all = await db.getAll("unions");
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createUnion(
  partnerAId: string,
  partnerBId: string,
  weddingGregorianDate: string,
): Promise<UnionRecord> {
  const db = await getDb();
  const record: UnionRecord = {
    id: uuid(),
    partnerAId,
    partnerBId,
    weddingGregorianDate,
    weddingHebrewDate: hebrewDateFromGregorian(new Date(weddingGregorianDate)),
    shevaBrachot: [],
    createdAt: new Date().toISOString(),
  };
  await db.put("unions", record);
  await enqueueSync("unions", record.id, "put");
  return record;
}

/** Records (or re-records) one day of the seven — sealing is soft; a day may be rewritten until the Scribe is content. */
export async function recordShevaBrachotDay(
  unionId: string,
  day: number,
  input: { letter?: LetterDraw; reflection?: string },
): Promise<UnionRecord> {
  if (day < 1 || day > 7) throw new Error(`Sheva Brachot day must be 1-7, got ${day}`);
  const db = await getDb();
  const record = await db.get("unions", unionId);
  if (!record) throw new Error(`Union ${unionId} not found`);
  const entry: ShevaBrachotDay = {
    day,
    sefirah: SHEVA_BRACHOT_SEFIROT[day - 1],
    letter: input.letter,
    reflection: input.reflection,
    recordedAt: new Date().toISOString(),
  };
  const updated: UnionRecord = {
    ...record,
    shevaBrachot: [...record.shevaBrachot.filter((d) => d.day !== day), entry].sort(
      (a, b) => a.day - b.day,
    ),
    updatedAt: new Date().toISOString(),
  };
  await db.put("unions", updated);
  await enqueueSync("unions", updated.id, "put");
  return updated;
}

export async function deleteUnion(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("unions", id);
  await enqueueSync("unions", id, "delete");
}
