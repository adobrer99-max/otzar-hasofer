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
 * **Most are `null` still, and two are load-bearing nulls.** Malchut's
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
  /**
   * **Netzach's knob — the shrines do not answer on ground bound here.**
   * The Tav shrine still stands and the chunk that lays it is byte-identical
   * (a rule may change behaviour, never a tile — the P5a law), but standing at
   * it sets nothing: no respawn, no `marksSet`, no verb spent. The string is
   * what a cold shrine says instead of "Your mark is set here." — the voice
   * stays in this table so the rule and its words live in one place.
   *
   * A veiling on such ground carries the Scribe back to wherever the last
   * *answering* shrine set them down — the rung's own start, for a rung
   * walked cold — which is endurance made mechanical: what you carry, you
   * carry the whole way, because nothing on this road will hold it for you.
   */
  shrinesCold?: string;
  /**
   * **Gevurah's knob — the throws are rationed on ground bound here.**
   * `count` marks may fly on the rung; the one that spends the ration and
   * every refused press after it say `spent`. Counted on `World.marksThrown`
   * at the moment a mark actually flies, so the ration survives a veiling
   * (the world does) and resets only with the rung itself. Only the Scribe's
   * own hand is counted — a klipah's throw goes through its own case in
   * `stepHusks` and never touches the counter.
   */
  marksRationed?: { count: number; spent: string };
}

export const RUNG_RULES: Record<SefirahId, RungRule | null> = {
  // The kingdom's rule is the taught opening. Load-bearing null.
  malchut: null,
  yesod: null,
  hod: null,
  /**
   * **P15-R1 — Endurance.** The question is "What will you carry the whole
   * way, without setting it down?", and the rule is its answer in the hands:
   * the shrines are cold, so there is no setting anything down. Ground is the
   * one thing the rung asks you to keep — every fall on a netzach-bound path
   * is paid for in the whole road back.
   *
   * Measured on landing: `fight`, `curve`, `economy` and `climb` re-run over
   * all three seed pools with the rule live and **no band moved** — the tour
   * and the dash stand untouched. The cost falls only where it is meant to:
   * on a body that falls, on this road, after where a mark would have been.
   */
  netzach: {
    says: "The shrines on this road are cold. What you carry, you carry the whole way.",
    shrinesCold: "The shrine is cold. This road keeps no mark but the walking of it.",
  },
  tiferet: null,
  /**
   * **P15-R2 — Severity.** The question is "What will you leave untaken,
   * though it stands within reach?", and the rule answers it in the writing
   * hand: sixty marks for the whole road, and not one more. Sixty is
   * generous by measurement, not by feeling — the fighting probe was run
   * over all three gevurah-bound paths and eight seeds before the number
   * was chosen, and no run that *broke* anything ever needed more than 31
   * throws; the only runs past sixty were three that sprayed 286–389 marks
   * into something they could not kill and broke nothing doing it. So the
   * ration never binds a deliberate hand, and what it takes from a spraying
   * one was buying nothing anyway. Restraint is the middah; the mechanics
   * are the middah's own claim that what you decline to spend was never
   * yours to waste.
   *
   * Measured on landing: with the ration live the same 24-walk sweep came
   * back **bit-identical** in broken, shells taken, goings-out and ticks —
   * only the three spray runs changed, capped at sixty with the outcomes
   * they already had — and `fight`, `curve`, `economy` and `climb` stand
   * over all three seed pools. The tour and the dash are untouched.
   */
  gevurah: {
    says: "The hand is rationed here: sixty marks, and not one more. What stands within reach may be left standing.",
    marksRationed: {
      count: 60,
      spent: "The ration is spent. What is left standing stays standing.",
    },
  },
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
