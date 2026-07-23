import { useEffect, useState } from "react";
import { Button, ConfirmButton } from "../../components/ui";
import { toast } from "../../components/ui/toast";
import type { ParticipantRecord, HeraldLayer, HeraldStyle } from "../../types/herald";
import { copyText } from "../export/blazon";
import { buildSharePayload } from "./sharePayload";
import styles from "./share.module.css";

/**
 * The Scribe's share controls — publish a participant's Herald as a public,
 * read-only link. Snapshot semantics: the link shows the Herald as it was
 * when published; republish after new readings to refresh it. Rendered only
 * when the cloud is configured; publishing requires a signed-in Scribe.
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
  const [share, setShare] = useState<{ token: string; updatedAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
    void (async () => {
      try {
        const { getShare } = await import("../../cloud/shares");
        const info = await getShare(participant.id);
        if (!cancelled) setShare(info);
      } catch {
        if (!cancelled) setShare(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [participant.id, signedIn]);

  function shareUrl(token: string): string {
    return `${location.origin}${location.pathname}#/shared/${token}`;
  }

  async function handlePublish() {
    setBusy(true);
    try {
      const { publishShare } = await import("../../cloud/shares");
      const payload = buildSharePayload(participant, layers, style);
      const token = await publishShare(participant.id, payload);
      setShare({ token, updatedAt: payload.publishedAt });
      toast(share ? "Share republished" : "Share link published", { tone: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Publishing failed", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!share) return;
    const ok = await copyText(shareUrl(share.token));
    toast(ok ? "Share link copied" : "Clipboard unavailable — copy it from the address below", {
      tone: ok ? "success" : "error",
    });
  }

  async function handleRevoke() {
    setBusy(true);
    try {
      const { revokeShare } = await import("../../cloud/shares");
      await revokeShare(participant.id);
      setShare(null);
      toast("Share revoked — the link is dark");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Revoking failed", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

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
      ) : (
        <>
          <p className={styles.note}>
            A published link shows the Herald <em>as it was when published</em> —
            never the readings themselves, and never the Sod. Republish after
            new readings. Anyone holding the link can view it.
          </p>
          {share && (
            <p className={styles.linkLine}>
              <code className={styles.link}>{shareUrl(share.token)}</code>
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="primary" onClick={handlePublish} disabled={busy}>
              {share ? "Republish" : "Publish the link"}
            </Button>
            {share && (
              <>
                <Button variant="subtle" onClick={handleCopy} disabled={busy}>
                  Copy link
                </Button>
                <ConfirmButton onConfirm={() => void handleRevoke()} ariaLabel="Confirm revoking the share link">
                  Revoke
                </ConfirmButton>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
