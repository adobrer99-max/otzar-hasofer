import { dorotCardsById, dorotHousesById } from "../data/dorot";
import type { AscentRecord, FormedWord } from "../storage/ascentRepo";
import type { SefirahId } from "../types/letter";
import { sealKindOf, type SealKind } from "./sealing";
import { endingOf } from "./story";
import type { PleaKind } from "./story";

/**
 * **The Book of Ascents — what a Scribe has done, kept.**
 *
 * Ma'alot has recorded every climb since the first day it saved anything, and
 * has never once shown one back. A sealed record went into IndexedDB and no
 * surface in the game ever read it again: the plea was computed on the crown
 * plate and discarded, the roots formed at the gates were listed once and
 * never again, and of a hundred and sixty-eight Dorot cards a climb meets
 * about four per cent — with no way to know which four, or that there were
 * others.
 *
 * So this module is **entirely folds**, and deliberately holds nothing of its
 * own. Every function here takes the list `listAscents()` already returns and
 * derives a reading from it; there is no new store, no new schema field, and
 * nothing to migrate or keep in step. That is the same shape `sealedCount` and
 * `guardiansFreed` already have, and for the same reason: a climb is a record,
 * and what a Scribe has *become* is a fold over all of them.
 *
 * It is also why the Book can show climbs sealed long before it existed. A
 * record from before `endingPlea` was frozen still derives its ending from
 * `endingOf`, which is the function `sealAscent` freezes from.
 */

/** One sealed climb, as the Book reads it. */
export interface BookPage {
  id: string;
  /** The Hebrew date it was seeded by — the day it belongs to. */
  seedLabel: string;
  /** When it was sealed, ISO, for ordering and for showing. */
  sealedAt: string;
  /** Which ending: a lit Tree, or a crown taken out of what held it. */
  ending: SealKind;
  plea: PleaKind;
  /** Which Houses stood — one per Sefirah, however many of its cards were met. */
  witnesses: SefirahId[];
  /** The route, in the order it was walked. Drawable on a small Tree. */
  route: string[];
  lettersHeld: string[];
  sefirotLit: SefirahId[];
  guardiansBroken: SefirahId[];
  words: FormedWord[];
  falls: number;
  or: number;
  /** Which of the seven this climb was, if it was one of them. */
  encounterNumber?: number;
}

/**
 * Every sealed climb, newest first.
 *
 * **Sealed only.** A climb put down (`abandonedAt`) and a climb still open are
 * both real and neither is a page: the Book is a record of endings, and an
 * ending is the one thing this game has never shown twice. They are counted in
 * `tally` instead, because a Scribe who has put four climbs down has done
 * something and should not have it silently unrecorded.
 */
export function pagesOf(ascents: readonly AscentRecord[]): BookPage[] {
  return ascents
    .filter((a): a is AscentRecord & { sealedAt: string } => Boolean(a.sealedAt))
    .map((a) => {
      // Frozen if the record has it, derived if it is old enough not to — the
      // same function `sealAscent` freezes from, so the two cannot disagree.
      const frozen =
        a.endingPlea && a.witnessSefirot
          ? { plea: a.endingPlea, witnessSefirot: a.witnessSefirot }
          : endingOf(a.lettersHeld, a.housesMet);
      return {
        id: a.id,
        seedLabel: a.seedLabel,
        sealedAt: a.sealedAt,
        ending: sealKindOf(a),
        plea: frozen.plea,
        witnesses: [...frozen.witnessSefirot],
        route: [...(a.pathsWalked ?? [])],
        lettersHeld: [...a.lettersHeld],
        sefirotLit: [...(a.sefirotLit ?? [])],
        guardiansBroken: [...(a.guardiansBroken ?? [])],
        words: [...(a.wordsFormed ?? [])],
        falls: a.falls ?? 0,
        or: a.or,
        encounterNumber: a.encounterNumber,
      };
    })
    .sort((x, y) => y.sealedAt.localeCompare(x.sealedAt));
}

/** The most recent sealed climb, which is what the threshold speaks of. */
export function lastSealed(ascents: readonly AscentRecord[]): BookPage | undefined {
  return pagesOf(ascents)[0];
}

// ---------------------------------------------------------------------------
// the collections
// ---------------------------------------------------------------------------

/**
 * A figure of the Dorot, and every card of theirs this Scribe has met.
 *
 * Grouped by *House* rather than listed as cards, because that is how a player
 * remembers them — "I have spoken with Ruth four times" rather than a hundred
 * and sixty-eight loose ids. `total` is how many cards that House has, so the
 * collection has a floor and a ceiling and a Scribe can see the shape of what
 * is left.
 */
export interface HouseMet {
  houseId: string;
  figure: string;
  sefirah: SefirahId;
  /** Card ids met, in the order first met. */
  cardIds: string[];
  /** How many cards that House has in all. */
  total: number;
}

