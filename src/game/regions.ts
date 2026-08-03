import { housesBySefirah } from "../data/dorot";
import type { SefirahId } from "../types/letter";
import { abilityByLetter } from "./abilities";
import type { HuskKind } from "./combat";

/**
 * The ten regions: Malchut at the foot of the Tree, Keter at its crown.
 *
 * The Scribe climbs *against* the direction of emanation — from the kingdom
 * back toward the crown — which is why the list reads bottom-up. The seven
 * lower Sefirot each hold a House of the Dorot, using the same Sefirah
 * correspondence the Herald and the Seven Encounters already keep, so a lived
 * biblical episode stands in each. Above the Abyss the three supernals hold
 * no House: Binah, Chochmah and Keter are crossed on the letters alone.
 *
 * `letters` is the whole progression system. A region's terrain may only ask
 * for verbs the Scribe already carried into it, so the order these are given
 * in *is* the order the world unlocks — see `build.ts`, which filters the
 * chunk library by exactly this.
 */
export interface Region {
  /** 1 = Malchut … 10 = Keter, the order of the ascent. */
  index: number;
  sefirah: SefirahId;
  name: string;
  hebrew: string;
  middah: string;
  /** The letters found here, in the order their alcoves appear. */
  letters: string[];
  /**
   * Fragments of the torn scroll strewn here (see `scroll.ts`). Three across
   * the whole ascent assemble into Peh, the Mouth — the one letter that is
   * never simply found.
   */
  fragments?: number;
  /** How many body screens the region is built from. */
  length: number;
  /**
   * The band of `Chunk.demand` this region draws from.
   *
   * This is the knob the game did not have. `length` was the only per-region
   * number in the file, and it says how *long* a region is — so as the letters
   * accumulated the pool of passable screens grew while every screen in it
   * stayed a one-press solve, and Keter, drawing on all twelve verbs, ended up
   * the easiest ground in the ascent. The `min` matters more than the `max`:
   * it is what keeps the gentle screens out of the crown.
   */
  demand: {
    min: 1 | 2 | 3;
    max: 1 | 2 | 3;
    /**
     * Above the Abyss the band alone is not enough — with a floor of 2 the
     * supernals still average what Gevurah averages. `"hard"` draws twice and
     * keeps the harder screen, which shifts the region toward the top of its
     * band without narrowing what it can draw on.
     */
    bias?: "hard";
  };
  /**
   * The klipot standing at this rung: which shells, and how many.
   *
   * A region property rather than a property of the screens that happen to be
   * laid — authored husks alone made the *upper* Tree emptier than the foot,
   * because the screens they stood on were demand 1 and the high bands exclude
   * those. Scattered like the motes are, in `scatterHusks`.
   *
   * Each rung brings a new klipah and keeps two of the last, so the bestiary is
   * learned the way the letters are — and the pairing is not arbitrary. Delilah
   * stands at Yesod, which is the covenant and is Samson's undoing. The Calf is
   * false splendour, so it is Hod's; the Brothers withheld the acknowledgment
   * Hod is named for. Esau, who could not endure, is Netzach's. Amalek, who
   * will not be met face to face, is Tiferet's, which is Jacob and is truth.
   * Korach is Gevurah's, where the earth's judgment opens. Jezebel is the exact
   * inversion of what a queen's table is for, which is Chesed. Athaliah
   * destroyed her own seed, and Binah is the supernal mother. And the Serpent
   * — עָרוּם, subtler than any beast of the field, which is the same word — is
   * Chochmah's shadow before it is anything else; it goes on standing at the
   * crown because that is where it was always going to be waiting.
   *
   * **And from Netzach up, the creatures**, on the same principle. The Re'em,
   * which will not turn, stands at Netzach, which is endurance. The Saraf's
   * bite is not what kills — the ground you have to go back over is — so it is
   * Tiferet's, which is truth. The Arbeh is the one plague that is a number
   * rather than a thing, and Gevurah is judgment falling. The Tannin is the sea
   * and Chesed is water. Rahav is the sea's *pride*, cut down, and Binah is
   * where a thing is understood rather than admired. Og is the last of the
   * giants and Chochmah is the oldest ground there is. And the Nefilim are
   * named for a fall from the highest place, which is Keter.
   *
   * The other constraint is mechanical and is not negotiable: **no rung may be
   * all pacers and chargers**, because those are the roles a door waits on, and
   * a rung whose every klipah holds a door seals every room in it. Measured, on
   * a Yesod of Cain and the Brothers alone: not one run of ten reached the way
   * out.
   *
   * The counts climb, with one dip, and the dip is measured rather than
   * decorative: **Binah stands six where Chesed stands seven**, because the
   * three that meet there — the earth opening, what Jezebel sent, and Athaliah
   * putting the light out before you reach it — cost more between them than any
   * other rung's three. At seven it put half of every ten runs out. What a rung
   * costs is the count and the company together, and only one of those is a
   * number you can read off the page.
   */
  klipot: { kinds: HuskKind[]; count: number };
  /**
   * How many pieces of this rung's floor are **אֶבֶן מַשְׂכִּית** — figured stones,
   * which look like ground and are not (see `Tile.Maskit`).
   *
   * None in the kingdom. Malchut is where the walk, the leap and the mark are
   * taught, and a floor that gives way under a Scribe who has just been told
   * which key walks is not a trap, it is a lie about the controls.
   *
   * The count is small on purpose everywhere. A trap that is common stops being
   * a trap and becomes terrain — a Scribe who meets four in a rung starts
   * treading on every tile the way one treads on a frozen pond, and the rung
   * takes four times as long to cross for no more thought. One or two is a
   * thing that happens to you; five is a rule you learn to play around.
   */
  maskit: number;
  /** The three supernals stand above the Abyss and hold no House. */
  hasHouse: boolean;
  /**
   * And no mark either. Above the Abyss a veiling costs the whole region's
   * ground — the only real consequence in a game that will not kill you.
   */
  hasShrine: boolean;
  /**
   * Set only by `regionOfPath`, and only on the five paths that cross the gulf
   * (see `crossesAbyss` in `tree.ts`). No Sefirah is over the Abyss — a
   * Sefirah is a place, and the Abyss is the absence of one — so no entry in
   * the table below carries it.
   *
   * A crossing takes neither House nor shrine, which is the supernals' own
   * severity beginning one rung early, and its way out stands behind a
   * Word-Gate rather than beside the road. See `ABYSS_GATE_CHUNK`.
   */
  overTheAbyss?: boolean;
  /**
   * Where this rung's niches start in the scroll — also set only by
   * `regionOfPath`, and for a sharper reason than `overTheAbyss`.
   *
   * A path's `index` is deliberately **not** its own: it is the upper end's,
   * capped by what the Scribe's letters have earned, because index is what says
   * *how big the ground is*. Its `fragments` come from the **lower** end,
   * because that is whose niches they are. So on a path the two answer
   * different questions, and deriving "which piece of the verse is in this
   * niche" from `fragmentsBefore(index)` read the wrong one — the count came
   * from one end of the path and the identity from the other, and they diverged
   * the moment a Scribe outgrew the ground they stood on. That dealt fragments
   * `3` and `4` out of a scroll with three pieces, and put the same piece in two
   * places on the Tree.
   *
   * Carried here so it sits beside `fragments` and cannot drift from it again.
   * Unset on a real Sefirah, where `index` is its own and `fragmentsBefore`
   * still answers correctly.
   */
  fragmentsFrom?: number;
  teaching: string;
}

