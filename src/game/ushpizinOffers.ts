import { ushpizinBySefirah } from "../data/ushpizin";
import type { Bargain } from "../storage/ascentRepo";
import type { SefirahId } from "../types/letter";
import type { Grace, Verb } from "./abilities";

/**
 * The seven guests, and what each will do for you.
 *
 * The Houses were a plate of text: you walked up, read an episode, walked on.
 * Nothing was asked and nothing was decided. Here each of the seven lower
 * Sefirot instead offers a bargain **in its own middah, at a price in that
 * same middah** — which is the only way a Sefirah can be taught by a game
 * rather than described by one. Abraham keeps an open tent, so Abraham asks
 * nothing. Isaac is restraint, so Isaac will only give to a Scribe who can
 * leave a region without taking its light. Jacob wrestled through the night,
 * so Jacob wants a crossing survived unveiled.
 *
 * Two shapes only, so the machinery stays small:
 *
 * - a **price** paid the moment the offer is accepted (light, or nothing);
 * - a **vow** taken now and judged at the region's exit.
 *
 * A declined offer costs nothing. A broken vow costs nothing but the boon —
 * this game charges nothing for refusing a guest. **That doctrine survives
 * the partings below unchanged**: a refusal is now *remembered*
 * (`AscentRecord.bargains`) and *answered* — the guest gives an authored
 * parting line in their own middah — but it grants nothing, waives nothing,
 * and prices nothing. Honoring a refusal with payment would make No a second
 * Yes; honoring it with memory and a word keeps it a real choice.
 */

export type VowKind =
  /** Take no light for the rest of this region. */
  | "gather-nothing"
  /** Cross the rest of this region without being veiled. */
  | "unveiled"
  /** Reach the exit without setting another mark. */
  | "no-mark";

export interface UshpizinOffer {
  sefirah: SefirahId;
  /** The guest, from `data/ushpizin.ts`. */
  figure: string;
  middah: string;
  /** What the guest says when the offer is made. */
  saying: string;
  /** What is asked, in one line, for the button. */
  terms: string;
  /** Light paid on acceptance. Zero for the freely-given and the vows. */
  price: number;
  /** A vow judged at the exit, when the bargain is one. */
  vow?: VowKind;
  /** The grace granted — on acceptance for a price, at the exit for a vow. */
  grants: Grace;
  /** Named on the plate so the Scribe knows what they are being given. */
  grantsLabel: string;
  /**
   * What the guest says to a Scribe who declines — in that figure's middah,
   * because a refusal met in character is the proof the offer was a person
   * and not a vending machine. Isaac, who is restraint, honors the honest no
   * outright: a vow taken and broken would have cost more than a vow never
   * given.
   */
  parting: string;
}

/** The seven Sefirot that seat a guest — Keter, Chochmah and Binah do not. */
export type GuestSefirah =
  | "chesed"
  | "gevurah"
  | "tiferet"
  | "netzach"
  | "hod"
  | "yesod"
  | "malchut";

// Exhaustive over the seven by type — the TILE_NAMES lesson. It was
// Record<string, …>, the silent-default shape, which would have let a typo'd
// key ship a guest nobody could ever meet.
const OFFERS: Record<GuestSefirah, Omit<UshpizinOffer, "figure" | "middah">> = {
  chesed: {
    sefirah: "chesed",
    saying:
      "The tent is open on all four sides, and you were not asked to knock. Take this, and do not thank me — a gift that must be repaid was a sale.",
    terms: "Accept, freely",
    price: 0,
    grants: "swift-water",
    grantsLabel: "The Fish — the deep becomes your element",
    parting:
      "Then go with what you have, and go blessed. The tent stays open on the way back, and the way back is also a way.",
  },
  gevurah: {
    sefirah: "gevurah",
    saying:
      "You have been gathering everything you pass. Leave the rest of this region untouched — take no more light from it — and I will give you what restraint is worth.",
    terms: "Vow: gather no more light here",
    price: 0,
    vow: "gather-nothing",
    grants: "high-jump",
    grantsLabel: "The Staff — you rise higher from every leap",
    parting:
      "Good. A vow you could not keep would have cost us both more than this. Restraint that knows itself is the whole lesson — go up.",
  },
  tiferet: {
    sefirah: "tiferet",
    saying:
      "I wrestled until dawn and did not let go, and it cost me my hip. Cross what remains of this region without once being veiled, and the blessing is yours.",
    terms: "Vow: reach the exit unveiled",
    price: 0,
    vow: "unveiled",
    grants: "return",
    grantsLabel: "The Beginning — veiled on a branch, you wake at the fork",
    parting:
      "Then you will not wrestle tonight. It is honest to say so, and honesty is most of what I was fighting for.",
  },
  netzach: {
    sefirah: "netzach",
    saying:
      "Forty years, and I did not enter. Endurance is not the strength of the moment — set no further mark between here and the way out, and carry the whole distance yourself.",
    terms: "Vow: set no further mark",
    price: 0,
    vow: "no-mark",
    grants: "farsight",
    grantsLabel: "The Window — the view widens before you",
    parting:
      "Then carry your own marks. It is a long way under any word, and no is a word too — hold it the whole road.",
  },
  hod: {
    sefirah: "hod",
    saying:
      "Splendour is the naming of what was given. Name it in light — pay me what you have gathered — and I will teach your hands to draw it.",
    terms: "Pay 10 light",
    price: 10,
    grants: "draw-motes",
    grantsLabel: "The Angler — light comes to you of its own accord",
    parting:
      "Keep your light, and spend it where you must. A gift refused kindly leaves both of our hands full.",
  },
  yesod: {
    sefirah: "yesod",
    saying:
      "Everything above must pass through a narrow place to reach the world below. I keep that channel, and nothing that comes through it falls hard. Give me a little of what you carry and I will see you down gently.",
    terms: "Pay 6 light",
    price: 6,
    grants: "slow-fall",
    grantsLabel: "The Support — you descend as though upheld",
    parting:
      "Then store your own grain. I kept mine for years before anyone was fed from it — a foundation knows how to wait.",
  },
  malchut: {
    sefirah: "malchut",
    saying:
      "The kingdom asks nothing it has not already given. What is here is yours; I only hand it to you.",
    terms: "Accept",
    price: 0,
    grants: "light",
    grantsLabel: "The Spark — your lamp reaches further",
    parting:
      "A king hears no gladly from a free man. Sing something on the stairs anyway, whether or not it is mine.",
  },
};

