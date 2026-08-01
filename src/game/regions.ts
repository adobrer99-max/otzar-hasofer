import { housesBySefirah } from "../data/dorot";
import type { SefirahId } from "../types/letter";
import { abilityByLetter } from "./abilities";

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
  /** How many body screens the region is built from. */
  length: number;
  /** The three supernals stand above the Abyss and hold no House. */
  hasHouse: boolean;
  teaching: string;
}

export const regions: Region[] = [
  {
    index: 1,
    sefirah: "malchut",
    name: "Malchut",
    hebrew: "מלכות",
    middah: "Sovereignty / Receiving",
    letters: ["aleph", "tav", "resh"],
    length: 5,
    hasHouse: true,
    teaching:
      "The kingdom — the world exactly as it is. Nothing is climbed that was not first stood upon. The breath is given here, at the bottom, because nothing rises without it.",
  },
  {
    index: 2,
    sefirah: "yesod",
    name: "Yesod",
    hebrew: "יסוד",
    middah: "Foundation / Connection",
    letters: ["chet", "samech"],
    length: 5,
    hasHouse: true,
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
    hasHouse: true,
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
    hasHouse: true,
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
    hasHouse: true,
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
    hasHouse: true,
    teaching:
      "Restraint — the boundary that holds, and the discernment to know where it belongs. The edge given here clears a way; it does not conquer one.",
  },
  {
    index: 7,
    sefirah: "chesed",
    name: "Chesed",
    hebrew: "חסד",
    middah: "Loving-kindness",
    letters: ["mem", "nun", "peh"],
    length: 7,
    hasHouse: true,
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
    hasHouse: false,
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
    hasHouse: false,
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
    hasHouse: false,
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

/** Sanity: the ten regions between them give all twenty-two letters, once each. */
export function allRegionLetters(): string[] {
  return regions.flatMap((r) => r.letters);
}

/** The ability a letter grants, for the plate shown when it is found. */
export function abilityOf(letterId: string) {
  const ability = abilityByLetter[letterId];
  if (!ability) throw new Error(`No ability defined for letter ${letterId}`);
  return ability;
}
