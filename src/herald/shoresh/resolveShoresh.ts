import { lettersById } from "../../data/letters";
import { shorashimByKey } from "../../data/shorashim.generated";
import { findTwoLetterRoot } from "../../data/twoLetterRoots";
import { findGematriaCoincidence } from "../../data/gematriaCoincidences";

export interface RelatedCorrespondence {
  kind: "two-letter-root" | "reordered-root" | "gematria";
  letters: string[];
  label: string;
  meaning: string;
  source?: string;
}

export type ShoreshResult =
  | { tier: "root"; word: string; transliteration: string; gloss: string; citation: string }
  | { tier: "name"; name: string; transliteration: string; gloss: string; citation: string }
  | { tier: "related"; correspondences: RelatedCorrespondence[] }
  | { tier: "hidden" };

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([item, ...perm]);
    }
  });
  return result;
}

function dedupeFirstOccurrence(letters: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const letter of letters) {
    if (!seen.has(letter)) {
      seen.add(letter);
      result.push(letter);
    }
  }
  return result;
}

/**
 * Resolves the reading's 3 openly-drawn letters (the veiled letter is never
 * passed in here) through the Shoresh hierarchy: Canonical Root -> Canonical
 * Name -> Related Correspondence -> Shoresh Nistar (Hidden Root).
 *
 * `drawnLetterIds` must be in original draw order, including duplicates
 * (e.g. if the same letter was drawn twice) — duplicates matter for the
 * gematria sum even though they collapse for root-lookup purposes. Do NOT
 * pass a shield-band-reordered array (see herald/render/divisions.ts) here;
 * that order reflects visual layout, not the drawn root order.
 */
export function resolveShoresh(drawnLetterIds: [string, string, string]): ShoreshResult {
  const distinct = dedupeFirstOccurrence(drawnLetterIds);

  // Tier I & II require 3 distinct radicals — a real root can't be formed
  // from fewer.
  if (distinct.length === 3) {
    const asDrawnKey = distinct.join("-");
    const asDrawnMatches = shorashimByKey[asDrawnKey];
    const root = asDrawnMatches?.find((e) => e.kind === "root");
    if (root) {
      return { tier: "root", word: root.transliteration, transliteration: root.transliteration, gloss: root.gloss, citation: root.citation };
    }
    const name = asDrawnMatches?.find((e) => e.kind === "name");
    if (name) {
      return { tier: "name", name: name.transliteration, transliteration: name.transliteration, gloss: name.gloss, citation: name.citation };
    }
  }

  // Tier III: collect every applicable signal, never short-circuit on the first.
  const correspondences: RelatedCorrespondence[] = [];

  for (let i = 0; i < distinct.length; i++) {
    for (let j = i + 1; j < distinct.length; j++) {
      const pair = findTwoLetterRoot(distinct[i], distinct[j]);
      if (pair) {
        correspondences.push({
          kind: "two-letter-root",
          letters: [distinct[i], distinct[j]],
          label: pair.rootWord,
          meaning: pair.meaning,
        });
      }
    }
  }

  if (distinct.length === 3) {
    const asDrawnKey = distinct.join("-");
    for (const perm of permutations(distinct)) {
      const key = perm.join("-");
      if (key === asDrawnKey) continue; // already tried as Tier I/II
      const matches = shorashimByKey[key];
      if (matches && matches.length > 0) {
        const match = matches[0];
        correspondences.push({
          kind: "reordered-root",
          letters: perm,
          label: match.transliteration,
          meaning: match.gloss,
          source: `If read in a different order — ${match.citation}`,
        });
      }
    }
  }

  const gematriaSum = drawnLetterIds.reduce((sum, id) => sum + (lettersById[id]?.gematria ?? 0), 0);
  const coincidence = findGematriaCoincidence(gematriaSum);
  if (coincidence) {
    correspondences.push({
      kind: "gematria",
      letters: drawnLetterIds,
      label: coincidence.label,
      meaning: coincidence.meaning,
      source: `Combined gematria: ${gematriaSum} — for contemplation only`,
    });
  }

  if (correspondences.length > 0) {
    return { tier: "related", correspondences };
  }

  return { tier: "hidden" };
}
