import type { ReactNode } from "react";
import { FestivalCard } from "../guide/components/FestivalCard";
import { DorotCardView } from "../guide/components/DorotCardView";
import { festivalsById } from "../data/festivals";
import { dorotCardsById } from "../data/dorot";
import { liturgiesById } from "../data/liturgies";
import { encountersByNumber } from "../data/encounters";
import { lettersById } from "../data/letters";
import type { DatasetId, RegistryEntry } from "./contentRegistry";
import { RichText } from "../components/ui";
import pardes from "../library/pardes.module.css";
import styles from "./scriptorium.module.css";

/**
 * Live preview of an entry with the author's draft merged over the shipped
 * values. Reuses the real render components (FestivalCard, DorotCardView) so
 * what the author sees is what a reader will see. Empty fields fall back to
 * `undefined` so the same truthiness guards used across the app apply.
 */
export function PreviewPane({
  datasetId,
  entry,
  values,
}: {
  datasetId: DatasetId;
  entry: RegistryEntry;
  values: Record<string, string>;
}) {
  const v = (key: string) => values[key]?.trim() || undefined;

  return (
    <div className={styles.previewShell}>
      <div className={styles.previewLabel}>Live preview</div>
      {renderPreview()}
    </div>
  );

  function renderPreview(): ReactNode {
    switch (datasetId) {
      case "festivals": {
        const base = festivalsById[entry.id];
        if (!base) return null;
        return (
          <FestivalCard
            festival={{
              ...base,
              gesture: v("gesture"),
              contemplativeQuestion: v("contemplativeQuestion"),
            }}
          />
        );
      }
      case "dorot-matriarchal": {
        const base = dorotCardsById[entry.id];
        if (!base) return null;
        return (
          <DorotCardView
            card={{
              ...base,
              title: values.title?.trim() || base.title,
              humanPractice: v("humanPractice"),
              question: v("question"),
            }}
          />
        );
      }
      case "liturgy": {
        const base = liturgiesById[entry.id];
        if (!base) return null;
        return (
          <div className={pardes.entry}>
            <Tier hebrew="פְּשָׁט" name="Peshat" gloss="The Letter — as it is">
              <p className={styles.previewHebrew}>{base.hebrew}</p>
              {v("english") ? (
                <RichText as="p" html={v("english")!} />
              ) : (
                <p><span className={styles.muted}>(no English yet)</span></p>
              )}
            </Tier>
            <Tier hebrew="רֶמֶז" name="Remez" gloss="The Tradition — when and why it is said">
              <p>{base.occasionNote}</p>
            </Tier>
            <Tier hebrew="סוֹד" name="Sod" gloss="The Participant — disclosed through lived experience">
              {v("sodPrompt") ? (
                <RichText as="p" html={v("sodPrompt")!} className={pardes.sod} />
              ) : (
                <p className={pardes.sod}>
                  <span className={styles.muted}>(no Sod prompt yet)</span>
                </p>
              )}
            </Tier>
          </div>
        );
      }
      case "encounters": {
        const base = encountersByNumber[Number(entry.id)];
        if (!base) return null;
        return (
          <div>
            <h3>
              {base.name} — {base.aspect}
            </h3>
            <Field label="Themes">{base.themes}</Field>
            <Field label="Question">
              {v("question") ? (
                <RichText html={v("question")!} />
              ) : (
                <em><span className={styles.muted}>(no question yet)</span></em>
              )}
            </Field>
          </div>
        );
      }
      case "epithets": {
        return (
          <div>
            <p style={{ fontSize: "1.15rem", color: "var(--accent-bright)" }}>
              {v("phrase") ?? <span className={styles.muted}>(empty)</span>}
            </p>
            <p className={styles.muted}>
              In context: “
              {entry.id.startsWith("emblem:")
                ? `Keeper of the Open Tent, under the Sign of ${values.phrase?.trim() || "…"}`
                : entry.id.startsWith("sefirah:")
                  ? `${values.phrase?.trim() || "…"}, under the Sign of the Sheltering House`
                  : values.phrase?.trim() || "…"}
              ”
            </p>
          </div>
        );
      }
      case "letters": {
        const base = lettersById[entry.id];
        return (
          <div>
            <div className={styles.previewGlyph}>{base?.glyph ?? entry.hebrew}</div>
            <Field label="Keyword">{v("keyword")}</Field>
            <Field label="Translation / root">{v("translationRoot")}</Field>
            <Field label="Eternal principle">
              {v("eternalPrinciple") ? <RichText html={v("eternalPrinciple")!} /> : undefined}
            </Field>
            <Field label="Question">
              {v("question") ? <RichText html={v("question")!} /> : undefined}
            </Field>
            <Field label="Hebrew root">
              {v("hebrewRoot") ? (
                <span className={styles.previewHebrew}>{v("hebrewRoot")}</span>
              ) : undefined}
            </Field>
            <Field label="Scribe notes">
              {v("scribeNotes") ? <RichText html={v("scribeNotes")!} /> : undefined}
            </Field>
          </div>
        );
      }
    }
  }
}

function Tier({
  hebrew,
  name,
  gloss,
  children,
}: {
  hebrew: string;
  name: string;
  gloss: string;
  children: ReactNode;
}) {
  return (
    <div className={pardes.tier}>
      <div className={pardes.tierLabel}>
        <span className={pardes.tierHebrew}>{hebrew}</span>
        <span className={pardes.tierName}>{name}</span>
        <span className={pardes.tierGloss}>{gloss}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.previewField}>
      <div className={styles.previewFieldLabel}>{label}</div>
      <div>{children ?? <span className={styles.muted}>—</span>}</div>
    </div>
  );
}
