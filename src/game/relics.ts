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
 * **What they do — not yet.** Every relic states a bargain: one thing given and
 * one thing taken. The prose is authored here and read by the chooser and the
 * Book; the *mechanism* lands later, deliberately, because a relic acts on
 * three different layers (world generation, the scope of a run, and the
 * Scribe's own numbers) and each needs its own wiring and its own re-measured
 * bands. Nothing in this file is written and never read.
 */

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
    takes: "It takes the light instead, and takes more of it.",
  },
  {
    id: "matteh",
    sefirah: "hod",
    name: "Aaron's Rod",
    hebrew: "מַטֵּה אַהֲרֹן",
    source: "Bamidbar 17:23 — it brought forth buds, and bloomed blossoms, and yielded almonds",
    hidden:
      "A dead stick among twelve dead sticks, laid up overnight before the testimony. In the morning it had budded and blossomed and borne almonds all at once — bud and flower and fruit on one branch, which is not how anything grows — and that ended the argument about who was chosen.",
    gives: "The first lamp you lose on a rung comes back to you.",
    takes: "It comes back only once, and never above the Abyss.",
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
    takes: "The light you gather is worth less while you carry it.",
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
  },
  {
    id: "shemen",
    sefirah: "chesed",
    name: "The Anointing Oil",
    hebrew: "שֶׁמֶן הַמִּשְׁחָה",
    source: "Shemot 30:31 — this shall be a holy anointing oil unto me throughout your generations",
    hidden:
      "Moses made it once, in the wilderness, twelve logs of it, and it was never made again — the recipe stands in the text and using it for anything else carries a death sentence. Everything consecrated for a thousand years was consecrated out of that one jar, and the jar did not empty.",
    gives: "Kindling a Sefirah costs less.",
    takes: "For the first three only. After that the oil is spent.",
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
