import type { SpreadKind } from "../../types/herald";

/**
 * Which spread a reading uses, by festival. Pure and total, mirroring
 * `resolveDorotMechanic`:
 *
 * - Tu Bishvat ("The Etz Chaim / Four Worlds"): the standard Triadic Spread
 *   is replaced by a Vertical Four-Card Draw — roots, trunk, branches, and
 *   fruit, one per World (Assiyah, Yetzirah, Briyah, Atzilut) — and the
 *   Scribe draws a fifth card for the world to come. The PaRDeS framework
 *   ("Orchard") takes absolute precedence over the Shoresh resolution.
 * - Tu B'Av ("The Yichud / Unification"): the veiled anchor is unveiled —
 *   Tu B'Av is about transparency and the lifting of veils — leaving two
 *   pairs of cards. The reading does not look for tension or conflict, only
 *   for synthesis: between each letter in a pair, and between the pairs.
 * - Every other day: the standard triadic spread.
 */
export function resolveSpread(festivalId: string): SpreadKind {
  if (festivalId === "tubishvat") return "etz-chaim";
  if (festivalId === "tubav") return "yichud";
  return "triadic";
}
