import type { ReadingPath } from "../../types/herald";
import styles from "./form.module.css";

export function PathToggle({
  value,
  onChange,
}: {
  value: ReadingPath;
  onChange: (path: ReadingPath) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label="Reading path">
      <button
        type="button"
        className={value === "brit" ? styles.active : undefined}
        aria-pressed={value === "brit"}
        onClick={() => onChange("brit")}
      >
        Derekh HaBrit
      </button>
      <button
        type="button"
        className={value === "noach" ? styles.active : undefined}
        aria-pressed={value === "noach"}
        onClick={() => onChange("noach")}
      >
        Derekh Noach
      </button>
    </div>
  );
}
