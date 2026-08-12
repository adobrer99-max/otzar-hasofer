import type { Grace, Verb } from "./abilities";
import { powersFrom, type Effect } from "./items";

/**
 * The klipot, and what a scribe does about them.
 *
 * **The husks are not invented.** In Lurianic Kabbalah the *klipot* — קליפות,
 * shells — are what conceals and holds captive the sparks of divine light
 * scattered at the shattering of the vessels, and the work of *birur*, of
 * sorting, is the releasing of them. That is the best-sourced idea in this
 * whole design and it fits the game exactly as it already stood: **break a
 * husk and light comes out.** The motes the Scribe has always gathered stop
 * being scenery on the ground and become what was inside something.
 *
 * ## Why they have names now
 *
 * They used to be four shapes told apart by how they moved — a crawler, a
 * drifter, a spitter, a sentinel — and the comment above them said, with some
 * pride, that they were functional rather than a bestiary. That was the wrong
 * kind of restraint for this game. Everything else here is drawn from the
 * sources and is more interesting for it: the letters are the Sefer Yetzirah's,
 * the guests are the Ushpizin, the rungs are the Sefirot. The klipah was the
 * one system inventing itself out of nothing, and a shell with no name inside
 * it is exactly the thing the Kabbalah says a klipah is *not*: it is a husk
 * **around** something.
 *
 * So each is a failure that Tanach and the midrash already name, and each
 * moves the way its failure moves. Cain paces the same ground and never looks
 * up. Amalek will not come at you while you are looking at it. The Brothers
 * are timid alone and terrible together. The Calf does nothing at all until
 * you touch it. Nothing here is allegory laid on top of a monster — the
 * behaviour **is** the reading, and if you can tell which one it is by how it
 * comes at you, the writing has done its work.
 *
 * ## And why some of them are not people
 *
 * The ten are all human failures, which is right for the foot of the Tree and
 * wrong for the top of it: a Scribe climbing past the Abyss is not still being
 * asked about sibling rivalry. Above them stands a second tier — the
 * **creatures**, which Tanach names as freely as it names the people and which
 * are not failures at all. A tannin is not doing anything wrong by being a
 * tannin. They are simply what is there, older than the argument, and they do
 * not care who you are.
 *
 * Read the two tiers against each other and the difference is the point: a
 * klipah is a shell around a failure and can be talked about; a creature is a
 * shell around the world's own strength and can only be met.
 *
 * ## Roles
 *
 * The chunk library is authored once and drawn on by every rung, so a screen
 * cannot name a klipah — Athaliah has no business in Malchut. What a screen
 * writes is a **role**: something that paces here, something adrift there,
 * something rooted that throws. The rung supplies the klipah, from its own
 * pool, and the role only decides which of them fits the spot.
 *
 * This module is **pure**: shapes, numbers and rules. `world/step.ts` applies
 * them. Nothing in here reads a clock, a DOM or a random number.
 */

export type HuskKind =
  | "cain"
  | "brothers"
  | "calf"
  | "esav"
  | "amalek"
  | "korach"
  | "izevel"
  | "delilah"
  | "atalya"
  | "nachash"
  // The creatures. Not failures — the world's own strength, and older than
  // anybody who could be blamed for anything.
  | "tannin"
  | "reem"
  | "saraf"
  | "rahav"
  | "og"
  | "nefilim"
  | "arbeh"
  // And the three that were made on the fifth day and set aside — Bava Batra
  // 74b. One holds each Sefirah above the Abyss, and none of them can be
  // broken at all except by the one letter that answers it.
  | "livyatan"
  | "behemot"
  | "ziz";

/**
 * The seven creatures, as against the ten klipot.
 *
 * Kept as a list rather than a flag on the spec so that "is this a beast?" has
 * exactly one answer and the bestiary plate can be split in two without
 * anything having to agree with anything else about it.
 */
export const BEASTS: readonly HuskKind[] = [
  "tannin",
  "reem",
  "saraf",
  "rahav",
  "og",
  "nefilim",
  "arbeh",
];

