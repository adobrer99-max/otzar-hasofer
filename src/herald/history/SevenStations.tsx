import styles from "./SevenStations.module.css";

/** The seven readings as the days of Creation — letter, Hebrew day-name, aspect. */
export const STATIONS: { letter: string; hebrew: string; aspect: string }[] = [
  { letter: "א", hebrew: "אור", aspect: "Light" },
  { letter: "ב", hebrew: "רקיע", aspect: "Firmament" },
  { letter: "ג", hebrew: "דשא", aspect: "Seed" },
  { letter: "ד", hebrew: "מאורות", aspect: "Luminaries" },
  { letter: "ה", hebrew: "שרצים", aspect: "Swarms" },
  { letter: "ו", hebrew: "אדם", aspect: "Adam" },
  { letter: "ז", hebrew: "שבת", aspect: "Shabbat" },
];

/**
 * The Unfolding — the seven-reading spine. Readings already made are lit gold;
 * the most recent is haloed; those still to come are dashed. The seventh
 * (Shabbat) is where the Herald is revealed.
 */
export function SevenStations({ readingCount }: { readingCount: number }) {
  const formed = Math.min(readingCount, 7);
  // Progress line fills from the first node to the most-recent formed node.
  const fillPct = formed <= 1 ? 0 : ((formed - 1) / 6) * 100;

  return (
    <section className={styles.wrap} aria-label="The Unfolding — seven readings">
      <div className={styles.head}>
        <span className="otz-section-label">The Unfolding · Seven Readings</span>
        <span className={styles.count}>
          {formed === 0
            ? "Not yet begun"
            : formed >= 7
              ? "All seven have formed"
              : `${formed} of seven ${formed === 1 ? "has" : "have"} formed`}
        </span>
      </div>
      <ol className={styles.rail}>
        <span className={styles.track} aria-hidden="true" />
        <span className={styles.trackFill} style={{ width: `${fillPct}%` }} aria-hidden="true" />
        {STATIONS.map((s, i) => {
          const n = i + 1;
          const state = n <= formed ? (n === formed ? "current" : "formed") : "future";
          return (
            <li key={s.letter} className={styles.station}>
              <span className={`${styles.node} ${styles[state]}`}>{s.letter}</span>
              <span className={`${styles.label} hebrew`}>{s.hebrew}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
