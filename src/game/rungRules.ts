import type { SefirahId } from "../types/letter";

/**
 * **The rungs' own rules — the spine, and what has been hung on it.**
 *
 * P15-3 authored each rung a question (`Region.question`); the P15-R slices
 * give each an *answer in the hands* — one bespoke rule per Sefirah, designed
 * from its middah, acting on the world/Scribe/economy side. This table is the
 * one home those rules will live in, the FESTIVAL_RULES discipline applied
 * before the first rule exists: exhaustive by type, so a Sefirah cannot be
 * forgotten; one resolver, so a rule reaches the game through a single seam
 * and never as a scattered `if`.
 *
 * **Nine are filled — every rung but the kingdom, whose null is load-bearing.** Malchut's
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
  marksRationed?: {
    count: number;
    spent: string;
    /**
     * What a room says when it lets a spent hand go. A door that waits on a
     * shell the Scribe may no longer throw at is a door only a fall opens,
     * so once the ration is gone no room closes and the one already closed
     * opens and stays open — restraint is asked for, not a trap sprung.
     */
    released: string;
  };
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
   * **Keter's knob — what is carried can be spent to keep you.** On ground
   * bound here a kneeling Scribe who gives (crouch + act) spends `price`
   * light and relights one lamp, up to a whole hand. `relit` is what the
   * world says; `wanting` what it says to a purse that cannot pay.
   */
  lightKeeps?: { price: number; relit: string; wanting: string };
  /**
   * **Chochmah's knob — light is received, not taken.** On ground bound here
   * a Scribe who has gone low (crouching or crawling) gathers motes from
   * `reach` tiles away and a standing body gathers none. `came` and
   * `untaken` are each said once a rung, the first time each happens.
   */
  lightReceived?: { reach: number; came: string; untaken: string };
  /**
   * **Tiferet's knob — a sealed room asks for half.** On ground bound here
   * a room opens when the shells holding it are as many broken as standing
   * (`opened` is what it says), and a shell broken in a room already in
   * balance spills no light and says `past` instead of its own release.
   * State lives on the room (`held`, `balanced`), never on a creature.
   */
  roomsBalance?: { opened: string; past: string };
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
  /**
   * **P15-R7 — Beauty.** The question is "What will you hold in balance,
   * when kindness and restraint both pull?", and the rule answers it at the
   * sealed room — the same place Gevurah's and Chesed's rules meet the
   * Scribe, because Tiferet is the line drawn between those two. A room on a
   * tiferet-bound road is satisfied by half: the door opens when as many of
   * the shells holding it are broken as are left standing. That is the
   * kindness. The restraint is that the measure is a measure — once a room
   * has found its balance, anything further broken in it gives no light.
   *
   * So a room held by two asks for one, by three or four for two; a room
   * held by one is the room it is on any road. Which to break and which to
   * leave is the Scribe's, and there is a reason on each side of the scale.
   * Eight roads are bound here, three walked up (from Yesod, Hod, Netzach)
   * and five down.
   *
   * Measured on landing: `fight`, `curve`, `economy` and `climb` over all
   * three seed pools with the rule live, and **no band moved**. Part of the
   * reason is worth knowing rather than discovering: a room held by two or
   * more is uncommon on these roads — a sweep found one on-path in roughly
   * one seed in eight on hod-tiferet and fewer elsewhere — so the rule is an
   * occasion on a road rather than its whole character. Raising how often
   * it is met would mean touching the klipot draw, which is a recalibration
   * and not this slice.
   */
  tiferet: {
    says: "A room on this road asks for half. Break as many as you leave standing and the way opens; what you break past that gives no light.",
    roomsBalance: {
      opened: "The room is in balance. The way opens, and what stands may stand.",
      past: "The shell breaks past the measure, and nothing comes out of it.",
    },
  },
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
      released: "Nothing more can be asked of an empty hand. The way opens.",
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
  /**
   * **P15-R8 — Wisdom.** The question is "What can you receive that cannot
   * be taken?", and the rung's own teaching already says how: *nothing here
   * can be taken; it can only be received, and it is found by going low.*
   * So the rule is that, in the feet rather than at a door or a shrine: go
   * low on a chochmah-bound road — crouch, or crawl, which is this rung's
   * letter — and the light comes to you from four tiles. Fight, then kneel
   * and let what was freed come; kneeling while something still stands is an
   * exposure the Scribe chooses. Four roads are bound here — from Chesed and
   * Tiferet walked up, from Binah across, from Keter down.
   *
   * And a standing body gathers none of it: nothing on this road is taken.
   *
   * **The rule is strict because the instrument learned to kneel.** The
   * first time this was built no probe could go low on purpose, so the
   * ninth rung measured as paying nothing — `curve`'s "pays more the higher
   * it goes" read 23.5 against a needed 26.1 on pool 1 — and a softer draft
   * (every other mote lost) broke `climb`'s tour on pool 2 instead. Rather
   * than widen a band or ship a rule with no cost, the fighting probe was
   * taught the one thing any player would do on reading the rule: on a road
   * that carries it, and nowhere else, it kneels for light within reach when
   * nothing is coming. See `fighter` in `world/probes.ts`.
   *
   * **Four tiles, by measurement.** At three the kneeling probe carried out
   * 79–96% of what the same ground pays a touching hand, and `curve` missed
   * its band on pool 1 by three hundredths; at four it carries 108–138%.
   * That is the shape the rule wants in any case — going low reaches light
   * a hand cannot — so the reach is four and the bands were run again.
   */
  chochmah: {
    says: "Nothing on this road is taken. Go low, and the light comes to you.",
    lightReceived: {
      reach: 4,
      came: "You went low, and the light came. Nothing here is taken; it is received.",
      untaken: "The light does not come to a hand that reaches. Go low, and receive it.",
    },
  },
  /**
   * **P15-R9 — the Crown.** The question is "What is left of you to
   * present, when everything carried has been spent?" The three roads bound
   * here are all Abyss crossings — no shrine, no House, nothing on them
   * restores a lamp — and the crown itself is kindled with light. So the
   * question already has teeth; the rule puts the choice in the hand: kneel
   * and give (crouch and act, the gesture Chesed's road teaches) and a price
   * of light relights one lamp, anywhere on the road, up to a whole hand.
   * What is spent to keep the Scribe is not there to kindle the crown with.
   * Which of the two arrives is theirs to decide.
   *
   * This entry read "the crown's rule is the presentation itself — likely
   * permanent null" until the owner asked for it. It takes nothing from a
   * Scribe who ignores it.
   *
   * **Ten light, by measurement.** Sixteen fighting walks on each road carried
   * out a median of 16 (tiferet-keter), 23 (chochmah-keter) and 23
   * (binah-keter), arriving with 2.1, 1.1 and 1.3 lamps of three. Ten is
   * about half a walk — one lamp, perhaps two, and then the crown is
   * unkindled — above Chesed's door (8) and five veilings.
   *
   * **No instrument can feel it**: the gesture is crouch *and* act on the
   * ground, which no probe presses — the fighter holds `down` only airborne
   * or, on Chochmah's roads, alone. That is Chesed's argument, and
   * `rungRules.test.ts` pins it with the fighter itself rather than trusting
   * the paragraph.
   */
  keter: {
    says: "On this road what you carry can be spent to keep you. Kneel and give light, and a lamp is relit.",
    lightKeeps: {
      price: 10,
      relit: "The light is given, and a lamp is relit. Less is carried to the crown, and more of you.",
      wanting: "There is not light enough in hand to relight a lamp.",
    },
  },
};

