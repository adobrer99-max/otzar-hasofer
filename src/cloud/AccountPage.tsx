import { useEffect, useState } from "react";
import { PageHeader } from "../components/ui";
import { toast } from "../components/ui/toast";
import { isCloudConfigured } from "./config";
import { syncNow } from "./orchestrator";
import { getPendingCount, createIdbAdapter } from "./sync";
import styles from "./account.module.css";

interface SessionInfo {
  email: string;
}

/**
 * "The Scribe's Seal" — the account page. Three states: this deployment has
 * no cloud configured (calm explainer); signed out (email magic link);
 * signed in (sync status + controls). The local Treasury always remains
 * primary and offline-capable — signing in adds private sync, nothing more.
 */
export function AccountPage() {
  const configured = isCloudConfigured();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function refreshStatus() {
    setPending(await getPendingCount());
    const at = (await createIdbAdapter().getState("lastSyncAt")) as string | undefined;
    setLastSyncAt(at);
  }

  useEffect(() => {
    if (!configured) {
      setChecked(true);
      return;
    }
    let unsub: (() => void) | undefined;
    void (async () => {
      try {
        const { getSupabase } = await import("./supabaseClient");
        const supabase = getSupabase();
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        setSession(s?.user?.email ? { email: s.user.email } : null);
        setChecked(true);
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, s2) => {
          setSession(s2?.user?.email ? { email: s2.user.email } : null);
        });
        unsub = () => subscription.unsubscribe();
      } catch {
        setError("Could not reach the configured cloud. The app remains fully usable locally.");
        setChecked(true);
      }
      await refreshStatus();
    })();
    const onDone = () => void refreshStatus();
    window.addEventListener("otzar:sync-done", onDone);
    return () => {
      unsub?.();
      window.removeEventListener("otzar:sync-done", onDone);
    };
  }, [configured]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      const { getSupabase } = await import("./supabaseClient");
      const { error: err } = await getSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const { getSupabase } = await import("./supabaseClient");
    await getSupabase().auth.signOut();
    setSession(null);
  }

  async function handleSyncNow() {
    setBusy(true);
    setError(undefined);
    try {
      await syncNow();
      await refreshStatus();
      toast("Synced", { tone: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed — your changes remain queued locally.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader kicker="The Scribe's Seal" title="Account" />

      <p>
        The Treasury lives in this browser first — every reading, Herald, and
        commentary works fully offline, account or no account. Signing in adds
        one thing: your Treasury syncs privately to your account and follows
        you across devices.
      </p>

      <p className={styles.privacy}>
        Privacy, plainly: a Treasury holds other people's reflections and life
        events. Each Scribe's rows are locked to their account by the
        database's own row-level security — not merely by app code — and no
        other account can read them. Your local copy always remains primary.
      </p>

      {!configured && (
        <div className={styles.panel}>
          <p>
            <strong>This deployment has no cloud configured.</strong> The app
            runs fully local. To enable accounts and sync, the site's deployer
            creates a Supabase project and sets two environment variables —
            see <code>DEPLOY.md</code> in the repository.
          </p>
        </div>
      )}

      {configured && !checked && <p className={styles.statusLine}>Checking session…</p>}

      {configured && checked && !session && (
        <form className={styles.panel} onSubmit={handleSignIn}>
          <label htmlFor="account-email">Email — a sign-in link will be sent (no password)</label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="scribe@example.com"
            required
          />
          <div className={styles.actions}>
            <button type="submit" disabled={busy || !email.trim()}>
              Send sign-in link
            </button>
          </div>
          {sent && (
            <p className={styles.sent}>
              Sent. Open the link from this device to complete sign-in; your
              local Treasury will sync to the account on first sign-in.
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}

      {configured && checked && session && (
        <div className={styles.panel}>
          <p className={styles.statusLine}>
            Signed in as <strong>{session.email}</strong>
          </p>
          <p className={styles.statusLine}>
            Last synced: <strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "never"}</strong>
            {" · "}
            Awaiting push: <strong>{pending}</strong>
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={handleSyncNow} disabled={busy}>
              Sync now
            </button>
            <button type="button" onClick={handleSignOut} disabled={busy}>
              Sign out
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}