/**
 * The three great ones, which stand nowhere on a rung.
 *
 * Kept apart from `BEASTS` because they are not scattered — nothing lays them,
 * a Sefirah *holds* them, and they are met one at a time in a room of their
 * own. See `guardians.ts`.
 */
export const GREAT: readonly HuskKind[] = ["livyatan", "behemot", "ziz"];

export const isGreat = (kind: HuskKind): boolean => GREAT.includes(kind);
export const isBeast = (kind: HuskKind): boolean =>
  BEASTS.includes(kind) || GREAT.includes(kind);

/**
 * What a screen can ask for, as against what a rung supplies.
 *
 * Four, because that is what the authored screens already distinguish: a thing
 * on a ledge, a thing in the air, a thing rooted that reaches you at distance,
 * and a thing that waits and then commits.
 */
export type HuskRole = "pacer" | "floater" | "thrower" | "charger";

export interface HuskSpec {
  kind: HuskKind;
  /** As it is written on the plate. */
  name: string;
  hebrew: string;
  /** Where it is from, so the claim can be checked rather than believed. */
  source: string;
  /** What it is, in one line, for the guide and the HUD. */
  is: string;
  /** How its failure moves — the sentence the behaviour has to earn. */
  reading: string;
  role: HuskRole;
  /** Strikes to disperse it. */
  shells: number;
  /** Pixels per second it moves under its own power. */
  speed: number;
  /** How much light was trapped in it, released when it breaks. */
  light: number;
  /** Half-width and half-height of its body, in pixels. */
  size: { w: number; h: number };
  /**
   * How near the Scribe must come before it does anything. `Infinity` for the
   * ones that never noticed him in the first place.
   */
  notices: number;
  /** Ticks between one throw and the next, for the kinds that throw. */
  throws?: number;
  /** Whether stone means nothing to it. */
  flies?: boolean;
  /**
   * What contact costs. A lamp for almost all of them — that is what a husk
   * is — but Delilah takes what you have gathered instead, which is worse in a
   * way you do not feel until you count.
   */
  takes?: "lamp" | "light";
}

