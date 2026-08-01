import type { SefirahId } from "../types/letter";
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
  /**
   * Indices of the torn scroll's fragments lifted so far (see
   * `src/game/scroll.ts`). Stored as identities rather than a count so that
   * resuming a region — which rebuilds its niches — cannot double-count a
   * fragment already taken. When all three are held they become Peh, and
   * "peh" joins `lettersHeld` like any other letter.
   */
  scrollFragments?: number[];
  /** Light gathered across the whole ascent. */
  or: number;
  /** Region indices whose exit has been reached. */
  regionsCleared: number[];
  /** Dorot card ids of the House figures spoken with. */
  housesMet: string[];
  /**
   * Sefirot the Scribe spent this climb's light to kindle, rather than
   * carrying the light on as score. The choice is offered once per region and
   * is the only thing `or` can be spent on — see `kindleCost`.
   */
  sefirotLit?: SefirahId[];
  /**
   * Which of the Seven Encounters this climb is, from the count of ascents
   * sealed before it (see `src/game/encounter.ts`). Absent once the seven are
   * behind you — later climbs are beyond the unfolding order, exactly as
   * later readings are for the Herald.
   */
  encounterNumber?: number;
  /**
   * Roots formed at the Word-Gates, in the order they were inscribed. The
   * ascent's own small vocabulary, listed at the crown.
   */
  wordsFormed?: FormedWord[];
  /** Sacred Time's notes for the day this ascent belongs to. */
  sacredNotes: string[];
  ascendantLetterId?: string;
  /** Set when Keter is reached. */
  sealedAt?: string;
}

/** A root the Scribe put together at a Word-Gate. */
export interface FormedWord {
  /** The three letter ids inscribed, in the order they were set. */
  letterIds: string[];
  /** The Hebrew spelling, with final forms applied. */
  hebrew: string;
  transliteration: string;
  gloss: string;
  /** Whether this was the root the gate actually named. */
  wasTarget: boolean;
  /** The region it was formed in. */
  regionIndex: number;
}

/**
 * What it costs to kindle a Sefirah.
 *
 * Pitched deliberately close to what a whole region yields — roughly a mote
 * every nine tiles, plus whatever the Word-Gate paid — so that kindling one
 * rung costs most of what was gathered to reach it. A cheaper price is not a
 * choice at all: the first tuning made it about a fifth of a region's light,
 * and there was never a reason to say no.
 */
export function kindleCost(regionIndex: number): number {
  return 20 + regionIndex * 5;
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
