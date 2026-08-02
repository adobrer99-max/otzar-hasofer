import { shorashimByKey, type ShoreshEntry } from "../data/shorashim.generated";
import { spellWord } from "../data/hebrewText";
import { resolveShoresh } from "../herald/shoresh/resolveShoresh";
import { lettersOnEntering } from "./regions";
import { randomInt } from "./rng";

/**
 * The Word-Gate: the Shoresh, made playable.
 *
 * Three sockets stand before a sealed chamber, and the gate names what it
 * wants — *"a gate that opens on a word meaning: to bind"*. The Scribe
 * inscribes three of the letters they carry, and the Brown-Driver-Briggs
 * lexicon the Treasury already ships judges whether they have spelled it.
 *
 * This is the move the whole project is built on — three letters becoming a
 * root — and until now the game did not make it once. It also fixes the
 * game's flattest problem: with a gate on the map, the letters in hand stop
 * being a checklist and become a combinatorial resource, and there is finally
 * a reason to leave the path.
 *
 * **Solvability is guaranteed at construction, not tested for.** The target
 * is chosen from roots whose three letters all lie within
 * `lettersOnEntering(regionIndex)` — what the Scribe is *guaranteed* to hold
 * on arriving, never counting letters found later in the same region. If no
 * such root exists, no gate is placed. So an unsolvable gate cannot be built,
 * in the same way an impassable chunk cannot: the generator is not allowed to
 * express one.
 */

export interface WordGateTarget {
  /** The root's three letter ids, in order. */
  letterIds: [string, string, string];
  /** Hebrew spelling with final forms, e.g. "אסר". */
  hebrew: string;
  transliteration: string;
  /** The clue: a short meaning, trimmed out of the lexicon's gloss. */
  clue: string;
  citation: string;
}

/** How an inscription was judged. */
export type WordGateVerdict =
  | { kind: "target"; entry: WordGateTarget }
  | { kind: "other-root"; hebrew: string; transliteration: string; gloss: string }
  | { kind: "related"; hint: string }
  | { kind: "hidden" };

/**
 * BDB glosses are long, archaic and comma-spliced — *"properly, to wander
 * away, i.e. lose oneself; by implication to perish"*. A clue has to be short
 * enough to hold in the head while hunting for letters, so take the first
 * real clause and drop the lexicographer's throat-clearing.
 */
export function clueFrom(gloss: string): string {
  let text = gloss.trim();
  // Parentheticals are the lexicographer talking to other lexicographers —
  // "(especially to disperse)" — and they are what pushes a clue past its
  // budget and gets it cut off mid-word.
  text = text.replace(/\([^)]*\)/g, " ");
  // Strip leading editorial qualifiers that say nothing about meaning.
  text = text.replace(/^(properly|primarily|literally|figuratively)\b\s*,?\s*/i, "");
  // First sense only: cut at the first sentence-or-sense boundary. The
  // "literally or figuratively" hedge is one of these, not part of a meaning.
  const cut = text.search(
    /[;:.]| i\.e\.| e\.g\.| by implication| by extension| literally| figuratively| specifically/i,
  );
  if (cut > 0) text = text.slice(0, cut);
  text = text.replace(/\s+/g, " ").replace(/[,\s]+$/, "").trim();
  if (text.length > CLUE_MAX) {
    // Never mid-word: fall back to a comma, then to the last whole word.
    const comma = text.lastIndexOf(",", CLUE_MAX);
    const space = text.lastIndexOf(" ", CLUE_MAX);
    const at = comma > 24 ? comma : space > 24 ? space : CLUE_MAX;
    text = text.slice(0, at).replace(/[,\s]+$/, "").trim();
  }
  return text;
}

/** Long enough to say something, short enough to hold while hunting letters. */
const CLUE_MAX = 64;

