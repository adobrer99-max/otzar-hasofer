import type { Grace } from "./abilities";
import { LAMPS } from "./combat";
import type { EncounterRule } from "./encounter";
import { illuminedBy, VEIL_COST } from "./encounter";
import type { Effect } from "./items";
import type { World } from "./world/types";
import type { SefirahId } from "../types/letter";

/**
 * **The Reliquary — the hidden things, and the first objects in this game that
 * survive a seal.**
 *
 * Nothing else does. The letters, the vessels, the scroll fragments and the
 * light all reset at Begin, and the only two facts that have ever crossed a
 * climb boundary are folds — `guardiansBroken → timesFreed → boonsFrom`, and
 * `witnessSefirot → timesStood → cardsOpen`. Neither is a thing you hold. A
 * relic is.
 *
 * **What they are.** Yoma 52b and Horayot 12a list what was hidden away before
 * the destruction rather than lost — *nignaz*, put in store. That is exactly
 * what a reliquary is for, and it is the reason this collection can be finite
 * and still feel open: these are things that are somewhere, not things that
 * are gone.
 *
 * Three of the obvious candidates were **already taken by the twenty kelim**
 * and are deliberately not here: `tzintzenet` "The Jar" *is* the jar of manna —
 * its own line quotes Shemot 16:32 — and `menorah` and `kiyor` are the
 * Lampstand and the Laver. A relic that shared a name with a vessel would
 * undo the one distinction this phase exists to draw.
 *
 * **Where they lie.** One at each Sefirah that is the *lower* end of a path —
 * Malchut through Chochmah. **Keter is never a lower end and holds none**,
 * which is right twice over: nothing is hidden at the crown, and the crown is
 * what you are climbing toward rather than through.
 *
 * That keying is not arbitrary and it is worth being exact about, because there
 * are two different notions of "upper" in this codebase and they disagree.
 * `regionOfPath` returns `{ ...lower, index: min(upper.index, earned) }`, so
 * **`world.sefirah` is already the lower end** and a chamber keyed this way
 * needs no new argument threaded through `layout` and `paint`. Keying to the
 * upper end instead would paint a Keter relic in a Tiferet-coloured room. And
 * `tree.ts` decides "upper" by row on the diagram, which **ties on the three
 * horizontals and is broken by declaration order in `EDGES`** — a different
 * answer again from the region index `curve.test.ts` uses. Do not mix them.
 *
 * **What they do.** Every relic states a bargain — one thing given and one
 * thing taken — and every one of them makes it, on one of three layers:
 *
 * - **`bends`**, the day's own layer, the one the Seven Encounters occupy.
 * - **`keeps`**, the rules that are not numbers: one flag, one site, the same
 *   shape the six authored vessel behaviours took.
 * - **`effect`**, the Scribe's numbers, in the vessels' and guardians' own
 *   currency. Exactly one relic has one, which is the point.
 *
 * `foldRelics` at the foot of this file composes all three beside the day's
 * rule and is the only thing that should; what it produces is wired into the
 * world in its own slice, so that a band that moves is attributable to the
 * wiring rather than to the table.
 */

/**
 * **What a relic bends about the climb — the day's own layer, scaled and never
 * overwritten.**
 *
 * The Seven Encounters already own this layer and their fields are *absolute*:
 * the Second Encounter says a klipah broken in a sealed room pays twice, the
 * Seventh says a veiling costs nothing. Three relics carried beside a rule is
 * four objects with a claim on the same numbers, and `EncounterRule` has no
 * fold — `Effect` has one and this deliberately does not.
 *
 * So the precedence is stated rather than discovered: **the day sets the
 * number, and a relic can only bend what the day left.** Every field here is a
 * multiplier on the rule's own value, except `lamps`, which is added. Shabbat's
 * `veilCost: 0` therefore survives any relic that would raise it, because zero
 * times anything is zero — and that is the right answer, not an accident: a day
 * the game declared free is not something an object in your hand overrules.
 */