export function housesMet(ascents: readonly AscentRecord[]): HouseMet[] {
  const totals = new Map<string, number>();
  for (const card of Object.values(dorotCardsById)) {
    totals.set(card.houseId, (totals.get(card.houseId) ?? 0) + 1);
  }
  const met = new Map<string, string[]>();
  // Oldest first, so "the order first met" is the order they were met in.
  for (const ascent of [...ascents].reverse()) {
    for (const cardId of ascent.housesMet) {
      const card = dorotCardsById[cardId];
      if (!card) continue;
      const seen = met.get(card.houseId) ?? [];
      if (!seen.includes(cardId)) seen.push(cardId);
      met.set(card.houseId, seen);
    }
  }
  return [...met.entries()]
    .map(([houseId, cardIds]) => {
      const house = dorotHousesById[houseId];
      return {
        houseId,
        figure: house?.figure ?? houseId,
        sefirah: (house?.sefirah ?? "malchut") as SefirahId,
        cardIds,
        total: totals.get(houseId) ?? cardIds.length,
      };
    })
    .sort((a, b) => b.cardIds.length - a.cardIds.length);
}

/** How many of the Dorot's cards exist at all — the collection's ceiling. */
export const CARDS_IN_ALL = Object.keys(dorotCardsById).length;

/**
 * **The Lexicon** — every root this Scribe has ever put together at a gate.
 *
 * The game's deepest axis and its longest collection, at no authoring cost:
 * three thousand and more roots ship in `shorashim.generated.ts` already, and
 * a climb forms a handful. Deduplicated by spelling, because forming the same
 * root twice is the same word — but the count is kept, since a root a Scribe
 * keeps reaching for says something about them.
 */
export interface LexiconEntry {
  hebrew: string;
  transliteration: string;
  gloss: string;
  /** How many times it has been inscribed, across every climb. */
  times: number;
  /** Whether it was ever the root a gate actually named. */
  wasTarget: boolean;
}

export function lexicon(ascents: readonly AscentRecord[]): LexiconEntry[] {
  const by = new Map<string, LexiconEntry>();
  for (const ascent of [...ascents].reverse()) {
    for (const word of ascent.wordsFormed ?? []) {
      const seen = by.get(word.hebrew);
      if (seen) {
        seen.times += 1;
        // Once named by a gate, always named by a gate: the mark is about the
        // root rather than about the inscription that happened to find it.
        seen.wasTarget = seen.wasTarget || word.wasTarget;
      } else {
        by.set(word.hebrew, {
          hebrew: word.hebrew,
          transliteration: word.transliteration,
          gloss: word.gloss,
          times: 1,
          wasTarget: word.wasTarget,
        });
      }
    }
  }
  return [...by.values()].sort((a, b) => a.transliteration.localeCompare(b.transliteration));
}

/**
 * **How often each Sefirah's House has stood for this Scribe**, across every
 * sealed climb.
 *
 * Counted from `witnessSefirot` — the frozen half of the ending — rather than
 * from `housesMet`, and the difference is the whole point: meeting a figure is
 * walking past them, and *standing* is being spoken for at the crown, which
 * only happens on a climb that arrived carrying the Mouth. A Scribe who has
 * gone mute seven times has met a great many figures and been stood for by
 * nobody.
 *
 * This is what deepens the Houses — see `cardsOpen` in `world/build.ts`.
 */
export function timesStood(ascents: readonly AscentRecord[]): Record<string, number> {
  const stood: Record<string, number> = {};
  for (const page of pagesOf(ascents)) {
    /**
     * **A mute climb's witnesses were met, not heard.** `witnessSefirot` is
     * filled from `housesMet` whatever the Scribe was carrying, because a
     * figure spoken with is a figure spoken with — the crown plate already
     * knows this and says "met on the way" rather than "stood for you" when
     * the Mouth is missing. Reading the field without the plea would hand the
     * whole collection to a Scribe who never once carried Peh, which is the
     * exact opposite of what standing is supposed to mean.
     */
    if (page.plea === "mute") continue;
    for (const sefirah of page.witnesses) stood[sefirah] = (stood[sefirah] ?? 0) + 1;
  }
  return stood;
}

// ---------------------------------------------------------------------------
// the tally
// ---------------------------------------------------------------------------

/**
 * What the whole shelf comes to. Every number here is a fold; none of it is
 * stored, so none of it can drift from the records it describes.
 */
export interface Tally {
  sealed: number;
  /** Climbs carried to a lit Tree, of those. */
  kindled: number;
  /** Climbs put down mid-way, which is a thing that happened and is kept. */
  abandoned: number;
  /** Paths walked across every climb — repeats counted, since they were walked. */
  pathsWalked: number;
  falls: number;
  /** Distinct letters ever held. Twenty-two is the alphabet. */
  lettersEver: number;
  /** Distinct roots ever formed. */
  rootsEver: number;
  /** Distinct Dorot cards ever met, of `CARDS_IN_ALL`. */
  cardsEver: number;
}

export function tally(ascents: readonly AscentRecord[]): Tally {
  const letters = new Set<string>();
  const cards = new Set<string>();
  let pathsWalked = 0;
  let falls = 0;
  for (const a of ascents) {
    for (const id of a.lettersHeld) letters.add(id);
    for (const id of a.housesMet) if (dorotCardsById[id]) cards.add(id);
    pathsWalked += (a.pathsWalked ?? []).length;
    falls += a.falls ?? 0;
  }
  const pages = pagesOf(ascents);
  return {
    sealed: pages.length,
    kindled: pages.filter((p) => p.ending === "kindled").length,
    abandoned: ascents.filter((a) => a.abandonedAt && !a.sealedAt).length,
    pathsWalked,
    falls,
    lettersEver: letters.size,
    rootsEver: lexicon(ascents).length,
    cardsEver: cards.size,
  };
}