export const regions: Region[] = [
  {
    index: 1,
    sefirah: "malchut",
    name: "Malchut",
    hebrew: "מלכות",
    middah: "Sovereignty / Receiving",
    letters: ["aleph", "tav"],
    fragments: 1,
    length: 6,
    demand: { min: 1, max: 2 },
    klipot: { kinds: ["cain"], count: 2 },
    maskit: 0,
    hasHouse: true,
    // The one rung with no shrine, for two reasons that agree. Tav is *found*
    // here, so a shrine laid before its alcove is furniture — and now that the
    // shrine asks for the Mark, furniture that says so. And a veiling at the
    // foot of the Tree costs almost nothing: the ground is gentle and short,
    // and you wake where you came in. A mark is worth setting where ground is
    // expensive, which begins one rung up.
    hasShrine: false,
    teaching:
      "The kingdom — the world exactly as it is. Nothing is climbed that was not first stood upon. The breath is given here, at the bottom, because nothing rises without it.",
  },
  {
    index: 2,
    sefirah: "yesod",
    name: "Yesod",
    hebrew: "יסוד",
    middah: "Foundation / Connection",
    letters: ["chet", "samech", "resh"],
    fragments: 2,
    length: 6,
    demand: { min: 1, max: 2 },
    klipot: { kinds: ["cain", "delilah"], count: 3 },
    maskit: 1,
    hasHouse: true,
    hasShrine: true,
    teaching:
      "The foundation — the narrow channel everything above must pass through to reach the world. Here you learn to hold a wall instead of resenting it.",
  },
  {
    index: 3,
    sefirah: "hod",
    name: "Hod",
    hebrew: "הוד",
    middah: "Splendour / Gratitude",
    letters: ["gimel", "heh"],
    length: 6,
    demand: { min: 1, max: 3 },
    klipot: { kinds: ["cain", "brothers", "calf"], count: 4 },
    maskit: 1,
    hasHouse: true,
    hasShrine: true,
    teaching:
      "Splendour — the yielding that makes room, and the thanksgiving that names what was given. What cannot be walked is crossed in one motion.",
  },
  {
    index: 4,
    sefirah: "netzach",
    name: "Netzach",
    hebrew: "נצח",
    middah: "Endurance / Victory",
    letters: ["kuf", "lamed"],
    length: 6,
    demand: { min: 1, max: 3 },
    klipot: { kinds: ["brothers", "esav", "delilah", "reem"], count: 5 },
    maskit: 1,
    hasHouse: true,
    hasShrine: true,
    teaching:
      "Endurance — not the strength of the moment but the strength that outlasts it. The long way up is taken by whoever will make themselves small enough for it.",
  },
  {
    index: 5,
    sefirah: "tiferet",
    name: "Tiferet",
    hebrew: "תפארת",
    middah: "Harmony / Truth",
    letters: ["vav", "tzadi"],
    length: 7,
    demand: { min: 1, max: 3 },
    klipot: { kinds: ["cain", "amalek", "izevel", "saraf"], count: 6 },
    maskit: 1,
    hasHouse: true,
    hasShrine: true,
    teaching:
      "Beauty — the balance held between kindness and restraint, which is why it stands at the heart. Its letter is the hook: the one that joins, and holds.",
  },
  {
    index: 6,
    sefirah: "gevurah",
    name: "Gevurah",
    hebrew: "גבורה",
    middah: "Discipline / Severity",
    letters: ["zayin", "tet"],
    length: 7,
    demand: { min: 2, max: 3 },
    klipot: { kinds: ["cain", "amalek", "korach", "arbeh"], count: 5 },
    maskit: 1,
    hasHouse: true,
    hasShrine: true,
    teaching:
      "Restraint — the boundary that holds, and the discernment to know where it belongs. The edge given here clears a way; it does not conquer one.",
  },
  {
    index: 7,
    sefirah: "chesed",
    name: "Chesed",
    hebrew: "חסד",
    middah: "Loving-kindness",
    letters: ["mem", "nun"],
    length: 7,
    demand: { min: 2, max: 3 },
    klipot: { kinds: ["esav", "korach", "izevel", "tannin"], count: 7 },
    maskit: 1,
    hasHouse: true,
    hasShrine: true,
    teaching:
      "Loving-kindness — the open tent and the open hand, given without condition. The deep that refused you becomes the way through.",
  },
  {
    index: 8,
    sefirah: "binah",
    name: "Binah",
    hebrew: "בינה",
    middah: "Understanding",
    letters: ["ayin", "bet", "kaf"],
    length: 8,
    demand: { min: 2, max: 3, bias: "hard" },
    klipot: { kinds: ["korach", "izevel", "atalya", "rahav"], count: 6 },
    maskit: 2,
    hasHouse: false,
    hasShrine: false,
    teaching:
      "Understanding — the womb of forms, where a flash of insight is worked into something that can be held and said. Here the hidden light is simply seen.",
  },
  {
    index: 9,
    sefirah: "chochmah",
    name: "Chochmah",
    hebrew: "חכמה",
    middah: "Wisdom",
    letters: ["shin", "dalet"],
    length: 8,
    demand: { min: 2, max: 3, bias: "hard" },
    klipot: { kinds: ["atalya", "izevel", "nachash", "og"], count: 9 },
    maskit: 2,
    hasHouse: false,
    hasShrine: false,
    teaching:
      "Wisdom — the first point, the flash before the form. Nothing here can be taken; it can only be received, and it arrives as fire.",
  },
  {
    index: 10,
    sefirah: "keter",
    name: "Keter",
    hebrew: "כתר",
    middah: "Crown / Will",
    letters: ["yod"],
    length: 9,
    demand: { min: 2, max: 3, bias: "hard" },
    klipot: { kinds: ["calf", "atalya", "nachash", "delilah", "nefilim"], count: 10 },
    maskit: 2,
    hasHouse: false,
    hasShrine: false,
    teaching:
      "The crown — will before thought, the silent Aleph beneath all speech. The last letter given is the smallest: the point from which every other letter is written.",
  },
];

