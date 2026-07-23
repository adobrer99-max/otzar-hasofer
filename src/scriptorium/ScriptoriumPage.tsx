import { useEffect, useMemo, useState } from "react";
import { PageHeader, Button, Callout } from "../components/ui";
import { toast } from "../components/ui/toast";
import {
  DATASETS,
  datasetsById,
  draftKey,
  type DatasetId,
  type RegistryEntry,
} from "./contentRegistry";
import {
  listDrafts,
  putDraft,
  deleteDraft,
  type DraftRecord,
} from "../storage/contentDraftsRepo";
import { overlayForDataset, serializeDataset, serializeAll } from "./exportDrafts";
import { applyContentOverrides, revertEntry } from "./applyOverrides";
import { downloadText, copyText } from "../herald/export/blazon";
import { DraftEditor } from "./DraftEditor";
import { PreviewPane } from "./PreviewPane";
import { CardArtStudio } from "./CardArtStudio";
import styles from "./scriptorium.module.css";

/**
 * The Scriptorium — a standalone, unlinked drafting studio (reachable only at
 * /scriptorium). Browse every authorable content gap, compose into a form with
 * formatting tools, and watch the real component render live. Saved edits apply
 * to the running app on this device immediately (see applyOverrides.ts); the
 * JSON export is how those edits are published to everyone (folded into
 * src/data/*.ts and deployed).
 */
export function ScriptoriumPage() {
  const [datasetId, setDatasetId] = useState<DatasetId>("festivals");
  const [showArt, setShowArt] = useState(false);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [entryId, setEntryId] = useState<string>();
  const [values, setValues] = useState<Record<string, string>>({});

  const dataset = datasetsById[datasetId];
  const draftsByKey = useMemo(() => new Map(drafts.map((d) => [d.key, d])), [drafts]);
  const overlay = useMemo(() => overlayForDataset(datasetId, drafts), [datasetId, drafts]);
  const entry = dataset.entries.find((e) => e.id === entryId);

  useEffect(() => {
    listDrafts().then(setDrafts);
  }, []);

  // Selecting a dataset lands on its first entry.
  useEffect(() => {
    setEntryId(dataset.entries[0]?.id);
  }, [datasetId, dataset.entries]);

  const persisted = useMemo(() => {
    if (!entry) return {};
    const draft = draftsByKey.get(draftKey(datasetId, entry.id));
    return { ...entry.base, ...draft?.fields };
  }, [entry, draftsByKey, datasetId]);

  // Hydrate the form from base + any saved draft when the selection (or the
  // loaded drafts) change. Editing never touches `drafts`, so this never
  // clobbers in-progress typing. (The saved-note is cleared on edit/selection,
  // not here — otherwise a post-save drafts refresh would wipe it instantly.)
  useEffect(() => {
    setValues(persisted);
  }, [persisted]);

  const dirty = JSON.stringify(values) !== JSON.stringify(persisted);
  const hasDraft = !!entry && draftsByKey.has(draftKey(datasetId, entry.id));

  async function refresh() {
    setDrafts(await listDrafts());
  }

  async function handleSave() {
    if (!entry) return;
    await putDraft(datasetId, entry.id, values);
    const updated = await listDrafts();
    setDrafts(updated);
    applyContentOverrides(updated); // live on this device, app-wide
    toast("Saved · live on this device", { tone: "success" });
  }

  async function handleRevert() {
    if (!entry) return;
    await deleteDraft(datasetId, entry.id);
    revertEntry(datasetId, entry.id); // restore the shipped text live
    await refresh();
    setValues(entry.base);
    toast("Reverted to the shipped text");
  }

  function statusOf(e: RegistryEntry): "drafted" | "gap" | undefined {
    if (overlay[e.id]) return "drafted";
    if (e.isGap) return "gap";
    return undefined;
  }

  function datasetSummary(id: DatasetId): string {
    const d = datasetsById[id];
    const drafted = Object.keys(overlayForDataset(id, drafts)).length;
    const gaps = d.entries.filter((e) => e.isGap && !overlayForDataset(id, drafts)[e.id]).length;
    return `${drafted} drafted · ${gaps} ${d.gapNoun}${gaps === 1 ? "" : "s"}`;
  }

  return (
    <div className="page">
      <PageHeader
        kicker="The Scriptorium — a drafting studio"
        title="Author the Treasury's content"
        lede="Compose into the gaps with the formatting tools and watch the real page render as you type. Saved edits go live across the app on this device immediately. To publish an edit to everyone, export the JSON and fold it into the data files, then deploy."
      />

      <div className={styles.dashboard}>
        {DATASETS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`${styles.datasetTab} ${d.id === datasetId && !showArt ? styles.datasetTabActive : ""}`}
            onClick={() => {
              setShowArt(false);
              setDatasetId(d.id);
            }}
          >
            <span className={styles.datasetName}>{d.label}</span>
            <span className={styles.datasetCount}>{datasetSummary(d.id)}</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.datasetTab} ${showArt ? styles.datasetTabActive : ""}`}
          onClick={() => setShowArt(true)}
        >
          <span className={styles.datasetName}>The Card Art</span>
          <span className={styles.datasetCount}>publishes instantly</span>
        </button>
      </div>

      {showArt ? (
        <CardArtStudio />
      ) : (
        <>
      <p className={styles.muted}>{dataset.blurb}</p>

      <div className={styles.workspace}>
        <div className={styles.entryList}>
          {dataset.entries.map((e) => {
            const status = statusOf(e);
            return (
              <button
                key={e.id}
                type="button"
                className={`${styles.entryButton} ${e.id === entryId ? styles.entryButtonActive : ""}`}
                onClick={() => setEntryId(e.id)}
              >
                <span className={styles.entryButtonLabel}>
                  <span>{e.label}</span>
                  {status && (
                    <span
                      className={`${styles.status} ${status === "drafted" ? styles.statusDrafted : styles.statusGap}`}
                    >
                      {status}
                    </span>
                  )}
                </span>
                {e.sublabel && <span className={styles.entrySub}>{e.sublabel}</span>}
              </button>
            );
          })}
        </div>

        <div className={styles.editorPane}>
          {entry ? (
            <>
              <DraftEditor
                dataset={dataset}
                values={values}
                onFieldChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
                onSave={handleSave}
                onRevert={handleRevert}
                dirty={dirty}
                hasDraft={hasDraft}
              />
              <PreviewPane datasetId={datasetId} entry={entry} values={values} />
            </>
          ) : (
            <p>Select an entry to begin.</p>
          )}
        </div>
      </div>

      <div className={styles.exportBar}>
        <Button
          variant="primary"
          onClick={() => downloadText(serializeDataset(datasetId, drafts), `scriptorium-${datasetId}.json`)}
        >
          Download “{dataset.label}” JSON
        </Button>
        <Button variant="ghost" onClick={() => downloadText(serializeAll(drafts), "scriptorium-drafts.json")}>
          Export all
        </Button>
        <Button
          variant="subtle"
          onClick={async () => {
            const ok = await copyText(serializeAll(drafts));
            toast(
              ok ? "Copied all drafts to the clipboard" : "Clipboard unavailable — use a Download button",
              { tone: ok ? "success" : "error" },
            );
          }}
        >
          Copy all
        </Button>
      </div>

      <Callout>
        These drafts live only in this browser (IndexedDB) and are never synced.
        The exported JSON is the durable artifact — hand it back to have it folded
        into <code>src/data/*.ts</code>.
      </Callout>
        </>
      )}
    </div>
  );
}
