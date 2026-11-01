import { useEffect, useId, useState } from "react";
import { Button, ConfirmButton } from "../../components/ui";
import { toast } from "../../components/ui/toast";
import { useOnline } from "../../components/useOnline";
import type { ParticipantRecord, HeraldLayer, HeraldStyle } from "../../types/herald";
import type { ShareInfo } from "../../cloud/shares";
import { copyText } from "../export/blazon";
import { buildSharePayload } from "./sharePayload";
import { EXPIRY_PRESETS, expiryFromPreset, expiryLabel, isExpired, viewsLabel, type ExpiryPreset } from "./expiry";
import { ShareQr } from "./ShareQr";
import styles from "./share.module.css";

/** A cloud error, in words the Scribe can act on. */
function shareErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : "";
  if (/expires_at|view_count|last_viewed_at/.test(message)) {
    return "Link expiry needs the share-links update in supabase/schema.sql — see DEPLOY.md.";
  }
  return message || fallback;
}

function fileStem(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "herald";
}

/**
 * The Scribe's share controls — publish a participant's Herald as a public,
 * read-only link. Snapshot semantics: the link shows the Herald as it was
 * when published; republish after new readings to refresh it. A link can be
 * set to expire, shows when it was last opened, can be reset to a new token,
 * and can be handed over as a QR code. Rendered only when the cloud is
 * configured; publishing requires a signed-in Scribe.
 */
