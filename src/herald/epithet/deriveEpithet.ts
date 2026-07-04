import type { HeraldLayer } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { sefirahHonorifics, letterEmblems, DEFAULT_HONORIFIC } from "../../data/epithets";

export interface DerivedEpithet {
  text: string;
  dominantLetterId: string;
  dominantMiddah: SefirahId;
}

/**
 * Picks the most frequent value in a sequence; ties are broken by which
 * value reached that count first in sequence order — fully deterministic,
 * no wall-clock or randomness.
 */
function dominant<T extends string>(sequence: T[]): T {
  const counts = new Map<T, number>();
  let best: T = sequence[0];
  let bestCount = 0;
  for (const value of sequence) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    // Strictly greater: an equal count reached later never displaces the earlier value.
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Derives the Treasury's proposed Heraldic Epithet from a participant's
 * reading history. Only the first seven layers (the Seven Encounters) are
 * consulted — readings beyond the seventh never change the derivation.
 */
export function deriveEpithet(layers: HeraldLayer[]): DerivedEpithet {
  if (layers.length < 7) {
    throw new Error("The Heraldic Epithet is derived at the seventh reading — fewer than 7 layers given.");
  }
  const seven = [...layers].sort((a, b) => a.layerIndex - b.layerIndex).slice(0, 7);

  const letterSequence = seven.flatMap((layer) => layer.input.drawnLetters.map((d) => d.letterId));
  const middahSequence = seven.map((layer) => layer.input.middah);

  const dominantLetterId = dominant(letterSequence);
  const dominantMiddah = dominant(middahSequence);

  const honorific = sefirahHonorifics[dominantMiddah] ?? DEFAULT_HONORIFIC;
  const emblem = letterEmblems[dominantLetterId];
  const text = emblem ? `${honorific}, under the Sign of ${emblem}` : honorific;

  return { text, dominantLetterId, dominantMiddah };
}
