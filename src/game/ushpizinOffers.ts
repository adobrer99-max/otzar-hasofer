import { ushpizinBySefirah } from "../data/ushpizin";
import type { SefirahId } from "../types/letter";
import type { Grace } from "./abilities";

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
 * this is still a game where the crown is always reached.
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
}

const OFFERS: Record<string, Omit<UshpizinOffer, "figure" | "middah">> = {
  chesed: {
    sefirah: "chesed",
    saying:
      "The tent is open on all four sides, and you were not asked to knock. Take this, and do not thank me — a gift that must be repaid was a sale.",
    terms: "Accept, freely",
    price: 0,
    grants: "light",
    grantsLabel: "The Spark — your lamp reaches further",
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
  },
  tiferet: {
    sefirah: "tiferet",
    saying:
      "I wrestled until dawn and did not let go, and it cost me my hip. Cross what remains of this region without once being veiled, and the blessing is yours.",
    terms: "Vow: reach the exit unveiled",
    price: 0,
    vow: "unveiled",
    grants: "slow-fall",
    grantsLabel: "The Support — you descend as though upheld",
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
  },
  hod: {
    sefirah: "hod",
    saying:
      "Splendour is the naming of what was given. Name it in light — pay me what you have gathered — and I will teach your hands to draw it.",
    terms: "Pay 10 light",
    price: 10,
    grants: "draw-motes",
    grantsLabel: "The Angler — light comes to you of its own accord",
  },
  yesod: {
    sefirah: "yesod",
    saying:
      "Everything above must pass through a narrow place to reach the world below. I keep that channel. Give me a little of what you carry and it will run more freely.",
    terms: "Pay 6 light",
    price: 6,
    grants: "swift-water",
    grantsLabel: "The Fish — the deep becomes your element",
  },
  malchut: {
    sefirah: "malchut",
    saying:
      "The kingdom asks nothing it has not already given. What is here is yours; I only hand it to you.",
    terms: "Accept",
    price: 0,
    grants: "second-stone",
    grantsLabel: "The Palm — you may hold a second standing stone",
  },
};

/** The guest standing in a region, if that Sefirah keeps one. */
export function offerFor(sefirah: SefirahId): UshpizinOffer | undefined {
  const base = OFFERS[sefirah];
  const guest = ushpizinBySefirah[sefirah];
  if (!base || !guest) return undefined;
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