export const TOTAL_REGIONS = regions.length;

export function regionAt(index: number): Region {
  const region = regions[index - 1];
  if (!region) throw new Error(`No region at index ${index}`);
  return region;
}

/**
 * The region standing at a Sefirah — the other way round from `regionAt`, and
 * the one the Tree asks for, since a place on the overworld is a Sefirah and
 * not a number.
 *
 * Written three times before it was written once: `build.ts` had a copy for
 * `regionOfPath` and `GamePage` had another, and `fall.ts` would have been the
 * third. `index` is the only total order over the ten — how far up the Tree a
 * place is — so anything that has to compare two Sefirot comes through here.
 */
export function regionOfSefirah(sefirah: string): Region {
  const region = regions.find((r) => r.sefirah === sefirah);
  if (!region) throw new Error(`No region stands at ${sefirah}`);
  return region;
}

/** How many scroll fragments lie in the regions *before* this one. */
export function fragmentsBefore(regionIndex: number): number {
  return regions.slice(0, regionIndex - 1).reduce((n, r) => n + (r.fragments ?? 0), 0);
}

/** Every letter found at or before a region — what the Scribe carries into it. */
export function lettersThrough(regionIndex: number): string[] {
  return regions.slice(0, regionIndex).flatMap((r) => r.letters);
}

/** What the Scribe holds on *entering* a region — the previous regions' letters. */
export function lettersOnEntering(regionIndex: number): string[] {
  return lettersThrough(regionIndex - 1);
}

/** The Houses whose figures may stand in a region. */
export function housesFor(region: Region) {
  return region.hasHouse ? housesBySefirah(region.sefirah) : [];
}

/**
 * The letters lying in alcoves — twenty-one of the twenty-two. Peh is not
 * among them; it is assembled from the torn scroll (see `scroll.ts`), which
 * is why this and `SCROLL_LETTER` together must account for all 22.
 */
export function allRegionLetters(): string[] {
  return regions.flatMap((r) => r.letters);
}

/** The ability a letter grants, for the plate shown when it is found. */
export function abilityOf(letterId: string) {
  const ability = abilityByLetter[letterId];
  if (!ability) throw new Error(`No ability defined for letter ${letterId}`);
  return ability;
}
