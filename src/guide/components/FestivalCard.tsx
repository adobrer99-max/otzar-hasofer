import type { FestivalOverride } from "../../types/festival";
import styles from "./FestivalCard.module.css";

export function FestivalCard({ festival }: { festival: FestivalOverride }) {
  return (
    <article className={styles.card}>
      <div className={styles.title}>
        <h3>{festival.name}</h3>
        {festival.hebrewName && (
          <span className={`${styles.hebrew} hebrew`}>
            {festival.hebrewName}
          </span>
        )}
      </div>
      <p>{festival.description}</p>
      <p className={styles.mechanic}>{festival.ritualMechanic}</p>
    </article>
  );
}