export const HUSKS: Record<HuskKind, HuskSpec> = {
  cain: {
    kind: "cain",
    name: "Cain",
    hebrew: "קַיִן",
    source: "Bereshit 4 — נָע וָנָד, a restless wanderer upon the earth",
    is: "It walks its ground and turns at the edge. It has never once looked up.",
    reading: "The first murder, and the sentence for it: to go back and forth over the same earth forever.",
    role: "pacer",
    shells: 3,
    speed: 42,
    light: 3,
    size: { w: 16, h: 18 },
    notices: Infinity,
  },
  brothers: {
    kind: "brothers",
    name: "The Brothers",
    hebrew: "הָאַחִים",
    source: "Bereshit 37 — the pit, and the sale to the caravan",
    is: "Alone it hangs back. It is braver for every other one of them still standing.",
    reading: "Not one of them would have done it by himself, and that is the whole of what they are.",
    role: "pacer",
    shells: 2,
    speed: 30,
    light: 3,
    size: { w: 16, h: 18 },
    // Close range on purpose. They close on what comes to them and go back to
    // their ground after — a klipah that dogs a Scribe's heels the length of a
    // rung is slower than he is, never gets in front to be written at, and just
    // gnaws: measured, it stalled every run in Yesod and broke one shell in
    // eight. Joseph came to them. They did not go looking.
    notices: 112,
  },
  calf: {
    kind: "calf",
    name: "The Golden Calf",
    hebrew: "הָעֵגֶל",
    source: "Shemot 32 — made in a day, out of what everyone gave",
    is: "It does nothing whatever until you strike it. Then it never stops.",
    reading: "An idol is harmless until you grant it your attention, and then it has all of it.",
    role: "charger",
    shells: 5,
    speed: 128,
    light: 6,
    size: { w: 22, h: 22 },
    notices: Infinity,
  },
  esav: {
    kind: "esav",
    name: "Esau",
    hebrew: "עֵשָׂו",
    source: "Bereshit 25 — a man of the field, who despised the birthright",
    is: "It runs you down over open ground, and gives up the moment you are above it.",
    reading: "He sold what was higher for what was in front of him, and he has not learned to look up since.",
    role: "charger",
    shells: 4,
    speed: 148,
    light: 5,
    size: { w: 20, h: 24 },
    notices: 165,
  },
  amalek: {
    kind: "amalek",
    name: "Amalek",
    hebrew: "עֲמָלֵק",
    source: "Devarim 25 — he met you on the way and cut off the stragglers behind you",
    is: "It comes at your back, and stands still as stone while you face it.",
    reading: "The attack that will not be met — it waits for the moment your attention is elsewhere.",
    role: "pacer",
    shells: 3,
    speed: 92,
    light: 4,
    size: { w: 16, h: 20 },
    notices: 240,
  },
  korach: {
    kind: "korach",
    name: "Korach",
    hebrew: "קֹרַח",
    source: "Bamidbar 16 — the earth opened her mouth and swallowed them",
    is: "It travels inside the ground, and comes up under you — and for a moment after, it is out in the open and still.",
    reading: "The dispute that is not for the sake of heaven: it goes down out of sight and surfaces where you stand.",
    role: "floater",
    shells: 4,
    speed: 72,
    light: 5,
    size: { w: 18, h: 20 },
    notices: 300,
    throws: 345,
    flies: true,
  },
  izevel: {
    kind: "izevel",
    name: "Jezebel",
    hebrew: "אִיזֶבֶל",
    source: "Melachim I 18–21 — she cut off the prophets, and watched from her window",
    is: "Rooted where she stands. What she sends is slow, and it lingers after her.",
    reading: "She never went anywhere. Everything she did, she did at a distance and by other hands.",
    role: "thrower",
    shells: 3,
    speed: 0,
    light: 4,
    size: { w: 18, h: 22 },
    notices: 260,
    throws: 165,
  },
  delilah: {
    kind: "delilah",
    name: "Delilah",
    hebrew: "דְּלִילָה",
    source: "Shofetim 16 — and she pressed him daily with her words",
    is: "It costs you no lamp at all. It costs you what you had gathered.",
    reading: "Nothing is taken by force. It is coaxed out, a little at a time, and the loss is only visible later.",
    role: "floater",
    shells: 2,
    speed: 46,
    light: 3,
    size: { w: 18, h: 18 },
    notices: 260,
    flies: true,
    takes: "light",
  },
  atalya: {
    kind: "atalya",
    name: "Athaliah",
    hebrew: "עֲתַלְיָה",
    source: "Melachim II 11 — she destroyed all the seed royal",
    is: "It goes for the loose light before you can, and puts it out.",
    reading: "She did not want the throne so much as she wanted no one else to have it.",
    role: "pacer",
    shells: 3,
    speed: 96,
    light: 4,
    size: { w: 18, h: 20 },
    notices: Infinity,
  },
  nachash: {
    kind: "nachash",
    name: "The Serpent",
    hebrew: "נָחָשׁ",
    source: "Bereshit 3 — subtler than any beast of the field",
    is: "Slow, and it does not stop, and stone is nothing to it.",
    reading: "The first of them and the shape of all the rest: it never hurries, because it has never needed to.",
    role: "floater",
    shells: 5,
    speed: 46,
    light: 6,
    size: { w: 20, h: 20 },
    notices: Infinity,
    flies: true,
  },

  // -------------------------------------------------------------------------
  // the creatures
  // -------------------------------------------------------------------------

  tannin: {
    kind: "tannin",
    name: "The Tannin",
    hebrew: "תַּנִּין",
    source: "Bereshit 1:21 — וַיִּבְרָא אֱלֹהִים אֶת־הַתַּנִּינִם הַגְּדֹלִים",
    is: "It stays in the water, where nothing can touch it, and comes out of it at you.",
    reading: "The great sea-creatures are the first thing the account of creation bothers to say was made — and they were made, which is the whole of what they are.",
    role: "floater",
    shells: 4,
    speed: 88,
    light: 5,
    size: { w: 20, h: 20 },
    notices: 220,
  },
  reem: {
    kind: "reem",
    name: "The Re'em",
    hebrew: "רְאֵם",
    source: "Bamidbar 23:22 — כְּתוֹעֲפֹת רְאֵם לוֹ, the horns of the wild ox",
    is: "It runs one line and will not turn. Stand aside and it goes into the wall.",
    reading: "Not malice. It has never once been asked to reconsider, and it would not know how.",
    role: "charger",
    shells: 4,
    speed: 196,
    light: 6,
    size: { w: 24, h: 20 },
    notices: 280,
  },
  saraf: {
    kind: "saraf",
    name: "The Saraf",
    hebrew: "שָׂרָף",
    source: "Bamidbar 21:6 — הַנְּחָשִׁים הַשְּׂרָפִים, the burning serpents",
    is: "The ground it has crossed goes on burning after it.",
    reading: "The bite is not what kills. What kills is the ground you have to go back over.",
    role: "pacer",
    shells: 3,
    speed: 76,
    light: 4,
    size: { w: 18, h: 16 },
    notices: 240,
    throws: 90,
  },
  rahav: {
    kind: "rahav",
    name: "Rahav",
    hebrew: "רַהַב",
    source: "Yeshayahu 51:9 — הֲלוֹא אַתְּ־הִיא הַמַּחְצֶבֶת רַהַב",
    is: "Every shell you take off it makes it bigger and faster.",
    reading: "Pride does not diminish when it is opposed. It is the one thing that grows on being struck.",
    role: "charger",
    shells: 5,
    speed: 62,
    light: 6,
    size: { w: 18, h: 20 },
    notices: 300,
  },
  og: {
    kind: "og",
    name: "Og of Bashan",
    hebrew: "עוֹג",
    source: "Devarim 3:11 — his bedstead of iron, nine cubits its length",
    is: "Slow, and enormous, and its step brings the ceiling down where you stand.",
    reading: "The last of the giants, and what is dangerous about him is not that he is quick.",
    role: "pacer",
    shells: 6,
    speed: 34,
    light: 7,
    size: { w: 26, h: 28 },
    notices: Infinity,
    // **Measured.** At 140 with a reach of eighteen tiles he was a barrage
    // rather than a giant: Chochmah stands nine bodies, several of them his,
    // and the ceiling came down somewhere every two seconds. Five runs in ten
    // went out there against two before he arrived. He is slow — the sentence
    // is that you cannot outrun what he brings down, not that he does it
    // constantly from across the room.
    throws: 260,
  },
  nefilim: {
    kind: "nefilim",
    name: "The Nefilim",
    hebrew: "נְפִילִים",
    source: "Bereshit 6:4 — הַנְּפִלִים הָיוּ בָאָרֶץ, and the name means they fell",
    is: "It hangs where it is and does nothing until you are underneath it.",
    reading: "They are named for the one thing they did. Everything else about them is waiting.",
    role: "floater",
    shells: 3,
    speed: 0,
    light: 5,
    size: { w: 20, h: 22 },
    notices: 150,
  },
  arbeh: {
    kind: "arbeh",
    name: "The Arbeh",
    hebrew: "אַרְבֶּה",
    source: "Shemot 10:14 — before them there were no such locusts, neither after them",
    is: "One of them is nothing. There are never one of them.",
    reading: "The eighth plague is the only one that is a number rather than a thing.",
    role: "floater",
    shells: 2,
    speed: 68,
    light: 3,
    size: { w: 12, h: 12 },
    notices: 320,
    flies: true,
  },

  // -------------------------------------------------------------------------
  // the three great ones
  // -------------------------------------------------------------------------
  //
  // Bava Batra 74b: made on the fifth day, set aside, and kept. They are the
  // only things in this game a Scribe cannot simply out-write — each is opened
  // by one letter and by nothing else, and until it is opened the shells do not
  // come off however many marks are thrown at it. `opened()` in `step.ts` is
  // where each rule actually lives; these are the numbers.

  livyatan: {
    kind: "livyatan",
    name: "Leviathan",
    hebrew: "לִוְיָתָן",
    source: "Iyov 41:1 — תִּמְשֹׁךְ לִוְיָתָן בְּחַכָּה, canst thou draw out leviathan with an hook?",
    is: "Nothing touches it in the water. The question the book asks is whether you can get it out.",
    reading: "The verse is not a riddle and it is not rhetorical either. It is a list of what you cannot do, and the Hook is the first item on it.",
    role: "floater",
    shells: 7,
    speed: 78,
    light: 10,
    size: { w: 34, h: 26 },
    notices: Infinity,
  },
  behemot: {
    kind: "behemot",
    name: "Behemoth",
    hebrew: "בְּהֵמוֹת",
    source: "Iyov 40:19 — הָעֹשׂוֹ יַגֵּשׁ חַרְבּוֹ, he that made him can make his sword approach",
    is: "Nothing stops it while it is moving, and nothing marks it either.",
    reading: "Only the one who made it can bring a blade near it — so the answer is not a blade. It is something set in the way.",
    role: "charger",
    shells: 8,
    speed: 214,
    light: 12,
    size: { w: 34, h: 30 },
    notices: Infinity,
  },
  ziz: {
    kind: "ziz",
    name: "The Ziz",
    hebrew: "זִיז",
    source: "Tehillim 50:11 — וְזִיז שָׂדַי עִמָּדִי, and the ziz of the field is mine",
    is: "It never comes down. Whether you reach it is a question about how far you can throw.",
    reading: "The verse says only that it is His. Everything else about it is midrash, and all of the midrash agrees that it is enormous and that it is above you.",
    role: "floater",
    shells: 7,
    speed: 104,
    light: 10,
    size: { w: 30, h: 24 },
    notices: Infinity,
    throws: 150,
    flies: true,
  },
};

