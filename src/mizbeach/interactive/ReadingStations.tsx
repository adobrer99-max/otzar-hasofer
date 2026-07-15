import type { MizbeachReadingState } from "./reading";
import styles from "./ReadingStations.module.css";

/** The four stations of the central panel, in the order a reading moves. */
const STATIONS = [
  { en: "Hand Anchor", he: "יד" },
  { en: "The Letters", he: "אותיות" },
  { en: "The Tree", he: "עץ" },
  { en: "Veiled Anchor", he: "עוגן" },
];

/**
 * The order rail — the spread read as a composed figure, in sequence. Each
 * station lights as the reading fills it: the Hand is read, the three letters
 * are drawn, the dominant middah is set on the Tree, the Veiled Anchor is laid.
 */
export function ReadingStations({ state }: { state: MizbeachReadingState }) {
  const done = [
    !!state.palmNotes?.trim(),
    state.letters.every((l) => l !== null),
    !!state.middah,
    !!state.veiled,
  ];
  const current = done.findIndex((d) => !d);

  return (
    <ol className={styles.rail} aria-label="The order of the reading">
      <span className={styles.track} aria-hidden="true" />
      {STATIONS.map((s, i) => {
        const state2 = done[i] ? "done" : i === current ? "current" : "future";
        return (
          <li key={s.en} className={styles.station}>
            <span className={`${styles.node} ${styles[state2]}`}>{i + 1}</span>
            <span className={styles.label}>
              <span className={styles.en}>{s.en}</span>
              <span className={`${styles.he} hebrew`}>{s.he}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