/**
 * The one seam a rung's rule reaches the game through. Keyed to the
 * **destination** on the Tree — the place the Scribe is walking *to*, which
 * is the lower end on a road walked downward (`destinationOf`).
 */
export function rungRule(sefirah: SefirahId): RungRule | null {
  return RUNG_RULES[sefirah];
}

/**
 * Where a path walked **from** `from` comes out. With no `from` it is the
 * upper end, which is what every world built before the Tree knew which way
 * it was being walked meant by "destination".
 */
export function destinationOf(
  path: { ends: readonly [SefirahId, SefirahId] },
  from?: SefirahId,
): SefirahId {
  return from === path.ends[1] ? path.ends[0] : path.ends[1];
}

/**
 * The rule of a way, by the place it actually leads to. The world, the map's
 * way button and the arrival plate all ask this one function, so the rule
 * read before a road, the rule walked on it and the rule named at its end
 * cannot be three different rules — which, for a road walked downward, they
 * were.
 */
export function ruleOfWay(
  path: { ends: readonly [SefirahId, SefirahId] },
  from?: SefirahId,
): RungRule | null {
  return rungRule(destinationOf(path, from));
}

/** The rule of the ground underfoot — null off the Tree and in every arena. */
export function ruleOf(world: { toward?: SefirahId }): RungRule | null {
  return world.toward ? rungRule(world.toward) : null;
}