/**
 * The character each **role** is authored as in the chunk library.
 *
 * Not the kind: a screen is drawn on by every rung and cannot know which
 * klipah belongs there. The letters are the ones the four old kinds used, so
 * every authored screen still says what it always said.
 */
export const HUSK_CHARS: Record<string, HuskRole> = {
  k: "pacer",
  j: "floater",
  q: "thrower",
  n: "charger",
};

/**
 * Which of a rung's klipot fills a spot a screen authored for a role.
 *
 * Falls back to whatever the rung does have, because a screen asking for
 * something rooted is not a reason to stand a klipah that does not belong on
 * this rung — better a Cain in a thrower's alcove than Athaliah in Malchut.
 */
export function kindForRole(
  pool: readonly HuskKind[],
  role: HuskRole,
  pick = 0,
): HuskKind | undefined {
  if (pool.length === 0) return undefined;
  const fitting = pool.filter((k) => HUSKS[k].role === role);
  const from = fitting.length > 0 ? fitting : pool;
  return from[pick % from.length];
}

// ---------------------------------------------------------------------------
// the Scribe's own mark
// ---------------------------------------------------------------------------

/**
 * He is a scribe. He writes, and the letter flies.
 *
 * The mark is thrown in the direction faced and angled by holding up or down —
 * which is why it needed a key of its own rather than a seventh job on the act
 * key. Act already resolves six things by silent precedence; a seventh that
 * fired whenever something was in reach would make the one contextual key
 * ambiguous exactly where ambiguity costs the most.
 */
