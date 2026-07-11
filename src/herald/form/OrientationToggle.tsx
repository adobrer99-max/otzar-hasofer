import type { Orientation } from "../../types/herald";
import styles from "./form.module.css";

export function OrientationToggle({
  value,
  onChange,
}: {
  value: Orientation;
  onChange: (orientation: Orientation) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label="Orientation">
      <button
        type="button"
        className={value === "upright" ? styles.active : undefined}
        aria-pressed={value === "upright"}
        onClick={() => onChange("upright")}
      >
        Upright
      </button>
      <button
        type="button"
        className={value === "reversed" ? styles.active : undefined}
        aria-pressed={value === "reversed"}
        onClick={() => onChange("reversed")}
      >
        Reversed
      </button>
    </div>
  );
}