/** What `ruleStatus` reads — the world's own fields, named structurally. */
export interface RuledGround {
  toward?: SefirahId;
  placed: readonly unknown[];
  marksThrown: number;
  inSealedRoom: boolean;
  revealed: boolean;
  roomIndex: number;
  rooms: readonly { held?: number; standing?: number; balanced?: boolean }[];
  player: { lamps: number };
  lampsFull?: number;
}

/** A whole hand where the page has not said otherwise — `LAMPS` in `combat.ts`. */
const PLAIN_HAND = 3;

/**
 * **Where the rule stands, right now, in one short line** — for the HUD.
 *
 * A rule is said on the map and again on arriving, and then for the length of
 * a whole road nothing kept it in sight: how many marks were left, what a room
 * still asked, how many stones had been founded. A rule the Scribe cannot see
 * is one they cannot keep on purpose (the vow mark's lesson, exactly).
 *
 * Every number comes off the rule's own knob or the world's own count — none
 * is repeated here as a literal. `null` where there is nothing worth a line.
 */
export function ruleStatus(world: RuledGround): string | null {
  const rule = ruleOf(world);
  if (!rule) return null;
  if (rule.marksRationed) {
    const left = rule.marksRationed.count - world.marksThrown;
    return left > 0 ? `${left} ${left === 1 ? "mark" : "marks"} left` : "The ration is spent";
  }
  if (rule.stonesFounded) {
    const n = world.placed.length;
    return n > 0 ? `${n} ${n === 1 ? "stone" : "stones"} founded` : null;
  }
  if (rule.roomsBalance) {
    const room = world.rooms[world.roomIndex];
    if (!room || (room.held ?? 0) < 2) return null;
    if (room.balanced) return "This room is in balance";
    const held = room.held ?? 0;
    const more = Math.ceil(held / 2) - (held - (room.standing ?? held));
    return more > 0 ? `This room asks for ${more} more` : null;
  }
  if (rule.sealOpensTo) {
    return world.inSealedRoom
      ? `Kneel and give ${rule.sealOpensTo.price} light to open the way`
      : null;
  }
  if (rule.liesLaidBare) {
    return world.revealed ? "The Eye is open — the floor bears you" : "The floor's lies are shown";
  }
  if (rule.lightKeeps) {
    return world.player.lamps < (world.lampsFull ?? PLAIN_HAND)
      ? `Kneel and give ${rule.lightKeeps.price} light to relight a lamp`
      : null;
  }
  if (rule.lightReceived) return "Go low to receive the light";
  if (rule.shrinesCold !== undefined) return "The shrines are cold";
  if (rule.shrinesRelight !== undefined) return "A shrine here relights the lamps";
  return null;
}
