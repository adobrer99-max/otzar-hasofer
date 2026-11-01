/**
 * Asking the browser to keep the Treasury. By default a site's storage is
 * "best effort": under storage pressure the browser may clear it. Persistent
 * storage takes the Treasury out of that eviction — the only protection a
 * cloud-free deploy has besides a backup file.
 */

export interface StorageStatus {
  /** null when the browser can't say (no StorageManager). */
  persisted: boolean | null;
  usage?: number;
  quota?: number;
}

export async function storageStatus(): Promise<StorageStatus> {
  const manager = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!manager?.persisted) return { persisted: null };
  const [persisted, estimate] = await Promise.all([
    manager.persisted().catch(() => false),
    manager.estimate ? manager.estimate().catch(() => undefined) : Promise.resolve(undefined),
  ]);
  return { persisted, usage: estimate?.usage, quota: estimate?.quota };
}

/** Ask for persistence (some browsers ask the person; others decide quietly). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** "1.2 MB" (pure). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
