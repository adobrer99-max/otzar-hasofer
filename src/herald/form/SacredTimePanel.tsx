import type { SacredTimeSnapshot } from "../../types/sacredTime";
import { formatHebrewDateEnglish, formatHebrewDateHebrew } from "../../data/hebrewCalendar";
import { festivalsById } from "../../data/festivals";
import styles from "./form.module.css";

export interface SacredTimePanelProps {
  snapshot: SacredTimeSnapshot;
  backdateEnabled: boolean;
  backdateValue: string;
  onBackdateEnabledChange: (enabled: boolean) => void;
  onBackdateValueChange: (value: string) => void;
}

export function SacredTimePanel({
  snapshot,
  backdateEnabled,
  backdateValue,
  onBackdateEnabledChange,
  onBackdateValueChange,
}: SacredTimePanelProps) {
  const primaryFestival = snapshot.activeFestivalIds[0];
  const festival = primaryFestival ? festivalsById[primaryFestival] : undefined;

  return (
    <div className={styles.sacredTimePanel}>
      <div className={styles.sacredTimeLine}>
        {backdateEnabled ? "This reading is set to" : "Today is"}{" "}
        <span className={styles.hebrewDate}>{formatHebrewDateHebrew(snapshot.hebrewDate)}</span>
        {" "}({formatHebrewDateEnglish(snapshot.hebrewDate)}) ·{" "}
        {snapshot.dayOfWeek.charAt(0).toUpperCase() + snapshot.dayOfWeek.slice(1)}
        {snapshot.omer && ` · Omer day ${snapshot.omer.day}`}
        {snapshot.roshChodesh && " · Rosh Chodesh"}
        {festival && festival.id !== "ordinary" && ` · ${festival.name}`}
      </div>
      <div className={styles.backdateRow}>
        <label>
          <input
            type="checkbox"
            checked={backdateEnabled}
            onChange={(e) => onBackdateEnabledChange(e.target.checked)}
          />{" "}
          Backdate this reading
        </label>
        {backdateEnabled && (
          <input
            type="date"
            value={backdateValue}
            onChange={(e) => onBackdateValueChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
