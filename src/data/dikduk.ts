import type { LetterId } from "../types/letter";
import { shorashim, type ShoreshEntry } from "./shorashim.generated";

/**
 * Sefer HaDikduk — the grammar of the roots, applied mechanically to the
 * project's own BDB/Strong's-derived lexicon. Classical Hebrew grammar
 * classifies triliteral roots by their "weak" radicals: letters that
 * assimilate, drop, or quiesce in inflection. The pattern names below are
 * canonical grammatical categories; the classification itself is pure
 * string logic over the 22 letter ids, so the whole lexicon can be browsed
 * by pattern.
 */

export type RootPatternId =
  | "strong"
  | "i-guttural"
  | "ii-guttural"
  | "iii-guttural"
  | "i-nun"
  | "i-aleph"
  | "i-yod"
  | "hollow"
  | "iii-heh"
  | "iii-aleph"
  | "geminate";

export interface RootPattern {
  id: RootPatternId;
  name: string;
  hebrewName: string;
  description: string;
}

export const ROOT_PATTERNS: RootPattern[] = [
  {
    id: "strong",
    name: "Strong (complete)",
    hebrewName: "שלמים",
    description:
      "All three radicals hold firm through every inflection — the paradigm roots the grammars conjugate first.",
  },
  {
    id: "i-guttural",
    name: "First-guttural",
    hebrewName: "פ״א גרונית",
    description:
      "A guttural (Aleph, Heh, Chet, Ayin) opens the root; gutturals refuse doubling and prefer composite vowels, bending the paradigm around them.",
  },
  {
    id: "ii-guttural",
    name: "Second-guttural",
    hebrewName: "ע״א גרונית",
    description: "The guttural stands in the root's heart, drawing a-vowels toward itself.",
  },
  {
    id: "iii-guttural",
    name: "Third-guttural",
    hebrewName: "ל״א גרונית",
    description: "The root closes on Chet or Ayin, which demands a patach before it at the word's end.",
  },
  {
    id: "i-nun",
    name: "First-Nun",
    hebrewName: "פ״ן",
    description:
      "An opening Nun assimilates into the following radical (as in yitten from natan) — the letter of the falling soul, quietly absorbed.",
  },
  {
    id: "i-aleph",
    name: "First-Aleph",
    hebrewName: "פ״א",
    description: "An opening Aleph quiesces in some forms — present in writing, silent in the mouth.",
  },
  {
    id: "i-yod",
    name: "First-Yod",
    hebrewName: "פ״י",
    description: "An opening Yod (often an original Vav) drops or contracts in the prefix conjugation.",
  },
  {
    id: "hollow",
    name: "Hollow (second-Vav/Yod)",
    hebrewName: "ע״ו / ע״י",
    description:
      "The middle radical is a Vav or Yod that collapses into a long vowel — roots with an open center, like kum (to rise).",
  },
  {
    id: "iii-heh",
    name: "Third-Heh",
    hebrewName: "ל״ה",
    description:
      "The root ends in Heh (usually an original Yod), which falls away or transforms in inflection — endings that breathe rather than close.",
  },
  {
    id: "iii-aleph",
    name: "Third-Aleph",
    hebrewName: "ל״א",
    description: "The closing Aleph quiesces, lengthening the vowel before it.",
  },
  {
    id: "geminate",
    name: "Geminate (doubled)",
    hebrewName: "כפולים",
    description:
      "The second and third radicals are the same letter, fusing into one doubled consonant — as in savav (to encircle).",
  },
];

export const rootPatternsById: Record<RootPatternId, RootPattern> = Object.fromEntries(
  ROOT_PATTERNS.map((p) => [p.id, p]),
) as Record<RootPatternId, RootPattern>;

const GUTTURALS = new Set<LetterId>(["aleph", "heh", "chet", "ayin"]);

/**
 * Classifies a triliteral root by its weak-radical patterns. A root may
 * carry several (e.g. נשא is both first-Nun and third-Aleph); a root with
 * none is "strong". Pure and total over the 22 letter ids.
 */
export function classifyRoot(letters: [LetterId, LetterId, LetterId]): RootPatternId[] {
  const [first, second, third] = letters;
  const patterns: RootPatternId[] = [];

  if (second === third) patterns.push("geminate");
  if (first === "nun") patterns.push("i-nun");
  if (first === "aleph") patterns.push("i-aleph");
  if (first === "yod") patterns.push("i-yod");
  if (GUTTURALS.has(first) && first !== "aleph") patterns.push("i-guttural");
  if (second === "vav" || second === "yod") patterns.push("hollow");
  if (GUTTURALS.has(second)) patterns.push("ii-guttural");
  if (third === "heh") patterns.push("iii-heh");
  if (third === "aleph") patterns.push("iii-aleph");
  if ((third === "chet" || third === "ayin") && !patterns.includes("geminate")) {
    patterns.push("iii-guttural");
  }

  return patterns.length > 0 ? patterns : ["strong"];
}

export interface PatternGroup {
  pattern: RootPattern;
  entries: ShoreshEntry[];
}

/** The whole lexicon, grouped by pattern (an entry can appear in several groups). */
export function groupRootsByPattern(): PatternGroup[] {
  const groups = new Map<RootPatternId, ShoreshEntry[]>();
  for (const pattern of ROOT_PATTERNS) groups.set(pattern.id, []);
  for (const entry of shorashim) {
    if (entry.kind !== "root") continue;
    for (const id of classifyRoot(entry.letters)) {
      groups.get(id)!.push(entry);
    }
  }
  return ROOT_PATTERNS.map((pattern) => ({ pattern, entries: groups.get(pattern.id)! }));
}