/** Whether an entry is usable as a gate's answer. */
function isUsable(entry: ShoreshEntry, held: ReadonlySet<string>): boolean {
  // A gate should name a word, not a person — the Names in the lexicon make
  // for clues no one could guess ("Terach, the father of Abraham").
  if (entry.kind !== "root") return false;
  const [a, b, c] = entry.letters;
  // Three distinct radicals, all of them already in hand.
  if (a === b || b === c || a === c) return false;
  if (!held.has(a) || !held.has(b) || !held.has(c)) return false;
  return clueFrom(entry.gloss).length >= 3;
}

/**
 * Every root a Scribe entering this region could actually spell. Deterministic
 * and pure — the caller picks from it with the run's seeded generator, never
 * `Math.random`, so a gate is the same gate on every replay of a seed.
 */
export function solvableRoots(regionIndex: number): ShoreshEntry[] {
  const held = new Set(lettersOnEntering(regionIndex));
  if (held.size < 3) return [];
  const found: ShoreshEntry[] = [];
  // Walk only the triples the Scribe can spell rather than the whole 3,889 —
  // at most |held|³ key lookups, and |held| is never more than 22.
  const ids = [...held];
  for (const a of ids) {
    for (const b of ids) {
      if (b === a) continue;
      for (const c of ids) {
        if (c === a || c === b) continue;
        for (const entry of shorashimByKey[`${a}-${b}-${c}`] ?? []) {
          if (isUsable(entry, held)) found.push(entry);
        }
      }
    }
  }
  // Stable order, so the seeded pick is reproducible across engines.
  found.sort((x, y) => x.id.localeCompare(y.id));
  return found;
}

export function toTarget(entry: ShoreshEntry): WordGateTarget {
  return {
    letterIds: entry.letters,
    hebrew: spellWord(entry.letters),
    transliteration: entry.transliteration,
    clue: clueFrom(entry.gloss),
    citation: entry.citation,
  };
}

/**
 * Picks the root a gate in this region will name. `undefined` when the Scribe
 * could not yet spell anything — which is why the earliest regions carry no
 * gates rather than carrying impossible ones.
 */
export function chooseTarget(regionIndex: number, rng: () => number): WordGateTarget | undefined {
  const pool = solvableRoots(regionIndex);
  if (pool.length === 0) return undefined;
  return toTarget(pool[randomInt(rng, pool.length)]);
}

/**
 * Judges three inscribed letters against the gate's target.
 *
 * The tiers are the Treasury's own Shoresh hierarchy, so the game agrees with
 * the reading: a canonical root or Name opens the way, a related
 * correspondence only murmurs, and a hidden root — Shoresh Nistar — costs
 * nothing at all. Nothing here can veil the Scribe, and a wrong inscription
 * may be tried again forever.
 */
export function judge(
  inscribed: [string, string, string],
  target: WordGateTarget,
): WordGateVerdict {
  if (inscribed.join("-") === target.letterIds.join("-")) {
    return { kind: "target", entry: target };
  }

  const result = resolveShoresh(inscribed);

  // A different real word still opens the gate. The Scribe has spelled
  // something true; that it was not what was asked for is the gate's problem.
  if (result.tier === "root") {
    return {
      kind: "other-root",
      hebrew: spellWord(inscribed),
      transliteration: result.transliteration,
      gloss: clueFrom(result.gloss),
    };
  }
  if (result.tier === "name") {
    return {
      kind: "other-root",
      hebrew: spellWord(inscribed),
      transliteration: result.transliteration,
      gloss: clueFrom(result.gloss),
    };
  }
  if (result.tier === "related" && result.correspondences.length > 0) {
    return { kind: "related", hint: result.correspondences[0].meaning };
  }
  return { kind: "hidden" };
}

/** Light awarded for an inscription — the target pays best, truth pays too. */
export function lightFor(verdict: WordGateVerdict): number {
  switch (verdict.kind) {
    case "target":
      return 12;
    case "other-root":
      return 5;
    default:
      return 0;
  }
}

/** Does this verdict open the chamber? */
export function opens(verdict: WordGateVerdict): boolean {
  return verdict.kind === "target" || verdict.kind === "other-root";
}
