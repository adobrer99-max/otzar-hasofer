import { letters } from "../../data/letters";
import styles from "./form.module.css";

export function LetterPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (letterId: string) => void;
  label: string;
}) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {letters.map((letter) => (
          <option key={letter.id} value={letter.id}>
            {letter.glyph} — {letter.name} ({letter.keyword})
          </option>
        ))}
      </select>
    </div>
  );
}
