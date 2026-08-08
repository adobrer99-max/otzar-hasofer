import type { Grace } from "../game/abilities";
// Type-only, so there is no runtime cycle: `story.ts` reads nothing from here.
import type { PleaKind } from "../game/story";
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
  /**
   * Which climb of its day this is. `0` — absent on older records — is the
   * day's shared ascent, the Tree every Scribe who begins that day climbs.
   * Each further Begin on the same day counts up, and the seed is
   * `hash(seedLabel#variant)` (`game/sacredAscent.ts`), so a re-begun climb is
   * a fresh shuffle with the day's character rather than the same map with the
   * light put back — which is what closed the abandon-and-restart exploit.
   */
  variant?: number;
  /**
   * The day's light multiplier, frozen at Begin beside the seed. A climb keeps
   * its day: begun on Hanukkah, its rungs are strewn like Hanukkah however
   * long the climb takes, and the calendar rolling over mid-session cannot
   * change ground already promised. Absent on older records, which fall back
   * to the live day's value.
   */
  lightOfTheDay?: number;
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
   * **The rule this climb was chosen to be played under**, past the seven.
   *
   * The Encounters are the unfolding order and are not a choice while a Scribe
   * is inside them — `encounterNumber` wins wherever it is set. After the
   * seventh seal the seven become seven earned play-modifiers and this is
   * which one was picked; absent means the climb was made bare, which is also
   * a choice and is what every record written before this existed reads as.
   * See `ruleOf`.
   */
  ruleNumber?: number;
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
  /**
   * **The relics carried into this climb, frozen at Begin** — see
   * `game/relics.ts`.
   *
   * Chosen at the threshold and written down here for the same reason
   * `ruleNumber` is: `currentAscent` resumes an unsealed record, so a choice
   * held only in React state would be lost on a reload — and since a relic
   * changes what is generated, the same seed would then build different ground.
   * That is the abandon-and-resume exploit `variant` was invented to close,
   * wearing a new coat.
   */
  reliquary?: string[];
  /**
   * And the relics **found** on this climb. The Reliquary itself is a fold over
   * these across sealed climbs (`relicsKept` in `game/book.ts`) rather than a
   * store of its own — but the find has to be written down somewhere, because
   * there is nothing already on the record it could be derived from.
   */
  relicsFound?: string[];
  /**
   * The graces guests of the Houses have given on this climb — see
   * `game/ushpizinOffers.ts`. The other half of `items`: a vessel changes what
   * the numbers are, a boon changes what a body can do.
   *
   * **It is on the record because it has to outlive the rung it was given on.**
   * This was React state, cleared at the top of every `walkPath` and every
   * `faceGuardian`, which made three of the seven guests give nothing at all: a
   * vow is judged at the exit, so its grace was granted and then wiped before
   * the next rung's first frame, and the Scribe never held it for a single
   * tick. The two priced guests fared better only by accident — they grant on
   * acceptance, so their grace lasted the back half of one screen, for ten
   * light and six.
   *
   * A climb's, not a Scribe's: `beginAscent` starts empty. Vessels are the
   * thing that carries between climbs, and the guests are a bargain struck
   * inside one.
   */
  boons?: Grace[];
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
  /**
   * Which of the four endings this climb reached — mute, alone, heard, whole —
   * frozen by `sealAscent` at the moment of sealing, with the Sefirot whose
   * figures stood for the Scribe beside it.
   *
   * Until now the plea was computed on the crown plate and thrown away, so no
   * record could ever say how its climb ended. Frozen rather than derived,
   * because `pleaFor` and the Dorot tables are authored data that will drift —
   * and an ending the Scribe was shown must not change under them. A record
   * sealed before these fields existed derives its ending with
   * `endingOf(lettersHeld, housesMet)` (`game/story.ts`), which is the same
   * function `sealAscent` freezes from.
   */
  endingPlea?: PleaKind;
  witnessSefirot?: SefirahId[];
  /**
   * Set when the Scribe begins again from Malchut with this climb still
   * unsealed — the climb was put down, not carried to an ending.
   *
   * Without it, "Begin again" only *shadowed* the old record: `currentAscent`
   * takes the most recently touched unsealed climb, so the moment the new one
   * sealed, the abandoned record — months old, mid-Tree, on a stale seed —
   * quietly became current again. An abandoned climb is finished the way a
   * drawer is closed: kept, countable, and never picked back up by accident.
   */
  abandonedAt?: string;
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
 * **How many times each Sefirah has been freed**, across all this Scribe's
 * climbs.
 *
 * The shape `sealedCount` has, and for the same reason: what a climb *is* is a
 * record, and what a Scribe has *become* is a fold over all of them. The boons
 * are drawn from this — see `guardians.ts`, where the division between the two
 * across-runs systems is stated: the Seven Encounters change the world, and
 * the guardians change the Scribe.
 *
 * **It counts rather than collecting**, and that replaced a `guardiansFreed`
 * that returned a bare set. The set was the whole shape of the problem: ten
 * booleans, all ten reachable inside one thorough climb, and every climb after
 * that changing a Scribe not at all. Breaking a guardian a second time was
 * worth exactly nothing, so there was never a reason to walk that way again.
 * The tiers read this number; the keys are still exactly the old set.
 *
 * A climb's own `guardiansBroken` holds each Sefirah once (a guardian broken
 * is broken for the rest of that climb), so this counts *climbs in which it
 * was broken*, which is the honest unit: the return trip, not the repetition.
 */
export function timesFreed(ascents: readonly AscentRecord[]): Record<string, number> {
  const times: Record<string, number> = {};
  for (const a of ascents) {
    for (const s of new Set(a.guardiansBroken ?? [])) times[s] = (times[s] ?? 0) + 1;
  }
  return times;
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

/**
 * The climb still in progress, if there is one — unsealed *and* not put down.
 * An abandoned record is history, not a climb; see `abandonedAt`.
 */
export async function currentAscent(): Promise<AscentRecord | undefined> {
  const all = await listAscents();
  return all.find((a) => !a.sealedAt && !a.abandonedAt);
}

export async function deleteAscent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("ascents", id);
}
