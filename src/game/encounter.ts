import { getEncounterForReadingIndex } from "../data/encounters";
import type { Encounter } from "../types/encounter";
import type { AscentRecord } from "../storage/ascentRepo";
import type { Grace } from "./abilities";

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

// ---------------------------------------------------------------------------
// what each Encounter does
// ---------------------------------------------------------------------------

/**
 * **Each of the seven changes how a climb is played, and each one is a number.**
 *
 * For most of this game's life the Encounters were a label and a doubling. The
 * doubling was real — light counts twice in one Sefirah — but it was the whole
 * of it, so six of the seven differed only in which rung they lit and in the
 * sentence printed at the threshold. That is a progression system in name.
 *
 * These are the rules, and they are **data rather than code** for the reason
 * `items.ts` gives about the vessels: a table can be enumerated, and
 * `encounter.test.ts` enumerates it to prove that none of them is decorative and
 * that no two of them are the same rule wearing different names. A rule that
 * changed nothing would otherwise be indistinguishable from a rule that worked,
 * because the label would print either way.
 *
 * Each is drawn from its own Day. The Days are `data/encounters.ts`'s own
 * wording, not a paraphrase — the Fifth is Living Creatures and the Sixth is
 * Humanity, whatever an earlier draft of the design called them.
 *
 * Two of these replace what the design first proposed, because the first
 * proposal did not hook a number that exists. *"Sealed rooms hold two klipot's
 * worth"* for the Second was the Fifth's rule with a different name on it; and
 * *"the Dorot Houses give double"* for the Sixth had nothing to double, since
 * what a House gives is a grace and a grace is not a quantity. What is here
 * instead stays in each Day's key and moves a number the game already keeps.
 */
export interface EncounterRule {
  number: Encounter["number"];
  /** One line, for the threshold and the map. */
  rule: string;
  /** Light gathered in the Encounter's own Sefirah, multiplied. */
  motes?: number;
  /** What a klipah broken **inside a sealed room** pays, multiplied. */
  sealed?: number;
  /** Light in every shell, multiplied, wherever it breaks. */
  husks?: number;
  /** How many klipot stand on a rung, multiplied. */
  klipot?: number;
  /** Graces held for the whole climb. */
  grants?: Grace[];
  /** Lamps beyond the three. */
  lamps?: number;
  /** Every Ushpizin bargain is freely given. */
  guestsFree?: boolean;
  /** What a veiling takes off the light gathered. Two, unless a rule says else. */
  veilCost?: number;
}

/** What a veiling costs when no Encounter says otherwise. */
export const VEIL_COST = 2;

export const ENCOUNTER_RULES: readonly EncounterRule[] = [
  {
    number: 1,
    // Chesed — Light. The rule the Encounters already had, kept as the First
    // rather than replaced, because it *is* the First's rule: the day light was
    // made is the day light is worth more.
    rule: "Light gathered in Chesed counts double.",
    motes: ILLUMINED_MULTIPLIER,
  },
  {
    number: 2,
    // Gevurah — Separation, the waters above and the waters below. The game's
    // own boundary is the door that closes behind you while something in the
    // room is still holding light. Draw the boundary, and what is separated
    // out within it is worth twice as much.
    rule: "A klipah broken inside a sealed room gives up twice the light.",
    sealed: 2,
  },
  {
    number: 3,
    // Tiferet — Dry Land. Bet sets a stone in the middle of nothing, which is
    // the only thing in this game that makes ground where there was none. On
    // the Third, two of them stand.
    rule: "Bet sets dry land where there was none, and a second stone may stand.",
    grants: ["second-stone"],
  },
  {
    number: 4,
    // Netzach — Luminaries. A lamp is the light a Scribe is made of, and this
    // is the day the lights were hung.
    rule: "A fourth lamp burns.",
    lamps: 1,
  },
  {
    number: 5,
    // Hod — Living Creatures. They swarm, and each of them is holding more.
    rule: "The klipot are many, and each holds more light.",
    klipot: 1.5,
    husks: 1.5,
  },
  {
    number: 6,
    // Yesod — Humanity. Btzelem Elohim, and what one person owes another: the
    // guests of the Ushpizin ask nothing, and every bargain is a gift.
    rule: "Every guest asks no price. What they offer is given.",
    guestsFree: true,
  },
  {
    number: 7,
    // Malchut — Shabbat. Creation is complete; nothing new is made and nothing
    // is lost. A veiling still sends the Scribe back to their mark, and it no
    // longer takes anything with it.
    rule: "A veiling costs no gathered light. Nothing is made, and nothing is lost.",
    veilCost: 0,
  },
];

export const ruleByNumber: Record<number, EncounterRule> = Object.fromEntries(
  ENCOUNTER_RULES.map((r) => [r.number, r]),
);

/**
 * The rule this climb is played under. Past the seventh there is none — later
 * climbs are beyond the unfolding order and are played on the game's own
 * numbers, which is the Herald's rule about later readings kept here.
 */
export function rulesFor(encounter: Encounter | undefined): EncounterRule | undefined {
  return encounter ? ruleByNumber[encounter.number] : undefined;
}
