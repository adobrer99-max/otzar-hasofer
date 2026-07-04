import type { ReactNode } from "react";
import type { CommentarySubject } from "../types/commentary";
import { DrashTier } from "./DrashTier";
import styles from "./pardes.module.css";

/**
 * The faithful four-tier reading of an entry, after the doc's Vocabulary
 * Treasury: Peshat (the Letter — literal), Remez (the Tradition), Drash (the
 * Scribe — received and ongoing commentaries), Sod (the Participant — the
 * mystery disclosed only through lived experience). Source-agnostic: callers
 * pass the literal/tradition/sod content and the commentary `subject` that
 * drives the Drash tier, so a root, a letter, or a worked example all render
 * through the same manuscript-styled page.
 */
export interface PardesEntryProps {
  /** A large Hebrew glyph/word heading the page, if any. */
  primaryHebrew?: string;
  peshat: ReactNode;
  remez: ReactNode;
  /** Drives the Drash tier's commentaries (reuses the shared store). */
  drashSubject: CommentarySubject;
  drashAddLabel?: string;
  sod: ReactNode;
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
    <div className={styles.tier}>
      <div className={styles.tierLabel}>
        <span className={styles.tierHebrew}>{hebrew}</span>
        <span className={styles.tierName}>{name}</span>
        <span className={styles.tierGloss}>{gloss}</span>
      </div>
      {children}
    </div>
  );
}

export function PardesEntry({
  primaryHebrew,
  peshat,
  remez,
  drashSubject,
  drashAddLabel,
  sod,
}: PardesEntryProps) {
  return (
    <div className={styles.entry}>
      {primaryHebrew && <div className={styles.primaryHebrew}>{primaryHebrew}</div>}

      <Tier hebrew="פְּשָׁט" name="Peshat" gloss="The Letter — as it is">
        {peshat}
      </Tier>
      <Tier hebrew="רֶמֶז" name="Remez" gloss="The Tradition — as it is used">
        {remez}
      </Tier>
      <Tier hebrew="דְּרַשׁ" name="Drash" gloss="The Scribe — the received and ongoing commentaries">
        <DrashTier subject={drashSubject} addLabel={drashAddLabel} />
      </Tier>
      <Tier hebrew="סוֹד" name="Sod" gloss="The Participant — disclosed through lived experience">
        <div className={styles.sod}>{sod}</div>
      </Tier>
    </div>
  );
}
