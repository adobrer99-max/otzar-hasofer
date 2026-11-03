import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { HeraldLayer, ParticipantRecord } from "../../types/herald";
import { listParticipants, getLayers } from "../../storage/participantsRepo";
import { buildSharePayload } from "../share/sharePayload";
import { SharedHeraldView } from "../share/SharedHeraldView";
import { exportHeraldPng } from "../export/exportPng";
import { toast } from "../../components/ui/toast";
import styles from "./keepsake.module.css";

type Loaded =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; participant: ParticipantRecord; layers: HeraldLayer[] };

function fileStem(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "herald";
}

/**
 * A keepsake for the participant: their Herald with name, status and (once
 * revealed) epithet, to print or send as an image — the way to give someone
 * their Herald when there is no cloud for a share link. It is built only from
 * buildSharePayload, the same veil-free snapshot a share link publishes, so
 * it never carries the readings, reflections, palm notes or the Sod.
 */
export function KeepsakePage() {
  const { participantId } = useParams<{ participantId: string }>();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const participant = (await listParticipants()).find((p) => p.id === participantId);
      if (!participant) {
        if (!cancelled) setLoaded({ kind: "missing" });
        return;
      }
      const layers = await getLayers(participant.id);
      if (!cancelled) setLoaded({ kind: "ready", participant, layers });
    })();
    return () => {
      cancelled = true;
    };
  }, [participantId]);

  const payload = useMemo(
    () =>
      loaded.kind === "ready" && loaded.layers.length > 0
        ? buildSharePayload(loaded.participant, loaded.layers, loaded.participant.heraldStyle)
        : null,
    [loaded],
  );

  const name = loaded.kind === "ready" ? loaded.participant.displayName : undefined;
  useEffect(() => {
    if (!name) return;
    const previous = document.title;
    document.title = `${name} — the Herald`;
    return () => {
      document.title = previous;
    };
  }, [name]);

  async function downloadImage() {
    if (!svgRef.current || !name) return;
    try {
      await exportHeraldPng(svgRef.current, `${fileStem(name)}-herald.png`);
    } catch {
      toast("The image couldn't be made — print or save as PDF instead", { tone: "error" });
    }
  }

  if (loaded.kind === "loading") {
    return (
      <main id="main" className={styles.shell}>
        <p className={styles.status}>Preparing the keepsake…</p>
      </main>
    );
  }
  if (loaded.kind === "missing") {
    return (
      <main id="main" className={styles.shell}>
        <p className={styles.status}>
          No participant here. <a href="#/herald">Return to the Herald</a>
        </p>
      </main>
    );
  }

  return (
    <main id="main" className={styles.shell}>
      <div className={styles.toolbar}>
        <a href={`#/herald?participant=${loaded.participant.id}`}>← Back to the Herald</a>
        {payload && (
          <span className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => window.print()}>
              Print / Save as PDF
            </button>
            <button type="button" className={styles.secondary} onClick={() => void downloadImage()}>
              Download as an image (PNG)
            </button>
          </span>
        )}
      </div>
      <p className={styles.hint}>
        Only the Herald itself, its name and status are on the keepsake — never the readings, the
        reflections, or the Sod.
      </p>

      <article className={styles.sheet}>
        <p className={styles.kicker}>Otzar HaSofer · The Herald</p>
        {payload ? (
          <>
            <SharedHeraldView payload={payload} dateLabel="Given" svgRef={svgRef} />
            <p className={styles.note}>
              A Herald forms across the first seven readings — the unfolding order of Creation — and is
              revealed at the seventh. It is never overwritten; each reading is kept within it.
            </p>
          </>
        ) : (
          <p className={styles.note}>
            {loaded.participant.displayName} has no readings yet — the Herald appears with the first.
          </p>
        )}
      </article>
    </main>
  );
}