export const MARK_SPEED = 430;
export const MARK_LIFE = 34;
export const MARK_COOLDOWN = 15;
export const MARK_SIZE = 10;

/**
 * What a vessel can lend a mark, in numbers.
 *
 * Two turns rather than unlimited: a mark that bounced forever would clear a
 * sealed room on its own, and a sealed room is where the fight is. Two is
 * enough to throw around a corner, which is the idea.
 */
export const MARK_TURNS = 2;
/**
 * How many ticks a hunting mark may bend for. Jezebel's bends for the first
 * third of a long flight and is then committed; his lives a third as long, so
 * the same idea has to be counted rather than read off `life`.
 */
export const MARK_HUNT = 10;
/** How hard a bend pulls. Hers, unchanged — it was measured, and it holds. */
export const BEND_TOWARD = 200;
export const BEND_RATE = 0.03;
/** The weight an arcing mark carries — a fraction of the body's own gravity. */
export const MARK_FALL = 0.55;

/**
 * How long the Scoring's line hangs after the mark that drew it is spent.
 *
 * Ninety ticks — a second and a half, which is long enough to be a place a
 * klipah walks into and short enough that a rung cannot be filled with them.
 * The mark that hangs keeps its bite and loses its motion, so it is a stroke
 * left on the ground rather than a second mark: *nothing is written above them,
 * and every letter hangs from one.*
 */
