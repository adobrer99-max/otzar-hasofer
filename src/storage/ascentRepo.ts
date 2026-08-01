import { getDb } from "./db";

/**
 * A climb of the Tree, saved.
 *
 * Only the *ascent* is stored — the seed, the letters found, the regions
 * behind you. The world itself is never written down, because it does not
 * need to be: `buildRegion(regionIndex, seed)` rebuilds it exactly, so a
 * saved game is a few dozen bytes rather than a tilemap, and resuming is
 * indistinguishable from never having stopped.
 */
export interface AscentRecord {
  id: string;
  seed: number;
  /** The Hebrew date the ascent was seeded by, e.g. "14 Nisan 5786". */
  seedLabel: string;
  createdAt: string;
  updatedAt: string;
  /** 1 = Malchut … 10 = Keter. */
  regionIndex: number;
  /** Letter ids found so far, in the order they were taken. */
  lettersHeld: string[];
  /** Light gathered across the whole ascent. */
  or: number;
  /** Region indices whose exit has been reached. */
  regionsCleared: number[];
  /** Dorot card ids of the House figures spoken with. */
  housesMet: string[];
  /** Sacred Time's notes for the day this ascent belongs to. */
  sacredNotes: string[];
  ascendantLetterId?: string;
  /** Set when Keter is reached. */
  sealedAt?: string;
}

export async function saveAscent(record: AscentRecord): Promise<void> {
  const db = await getDb();
  await db.put("ascents", record);
}

export async function loadAscent(id: string): Promise<AscentRecord | undefined> {
  const db = await getDb();
  return db.get("ascents", id);
}

export async function listAscents(): Promise<AscentRecord[]> {
  const db = await getDb();
  const all = await db.getAll("ascents");
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The climb still in progress, if there is one. */
export async function currentAscent(): Promise<AscentRecord | undefined> {
  const all = await listAscents();
  return all.find((a) => !a.sealedAt);
}

export async function deleteAscent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("ascents", id);
}