export interface Bending {
  /**
   * **Light in every mote, wherever it lies** — and note that this is *not*
   * `EncounterRule.motes`, which the day scopes to one Sefirah.
   *
   * The First Encounter's rule is "light counts double in Chesed", and
   * `layEncounter` applies it only where `illuminedBy` says. A relic is carried
   * up the whole Tree; a rod that made light thinner only in Chesed would be a
   * bargain a player could not feel and could not reason about. So the two
   * travel in separate fields all the way to `world.orPerMote` — see
   * `Climbing.light`.
   */
  light?: number;
  /** What a klipah broken inside a sealed room pays. */
  sealed?: number;
  /** Light in every shell, wherever it breaks. */
  husks?: number;
  /** How many klipot stand on a rung. */
  klipot?: number;
  /** What a veiling takes — a multiplier on the day's cost, never an override. */
  veilCost?: number;
  /** What a Sefirah costs to kindle. No Encounter touches this; relics may. */
  kindle?: number;
  /** Lamps beyond the three, added. May be negative — some relics take one. */
  lamps?: number;
}

/**
 * **The rules a relic keeps that are not numbers** — one flag, one site.
 *
 * The same shape the six authored vessel behaviours took in P5b (`lingers`,
 * `returns`, `heavy`, `spared`, `keeps`, `relights`), and for the same reason:
 * an object whose whole line is a scalar should stay one, and an object whose
 * line is a *rule* cannot be made into a scalar without losing it. Each of
 * these is read at exactly one place in the game.
 */
export interface Keeping {
  /** **The tablets.** A fall takes none of the light in hand. */
  keepsLight?: boolean;
  /** **The tablets.** The crown will not receive you — only all ten kindled. */
  kindledOnly?: boolean;
  /** **The foundation stone.** A fall wakes you where you set out, not lower. */
  wakesHigh?: boolean;
  /** **Aaron's rod.** The first lamp lost on a rung buds back, once, below the Abyss. */
  buds?: boolean;
  /** **The fire of the altar.** The last lamp relights itself, once a climb. */
  perpetual?: boolean;
  /** **The Urim.** A Word-Gate names its root, and taking that answer costs a lamp. */
  answers?: boolean;
  /** **The Ark.** No vessel's price is charged. */
  bears?: boolean;
  /** **The Ark.** Only one vessel may be lifted in a climb. */
  oneVessel?: boolean;
  /** **The Shamir.** Stone does not stop a mark. */
  cuts?: boolean;
  /** **The anointing oil.** How many kindlings are cheap before it is spent. */
  spends?: number;
}

export interface Relic {
  id: string;
  /** The Sefirah whose chamber holds it — the lower end of a path. */
  sefirah: SefirahId;
  name: string;
  hebrew: string;
  /** Where it is from, so the claim can be checked rather than believed. */
  source: string;
  /** What it is, in the voice of the thing itself. */
  hidden: string;
  /** The half of the bargain that is a gift. */
  gives: string;
  /** And the half that is a price. Every relic has one. */
  takes: string;
  /** What it bends about the day. */
  bends?: Bending;
  /** What it keeps that is a rule rather than a number. */
  keeps?: Keeping;
  /**
   * And what it makes of the Scribe, in the vessels' and the guardians' own
   * currency — folded by `powersFrom` through the channel `boonsFrom` already
   * uses. Only one relic has one, which is the point: `Effect` is a layer
   * relics stay off wherever their line can be said another way.
   */
  effect?: Effect;
}

/**
 * **Three.** The same number as the lamps, the tiers, the fragments of the
 * torn scroll and the great ones — and, more to the point, small enough that
 * carrying one thing means not carrying another. A Reliquary you could take
 * whole would be a second boon system with no cap, which is the failure the
 * guardian tiers were capped against.
 */
export const CARRIED = 3;

