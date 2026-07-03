import type { TwoLetterRoot } from "../types/letter";

/**
 * A starter set of two-letter Hebrew roots and their traditional meanings.
 * This is one of several signals feeding Tier III ("Related Correspondence")
 * of the Shoresh hierarchy in `src/herald/shoresh/resolveShoresh.ts` — on its
 * own it is not a full root, just an "avenue of contemplation." This is a
 * genuinely large linguistic-research task (up to C(22,2) = 231 possible
 * pairs) — this file is a curated starting set, not an exhaustive table.
 * Expand as the Scribe's own practice surfaces more resonant pairings.
 */
export const twoLetterRoots: TwoLetterRoot[] = [
  {
    id: "aleph-bet",
    letters: ["aleph", "bet"],
    rootWord: "אב (av)",
    meaning: "Father; origin, source, the desire to give.",
  },
  {
    id: "aleph-mem",
    letters: ["aleph", "mem"],
    rootWord: "אם (em)",
    meaning: "Mother; nurture, the wellspring a person returns to.",
  },
  {
    id: "aleph-chet",
    letters: ["aleph", "chet"],
    rootWord: "אח (ach)",
    meaning: "Brother; kinship, solidarity, one who stands beside.",
  },
  {
    id: "bet-nun",
    letters: ["bet", "nun"],
    rootWord: "בן (ben)",
    meaning: "Son; building (בנה), lineage carried forward.",
  },
  {
    id: "dalet-mem",
    letters: ["dalet", "mem"],
    rootWord: "דם (dam)",
    meaning: "Blood; life-force, kinship, what is offered or spilled.",
  },
  {
    id: "heh-resh",
    letters: ["heh", "resh"],
    rootWord: "הר (har)",
    meaning: "Mountain; permanence, the site of revelation.",
  },
  {
    id: "chet-nun",
    letters: ["chet", "nun"],
    rootWord: "חן (chen)",
    meaning: "Grace; favor given freely, unearned kindness.",
  },
  {
    id: "tet-lamed",
    letters: ["tet", "lamed"],
    rootWord: "טל (tal)",
    meaning: "Dew; quiet blessing, the gentlest form of renewal.",
  },
  {
    id: "yod-dalet",
    letters: ["yod", "dalet"],
    rootWord: "יד (yad)",
    meaning: "Hand; capability, action taken, a memorial kept.",
  },
  {
    id: "kaf-lamed",
    letters: ["kaf", "lamed"],
    rootWord: "כל (kol)",
    meaning: "All / everything; wholeness, totality.",
  },
  {
    id: "lamed-bet",
    letters: ["lamed", "bet"],
    rootWord: "לב (lev)",
    meaning: "Heart; the seat of understanding and will, not merely feeling.",
  },
  {
    id: "mem-nun",
    letters: ["mem", "nun"],
    rootWord: "מן (man)",
    meaning: "Manna / \"from\"; sustenance given from an unseen source.",
  },
  {
    id: "nun-resh",
    letters: ["nun", "resh"],
    rootWord: "נר (ner)",
    meaning:
      "Candle/lamp; a light kept burning — \"the soul of a person is the lamp of God\" (Proverbs 20:27).",
  },
  {
    id: "ayin-zayin",
    letters: ["ayin", "zayin"],
    rootWord: "עז (oz)",
    meaning: "Strength; boldness, fortitude.",
  },
  {
    id: "peh-heh",
    letters: ["peh", "heh"],
    rootWord: "פה (peh)",
    meaning: "Mouth; speech, voice, the instrument of interpretation itself.",
  },
  {
    id: "tzadi-lamed",
    letters: ["tzadi", "lamed"],
    rootWord: "צל (tzel)",
    meaning: "Shadow; shelter, or the intangible trace a thing leaves behind.",
  },
  {
    id: "kuf-resh",
    letters: ["kuf", "resh"],
    rootWord: "קר (kar)",
    meaning: "Cold; dormancy, distance, a season not yet ready to thaw.",
  },
  {
    id: "resh-ayin",
    letters: ["resh", "ayin"],
    rootWord: "רע (ra / re'a)",
    meaning:
      "Evil, or friend/companion — the same two letters carrying opposite faces depending on how they are read; a pairing that asks which face is showing.",
  },
  {
    id: "shin-mem",
    letters: ["shin", "mem"],
    rootWord: "שם (shem)",
    meaning: "Name; identity, reputation, what is carried forward as legacy.",
  },
  {
    id: "shin-resh",
    letters: ["shin", "resh"],
    rootWord: "שר (sar / shir)",
    meaning: "Prince, or song; leadership and its lyrical, celebratory face.",
  },
];

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("+");
}

export const twoLetterRootsByKey: Record<string, TwoLetterRoot> = Object.fromEntries(
  twoLetterRoots.map((pair) => [pairKey(pair.letters[0], pair.letters[1]), pair]),
);

export function findTwoLetterRoot(a: string, b: string): TwoLetterRoot | undefined {
  if (a === b) return undefined;
  return twoLetterRootsByKey[pairKey(a, b)];
}
