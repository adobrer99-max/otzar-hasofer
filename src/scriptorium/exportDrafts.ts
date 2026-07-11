import { DATASETS, datasetsById, parseDraftKey, type DatasetId } from "./contentRegistry";
import type { DraftRecord } from "../storage/contentDraftsRepo";

/**
 * Turn the studio's local drafts into a clean JSON overlay — the artifact the
 * author hands back so the drafted values can be folded into `src/data/*.ts`.
 *
 * Pure and IDB-free (drafts are passed in) so it can be unit-tested. Only
 * fields that are non-empty AND differ from the shipped value are emitted, so
 * the overlay is exactly the set of genuine edits.
 */

export type DatasetOverlay = Record<string, Record<string, string>>;

/** Overlay for a single dataset: `{ [entryId]: { field: value } }`. */
export function overlayForDataset(datasetId: DatasetId, drafts: DraftRecord[]): DatasetOverlay {
  const dataset = datasetsById[datasetId];
  if (!dataset) return {};
  const baseById = new Map(dataset.entries.map((e) => [e.id, e.base]));
  const overlay: DatasetOverlay = {};

  for (const draft of drafts) {
    const parsed = parseDraftKey(draft.key);
    if (!parsed || parsed.datasetId !== datasetId) continue;
    const base = baseById.get(parsed.entryId);
    if (!base) continue;

    const edited: Record<string, string> = {};
    for (const field of dataset.fields) {
      const value = (draft.fields[field.key] ?? "").trim();
      if (value && value !== (base[field.key] ?? "").trim()) {
        edited[field.key] = value;
      }
    }
    if (Object.keys(edited).length > 0) overlay[parsed.entryId] = edited;
  }
  return overlay;
}

/** How many entries in a dataset carry at least one exportable edit. */
export function draftedCount(datasetId: DatasetId, drafts: DraftRecord[]): number {
  return Object.keys(overlayForDataset(datasetId, drafts)).length;
}

const NOTE =
  "Otzar Ha'Sofer — Scriptorium drafts. Each key is a dataset; each value maps an " +
  "entry id to the authored fields. Fold these into the matching src/data/*.ts entries.";

/** Serialize one dataset's overlay to JSON text (stable key order for clean diffs). */
export function serializeDataset(datasetId: DatasetId, drafts: DraftRecord[]): string {
  const overlay = overlayForDataset(datasetId, drafts);
  return JSON.stringify({ _note: NOTE, [datasetId]: sortKeys(overlay) }, null, 2);
}

/** Serialize every dataset's overlay to one combined JSON text. */
export function serializeAll(drafts: DraftRecord[]): string {
  const out: Record<string, unknown> = { _note: NOTE };
  for (const dataset of DATASETS) {
    const overlay = overlayForDataset(dataset.id, drafts);
    if (Object.keys(overlay).length > 0) out[dataset.id] = sortKeys(overlay);
  }
  return JSON.stringify(out, null, 2);
}

function sortKeys(overlay: DatasetOverlay): DatasetOverlay {
  const sorted: DatasetOverlay = {};
  for (const id of Object.keys(overlay).sort()) sorted[id] = overlay[id];
  return sorted;
}
