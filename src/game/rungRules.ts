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
  /**
   * **Yesod's knob — a set stone is founded, and founding is one-way.**
   * On ground bound here Bet lays `Tile.Ledge` rather than `Tile.Placed`:
   * no recall (`kept` is what the refusal says), no limit (every press lays
   * a new one and every one stands), and no wall — a ledge bears a landing
   * body and bars nothing, horizontal and rising movement pass through and
   * a held drop falls through, so no accumulation of founded stones can
   * ever close a passage. That last property is the whole reason the rule
   * is safe to ship: "stones stay set" with *solid* stones and no recall
   * would let a hand seal a crawl mouth forever, and the no-soft-lock proof
   * is taken against terrain no hand can edit. `set` is said as one lays.
   */
  stonesFounded?: { set: string; kept: string };
  /**
   * **Hod's knob — a shrine that answers gives the lamps back.** Rides the
   * Tav activation and nothing else: setting the mark *is* the naming, so a
   * Scribe without Tav is offered nothing new (the shrine already says the
   * Mark is not yet theirs), and a hand whose lamps are all burning hears
   * the ordinary line — what was not taken cannot be given back. The string
   * is what the shrine says when it relights, instead of "Your mark is set
   * here."; the shrine still activates once, so the gift is once per shrine.
   */
  shrinesRelight?: string;
  /**
   * **Chesed's knob — a sealed door opens to a gift.** Kneel at the seal
   * (crouch + act) with `price` light in hand and the light is poured out:
   * the room unseals, latches open (`room.cleared` — without the latch
   * `stepRooms` rewrites the seal on the next tick), and everything holding
   * the door is left standing. `given` is said as the way opens; `wanting`
   * when the hand is short, with nothing spent.
   *
   * The crouch is load-bearing, not flavour: the fight probes press act
   * while grounded (the unstick rhythm) and are regularly stuck against the
   * very seal they are fighting behind, so a plain-act gift would let every
   * instrument buy its way out and move the fight bands. Measured against
   * the probes' own input blocks: the fighter presses down only airborne,
   * `hurried` never presses down, and the traversal probe presses down
   * grounded only over a ledge — where `p.crouching` is false by
   * construction. Kneeling is unreachable by every instrument, and it is
   * also the right image: you kneel to give.
   */
  sealOpensTo?: { price: number; given: string; wanting: string };
  /**
   * **Binah's knob — the lies are laid bare, in two tiers.** The knob's
   * presence is tier one: every figured stone on ground bound here is
   * *drawn* with its seam and hatch at full legibility, both palettes, no
   * letter needed — Binah tells the truth about its floor, and the ground
   * still charges a runner who ignores what is shown. Tier two is earned:
   * once the Eye is open (`world.revealed`), a seen lie does not give way —
   * `breakMaskit` refuses, and `revealed` is what the Eye's opening says on
   * this road instead of the ordinary Or HaGanuz line. Behaviour and ink
   * only, never a tile and never `isSolid`: the route proof is taken
   * against the shipping grid and stays that way.
   *
   * The gate on tier two is the Tree's own: Ayin lies on `tiferet-keter`,
   * not in Binah, so no straight-up climber holds the Eye on a binah-bound
   * road — the full rule belongs to a Scribe who has been to the crown's
   * road and come back down. That is the middah exactly: the flash is
   * received elsewhere; Binah is where it is worked into something that
   * can be stood on.
   */
  liesLaidBare?: { revealed: string };
}