/**
 * What a grace needs before it is worth anything.
 *
 * The reason this exists: two of the seven guests were handing over a power
 * that could not be used for most of the climb. David gave the Palm — a second
 * standing stone — at the *first* rung, and a standing stone needs Bet, which
 * is found at the eighth; Joseph gave the Fish at the second, and the deep
 * needs Mem, which is found at the seventh. The first two bargains a player is
 * ever offered both did nothing, and nothing in the codebase could notice,
 * because a grace is granted by name and the name is always valid.
 *
 * So the dependency is written down, and `exposure.test.ts` reads it: a guest
 * may not grant a grace whose verb lies above their own rung. The Palm is no
 * longer anyone's gift — Bet and Kaf are both Binah, and no House stands above
 * the Abyss, so there is no rung that could give it honestly. It is still had
 * by finding Kaf, like any other letter.
 */
export const GRACE_NEEDS: Partial<Record<Grace, Verb>> = {
  "swift-water": "swim",
  "second-stone": "block",
};

/**
 * The verb a boon needs and this body has not got — so the plate can say so.
 *
 * `GRACE_NEEDS` is checked at design time by `exposure.test.ts`, against
 * `lettersOnEntering`: on a line, standing at a rung *was* holding its letters,
 * so writing the dependency down was enough. **The Tree unpicked that.** The
 * route decides the alphabet now, so a Scribe can be standing in Chesed without
 * Mem, and Abraham's Fish — the deep becoming your element — is a bargain for a
 * body that cannot swim. The table was right and the world outgrew the place it
 * was enforced.
 *
 * Not hidden, told. A guest who silently vanished would be worse than one
 * offering something premature: the offer is still real, it is still theirs to
 * take, and the Scribe is the one who should decide whether to take it now or
 * come back holding the letter.
 */
export function dormantFor(offer: UshpizinOffer, verbs: readonly Verb[]): Verb | undefined {
  const needs = GRACE_NEEDS[offer.grants];
  return needs && !verbs.includes(needs) ? needs : undefined;
}

/** The guest standing in a region, if that Sefirah keeps one. */
export function offerFor(sefirah: SefirahId): UshpizinOffer | undefined {
  // The narrowing is the exhaustiveness: above the Abyss there is no guest,
  // and the table's type now says so instead of a lookup quietly missing.
  if (!(sefirah in OFFERS)) return undefined;
  const base = OFFERS[sefirah as GuestSefirah];
  const guest = ushpizinBySefirah[sefirah];
  if (!guest) return undefined;
  return { ...base, figure: guest.figure, middah: guest.middah };
}

/** Whether a vow taken in a region was kept, judged at its exit. */
export function vowKept(
  vow: VowKind,
  since: { orGathered: number; veilings: number; marksSet: number },
): boolean {
  switch (vow) {
    case "gather-nothing":
      return since.orGathered === 0;
    case "unveiled":
      return since.veilings === 0;
    case "no-mark":
      return since.marksSet === 0;
    default:
      return false;
  }
}

/**
 * The bargain remembered — pure, because a rule that lives inside a
 * `useCallback` is a rule no test can see, which is how `onVessel` went
 * missing for a whole phase. `GamePage` calls these at the moment of choice
 * and writes the result straight to the record (`AscentRecord.bargains`).
 *
 * `recordBargain` appends; a House can only be met once per rung, so there is
 * nothing to dedupe. `judgeBargain` upgrades the **latest** `accepted` entry
 * for that Sefirah — the vow just judged is the one most recently taken — and
 * touches nothing else: a declined offer stays declined, an already-judged
 * vow stays judged, and a judgment with no matching acceptance changes
 * nothing at all rather than inventing history.
 */
export function recordBargain(
  bargains: readonly Bargain[] | undefined,
  sefirah: SefirahId,
  outcome: "accepted" | "declined",
): Bargain[] {
  return [...(bargains ?? []), { sefirah, outcome }];
}

export function judgeBargain(
  bargains: readonly Bargain[] | undefined,
  sefirah: SefirahId,
  kept: boolean,
): Bargain[] {
  const list = [...(bargains ?? [])];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].sefirah === sefirah && list[i].outcome === "accepted") {
      list[i] = { sefirah, outcome: kept ? "kept" : "broken" };
      break;
    }
  }
  return list;
}
