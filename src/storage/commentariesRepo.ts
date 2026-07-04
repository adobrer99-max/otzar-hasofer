import { getDb } from "./db";
import { enqueueSync } from "./syncQueue";
import type { CommentaryRecord, CommentarySubject } from "../types/commentary";
import { subjectKeyFor } from "../types/commentary";
import { seedCommentaries, isSeedCommentary } from "../data/seedCommentaries";
import { hebrewDateFromGregorian } from "../data/hebrewCalendar";

function uuid(): string {
  return crypto.randomUUID();
}

function newestFirst(records: CommentaryRecord[]): CommentaryRecord[] {
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** All commentaries — the built-in received (seed) ones plus everything stored. */
export async function listAllCommentaries(): Promise<CommentaryRecord[]> {
  const db = await getDb();
  const stored = await db.getAll("commentaries");
  return newestFirst([...seedCommentaries, ...stored]);
}

export async function listCommentariesForSubject(
  subject: CommentarySubject,
): Promise<CommentaryRecord[]> {
  const key = subjectKeyFor(subject);
  const db = await getDb();
  const stored = await db.getAllFromIndex("commentaries", "by-subject", key);
  const seeds = seedCommentaries.filter((c) => c.subjectKey === key);
  return newestFirst([...seeds, ...stored]);
}

export async function addCommentary(input: {
  subject: CommentarySubject;
  title?: string;
  author: string;
  body: string;
}): Promise<CommentaryRecord> {
  const db = await getDb();
  const now = new Date();
  const record: CommentaryRecord = {
    id: uuid(),
    subject: input.subject,
    subjectKey: subjectKeyFor(input.subject),
    title: input.title || undefined,
    author: input.author,
    hebrewDate: hebrewDateFromGregorian(now),
    createdAt: now.toISOString(),
    body: input.body,
  };
  await db.put("commentaries", record);
  await enqueueSync("commentaries", record.id, "put");
  return record;
}

export async function updateCommentary(
  id: string,
  changes: { title?: string; author?: string; body?: string },
): Promise<CommentaryRecord> {
  if (isSeedCommentary(id)) throw new Error("Received commentaries cannot be edited.");
  const db = await getDb();
  const record = await db.get("commentaries", id);
  if (!record) throw new Error(`Commentary ${id} not found`);
  const updated: CommentaryRecord = {
    ...record,
    ...changes,
    title: changes.title !== undefined ? changes.title || undefined : record.title,
    updatedAt: new Date().toISOString(),
  };
  await db.put("commentaries", updated);
  await enqueueSync("commentaries", updated.id, "put");
  return updated;
}

export async function deleteCommentary(id: string): Promise<void> {
  if (isSeedCommentary(id)) throw new Error("Received commentaries cannot be deleted.");
  const db = await getDb();
  await db.delete("commentaries", id);
  await enqueueSync("commentaries", id, "delete");
}
