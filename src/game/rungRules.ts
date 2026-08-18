import type { SefirahId } from "../types/letter";

/**
 * **The rungs' own rules — the spine, laid empty.**
 *
 * P15-3 authored each rung a question (`Region.question`); the P15-R slices
 * give each an *answer in the hands* — one bespoke rule per Sefirah, designed
 * from its middah, acting on the world/Scribe/economy side. This table is the
 * one home those rules will live in, the FESTIVAL_RULES discipline applied
 * before the first rule exists: exhaustive by type, so a Sefirah cannot be
 * forgotten; one resolver, so a rule reaches the game through a single seam
 * and never as a scattered `if`.
 *
 * **All ten are `null` today, and two are load-bearing nulls.** Malchut's
 * rule is the taught opening — the kingdom asks you to receive, and its
 * standing exemptions (rooms that never seal, a figured-stone budget of zero)
 * are precedent that null is a decision, not an absence. Keter's rule is
 * likely the presentation itself. Each P15-R slice replaces one null with a
 * rule and carries its own instrument teaching and band gate; the constraints
 * stand in the plan and are repeated where they bind: no closed or
 * conditional states on rung creatures (the P14g-4 debt), and no touching
 * `demand`, `length`, the gating quota, or the chunk library — a rule that
 * truly needs a draw change is a named recalibration inside its own slice.
 */
export interface RungRule {
  /**
   * The rule named to the player, one line — shown beneath the rung's
   * question at first sight, so a place with its own law says so on arrival.
   */
  says: string;
}

export const RUNG_RULES: Record<SefirahId, RungRule | null> = {
  // The kingdom's rule is the taught opening. Load-bearing null.
  malchut: null,
  yesod: null,
  hod: null,
  netzach: null,
  tiferet: null,
  gevurah: null,
  chesed: null,
  binah: null,
  chochmah: null,
  // The crown's rule is the presentation itself. Likely permanent null.
  keter: null,
};

/**
 * The one seam a rung's rule reaches the game through. Keyed to the
 * **destination** on the Tree — `regionOfPath` carries the upper end's
 * question, and the rule follows the question.
 */
export function rungRule(sefirah: SefirahId): RungRule | null {
  return RUNG_RULES[sefirah];
}
