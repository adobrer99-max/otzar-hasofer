import type { SefirahId, CardArt } from "./letter";

export type DorotHouseKind = "patriarchal" | "matriarchal";

export interface DorotHouse {
  /** Stable forever — commentaries and future reading records reference card ids built on these. */
  id: string;
  sefirah: SefirahId;
  kind: DorotHouseKind;
  /** "Abraham", "Rachel & Leah", ... */
  figure: string;
  /** "The House of Welcome" — the doc names these for the matriarchal Houses only. */
  houseName?: string;
  /** "Hospitality, Promise, Covenant, Faith" — matriarchal Houses only per the doc. */
  spiritualEnergy?: string;
  /** The doc's one-line "rhythm" teaching, e.g. "Sarah teaches us to welcome God's promises." */
  teaching?: string;
}

export interface DorotCard {
  /** Stable forever, e.g. "abraham-1", "sarah-16". */
  id: string;
  houseId: string;
  /** 1–8 for patriarchal Houses, 1–16 for matriarchal Houses. */
  index: number;
  /** Evocative card title ("The Tent") for patriarchal cards; the episode name for matriarchal ones. */
  title: string;
  /** The biblical episode this card depicts — the unit of interpretation. */
  episode: string;
  /** The lived practice the episode points toward. Patriarchal cards only (for now). */
  humanPractice?: string;
  /** The card's contemplative question. Patriarchal cards only (for now). */
  question?: string;
  /** The doc's one-or-two-word "Core Energy". Matriarchal cards only (for now). */
  coreEnergy?: string;
  /** The physical card's artwork, when available (see CardArt). */
  art?: CardArt;
}
