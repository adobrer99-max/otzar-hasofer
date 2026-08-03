import type { AscentRecord } from "../storage/ascentRepo";
import { standingAt } from "../storage/ascentRepo";
import type { SefirahId } from "../types/letter";
import { regionOfSefirah } from "./regions";

/**
 * **The fall — what happens when the last lamp goes out.**
 *
 * The prologue has promised this since the game shipped: *when the last goes
 * out, so do you, and the kingdom comes up to meet you exactly as it did the
 * first time*. It was not true. Going out called `sealAscent`, which set
 * `sealedAt` and closed the record — so a plate that said "the kingdom is where
 * you wake, and the way up is where it was" was, in fact, the delete button,
 * and an hour of walking went with it.
 *
 * Three untruths sat on that one shortcut, and this file is the whole of the
 * fix for all three:
 *
 * 1. The plate promised waking and performed deletion.
 * 2. `sealedAt` meant both "carried to an ending" and "went out", so
 *    **going out advanced the Seven Encounters exactly as crowning did** — the
 *    one across-runs system meant to be earned could be walked through by dying
 *    seven times in the kingdom.
 * 3. `or` could never be taken, and light buys exactly one thing, offered at the
 *    end of every rung. So hoarding all three hundred for a grand finale was
 *    strictly correct, and the game's only economic decision had one answer.
 *
 * ## What the fall is
 *
 * **A veiling at the scale of the Tree.** Inside a rung a fall or a thorn veils
 * the Scribe and he wakes at his mark, costing time, ground and two light —
 * never a letter and never the run. This is that same act one level up, and it
 * is built to read as the same act: a place you paid for catches you, and what
 * you were carrying is what you lose.
 *
 * So the two rules, and they are opposite halves of one idea. **Light poured
 * into the Tree stays lit and is what saves you; light still in your hand is
 * what you are made of, and it goes out with you.** A Scribe who kindles as he
 * goes wakes near the top having lost one rung's gathering. A Scribe who hoards
 * three hundred for the crown and goes out at Chochmah loses the entire climb's
 * income and re-walks ground that pays a seventh (`SPENT_LIGHT`).
 *
 * Nothing else is taken. Not a letter — the ground is laid *for* the letters
 * held, so taking one back could lay a rung its own Scribe could not cross, and
 * the traversal guarantee is not negotiable. Not a vessel: those are objects,
 * not light. Not a guardian already broken, and not a Sefirah already lit.
 */

/**
 * Where the Scribe wakes: **the highest Sefirah this climb has kindled**, and
 * the kingdom if it has kindled none.
 *
 * Capped at where they set out, because **a fall never carries you upward**.
 * Without that the fall is a free warp: a Scribe standing at Keter with no
 * light in hand could go out on purpose and wake at a kindled Chesed having
 * lost nothing. It is barely worth doing even so — the paths back pay a seventh
 * either way — but "a fall may carry you up the Tree" is not a sentence this
 * game should have to defend, and the cap is one comparison.
 *
 * `index` is the comparison, because it is the only total order over the ten:
 * a Sefirah's row on the diagram says which pillar and which height, and how
 * far up the Tree a place is, is exactly what `regionOfSefirah(s).index` means
 * everywhere else in this codebase.
 */
export function wakeAt(ascent: Pick<AscentRecord, "at" | "sefirotLit">): SefirahId {
  const from = regionOfSefirah(standingAt(ascent)).index;
  const lit = (ascent.sefirotLit ?? [])
    .map((s) => regionOfSefirah(s))
    .filter((r) => r.index <= from);
  if (lit.length === 0) return "malchut";
  return lit.reduce((high, r) => (r.index > high.index ? r : high)).sefirah;
}

/**
 * What the fall changes about the record — returned as fields rather than
 * applied, so the rule can be tested without a page and `GamePage` stays the
 * only thing in the game that writes an `AscentRecord`.
 *
 * Note what is *not* here, because the absence is the design: no `sealedAt`.
 * The climb goes on. That is the whole of the debt this file was written to
 * pay.
 *
 * Lamps are not here either, and need no code: every path builds a fresh world
 * carrying `LAMPS` plus whatever the vessels and the day's Encounter add, so
 * the next rung already begins full. A fall costs light, ground and time — it
 * has never cost lamps, because lamps are not a thing you keep.
 */
export function afterFalling(
  ascent: Pick<AscentRecord, "at" | "sefirotLit" | "falls">,
): Pick<AscentRecord, "at" | "regionIndex" | "or" | "falls"> {
  const at = wakeAt(ascent);
  return {
    at,
    // Kept in step with `at` for the saved-game format, the HUD and every
    // caller that predates the Tree — the same rule `walkPath`'s bookkeeping
    // keeps, and for the same reason.
    regionIndex: regionOfSefirah(at).index,
    or: 0,
    falls: (ascent.falls ?? 0) + 1,
  };
}
