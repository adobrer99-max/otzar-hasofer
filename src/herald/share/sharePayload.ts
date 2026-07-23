/**
 * The shared Herald's payload — a snapshot of the DERIVED, veil-free Herald,
 * exactly the props the synthesis canvas renders. Nothing from the raw
 * readings enters it: `HeraldForm` excludes the veiled letters by
 * construction, and the builder never touches palm notes, reflections, or
 * the layer snapshots themselves. Publishing is snapshot semantics — the
 * stored `status` only changes when the Scribe republishes.
 */

import type { ParticipantRecord, HeraldLayer, ReadingPath, HeraldStyle } from "../../types/herald";
import { deriveHeraldForm, type HeraldForm } from "../synthesis/deriveHeraldForm";

export interface SharedHeraldPayload {
  heraldForm: HeraldForm;
  displayName: string;
  hebrewName?: string;
  path?: ReadingPath;
  status: string;
  epithet?: string;
  style?: HeraldStyle;
  publishedAt: string;
}

/** The status line for a synthesis form — shared with HeraldPage's headline. */
export function synthesisStatusText(form: HeraldForm): string {
  return form.revealed
    ? "The Herald, revealed"
    : `The Herald, forming — ${form.readingCount} of 7`;
}

export function buildSharePayload(
  participant: ParticipantRecord,
  layers: HeraldLayer[],
  style?: HeraldStyle,
): SharedHeraldPayload {
  const heraldForm = deriveHeraldForm(layers);
  return {
    heraldForm,
    displayName: participant.displayName,
    hebrewName: participant.hebrewName,
    path: participant.path,
    status: synthesisStatusText(heraldForm),
    epithet: heraldForm.revealed ? participant.heraldicEpithet?.text : undefined,
    style,
    publishedAt: new Date().toISOString(),
  };
}
