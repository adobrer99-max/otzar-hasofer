/**
 * Keeps the live in-memory datasets in step with the draft store — at boot
 * and after every cloud sync. A pulled edit goes live app-wide without a
 * reload; a pulled delete reverts that entry to the shipped text (the
 * appliedKeys diff below — applyContentOverrides alone can't un-apply).
 */

import { listDrafts } from "../storage/contentDraftsRepo";
import { applyContentOverrides, revertEntry } from "./applyOverrides";
import { parseDraftKey } from "./contentRegistry";

let appliedKeys = new Set<string>();

async function refresh(): Promise<void> {
  const drafts = await listDrafts();
  const next = new Set(drafts.map((d) => d.key));
  for (const key of appliedKeys) {
    if (next.has(key)) continue;
    const parsed = parseDraftKey(key);
    if (parsed) revertEntry(parsed.datasetId, parsed.entryId);
  }
  applyContentOverrides(drafts);
  appliedKeys = next;
}

/**
 * Call once before first render (main.tsx). Applies saved drafts and re-runs
 * on every completed sync, so edits pulled from another device land live.
 */
export function initContentOverrides(): Promise<void> {
  window.addEventListener("otzar:sync-done", () => void refresh().catch(() => {}));
  return refresh();
}
