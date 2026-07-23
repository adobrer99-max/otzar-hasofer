import { useEffect, useState } from "react";
import { PageHeader, SegmentedControl, ConfirmButton } from "../components/ui";
import { toast } from "../components/ui/toast";
import { isCloudConfigured } from "./config";
import { syncNow } from "./orchestrator";
import { getPendingCount, createIdbAdapter } from "./sync";
import {
  validateNewPassword,
  mapAuthError,
  isAlreadyRegistered,
  MIN_PASSWORD_LENGTH,
} from "./authHelpers";
import styles from "./account.module.css";

interface SessionInfo {
  email: string;
}

type SignInMode = "password" | "link";

/** Set by the orchestrator when a password-recovery link lands mid-app.
 *  Kept as a local literal (not exported) so the lazy route's module stays a
 *  pure component record; the orchestrator writes the same key. */
const RECOVERY_FLAG = "otz-recovery";

/**
 * "The Scribe's Seal" — the account page. States: this deployment has no
 * cloud configured (calm explainer); signed out (password sign-in / sign-up,
 * or the email magic link); recovering (set a new password from a reset
 * link); signed in (sync status + controls + change password). The local
 * Treasury always remains primary and offline-capable — signing in adds
 * private sync, nothing more.
 */
export function AccountPage() {
  const configured = isCloudConfigured();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<SignInMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [showResend, setShowResend] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
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
    // A recovery link may have redirected here before this page mounted.
    if (sessionStorage.getItem(RECOVERY_FLAG)) {
      sessionStorage.removeItem(RECOVERY_FLAG);
      setRecovery(true);
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
        } = supabase.auth.onAuthStateChange((event, s2) => {
          setSession(s2?.user?.email ? { email: s2.user.email } : null);
          if (event === "PASSWORD_RECOVERY") setRecovery(true);
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

  function resetMessages() {
    setError(undefined);
    setNotice(undefined);
    setShowResend(false);
  }

  async function withBusy(fn: () => Promise<void>) {
    resetMessages();
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    await withBusy(async () => {
      const { getSupabase } = await import("./supabaseClient");
      const { error: err } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        if (/not confirmed/i.test(err.message)) setShowResend(true);
        throw new Error(err.message);
      }
      setPassword("");
    });
  }

  async function handleSignUp() {
    await withBusy(async () => {
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password should be at least ${MIN_PASSWORD_LENGTH} characters`);
      }
      const { getSupabase } = await import("./supabaseClient");
      const { data, error: err } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw new Error(err.message);
      if (isAlreadyRegistered(data.user)) {
        throw new Error("User already registered");
      }
      setNotice(
        "Account created. A verification email is on its way — open its link to confirm the account, then sign in here.",
      );
      setPassword("");
    });
  }

  async function handleForgot() {
    await withBusy(async () => {
      if (!email.trim()) {
        throw new Error("Enter the account's email first, then choose “Forgot password”.");
      }
      const { getSupabase } = await import("./supabaseClient");
      const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (err) throw new Error(err.message);
      setNotice("A password-reset email is on its way — open its link on this device to set a new password.");
    });
  }

  async function handleResend() {
    await withBusy(async () => {
      const { getSupabase } = await import("./supabaseClient");
      const { error: err } = await getSupabase().auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw new Error(err.message);
      setNotice("Verification email resent.");
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    await withBusy(async () => {
      const { getSupabase } = await import("./supabaseClient");
      const { error: err } = await getSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw new Error(err.message);
      setNotice(
        "Sent. Open the link from this device to complete sign-in; your local Treasury will sync to the account on first sign-in.",
      );
    });
  }

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateNewPassword(newPw, newPw2);
    if (invalid) {
      setError(invalid);
      return;
    }
    await withBusy(async () => {
      const { getSupabase } = await import("./supabaseClient");
      const { error: err } = await getSupabase().auth.updateUser({ password: newPw });
      if (err) throw new Error(err.message);
      setNewPw("");
      setNewPw2("");
      setRecovery(false);
      setPwOpen(false);
      toast("Password updated", { tone: "success" });
    });
  }

  async function handleSignOut() {
    const { getSupabase } = await import("./supabaseClient");
    await getSupabase().auth.signOut();
    setSession(null);
  }

  async function handleDeleteAccount() {
    await withBusy(async () => {
      const { getSupabase } = await import("./supabaseClient");
      const supabase = getSupabase();
      const { error: err } = await supabase.rpc("delete_my_account");
      if (err) throw new Error(err.message);
      // Reset this device's sync bookkeeping so a future account link runs a
      // fresh initial full push rather than assuming one already happened.
      const adapter = createIdbAdapter();
      await adapter.setState("initialPushDone", false);
      await adapter.setState("lastPullAt", undefined);
      await adapter.setState("lastSyncAt", undefined);
      await supabase.auth.signOut();
      setSession(null);
      toast("Account removed — your Treasury remains on this device", { tone: "success" });
    });
  }

  async function handleSyncNow() {
    setBusy(true);
    resetMessages();
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

  const newPasswordFields = (
    <>
      <label htmlFor="account-new-pw">New password ({MIN_PASSWORD_LENGTH}+ characters)</label>
      <input
        id="account-new-pw"
        type="password"
        value={newPw}
        onChange={(e) => setNewPw(e.target.value)}
        autoComplete="new-password"
        required
      />
      <label htmlFor="account-new-pw2">Repeat the new password</label>
      <input
        id="account-new-pw2"
        type="password"
        value={newPw2}
        onChange={(e) => setNewPw2(e.target.value)}
        autoComplete="new-password"
        required
      />
    </>
  );

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

      {configured && checked && recovery && (
        <form className={styles.panel} onSubmit={handleSetNewPassword}>
          <p className={styles.statusLine}>
            <strong>Set a new password</strong> — the reset link has verified you.
          </p>
          {newPasswordFields}
          <div className={styles.actions}>
            <button type="submit" disabled={busy}>
              Set the new password
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}

      {configured && checked && !session && !recovery && (
        <div className={styles.panel}>
          <SegmentedControl<SignInMode>
            value={mode}
            onChange={(m) => {
              setMode(m);
              resetMessages();
            }}
            ariaLabel="Sign-in method"
            options={[
              { value: "password", label: "Password" },
              { value: "link", label: "Email link" },
            ]}
          />

          {mode === "password" ? (
            <form className={styles.innerForm} onSubmit={handlePasswordSignIn}>
              <label htmlFor="account-email">Email</label>
              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scribe@example.com"
                autoComplete="email"
                required
              />
              <label htmlFor="account-password">Password</label>
              <input
                id="account-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <div className={styles.actions}>
                <button type="submit" disabled={busy || !email.trim() || !password}>
                  Sign in
                </button>
                <button type="button" onClick={handleSignUp} disabled={busy || !email.trim() || !password}>
                  Create an account
                </button>
              </div>
              <button type="button" className={styles.quietBtn} onClick={handleForgot} disabled={busy}>
                Forgot password?
              </button>
              {showResend && (
                <button type="button" className={styles.quietBtn} onClick={handleResend} disabled={busy}>
                  Resend the verification email
                </button>
              )}
              <p className={styles.statusLine}>
                Creating an account sends a verification email — the account
                signs in once its link is opened.
              </p>
            </form>
          ) : (
            <form className={styles.innerForm} onSubmit={handleMagicLink}>
              <label htmlFor="account-email">Email — a sign-in link will be sent (no password)</label>
              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scribe@example.com"
                autoComplete="email"
                required
              />
              <div className={styles.actions}>
                <button type="submit" disabled={busy || !email.trim()}>
                  Send sign-in link
                </button>
              </div>
            </form>
          )}

          {notice && <p className={styles.sent}>{notice}</p>}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {configured && checked && session && !recovery && (
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
          <details
            className={styles.disclosure}
            open={pwOpen}
            onToggle={(e) => setPwOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>Change password</summary>
            <form className={styles.innerForm} onSubmit={handleSetNewPassword}>
              {newPasswordFields}
              <div className={styles.actions}>
                <button type="submit" disabled={busy}>
                  Update the password
                </button>
              </div>
            </form>
          </details>
          <details className={`${styles.disclosure} ${styles.danger}`}>
            <summary>Remove the account</summary>
            <p className={styles.statusLine}>
              This deletes the account and every row it owns in the Scribes'
              Cloud — participants, readings, drafts, shares. It cannot be
              undone. <strong>The local Treasury on this device remains</strong>{" "}
              — the app keeps working fully offline, exactly as before.
            </p>
            <ConfirmButton
              onConfirm={() => void handleDeleteAccount()}
              confirmLabel="Delete forever"
              ariaLabel="Confirm deleting the account and its cloud data"
            >
              Delete the account and its cloud data
            </ConfirmButton>
          </details>
          {notice && <p className={styles.sent}>{notice}</p>}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}
