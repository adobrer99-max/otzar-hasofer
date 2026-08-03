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
  /**
   * 1 = Malchut … 10 = Keter.
   *
   * **Kept, and no longer the whole truth.** The climb was a line and this was
   * the whole of where you were; it is now derived from `at` and held for the
   * saved-game format, the HUD, and every caller that predates the Tree. A
   * record written before the overworld existed has no `at` and reads exactly
   * as it always did.
   */
  regionIndex: number;
  /**
   * Which Sefirah the Scribe is standing on, on the overworld.
   *
   * Absent on a record from before the Tree was walkable, and on those the
   * kingdom is where you are — which is also true, because a linear climb
   * begins there. Everything that reads a position should go through
   * `standingAt` rather than reaching for this, so the default lives in one
   * place.
   */
  at?: SefirahId;
  /**
   * The paths walked, in the order they were walked — which is the order the
   * alphabet was gathered in, and therefore the shape of this particular climb.
   *
   * A path may appear twice: crossing back is how the Tree is a map rather than
   * a list, and `lettersFrom` in `game/tree.ts` gives a path's letter once
   * however often it is walked.
   */
  pathsWalked?: string[];
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
   * Which Sefirot this climb freed — whose guardian it broke.
   *
   * Recorded per climb and read *across* them: `guardiansFreed` folds every
   * ascent's list into the set a Scribe has broken ever, which is what the
   * boons are drawn from. A Sefirah cannot be kindled while it is held, so
   * this is also the gate on the ending; and a guardian broken in one climb
   * stays broken for that climb only, because a Tree with nothing left holding
   * it would be a Tree that is finished.
   */
  guardiansBroken?: SefirahId[];
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
  /**
   * The vessels lifted off their pedestals — see `game/items.ts`. Objects
   * rather than letters: they change what the numbers are, never what a body
   * can do.
   */
  items?: string[];
  /** Sacred Time's notes for the day this ascent belongs to. */
  sacredNotes: string[];
  ascendantLetterId?: string;
  /**
   * How many times the last lamp went out on this climb.
   *
   * A fall does not end a climb — see `game/fall.ts`. So it has to be counted,
   * or the record would say nothing about the difference between a Tree lit at
   * the first attempt and one lit after four goings-out, which is most of what
   * there is to say about a climb.
   */
  falls?: number;
  /**
   * Set when the climb is **carried to its ending** — the crown, or all ten
   * kindled.
   *
   * This used to say "Set when Keter is reached" and was set by going out as
   * well, which made `sealedCount` — and therefore the Seven Encounters —
   * advance on a death exactly as on a crowning. A Scribe could walk the seven
   * by going out seven times in the kingdom. Going out no longer touches this;
   * it is what divides the two across-runs systems, which is worth stating in
   * one line: **the guardians accrue from doing, the Encounters from
   * finishing.**
   */
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
 * What it costs to kindle a Sefirah — twelve at the kingdom, forty-eight at the
 * crown, **three hundred for all ten**, which is the price of a whole climb.
 *
 * The first pitch was `20 + 5i`, four hundred and seventy-five for the tour,
 * and it was set against what a single region yields on a line — where ten
 * rungs paid for ten kindlings and the only question was whether to spend.
 *
 * The Tree makes it a real question and the answer had to be measured.
 * `economy.test.ts` walks climbs with the fighting probe and records what a
 * Scribe actually leaves each path carrying, which is roughly a third of what
 * the rung was built holding — motes are only light once someone has walked
 * over them, a klipah's light only once its shell is broken, and every veiling
 * takes two back. Six climbs at each length:
 *
 * ```
 *    9 walks: worst  95   median 154   best 167
 *   15 walks: worst 223   median 258   best 316
 *   22 walks: worst 358   median 434   best 509
 * ```
 *
 * Nine walks is the fewest that can stand on all ten Sefirot. Twenty-two is
 * every path on the Tree. Four hundred and seventy-five sat above all but the
 * luckiest full tour, which is a game that mostly cannot be finished; and it
 * would have shipped, because nothing had ever asked.
 *
 * Three hundred puts the price where it does the work it was for: the dash
 * cannot buy it — nine walks pays at best a little over half — and a climb that
 * has been most places clears it with room even on a poor seed. The gap between
 * the two is the whole of what the map is for.
 *
 * The steeper slope (four a rung rather than five, on a lower base) is
 * deliberate: the crown costs four times the kingdom rather than under three,
 * because the paths into it are the ones a Scribe has to earn the letters to
 * walk at all.
 */
export function kindleCost(regionIndex: number): number {
  return 8 + regionIndex * 4;
}

/**
 * Every Sefirah this Scribe has ever freed, across all their climbs.
 *
 * The shape `sealedCount` has, and for the same reason: what a climb *is* is a
 * record, and what a Scribe has *become* is a fold over all of them. The boons
 * are drawn from this — see `guardians.ts`, where the division between the two
 * across-runs systems is stated: the Seven Encounters change the world, and
 * the guardians change the Scribe.
 */
export function guardiansFreed(ascents: readonly AscentRecord[]): SefirahId[] {
  const freed = new Set<SefirahId>();
  for (const a of ascents) for (const s of a.guardiansBroken ?? []) freed.add(s);
  return [...freed];
}

/**
 * Where the Scribe is standing. Malchut is where an angel cast down wakes, so
 * it is the answer for a climb that has not begun and for every record written
 * before the Tree could be walked.
 */
export function standingAt(ascent: Pick<AscentRecord, "at">): SefirahId {
  return ascent.at ?? "malchut";
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
