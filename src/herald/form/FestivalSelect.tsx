import { useId } from "react";
import { festivals } from "../../data/festivals";
import styles from "./form.module.css";

export function FestivalSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (festivalId: string) => void;
}) {
  const id = useId();
  const selected = festivals.find((f) => f.id === value);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>Sacred Time</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {festivals.map((festival) => (
          <option key={festival.id} value={festival.id}>
            {festival.name}
          </option>
        ))}
      </select>
      {selected && selected.id !== "ordinary" && (
        <p className={styles.festivalNote}>{selected.ritualMechanic}</p>
      )}
    </div>
  );
}