export const RUNG_RULES: Record<SefirahId, RungRule | null> = {
  // The kingdom's rule is the taught opening. Load-bearing null.
  malchut: null,
  /**
   * **P15-R3 — Foundation.** The question is "What will you hold to, when
   * the wall is all there is to hold?", and the rule gives the climb its
   * answer to hold: what Bet sets on this road is *founded* — it cannot be
   * taken back, it will bear you, and it will bar nothing. One road is
   * bound here (malchut-yesod, the game's first), so this is the rule a
   * climb meets before any other: the Foundation keeps what you set on it.
   *
   * Measured on landing: `route`, `traversal` and `speed` stand (the
   * walking probes set stones at lips on this road and climb their own
   * ledges), and `fight`, `curve`, `economy` and `climb` stand over all
   * three seed pools — the tour re-walks this road every climb and the
   * founding moved nothing.
   */
  yesod: {
    says: "What is set on this ground is founded for good. It will bear you, and bar nothing, and it will not be taken back.",
    stonesFounded: {
      set: "The stone goes into the Foundation. It will bear you, and it will not be taken back.",
      kept: "The Foundation keeps what you set on it. Nothing founded here returns to the hand.",
    },
  },
  /**
   * **P15-R4 — Splendour.** The question is "What will you name as given,
   * before you reach for the next?", and the rule is thanksgiving made
   * mechanical: setting your mark at a shrine names the road so far as
   * given, and what is named as given is given again — the lamps relight.
   * The gift rides the shrine's own gates, all of them standing: Tav must
   * be in the hand, the shrine answers once, and lamps already burning get
   * the ordinary line. Three roads are bound here (from Malchut, Yesod and
   * Netzach), which makes Hod the counterweight to its own pillar-mate:
   * Netzach's cold shrines take the checkpoint away, Hod's warm ones give
   * back more than a checkpoint.
   *
   * Measured on landing: `fight`, `curve`, `economy` and `climb` re-run
   * over all three seed pools with the rule live and no band moved — and
   * the reason was checked rather than assumed: over twenty-four fighting
   * walks on these roads the probe lit **no shrine at all**. The roads from
   * Yesod and Netzach lay theirs 2,800–4,800px in, past where the fight
   * budget usually ends, and the road from Malchut lays none — a rung's
   * shrine follows the *lower* end's `hasShrine`, and the kingdom keeps no
   * shrine. So the gift is a player's, met at a player's pace, and the
   * instruments walk past it.
   */
  hod: {
    says: "The shrines on this road give back. Set your mark, and what you name as given is given again.",
    shrinesRelight:
      "Your mark is set — and what was named as given is given again. The lamps are relit.",
  },
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
  /**
   * **P15-R5 — Loving-kindness.** The question is "What will you give away,
   * here where everything was given to you?", and the rule answers it at
   * the one place the game demands force: a sealed room on a chesed-bound
   * road opens to a gift of light, with everything that held the door left
   * standing. Eight light sits inside the 4–15 the door-holders would have
   * *paid* if broken (the mid-tree kinds are worth 3–6 each) and four times
   * what a veiling costs, so the gift is a real trade — roughly a dozen or
   * two of light swung against fighting — and one number a hand can hold.
   * Two roads are bound here: netzach-chesed and tiferet-chesed.
   *
   * Affordability was measured, not assumed: over sixteen fighting walks on
   * the two roads the probe gathered 0–24 light, median 9 — and those are
   * budget-truncated walks; a Scribe who crosses the whole rung gathers
   * more. Eight is a real reach into the purse, not a toll and not a wall.
   * Bands: `fight`, `curve`, `economy` and `climb` stand over all three
   * seed pools — the crouch gate makes the gift unreachable by every probe,
   * so the instruments measure exactly the ground they measured before.
   */
  chesed: {
    says: "A sealed door on this road opens to giving: kneel before it with eight light, and what holds it keeps its light.",
    sealOpensTo: {
      price: 8,
      given: "The light is given, and the way opens. What held the door keeps everything it holds.",
      wanting: "The door would open to a gift of eight light. You do not yet have it to give.",
    },
  },
  /**
   * **P15-R6 — Understanding.** The question is "What will you work the
   * flash into, so it can be held and said?", and the teaching's own last
   * sentence — "Here the hidden light is simply seen" — is the rule cashed:
   * the one deception in the game's ground, the figured stone, is shown
   * plainly on binah-bound roads, and with the Eye open it cannot deceive
   * at all — a seen lie bears weight. Three roads are bound here, and two
   * of them cross the Abyss, where a shrine-less rung makes every fall the
   * whole road again — the stone that cannot spring is worth the most
   * exactly where the rule puts it. `binah-keter` is bound for the crown
   * and keeps its lies: the rule follows the destination, as they all do.
   *
   * Measured on landing: `fight` hands binah rows `lettersOnEntering(8)`,
   * which holds no Ayin, so the fight bands cannot see tier two by
   * construction; `speed` and the figured-stone claims build worlds that
   * never set `toward`. The exposed surfaces were `climb`'s two crossings
   * tests — 21 letters including Ayin, the fighter opening the Eye on its
   * unstick beat, so they exercise the rule on every run — and the tour on
   * seeds where Ayin precedes a binah-bound leg. All four band files stand
   * over all three seed pools; the only direction the rule could move a
   * crossing rate is upward, and none moved at all.
   */
  binah: {
    says: "Nothing in this floor hides from you: every stone that lies shows its seam. Open the Eye, and a seen lie will bear you.",
    liesLaidBare: {
      revealed:
        "Or HaGanuz — and understanding holds it: the lies in the floor are laid bare, and what is seen will bear you.",
    },
  },
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
