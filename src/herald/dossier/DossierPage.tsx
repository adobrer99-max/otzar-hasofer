import { useEffect, useId, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { HeraldLayer, ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import { listParticipants, getLayers } from "../../storage/participantsRepo";
import { listLifeCycleEvents } from "../../storage/lifeCycleRepo";
import { deriveHeraldForm } from "../synthesis/deriveHeraldForm";
import { synthesisStatusText } from "../share/sharePayload";
import { HeraldCanvas } from "../render/HeraldCanvas";
import { blazonForForm, blazonToText } from "../export/blazon";
import { buildDossier, PRIVATE_DEFAULTS, type DossierLetter, type DossierOptions } from "./buildDossier";
import styles from "./dossier.module.css";

type Loaded =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; participant: ParticipantRecord; layers: HeraldLayer[]; events: LifeCycleEvent[] };

const PRIVATE_PARTS: { key: keyof DossierOptions; label: string }[] = [
  { key: "includeSod", label: "The Sod — each reading's veiled letter" },
  { key: "includeReflections", label: "Reflections" },
  { key: "includePalmNotes", label: "Palm baseline notes" },
  { key: "includeEventNotes", label: "Notes on life-cycle events" },
];

function Letter({ letter }: { letter: DossierLetter }) {
  return (
    <li>
      <span className={styles.glyph} lang="he">
        {letter.glyph}
      </span>{" "}
      <strong>{letter.name}</strong> — {letter.keyword}
      {letter.reversed && <em> (reversed — inward)</em>}
    </li>
  );
}

/**
 * A participant's whole history as one printable document — the Herald, its
 * blazon, every reading and the life-cycle record — for the Scribe's own
 * files ("Save as PDF" from the print dialog). It stands outside the app
 * frame so it prints clean. Private parts are opt-in, one by one.
 */
export function DossierPage() {
  const { participantId } = useParams<{ participantId: string }>();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [options, setOptions] = useState<DossierOptions>(PRIVATE_DEFAULTS);
  const optionsId = useId();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const participant = (await listParticipants()).find((p) => p.id === participantId);
      if (!participant) {
        if (!cancelled) setLoaded({ kind: "missing" });
        return;
      }
      const [layers, events] = await Promise.all([getLayers(participant.id), listLifeCycleEvents(participant.id)]);
      if (!cancelled) setLoaded({ kind: "ready", participant, layers, events });
    })();
    return () => {
      cancelled = true;
    };
  }, [participantId]);

  // The document title becomes the PDF's suggested file name.
  const name = loaded.kind === "ready" ? loaded.participant.displayName : undefined;
  useEffect(() => {
    if (!name) return;
    const previous = document.title;
    document.title = `${name} — the Scribe's record`;
    return () => {
      document.title = previous;
    };
  }, [name]);

  const dossier = useMemo(
    () => (loaded.kind === "ready" ? buildDossier(loaded.participant, loaded.layers, loaded.events, options) : null),
    [loaded, options],
  );

  if (loaded.kind === "loading") {
    return (
      <main id="main" className={styles.shell}>
        <p className={styles.status}>Gathering the record…</p>
      </main>
    );
  }
  if (loaded.kind === "missing" || !dossier) {
    return (
      <main id="main" className={styles.shell}>
        <p className={styles.status}>
          No participant here. <a href="#/herald">Return to the Herald</a>
        </p>
      </main>
    );
  }

  const { participant, layers } = loaded;
  const form = layers.length ? deriveHeraldForm(layers) : undefined;
  const epithet = form?.revealed ? participant.heraldicEpithet?.text : undefined;
  // The prose blazon only — the machine-readable JSON appendix is for the
  // download, not the page.
  const blazon = form
    ? blazonToText(blazonForForm(form, participant.heraldStyle, epithet), participant.displayName)
        .split("--- blazon.json ---")[0]
        .trim()
    : "";
  const first = dossier.readings[0];
  const last = dossier.readings[dossier.readings.length - 1];

  return (
    <main id="main" className={styles.shell}>
      <div className={styles.toolbar}>
        <a href={`#/herald?participant=${participant.id}`}>← Back to the Herald</a>
        <fieldset className={styles.options} aria-describedby={`${optionsId}-hint`}>
          <legend>Include the private parts</legend>
          <p id={`${optionsId}-hint`} className={styles.hint}>
            Off by default — this record leaves the device as paper or a PDF.
          </p>
          {PRIVATE_PARTS.map((part) => (
            <label key={part.key}>
              <input
                type="checkbox"
                checked={options[part.key]}
                onChange={(e) => setOptions((o) => ({ ...o, [part.key]: e.target.checked }))}
              />
              {part.label}
            </label>
          ))}
        </fieldset>
        <button type="button" className={styles.printButton} onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <article className={styles.paper}>
        <header className={styles.header}>
          <p className={styles.kicker}>Otzar HaSofer · The Scribe's record</p>
          <h1>{dossier.name}</h1>
          {dossier.hebrewName && (
            <p className={styles.hebrewName} lang="he" dir="rtl">
              {dossier.hebrewName}
            </p>
          )}
          <dl className={styles.facts}>
            <dt>Path</dt>
            <dd>{dossier.path}</dd>
            {dossier.birthday && (
              <>
                <dt>Hebrew birthday</dt>
                <dd>{dossier.birthday}</dd>
              </>
            )}
            <dt>Readings</dt>
            <dd>
              {dossier.readings.length === 0
                ? "None yet"
                : `${dossier.readings.length} — ${first.civilDate}${dossier.readings.length > 1 ? ` to ${last.civilDate}` : ""}`}
            </dd>
            {epithet && (
              <>
                <dt>Epithet</dt>
                <dd>“{epithet}”</dd>
              </>
            )}
          </dl>
          <p className={styles.private}>
            Prepared {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
            Private — for the Scribe's own records.
          </p>
        </header>

        {form && (
          <section className={styles.heraldSection}>
            <h2>The Herald</h2>
            <div className={styles.herald}>
              <HeraldCanvas
                form={form}
                displayName={participant.displayName}
                hebrewName={participant.hebrewName}
                path={participant.path}
                status={synthesisStatusText(form)}
                epithet={epithet}
                style={participant.heraldStyle}
              />
            </div>
            <p className={styles.blazon}>{blazon}</p>
          </section>
        )}

        {dossier.readings.length > 0 && (
          <section>
            <h2>The readings</h2>
            {dossier.readings.map((r) => (
              <section key={r.key} className={styles.reading} aria-label={r.title}>
                <h3>
                  {r.title} <span className={styles.date}>— {r.civilDate}</span>
                </h3>
                <p className={styles.meta}>
                  {[r.hebrewDate, ...r.occasion, r.spread, r.middah && `Middah: ${r.middah}`, r.geography]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <ul className={styles.letters}>
                  {r.letters.map((l, i) => (
                    <Letter key={i} letter={l} />
                  ))}
                  {r.fourth && <Letter letter={r.fourth} />}
                </ul>
                {r.sod && (
                  <p className={styles.sod}>
                    <strong>The Sod:</strong> <span lang="he">{r.sod.glyph}</span> {r.sod.name} — {r.sod.keyword}
                    {r.sod.reversed && " (reversed)"}
                  </p>
                )}
                {r.word && (
                  <p>
                    <strong>Word of the Reading:</strong> {r.word}
                  </p>
                )}
                {r.dorot.length > 0 && (
                  <ul className={styles.dorot}>
                    {r.dorot.map((d, i) => (
                      <li key={i}>
                        {d.role}: <strong>{d.title}</strong>
                        {d.house && ` — House of ${d.house}`}
                      </li>
                    ))}
                  </ul>
                )}
                {r.palmNotes && (
                  <p>
                    <strong>Palm baseline:</strong> {r.palmNotes}
                  </p>
                )}
                {r.reflection && <blockquote className={styles.reflection}>{r.reflection}</blockquote>}
              </section>
            ))}
          </section>
        )}

        {dossier.events.length > 0 && (
          <section className={styles.reading}>
            <h2>Life-cycle record</h2>
            <ul className={styles.events}>
              {dossier.events.map((e) => (
                <li key={e.key}>
                  <strong>{e.label}</strong> — {e.date}
                  {e.notes && <span className={styles.eventNotes}> · {e.notes}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
