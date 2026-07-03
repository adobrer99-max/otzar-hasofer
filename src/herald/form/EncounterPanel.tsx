import { getEncounterForReadingIndex } from "../../data/encounters";
import styles from "./form.module.css";

export function EncounterPanel({ readingIndex }: { readingIndex: number }) {
  const encounter = getEncounterForReadingIndex(readingIndex);
  if (!encounter) return null;

  return (
    <div className={styles.encounterPanel}>
      <div className={styles.encounterTitle}>
        Encounter {encounter.number}: {encounter.aspect}
      </div>
      <div className={styles.encounterThemes}>{encounter.themes}</div>
      <p className={styles.encounterQuestion}>{encounter.question}</p>
      {readingIndex === 6 && (
        <p className={styles.restNote}>
          Tradition invites a period of rest and quiet internalization before this reading — the
          Seventy Days of Silence. This is guidance, not a restriction; proceed whenever ready.
        </p>
      )}
    </div>
  );
}
