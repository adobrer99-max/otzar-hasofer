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
   */
  klipot: { kinds: HuskKind[]; count: number };
  /** The three supernals stand above the Abyss and hold no House. */
  hasHouse: boolean;
  /**
   * And no mark either. Above the Abyss a veiling costs the whole region's
   * ground — the only real consequence in a game that will not kill you.
   */
  hasShrine: boolean;
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
    klipot: { kinds: ["crawler"], count: 2 },
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
    klipot: { kinds: ["crawler", "drifter"], count: 3 },
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
    klipot: { kinds: ["crawler", "drifter"], count: 4 },
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
    klipot: { kinds: ["crawler", "drifter", "spitter"], count: 5 },
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
    klipot: { kinds: ["crawler", "drifter", "spitter"], count: 6 },
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
    klipot: { kinds: ["crawler", "spitter", "sentinel"], count: 6 },
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
    klipot: { kinds: ["drifter", "spitter", "sentinel"], count: 7 },
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
    klipot: { kinds: ["crawler", "drifter", "spitter", "sentinel"], count: 8 },
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
    klipot: { kinds: ["crawler", "drifter", "spitter", "sentinel"], count: 9 },
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
    klipot: { kinds: ["drifter", "spitter", "sentinel"], count: 10 },
    hasHouse: false,
    hasShrine: false,
    teaching:
      "The crown — will before thought, the silent Aleph beneath all speech. The last letter given is the smallest: the point from which every other letter is written.",
  },
];

export const TOTAL_REGIONS = regions.length;

/** The Abyss stands between Chesed and Binah — after region 7, before 8. */
export const ABYSS_AFTER_REGION = 7;

export function regionAt(index: number): Region {
  const region = regions[index - 1];
  if (!region) throw new Error(`No region at index ${index}`);
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