export const RELICS: readonly Relic[] = [
  {
    id: "argaz",
    sefirah: "malchut",
    name: "The Chest the Philistines Sent",
    hebrew: "הָאַרְגַּז",
    source: "Shmuel I 6 — the ark returned on a new cart, and the coffer with the golden mice beside it",
    hidden:
      "They could not keep it and they dared not simply give it back, so they sent a guilt-offering along with it in a box: five golden tumours and five golden mice, the plague itself worked in gold. It came home out of the hands of the nations, and what came home with it was the price they paid.",
    gives: "What you break gives up more of the light in it.",
    takes: "You set out with one lamp fewer.",
    bends: { husks: 1.5, lamps: -1 },
  },
  {
    id: "shetiyah",
    sefirah: "yesod",
    name: "The Foundation Stone",
    hebrew: "אֶבֶן הַשְּׁתִיָּה",
    source: "Yoma 53b — from it the world was founded, and the Ark stood upon it",
    hidden:
      "It stood three fingers above the ground in the place where the Ark had been, after there was no longer an Ark. The world was begun from this stone and the world is still resting on it, which is the whole reason a thing this plain is worth hiding.",
    gives: "A fall costs you no ground — you wake where you set out from.",
    takes: "A veiling takes twice the light instead.",
    bends: { veilCost: 2 },
    keeps: { wakesHigh: true },
  },
  {
    id: "matteh",
    sefirah: "hod",
    name: "Aaron's Rod",
    hebrew: "מַטֵּה אַהֲרֹן",
    source: "Bamidbar 17:23 — it brought forth buds, and bloomed blossoms, and yielded almonds",
    hidden:
      "A dead stick among twelve dead sticks, laid up overnight before the testimony. In the morning it had budded and blossomed and borne almonds all at once — bud and flower and fruit on one branch, which is not how anything grows — and that ended the argument about who was chosen.",
    gives: "The first lamp you lose on a rung buds back — once, and never above the Abyss.",
    takes: "The light you gather is thinner for it.",
    bends: { light: 0.8, husks: 0.8 },
    keeps: { buds: true },
  },
  {
    id: "esh",
    sefirah: "netzach",
    name: "The Fire of the Altar",
    hebrew: "אֵשׁ הַמִּזְבֵּחַ",
    source: "Vayikra 6:6 — a perpetual fire shall be kept burning upon the altar; it shall not go out",
    hidden:
      "It came down once and after that it was never lit again, only kept: fed through every night and carried under a copper cover on every journey. Nobody made this fire. What the priests did all their lives was refuse to let it stop.",
    gives: "Your last lamp relights itself, once in a climb.",
    takes: "Every shell you break gives up a quarter less.",
    bends: { husks: 0.75 },
    keeps: { perpetual: true },
  },
  {
    id: "luchot",
    sefirah: "tiferet",
    name: "The Tablets, and the Broken Tablets",
    hebrew: "הַלּוּחוֹת וְשִׁבְרֵי הַלּוּחוֹת",
    source: "Bava Batra 14b — both the tablets and the fragments of the tablets lay in the Ark",
    hidden:
      "The whole ones and the smashed ones in the same box, and no one ever proposed throwing the smashed ones away. What was broken on the way down the mountain was carried for forty years and buried with the rest.",
    gives: "A fall takes none of the light you were carrying.",
    takes: "The crown will not receive you. Only all ten kindled will end this climb.",
    keeps: { keepsLight: true, kindledOnly: true },
  },
  {
    id: "urim",
    sefirah: "gevurah",
    name: "The Urim and the Tummim",
    hebrew: "הָאוּרִים וְהַתֻּמִּים",
    source: "Shemot 28:30 — and they shall be upon Aaron's heart when he goes in before the LORD",
    hidden:
      "Letters lit in the stones of the breastplate, and a judgment that could be asked for and got. They were not in the second house. Whatever was asked after that was asked into a silence, and the answer had to be worked out.",
    gives: "A Word-Gate names the root it wants.",
    takes: "Asking costs a lamp, every time you ask.",
    keeps: { answers: true },
  },
  {
    id: "shemen",
    sefirah: "chesed",
    name: "The Anointing Oil",
    hebrew: "שֶׁמֶן הַמִּשְׁחָה",
    source: "Shemot 30:31 — this shall be a holy anointing oil unto me throughout your generations",
    hidden:
      "Moses made it once, in the wilderness, twelve logs of it, and it was never made again — the recipe stands in the text and using it for anything else carries a death sentence. Everything consecrated for a thousand years was consecrated out of that one jar, and the jar did not empty.",
    gives: "Kindling a Sefirah costs a third less.",
    takes: "For the first three only. After that the oil is spent.",
    bends: { kindle: 0.66 },
    keeps: { spends: 3 },
  },
  {
    id: "aron",
    sefirah: "binah",
    name: "The Ark",
    hebrew: "אֲרוֹן הַבְּרִית",
    source: "Sotah 35a — it carried those who carried it",
    hidden:
      "The staves were never to be taken out of the rings, so it was always ready to be lifted and never actually needed lifting: the men who bore it were held up off the ground by the thing they were holding up. Josiah put it away and it has not been seen since.",
    gives: "What you carry costs you nothing — no vessel's price is charged.",
    takes: "You may lift only one vessel in a climb.",
    keeps: { bears: true, oneVessel: true },
  },
  {
    id: "shamir",
    sefirah: "chochmah",
    name: "The Shamir",
    hebrew: "הַשָּׁמִיר",
    source: "Pirkei Avot 5:6 — created at twilight on the eve of the first Sabbath",
    hidden:
      "No bigger than a barleycorn, and no iron was lifted over the stones of the house because this went through them instead. It could not be kept in anything of metal; they carried it wrapped in wool inside a lead basket full of barley bran. It went when the house went.",
    gives: "Stone does not stop what you write.",
    takes: "The mark goes slower for the weight of it.",
    keeps: { cuts: true },
    effect: { speed: 0.75 },
  },
];