export function SharePanel({
  participant,
  layers,
  style,
}: {
  participant: ParticipantRecord;
  layers: HeraldLayer[];
  style?: HeraldStyle;
}) {
  const [signedIn, setSignedIn] = useState<boolean>();
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preset, setPreset] = useState<ExpiryPreset>("never");
  const [qrOpen, setQrOpen] = useState(false);
  const online = useOnline();
  const expiryId = useId();
  const qrId = useId();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getSupabase } = await import("../../cloud/supabaseClient");
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (!cancelled) setSignedIn(Boolean(session));
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setShare(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setQrOpen(false);
    void (async () => {
      try {
        const { getShare } = await import("../../cloud/shares");
        const info = await getShare(participant.id);
        if (!cancelled) setShare(info);
      } catch {
        // Not "unpublished" — we simply couldn't ask. Publishing now could
        // mint a second token, so hold the actions until a retry succeeds.
        if (!cancelled) {
          setShare(null);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [participant.id, signedIn, attempt]);

  function shareUrl(token: string): string {
    return `${location.origin}${location.pathname}#/shared/${token}`;
  }

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast(shareErrorMessage(err, fallback), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function handlePublish() {
    void run(async () => {
      const { publishShare } = await import("../../cloud/shares");
      const payload = buildSharePayload(participant, layers, style);
      // A first publish carries the chosen expiry; a republish keeps the
      // link's own (only written when set, so a pre-expiry database works).
      const expiresAt = share || preset === "never" ? undefined : expiryFromPreset(preset);
      const info = await publishShare(participant.id, payload, expiresAt);
      toast(share ? "Share republished" : "Share link published", { tone: "success" });
      setShare(info);
    }, "Publishing failed");
  }

  function handleExpiry(next: ExpiryPreset) {
    void run(async () => {
      const { setShareExpiry } = await import("../../cloud/shares");
      const info = await setShareExpiry(participant.id, expiryFromPreset(next));
      setShare(info);
      toast(
        next === "never" ? "The link no longer expires" : `Expiry updated · ${expiryLabel(info.expiresAt)}`,
        { tone: "success" },
      );
    }, "Changing the expiry failed");
  }

  async function handleCopy() {
    if (!share) return;
    const ok = await copyText(shareUrl(share.token));
    toast(ok ? "Share link copied" : "Clipboard unavailable — copy it from the address below", {
      tone: ok ? "success" : "error",
    });
  }

  function handleReset() {
    if (!share) return;
    const keepExpiry = share.expiresAt;
    void run(async () => {
      const { rotateShare } = await import("../../cloud/shares");
      const info = await rotateShare(participant.id, buildSharePayload(participant, layers, style), keepExpiry);
      setShare(info);
      toast("Link reset — the old link is dark; share the new one", { tone: "success" });
    }, "Resetting the link failed");
  }

  function handleRevoke() {
    void run(async () => {
      const { revokeShare } = await import("../../cloud/shares");
      await revokeShare(participant.id);
      setShare(null);
      setQrOpen(false);
      toast("Share revoked — the link is dark");
    }, "Revoking failed");
  }

  const expired = share ? isExpired(share.expiresAt) : false;
  const locked = busy || !online;

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Share with the participant</h3>
      {signedIn === false ? (
        <p className={styles.note}>
          Sign in on the <a href="#/account">Account page</a> to publish a
          read-only link to this Herald.
        </p>
      ) : loading || signedIn === undefined ? (
        <p className={styles.note}>Checking the share…</p>
      ) : loadFailed ? (
        <div role="alert" className={styles.note}>
          <p>
            {online
              ? "Couldn't check this Herald's share link."
              : "You're offline, so this Herald's share link can't be checked."}
          </p>
          <Button variant="subtle" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <p className={styles.note}>
            A published link shows the Herald <em>as it was when published</em> —
            never the readings themselves, and never the Sod. Republish after
            new readings. Anyone holding the link can view it.
          </p>

          {share && (
            <>
              <p className={`${styles.linkLine} ${expired ? styles.linkExpired : ""}`}>
                <code className={styles.link}>{shareUrl(share.token)}</code>
              </p>
              <p className={styles.meta}>
                Published{" "}
                {new Date(share.updatedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {!share.legacy && (
                  <>
                    {" · "}
                    {expiryLabel(share.expiresAt)}
                    {" · "}
                    {viewsLabel(share.viewCount, share.lastViewedAt)}
                  </>
                )}
              </p>
              {expired && (
                <p className={styles.warn} role="status">
                  This link has expired and no longer opens. Choose a new expiry to relight it.
                </p>
              )}
              {share.legacy && (
                <p className={styles.note}>
                  Expiry and open counts arrive once the share-links update in{" "}
                  <code>supabase/schema.sql</code> is run (see DEPLOY.md).
                </p>
              )}
            </>
          )}

          {(!share || !share.legacy) && (
            <div className={styles.field}>
              <label htmlFor={expiryId}>{share ? "Change when the link expires" : "The link expires"}</label>
              {share ? (
                <select
                  id={expiryId}
                  value=""
                  disabled={locked}
                  onChange={(e) => {
                    if (e.target.value) handleExpiry(e.target.value as ExpiryPreset);
                  }}
                >
                  <option value="">Choose…</option>
                  {EXPIRY_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id={expiryId}
                  value={preset}
                  disabled={locked}
                  onChange={(e) => setPreset(e.target.value as ExpiryPreset)}
                >
                  {EXPIRY_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!online && (
            <p className={styles.note} role="status">
              You're offline — publishing, resetting and revoking wait for a connection.
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="primary" onClick={handlePublish} disabled={locked}>
              {share ? "Republish" : "Publish the link"}
            </Button>
            {share && (
              <>
                <Button variant="subtle" onClick={handleCopy} disabled={busy}>
                  Copy link
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => setQrOpen((v) => !v)}
                  aria-expanded={qrOpen}
                  aria-controls={qrId}
                >
                  {qrOpen ? "Hide the QR code" : "Show a QR code"}
                </Button>
                <ConfirmButton
                  onConfirm={handleReset}
                  ariaLabel="Confirm resetting the share link"
                  disabled={locked}
                >
                  Reset link
                </ConfirmButton>
                <ConfirmButton
                  onConfirm={handleRevoke}
                  ariaLabel="Confirm revoking the share link"
                  disabled={locked}
                >
                  Revoke
                </ConfirmButton>
              </>
            )}
          </div>
          {share && qrOpen && (
            <div id={qrId}>
              <ShareQr url={shareUrl(share.token)} fileStem={fileStem(participant.displayName)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
