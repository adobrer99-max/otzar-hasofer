import { DATASETS, datasetsById, type DatasetId } from "./contentRegistry";
import { overlayForDataset } from "./exportDrafts";
import type { DraftRecord } from "../storage/contentDraftsRepo";
import { lettersById } from "../data/letters";
import { festivalsById } from "../data/festivals";
import { dorotCardsById } from "../data/dorot";
import { liturgiesById } from "../data/liturgies";
import { encounters } from "../data/encounters";
import { sefirahHonorifics, letterEmblems, setDefaultHonorific } from "../data/epithets";

/**
 * Applies the Scriptorium's saved drafts onto the live, in-memory datasets so
 * an authored edit takes effect across the running app — not just in the
 * studio's preview. Every authorable field is read at render time from these
 * mutable objects, so writing the edits in place is enough; no consumer needs
 * to change.
 *
 * This never touches the canonical `src/data/*.ts` on disk. The override is
 * local to this device/session; the JSON export remains the way to publish an
 * edit to everyone. The content registry captures each field's pristine `base`
 * at import (before any call here), so `revertEntry` can restore the shipped
 * text without a reload.
 */

/** Write a set of edited fields onto the live object for one entry. */
function writeEntry(datasetId: DatasetId, entryId: string, fields: Record<string, string>): void {
  switch (datasetId) {
    case "letters":
      if (lettersById[entryId]) Object.assign(lettersById[entryId], fields);
      return;
    case "festivals":
      if (festivalsById[entryId]) Object.assign(festivalsById[entryId], fields);
      return;
    case "dorot-matriarchal":
      if (dorotCardsById[entryId]) Object.assign(dorotCardsById[entryId], fields);
      return;
    case "liturgy":
      if (liturgiesById[entryId]) Object.assign(liturgiesById[entryId], fields);
      return;
    case "encounters": {
      const e = encounters.find((x) => x.number === Number(entryId));
      if (e) Object.assign(e, fields);
      return;
    }
    case "epithets": {
      const phrase = fields.phrase ?? "";
      if (entryId === "default") setDefaultHonorific(phrase);
      else if (entryId.startsWith("sefirah:")) sefirahHonorifics[entryId.slice(8) as keyof typeof sefirahHonorifics] = phrase;
      else if (entryId.startsWith("emblem:")) letterEmblems[entryId.slice(7)] = phrase;
      return;
    }
  }
}

/** Apply every genuine edit in `drafts` (non-empty, differs from base) live. */
export function applyContentOverrides(drafts: DraftRecord[]): void {
  for (const dataset of DATASETS) {
    const overlay = overlayForDataset(dataset.id, drafts);
    for (const [entryId, fields] of Object.entries(overlay)) {
      writeEntry(dataset.id, entryId, fields);
    }
  }
}

/** Restore one entry to its shipped values (the registry's pristine base). */
export function revertEntry(datasetId: DatasetId, entryId: string): void {
  const base = datasetsById[datasetId]?.entries.find((e) => e.id === entryId)?.base;
  if (!base) return;
  if (datasetId === "epithets" && entryId === "default") {
    setDefaultHonorific(undefined);
    return;
  }
  writeEntry(datasetId, entryId, base);
}