export const relicById: Record<string, Relic> = Object.fromEntries(
  RELICS.map((relic) => [relic.id, relic]),
);

/** The relic hidden at a Sefirah, if any. Keter holds none. */
export function relicAt(sefirah: SefirahId): Relic | undefined {
  return RELICS.find((relic) => relic.sefirah === sefirah);
}

/**
 * The relics a Scribe may actually set out with — what has been found, capped,
 * and stripped of anything unknown.
 *
 * Written as a function rather than trusted at the call sites because both of
 * its inputs come off storage: a record written by an older build, or hand-
 * edited, must not be able to put a fourth relic in a hand or an id that names
 * nothing.
 */
export function carried(chosen: readonly string[], found: readonly string[]): Relic[] {
  const kept = new Set(found);
  const seen = new Set<string>();
  return chosen
    .filter((id) => kept.has(id) && relicById[id] && !seen.has(id) && seen.add(id))
    .slice(0, CARRIED)
    .map((id) => relicById[id]);
}

/**
 * **How the climb reads once the day and what is carried are both accounted
 * for.** One object, so nothing downstream has to know there were four.
 */
export interface Climbing {
  /** Light in the day's own Sefirah, multiplied — the day's, and scoped. */
  motes: number;
  /** Light in every mote everywhere, from the relics — see `Bending.light`. */
  light: number;
  /** What a klipah broken inside a sealed room pays. */
  sealed: number;
  /** Light in every shell, wherever it breaks. */
  husks: number;
  /** How many klipot stand on a rung. */
  klipot: number;
  /** Lamps beyond the three. Never takes the last one. */
  lamps: number;
  /** What a veiling takes off the light gathered. */
  veilCost: number;
  /** What a Sefirah costs to kindle, multiplied. */
  kindle: number;
  /** The day's, never a relic's — see below. */
  guestsFree: boolean;
  grants: readonly Grace[];
  /** The rules, OR'd together; `spends` takes the most generous. */
  keeps: Keeping;
  /** Handed on to `powersFrom`'s existing boon channel. */
  effects: readonly Effect[];
}

/**
 * **The day, and then what is carried — in that order, and never the reverse.**
 *
 * Three things this settles, each of which is a way it could have gone quietly
 * wrong:
 *
 * 1. **`EncounterRule` has no fold and is not given one.** `Effect` has `fold`
 *    because a Scribe may hold many vessels; a climb has exactly one day. So
 *    the rule's numbers are read once, absolutely, and relics multiply what is
 *    left. That means Shabbat's `veilCost: 0` cannot be raised by an object in
 *    your hand — zero times two is zero — which is the answer a player would
 *    expect and would not have got from a "last one wins" policy.
 * 2. **Relics compose *beside* the rule, never through it.** This takes an
 *    already-resolved `EncounterRule`, so there is no way to route a relic
 *    through `ruleNumber` — and that matters, because `ruleOf` ignores
 *    `ruleNumber` while `encounterNumber` is set. A relic merged that way would
 *    do nothing at all for a new Scribe's first seven climbs and then start
 *    working on the eighth, which is the kind of bug nobody reports because
 *    nobody could describe it.
 * 3. **A relic grants no grace and frees no guest.** `grants` and `guestsFree`
 *    come from the day alone. The same rule the vessels have kept since they
 *    were written: an object may change what the numbers are, never what a body
 *    can do. The letters own the verbs and the graces.
 */
