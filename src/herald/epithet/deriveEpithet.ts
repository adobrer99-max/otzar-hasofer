import type { HeraldLayer } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { sefirahHonorifics, letterEmblems, DEFAULT_HONORIFIC } from "../../data/epithets";
import { dominant } from "../synthesis/dominant";

export interface DerivedEpithet {
  text: string;
  dominantLetterId: string;
  dominantMiddah: SefirahId;
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
