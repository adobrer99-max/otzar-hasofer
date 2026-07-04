import styles from "./library.module.css";

/**
 * A purely decorative sewn-in bookmark ribbon (segnalibro) hanging from the
 * top of a Book's page, to keep the manuscript feel. `label`, when given,
 * is stamped down the ribbon in gold — used to mark the entry you're reading.
 */
export function BookmarkRibbon({ label }: { label?: string }) {
  return (
    <div className={styles.ribbon} aria-hidden="true">
      {label && <span className={styles.ribbonLabel}>{label}</span>}
    </div>
  );
}