export function foldRelics(
  rule: EncounterRule | undefined,
  relics: readonly Relic[],
): Climbing {
  const climb: Climbing = {
    motes: rule?.motes ?? 1,
    light: 1,
    sealed: rule?.sealed ?? 1,
    husks: rule?.husks ?? 1,
    klipot: rule?.klipot ?? 1,
    lamps: rule?.lamps ?? 0,
    veilCost: rule?.veilCost ?? VEIL_COST,
    kindle: 1,
    guestsFree: rule?.guestsFree ?? false,
    grants: rule?.grants ?? [],
    keeps: {},
    effects: [],
  };
  const keeps: Keeping = {};
  const effects: Effect[] = [];

  for (const relic of relics) {
    const bends = relic.bends;
    if (bends) {
      climb.light *= bends.light ?? 1;
      climb.sealed *= bends.sealed ?? 1;
      climb.husks *= bends.husks ?? 1;
      climb.klipot *= bends.klipot ?? 1;
      climb.veilCost *= bends.veilCost ?? 1;
      climb.kindle *= bends.kindle ?? 1;
      climb.lamps += bends.lamps ?? 0;
    }
    for (const [key, value] of Object.entries(relic.keeps ?? {})) {
      if (typeof value === "number") {
        // The most generous wins, so carrying two things that both spend does
        // not leave you with the meaner of the two.
        const held = (keeps as Record<string, unknown>)[key];
        (keeps as Record<string, unknown>)[key] = Math.max(typeof held === "number" ? held : 0, value);
      } else if (value) {
        (keeps as Record<string, unknown>)[key] = true;
      }
    }
    if (relic.effect) effects.push(relic.effect);
  }

  // **A relic may take a lamp; it may not take the last one.** `argaz` costs
  // one and the game is built on three, so three of a kind would leave a Scribe
  // at zero before setting out — which is not a price, it is an ending.
  climb.lamps = Math.max(climb.lamps, 1 - LAMPS);
  // Rounded here rather than at the call site, because a veiling takes whole
  // light and every reader of this would otherwise round it their own way.
  climb.veilCost = Math.max(0, Math.round(climb.veilCost));
  climb.keeps = keeps;
  climb.effects = effects;
  return climb;
}

/**
 * **What kindling a Sefirah actually costs**, given the day, what is carried,
 * and how much of the Tree is already lit.
 *
 * Takes the base rather than importing `kindleCost`, so this file stays free of
 * storage — and, more usefully, so the map and the kindling itself cannot drift
 * apart: `TreeMap` prices what it offers through this, and `kindleHere` charges
 * through this, and a plate that named a cheaper number than the one taken
 * would be the worst bug this phase could ship.
 *
 * `spends` is the anointing oil, which is the only relic whose price is a
 * *count*: Moses made twelve logs of it once and it was never made again, so
 * the third Sefirah is the last one it consecrates. Counted off `sefirotLit`
 * rather than stored, because that is already a fold and a stored counter would
 * be a second truth about the same fact.
 */
export function kindlePrice(base: number, alreadyLit: number, climb: Climbing): number {
  const spends = climb.keeps.spends;
  const spent = spends !== undefined && alreadyLit >= spends;
  return Math.max(1, Math.round(base * (spent ? 1 : climb.kindle)));
}

/**
 * **Lay the climb onto a world as it is entered.**
 *
 * Lifted out of `GamePage` rather than left there, and the reason is the whole
 * of why this phase could be got wrong quietly: nothing in the suite renders
 * the page, so a rule applied in a `useCallback` is a rule no test can see.
 * `onVessel` was missing from the step context for the life of P5b and no test
 * could have caught it. This is the same class of thing pointed at a system
 * with eleven levers, so the levers are pulled here, where `relicsAct.test.ts`
 * drives exactly the code the page runs.
 *
 * The light is the one number that stays in two pieces, and it stays in two
 * pieces on purpose. `EncounterRule.motes` is **scoped** — the First's rule is
 * "light counts double in Chesed", and `illuminedBy` says where — while a relic
 * is carried up the whole Tree. Folded into one number, Aaron's rod would have
 * made light thinner in Chesed and nowhere else: a bargain a player could
 * neither feel nor reason about.
 */
export function layClimb(
  world: World,
  rule: EncounterRule | undefined,
  climb: Climbing,
  /** The path's two ends, which is what the day's scoped light is asked about. */
  here: readonly SefirahId[],
): void {
  const lights = illuminedBy(rule);
  const scoped = rule?.motes && lights && here.includes(lights as SefirahId) ? rule.motes : 1;
  world.orPerMote = Math.max(1, Math.round(world.orPerMote * scoped * climb.light));
  world.huskLight = climb.husks;
  world.sealedLight = climb.sealed;
  world.veilCost = climb.veilCost;
  // Never the last one — `foldRelics` holds that floor, and this is where it
  // lands. Three lamp-takers would leave a Scribe at zero before setting out,
  // which is not a price but an ending.
  world.player.lamps += climb.lamps;
}
