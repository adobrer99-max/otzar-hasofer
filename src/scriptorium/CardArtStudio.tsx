import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout, ConfirmButton } from "../components/ui";
import { toast } from "../components/ui/toast";
import { letters } from "../data/letters";
import { dorotHouses, dorotCards } from "../data/dorot";
import { isCloudConfigured } from "../cloud/config";
import { fetchCardArtRows, uploadCardArt, removeCardArt, type CardArtRow } from "../cloud/cardArt";
import { applyCardArt, clearCardArt, writeCardArtCache } from "../cloud/applyCardArt";
import styles from "./scriptorium.module.css";

interface ArtEntry {
  id: string; // "letter:aleph" | "dorot:sarah-3"
  label: string;
  sublabel?: string;
  defaultAlt: string;
}

interface ArtGroup {
  title: string;
  entries: ArtEntry[];
}

/** All 190 art slots — the 22 letters, then the Dorot cards by House. */
function buildGroups(): ArtGroup[] {
  const groups: ArtGroup[] = [
    {
      title: "The Twenty-Two Letters",
      entries: letters.map((l) => ({
        id: `letter:${l.id}`,
        label: `${l.glyph} ${l.name}`,
        sublabel: l.keyword,
        defaultAlt: `${l.name} — ${l.keyword}`,
      })),
    },
  ];
  for (const house of dorotHouses) {
    const cards = dorotCards.filter((c) => c.houseId === house.id);
    groups.push({
      title: house.houseName ? `${house.houseName} — ${house.figure}` : `House of ${house.figure}`,
      entries: cards.map((c) => ({
        id: `dorot:${c.id}`,
        label: c.title,
        defaultAlt: `${c.title} — House of ${house.figure}`,
      })),
    });
  }
  return groups;
}

/**
 * The Card Art studio — upload the designer's finished scans. Unlike the text
 * datasets (local drafts, published by export+deploy), art publishes to the
 * Scribes' Cloud instantly: the file lands in the public card-art bucket, the
 * registry row is upserted, and every visitor sees it on their next load.
 */
export function CardArtStudio() {
  const configured = isCloudConfigured();
  const groups = useMemo(buildGroups, []);
  const [rows, setRows] = useState<Map<string, CardArtRow>>(new Map());
  const [signedIn, setSignedIn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(groups[0].entries[0].id);
  const [alt, setAlt] = useState("");
  const [credit, setCredit] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => groups.flatMap((g) => g.entries).find((e) => e.id === selectedId),
    [groups, selectedId],
  );
  const currentRow = rows.get(selectedId);

  useEffect(() => {
    if (!configured) {
      setChecked(true);
      return;
    }
    let unsub: (() => void) | undefined;
    // Auth first — it reads the local session, so the signed-in/out state
    // never waits on the network. The registry fetch fills thumbnails after.
    void (async () => {
      try {
        const { getSupabase } = await import("../cloud/supabaseClient");
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSignedIn(Boolean(session));
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
        unsub = () => subscription.unsubscribe();
      } catch {
        // cloud unreachable — stays signed-out
      }
      setChecked(true);
    })();
    void fetchCardArtRows()
      .then((fetched) => setRows(new Map(fetched.map((r) => [r.id, r]))))
      .catch(() => {
        // offline — the registry list just shows no thumbnails
      });
    return () => unsub?.();
  }, [configured]);

  // Hydrate the editor fields when the selection (or loaded registry) changes.
  useEffect(() => {
    if (!selected) return;
    const row = rows.get(selected.id);
    setAlt(row?.alt ?? selected.defaultAlt);
    setCredit(row?.credit ?? "");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [selected, rows]);

  function syncCache(next: Map<string, CardArtRow>) {
    writeCardArtCache([...next.values()]);
  }

  async function handleUpload() {
    if (!selected || !file || !alt.trim()) return;
    setBusy(true);
    try {
      const row = await uploadCardArt(selected.id, file, alt.trim(), credit.trim() || undefined, currentRow?.src);
      const next = new Map(rows);
      next.set(row.id, row);
      setRows(next);
      applyCardArt([row]); // live in this session immediately
      syncCache(next);
      toast("Art published — live for every visitor", { tone: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!selected || !currentRow) return;
    setBusy(true);
    try {
      await removeCardArt(selected.id, currentRow.src);
      const next = new Map(rows);
      next.delete(selected.id);
      setRows(next);
      clearCardArt(selected.id);
      syncCache(next);
      toast("Art removed");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Remove failed", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <Callout>
        Card art publishes through the Scribes' Cloud, and this deployment has
        none configured. Set up the Supabase project (see <code>DEPLOY.md</code>)
        to enable uploads — the shipped app renders without art until then.
      </Callout>
    );
  }

  return (
    <div>
      <p className={styles.muted}>
        Upload the designer's finished card art. Unlike the text drafts, art
        publishes <strong>instantly to every visitor</strong> — the image lands
        in the public bucket and the registry row goes live; no redeploy.
      </p>

      {checked && !signedIn && (
        <Callout>
          Uploading requires a signed-in Scribe.{" "}
          <a href="#/account">Sign in on the Account page</a> and return here —
          browsing the slots below works either way.
        </Callout>
      )}

      <div className={styles.workspace}>
        <div className={styles.entryList}>
          {groups.map((group) => (
            <div key={group.title}>
              <div className={styles.artGroupTitle}>{group.title}</div>
              {group.entries.map((e) => {
                const has = rows.has(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`${styles.entryButton} ${e.id === selectedId ? styles.entryButtonActive : ""}`}
                    onClick={() => setSelectedId(e.id)}
                  >
                    <span className={styles.entryButtonLabel}>
                      <span>{e.label}</span>
                      <span className={`${styles.status} ${has ? styles.statusDrafted : styles.statusGap}`}>
                        {has ? "art" : "empty"}
                      </span>
                    </span>
                    {e.sublabel && <span className={styles.entrySub}>{e.sublabel}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.editorPane}>
          {selected && (
            <div className={styles.artEditor}>
              <h3 className={styles.artEditorTitle}>{selected.label}</h3>

              {currentRow ? (
                <figure className={styles.artFigure}>
                  <img src={currentRow.src} alt={currentRow.alt} className={styles.artImage} />
                  {currentRow.credit && <figcaption className={styles.muted}>{currentRow.credit}</figcaption>}
                </figure>
              ) : (
                <p className={styles.muted}>No art uploaded for this card yet.</p>
              )}

              <label htmlFor="card-art-file">Image file (downscaled to 1600px on upload)</label>
              <input
                id="card-art-file"
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={!signedIn || busy}
              />

              <label htmlFor="card-art-alt">Alt text (required — read to assistive tech)</label>
              <input
                id="card-art-alt"
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                disabled={!signedIn || busy}
              />

              <label htmlFor="card-art-credit">Credit (optional — the illustrator's name)</label>
              <input
                id="card-art-credit"
                type="text"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="Illustrated by …"
                disabled={!signedIn || busy}
              />

              <div className={styles.artActions}>
                <Button variant="primary" onClick={handleUpload} disabled={!signedIn || busy || !file || !alt.trim()}>
                  {currentRow ? "Replace the art" : "Upload & publish"}
                </Button>
                {currentRow && (
                  <ConfirmButton onConfirm={handleRemove} ariaLabel="Remove this card's art">
                    Remove
                  </ConfirmButton>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
