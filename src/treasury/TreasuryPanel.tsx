import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../components/ui";
import { toast } from "../components/ui/toast";
import { downloadText } from "../herald/export/blazon";
import {
  BACKUP_STORES,
  countLabel,
  backupDue,
  backupFilename,
  countRecords,
  exportTreasury,
  parseBackup,
  previewRestore,
  readLastBackup,
  recordBackup,
  restoreTreasury,
  type BackupFile,
  type BackupStore,
  type MergeCounts,
} from "../storage/backup";
import { formatBytes, requestPersistence, storageStatus, type StorageStatus } from "../storage/persistence";
import styles from "./treasury.module.css";

function listCounts(counts: Record<BackupStore, number>): string {
  const parts = BACKUP_STORES.filter((s) => counts[s] > 0).map((s) => countLabel(s, counts[s]));
  return parts.length ? parts.join(" · ") : "nothing yet";
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

interface Pending {
  backup: BackupFile;
  skipped: number;
  plan: Record<BackupStore, MergeCounts>;
}

/**
 * "Your Treasury on this device" — what is stored here, whether the browser
 * will keep it, and backup / restore as a file. Shown on the Account page in
 * every deployment: without a cloud, it is the only way a Treasury moves
 * between devices or survives a cleared browser.
 */
export function TreasuryPanel() {
  const [counts, setCounts] = useState<Record<BackupStore, number>>();
  const [status, setStatus] = useState<StorageStatus>();
  const [lastBackup, setLastBackup] = useState(readLastBackup);
  const [pending, setPending] = useState<Pending>();
  const [restoreError, setRestoreError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const fileId = useId();

  async function refresh() {
    const [current, storage] = await Promise.all([exportTreasury(), storageStatus()]);
    setCounts(countRecords(current.stores));
    setStatus(storage);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleBackup() {
    setBusy(true);
    try {
      const backup = await exportTreasury();
      downloadText(JSON.stringify(backup, null, 2), backupFilename(), "application/json;charset=utf-8");
      recordBackup();
      setLastBackup(readLastBackup());
      toast("Backup saved — keep the file somewhere private", { tone: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "The backup couldn't be made", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File | undefined) {
    setRestoreError(undefined);
    setPending(undefined);
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setRestoreError(parsed.error);
      return;
    }
    setPending({ backup: parsed.backup, skipped: parsed.skipped, plan: await previewRestore(parsed.backup) });
  }

  function cancelRestore() {
    setPending(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRestore() {
    if (!pending) return;
    setBusy(true);
    try {
      const result = await restoreTreasury(pending.backup);
      const added = BACKUP_STORES.reduce((n, s) => n + result[s].added, 0);
      const updated = BACKUP_STORES.reduce((n, s) => n + result[s].updated, 0);
      toast(
        added + updated === 0
          ? "Nothing to restore — this device already holds everything in the backup"
          : `Restored — ${added} added, ${updated} updated`,
        { tone: "success" },
      );
      cancelRestore();
      await refresh();
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "The restore didn't complete; nothing was lost.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePersist() {
    const granted = await requestPersistence();
    await refresh();
    toast(
      granted ? "The browser will keep this Treasury" : "The browser declined for now — a backup file is the safeguard",
      { tone: granted ? "success" : "info" },
    );
  }

  const hasData = (counts?.participants ?? 0) > 0;
  const due = backupDue(lastBackup, hasData);
  const planAdded = pending ? BACKUP_STORES.reduce((n, s) => n + pending.plan[s].added, 0) : 0;
  const planUpdated = pending ? BACKUP_STORES.reduce((n, s) => n + pending.plan[s].updated, 0) : 0;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        Your Treasury on this device
      </h2>
      <p className={styles.line}>{counts ? `Held here: ${listCounts(counts)}.` : "Counting…"}</p>

      {status && status.persisted !== null && (
        <p className={styles.line}>
          {status.persisted ? (
            <>The browser will keep it — it won't clear it to free space.</>
          ) : (
            <>
              Not yet protected — if the device runs low on space, the browser may clear it.{" "}
              <Button variant="subtle" onClick={() => void handlePersist()}>
                Ask the browser to keep it
              </Button>
            </>
          )}
          {status.usage !== undefined && <span className={styles.muted}> Using {formatBytes(status.usage)}.</span>}
        </p>
      )}

      <h3 className={styles.subtitle}>Backup</h3>
      <p className={due ? styles.due : styles.line} role={due ? "status" : undefined}>
        {lastBackup ? `Last backup: ${longDate(lastBackup)}.` : "Never backed up from this device."}
        {due && " A backup file is the only copy of this Treasury outside this browser."}
      </p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={() => void handleBackup()} disabled={busy}>
          Download a backup
        </Button>
        <label htmlFor={fileId} className={styles.fileLabel}>
          Restore from a backup…
          <input
            id={fileId}
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className={styles.fileInput}
            onChange={(e) => void handleFile(e.target.files?.[0])}
            disabled={busy}
          />
        </label>
      </div>
      <p className={styles.muted}>
        A backup holds other people's readings, reflections and life events — keep the file as private as
        the Treasury itself.
      </p>

      {restoreError && (
        <p className={styles.error} role="alert">
          {restoreError}
        </p>
      )}

      {pending && (
        <div className={styles.preview} role="region" aria-label="Restore preview">
          <p className={styles.line}>
            <strong>
              This backup{pending.backup.exportedAt ? ` from ${longDate(pending.backup.exportedAt)}` : ""}
            </strong>{" "}
            holds {listCounts(countRecords(pending.backup.stores))}.
          </p>
          <p className={styles.line}>
            {planAdded + planUpdated === 0
              ? "This device already holds everything in it — restoring would change nothing."
              : `Restoring adds ${planAdded} and updates ${planUpdated} with newer copies. Nothing on this device is removed or rolled back.`}
            {pending.skipped > 0 && ` ${pending.skipped} damaged entries will be skipped.`}
          </p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => void handleRestore()} disabled={busy || planAdded + planUpdated === 0}>
              Restore
            </Button>
            <Button variant="ghost" onClick={cancelRestore} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
