import { getEncounterForReadingIndex } from "../data/encounters";
import type { Encounter } from "../types/encounter";
import type { AscentRecord } from "../storage/ascentRepo";

/**
 * The Seven Encounters, as the Ascent climbs them.
 *
 * The Treasury already holds that a participant's first seven readings are the
 * Seven Encounters of Bereshit — Light, Separation, Dry Land, and so through
 * Shabbat — and that the Herald is formed out of exactly those seven. The
 * climb follows the same reckoning: **your Nth ascent is the Nth Encounter.**
 *
 * This is the game's only progression across runs, and it is deliberately not
 * an invented one. `getEncounterForReadingIndex` is the same function the
 * reading form and the folio call, given the same kind of number — a count of
 * what came before. Past the seventh it returns `undefined`, and later climbs
 * are simply beyond the seven: still made, still recorded, but no longer part
 * of the unfolding order. That is the Herald's own rule about later readings,
 * kept here rather than reinvented.
 */

/** How many ascents have been carried all the way to the crown and sealed. */
export function sealedCount(ascents: readonly AscentRecord[]): number {
  return ascents.filter((a) => a.sealedAt).length;
}

/**
 * The Encounter a climb belongs to, from the number of sealed climbs before
 * it. `undefined` once the seven are behind you.
 */
export function encounterFor(sealedBefore: number): Encounter | undefined {
  return getEncounterForReadingIndex(sealedBefore);
}

/** "The Third Encounter — Dry Land", for the threshold and the summary. */
export function encounterTitle(encounter: Encounter): string {
  return `The ${encounter.name} Encounter — ${encounter.aspect}`;
}

/**
 * The Encounter lights one rung of the Tree brighter than the rest: light
 * gathered in its Sefirah's region counts double. Which region that is comes
 * from the Encounter's own `sefirah`, the same correspondence the Herald uses
 * to decide which Sefirot a revealed Herald shows illuminated.
 */
export const ILLUMINED_MULTIPLIER = 2;

export function isIllumined(encounter: Encounter | undefined, sefirah: string): boolean {
  return Boolean(encounter && encounter.sefirah === sefirah);
}