export const MARK_HANGS = 90;
/** A shard is short and quick, so a split covers ground rather than repeating the throw. */
export const SHARD_SPEED = 320;
export const SHARD_LIFE = 16;

/** What the letters do to the mark. The beginning of the synergies. */
export interface MarkPowers {
  /** Zayin, the Edge: it passes through the first husk and carries on. */
  pierces: boolean;
  /** Shin, the Flame: it burns, so it is worth two shells. */
  burns: boolean;
  /** Vav, the Hook: struck husks are drawn toward the Scribe, not pushed. */
  draws: boolean;
  /** Lamed, the Staff: it is thrown further. */
  reach: number;
  /** And what the vessels come to — multipliers rather than powers. */
  bite?: number;
  speed?: number;
  cooldown?: number;
  /** Stone turns it rather than stopping it. */
  bounces?: boolean;
  /** It bends after the nearest shell, once, early. */
  homing?: boolean;
  /** Breaking a shell throws two shards out of it. */
  splits?: boolean;
  /** It has weight, and falls as it flies. */
  arcs?: boolean;
  /** Spent, it hangs where it stopped instead of going out. */
  lingers?: boolean;
  /** At the end of its flight it turns and comes back to the hand. */
  returns?: boolean;
}

export function markPowers(
  verbs: readonly Verb[],
  graces: readonly Grace[],
  items: readonly string[] = [],
  boons: readonly Effect[] = [],
  /** What the reliquary keeps that bears on the fold — see `powersFrom`. */
  keeps: { bears?: boolean } = {},
): MarkPowers {
  // The letters are the progression and the vessels are the furnishing, and
  // the line between them is the **verb list** — nothing here may hand out a
  // thirteenth verb. It is not a line between kind and quantity: `pierces` was
  // always on both sides of that one, and six more behaviours join it below.
  // A vessel that only scaled a number could never be a reason to walk one
  // path rather than another, which is the whole of what the Tree is for.
  const carried = powersFrom(items, boons, keeps);
  return {
    pierces: verbs.includes("cut") || carried.pierces,
    burns: verbs.includes("flame"),
    draws: verbs.includes("grapple"),
    reach: (graces.includes("high-jump") ? MARK_LIFE + 16 : MARK_LIFE) + carried.reach,
    bite: carried.bite,
    speed: carried.speed,
    cooldown: carried.cooldown,
    bounces: carried.bounces,
    homing: carried.homing,
    splits: carried.splits,
    arcs: carried.arcs,
    lingers: carried.lingers,
    returns: carried.returns,
  };
}

/** How many shells one mark takes off, given what the Scribe carries. */
export function markBite(powers: MarkPowers): number {
  return Math.max(1, Math.round((powers.burns ? 2 : 1) * (powers.bite ?? 1)));
}

/**
 * **And no word takes more than a third of what a thing was made with.**
 *
 * `markBite` folds Shin's doubling into the vessels' `bite`, and `powersFrom`
 * folds the vessels *multiplicatively* — so the three that sharpen the nib
 * (1.5, 1.2 and 1.6) come to 2.88 together, and with Shin to **six**. Nothing
 * in the game has eight shells, so at that point every klipah on the Tree and
 * all three of the great ones come apart in two words: the first blow is held
 * at one shell by the rule below, and the second one is the fight.
 *
 * **No band has ever seen this**, and that is the durable part. Every probe in
 * the suite fights with `items: []` — `fight.test.ts`, `curve.test.ts` and the
 * tour all build their `StepContext` out of the letters alone — so the whole
 * measured economy is the *un-furnished* case, at bite one or two. The Scribe
 * a player actually walks the back half of a climb with was never measured, and
 * it is the one the report came from.
 *
 * The ceiling is stated against the creature rather than against the nib,
 * because a rule that capped the bite itself would make the three vessels
 * worthless to anybody holding Shin — and a vessel that stops mattering the
 * moment you earn a letter is not a vessel. A third of a thing means the great
 * ones take three words however sharp the nib and the Arbeh still takes one.
 *
 * **The floor of two is what keeps every measured band exactly where it is.**
 * The ceiling can never be less than two, so it cannot bind at bite one or two
 * — which is every probe in the suite. Nothing that has been measured moves;
 * the change lands entirely on the case that never was.
 */
