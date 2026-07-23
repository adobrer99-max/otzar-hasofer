import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, EmptyState } from "../../components/ui";
import { isCloudConfigured } from "../../cloud/config";
import { HeraldCanvas } from "../render/HeraldCanvas";
import type { SharedHeraldPayload } from "./sharePayload";
import styles from "./share.module.css";

type PageState =
  | { kind: "unconfigured" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "found"; payload: SharedHeraldPayload };

/**
 * The participant-facing shared Herald — a public, read-only page reached
 * only by its tokenized URL (no nav link). Renders the published snapshot:
 * the derived, veil-free Herald with name, status, and epithet. Invalid,
 * revoked, and garbage tokens all collapse into one indistinguishable
 * "no longer lit" state.
 */
export function SharedHeraldPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>(
    isCloudConfigured() ? { kind: "loading" } : { kind: "unconfigured" },
  );

  useEffect(() => {
    if (!isCloudConfigured() || !token) return;
    let cancelled = false;
    void (async () => {
      const { fetchSharedHerald } = await import("../../cloud/shares");
      const payload = await fetchSharedHerald(token);
      if (cancelled) return;
      // A minimal shape guard — anything malformed reads as missing.
      if (payload?.heraldForm?.charges?.length === 3 && payload.displayName) {
        setState({ kind: "found", payload });
      } else {
        setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === "unconfigured") {
    return (
      <div className="page">
        <PageHeader kicker="A shared Herald" title="The Herald" />
        <EmptyState
          title="This deployment has no cloud configured"
          description="Share links live in the Scribes' Cloud, so they cannot be opened here."
        />
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="page">
        <PageHeader kicker="A shared Herald" title="The Herald" />
        <p className={styles.sharedCaption}>Unsealing…</p>
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="page">
        <PageHeader kicker="A shared Herald" title="The Herald" />
        <EmptyState
          title="This link is no longer lit"
          description="The Herald it pointed to has been withdrawn, or the link is not one the Treasury knows."
        />
      </div>
    );
  }

  const { payload } = state;
  return (
    <div className="page">
      <PageHeader kicker="A shared Herald" title={payload.displayName} />
      <div className={styles.sharedCanvas}>
        <HeraldCanvas
          form={payload.heraldForm}
          displayName={payload.displayName}
          hebrewName={payload.hebrewName}
          path={payload.path}
          status={payload.status}
          epithet={payload.epithet}
          style={payload.style}
        />
      </div>
      <div className={styles.sharedCaption}>
        <p>
          <strong>{payload.displayName}</strong>
          {payload.hebrewName && (
            <>
              {" · "}
              <span lang="he">{payload.hebrewName}</span>
            </>
          )}
        </p>
        <p>{payload.status}</p>
        {payload.epithet && <p className={styles.sharedEpithet}>“{payload.epithet}”</p>}
        <p>
          Published{" "}
          {new Date(payload.publishedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
