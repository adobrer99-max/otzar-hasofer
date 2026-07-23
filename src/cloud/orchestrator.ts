import { isCloudConfigured } from "./config";
import { runSync, createIdbAdapter, type SyncSummary } from "./sync";

/**
 * Wires the sync engine to the running app. All Supabase access is behind
 * dynamic imports gated on `isCloudConfigured()`, so an unconfigured
 * deployment never initializes (or even loads) the SDK.
 */

let syncing = false;
let hintTimer: number | undefined;

export async function syncNow(): Promise<SyncSummary | undefined> {
  if (!isCloudConfigured() || syncing) return undefined;
  const { getSupabase } = await import("./supabaseClient");
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session) return undefined;

  syncing = true;
  try {
    const { SupabaseTransport } = await import("./supabaseTransport");
    const adapter = createIdbAdapter();
    const summary = await runSync(adapter, new SupabaseTransport());
    await adapter.setState("lastSyncAt", new Date().toISOString());
    window.dispatchEvent(new CustomEvent("otzar:sync-done"));
    return summary;
  } finally {
    syncing = false;
  }
}

/** Call once at app start. Safe (and inert) when the cloud isn't configured. */
export function initCloudSync(): void {
  if (!isCloudConfigured()) return;

  // Repo writes hint the engine; debounce so a burst of writes syncs once.
  window.addEventListener("otzar:sync-hint", () => {
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      void syncNow().catch(() => undefined); // offline/errors: outbox keeps the changes
    }, 2500);
  });

  window.addEventListener("online", () => {
    void syncNow().catch(() => undefined);
  });

  void (async () => {
    const { getSupabase } = await import("./supabaseClient");
    getSupabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void syncNow().catch(() => undefined);
      }
      // A password-reset email lands at the origin (HashRouter sees the token
      // fragment, not a route), so the user is dropped on Home. Flag it and
      // steer to the Account page, whose "set a new password" panel takes over.
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("otz-recovery", "1");
        if (!window.location.hash.startsWith("#/account")) {
          window.location.hash = "#/account";
        }
      }
    });
  })();
}