export function shellsTaken(bite: number, full: number): number {
  return Math.min(bite, Math.max(2, Math.ceil(full / 3)));
}

/**
 * Whether a husk can be struck at all.
 *
 * A husk standing in veiled stone is no more visible than the stone is — the
 * Eye is what makes it a thing rather than a suspicion. This is the one place
 * a letter decides whether a fight is possible rather than how it goes.
 */
export function canBeStruck(hidden: boolean, verbs: readonly Verb[]): boolean {
  return !hidden || verbs.includes("reveal");
}

// ---------------------------------------------------------------------------
// light, and going out
// ---------------------------------------------------------------------------

/**
 * The Scribe is made of light, so light is what he loses.
 *
 * Deliberately **not** `or`. That is gathered light — the currency the
 * Sefirot are kindled with — and spending it on being hit would make every
 * mistake cost progress twice. These are separate: `lamps` is what he is,
 * `or` is what he is carrying.
 */
export const LAMPS = 3;
/** Ticks of grace after a hit, in which nothing can touch him again. */
export const IFRAME_TICKS = 54;
/** How hard a hit throws him, which is also what gets him clear. */
export const KNOCKBACK_X = 190;
export const KNOCKBACK_Y = 240;

export interface Hit {
  lamps: number;
  iframes: number;
  out: boolean;
}

/**
 * One contact with a husk.
 *
 * Returns the state after, rather than mutating: the rule is testable on its
 * own and `step.ts` decides when to ask. During i-frames nothing happens at
 * all — not a reduced hit, no hit — which is what makes a crowded screen
 * survivable rather than a shredder.
 */
export function takeHit(lamps: number, iframes: number, grace = 1): Hit {
  if (iframes > 0 || lamps <= 0) return { lamps, iframes, out: lamps <= 0 };
  const left = lamps - 1;
  // `grace` is what the vessels come to — the Wrapper lengthens the moment
  // after a hit rather than softening the hit itself, which is the difference
  // between an object and a letter.
  return { lamps: left, iframes: Math.round(IFRAME_TICKS * grace), out: left <= 0 };
}

/**
 * Going out is the fall happening a second time.
 *
 * This game was built with no failure state, and combat retires that. What
 * replaces it is not a death screen but the premise: an angel made of light,
 * whose light goes out, is cast back down — which is exactly what already
 * happened to him once, before the first rung.
 *
 * **And the run does not end.** This once said it did, and so did the plate,
 * and the plate's button proved it by sealing the record. What the fall costs
 * is the light in hand and the ground back up; what it cannot touch is a
 * letter, a vessel, or a Sefirah already lit. See `game/fall.ts`, which owns
 * the rule — nothing in this file needs to know it, and that is the point of
 * the split: `combat.ts` says the lamps are out, and something else says what
 * that means.
 */
export const GOING_OUT = "The light goes out of you, and the kingdom comes up to meet you.";

/**
 * **The other way a rung ends**, and the only one that is not about lamps.
 *
 * A Word-Gate is answered by *inscribing* — the Scribe writes a root and the
 * barrier opens. That is the office: *you wrote what was said and you said
 * nothing, and that was the whole of it, and it was enough.* Sometimes what is
 * behind the door is the rest of that sentence.
 *
 * It costs exactly what the last lamp costs and not a thing more, because page
 * five of the prologue already taught this rule and a trap that invented a new
 * one would be a cheat: *the light still in your hand goes out with you… you
 * wake at the highest one of them.* Nothing here is new. It is the fall, in the
 * one place the Scribe did the thing he was cast out for doing.
 */
export const THE_OPENING =
  "You wrote, and the floor was not there. You do not remember the fall this time either.";
