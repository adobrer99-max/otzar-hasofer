import type { GeographyMode } from "../../types/herald";

/**
 * When and why Derekh Ha'Dorot cards are drawn in a reading, per the doc's
 * ritual mechanics. Resolved from the reading's (possibly manually
 * overridden) festival and geography:
 *
 * - Tisha B'Av locks the 22-Letter deck and forces the Galut deck — the
 *   three "beneath" draws are required, "even if you are physically sitting
 *   in Jerusalem" (the app records the letters regardless: the Treasury
 *   remains a faithful record; the lock lives in the physical ritual).
 * - In Galut, three cards are drawn beneath the three open letters.
 * - On Sukkot, the Scribe additionally performs the Council of Sefirot —
 *   one Ha'Dorot card, in addition to the regular reading (so it combines
 *   with the Galut "beneath" draws when both apply).
 */
export interface DorotMechanic {
  beneath: "forced-tishabav" | "galut" | "none";
  council: boolean;
}

export function resolveDorotMechanic(festivalId: string, geography: GeographyMode): DorotMechanic {
  const beneath =
    festivalId === "tishabav" ? "forced-tishabav" : geography === "galut" ? "galut" : "none";
  return { beneath, council: festivalId === "sukkot" };
}
