import type { HeraldLayer, LetterDraw, GeographyMode } from "../../types/herald";
import type { UnionRecord } from "../../types/union";
import type { SefirahId } from "../../types/letter";
import { deriveHeraldForm } from "../synthesis/deriveHeraldForm";

/**
 * The Covenantal Herald — "a shared Herald is created" at marriage. It is
 * derived, never stored: each partner keeps their own Herald and history,
 * and this form reads both. Heraldically it is an impalement (per pale, the
 * marriage convention): the first partner's dominant letter on the dexter
 * side, the second's on the sinister. The Tree lights the union of both
 * partners' lit Sefirot, and each recorded day of the Sheva Brachot adds a
 * base mark — the marriage literally grows through seven blessings.
 */
export interface CovenantalForm {
  /** Partner A's dominant letter — the dexter half of the impalement. */
  dexterCharge: LetterDraw;
  /** Partner B's dominant letter — the sinister half. */
  sinisterCharge: LetterDraw;
  /** Union of both partners' lit Sefirot, first-occurrence order (A then B). */
  litSefirot: SefirahId[];
  /**
   * The couple's brightest Tree node: the shared dominant middah when the
   * partners agree, else Tiferet — the balancing Sefirah where two pillars
   * meet (a deliberate reading of the union, flagged as editorial).
   */
  dominantMiddah: SefirahId;
  /** Galut only when both partners' own majorities are Galut. */
  geography: GeographyMode;
  /** One Sefirah per recorded Sheva Brachot day, in day order. */
  shevaBrachotLit: SefirahId[];
  /** Grows with the recorded blessings. */
  ornamentDensity: number;
  /** True once both partners' own Heralds are revealed (7 readings each). */
  bothRevealed: boolean;
}

export function deriveCovenantalForm(
  layersA: HeraldLayer[],
  layersB: HeraldLayer[],
  union: UnionRecord,
): CovenantalForm {
  if (layersA.length === 0 || layersB.length === 0) {
    throw new Error("deriveCovenantalForm needs at least one reading per partner.");
  }
  const formA = deriveHeraldForm(layersA);
  const formB = deriveHeraldForm(layersB);

  const litSefirot: SefirahId[] = [];
  for (const s of [...formA.litSefirot, ...formB.litSefirot]) {
    if (!litSefirot.includes(s)) litSefirot.push(s);
  }

  const dominantMiddah: SefirahId =
    formA.dominantMiddah === formB.dominantMiddah ? formA.dominantMiddah : "tiferet";

  const shevaBrachotLit = [...union.shevaBrachot]
    .sort((a, b) => a.day - b.day)
    .map((d) => d.sefirah);

  return {
    dexterCharge: formA.charges[0],
    sinisterCharge: formB.charges[0],
    litSefirot,
    dominantMiddah,
    geography: formA.geography === "galut" && formB.geography === "galut" ? "galut" : "land",
    shevaBrachotLit,
    ornamentDensity: Math.min(12 + shevaBrachotLit.length * 4, 40),
    bothRevealed: formA.revealed && formB.revealed,
  };
}
