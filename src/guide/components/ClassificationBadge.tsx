import type { LetterClassification } from "../../types/letter";
import styles from "./ClassificationBadge.module.css";

const labels: Record<LetterClassification, string> = {
  Mother: "Mother Letter",
  Double: "Double Letter",
  Simple: "Simple Letter",
};

export function ClassificationBadge({
  classification,
}: {
  classification: LetterClassification;
}) {
  return (
    <span className={`${styles.badge} ${styles[classification.toLowerCase()]}`}>
      {labels[classification]}
    </span>
  );
}
