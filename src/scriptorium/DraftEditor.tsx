import { Button } from "../components/ui";
import type { DatasetDescriptor } from "./contentRegistry";
import { RichTextField } from "./RichTextField";
import styles from "./scriptorium.module.css";

/**
 * A generic, controlled form driven by a dataset's field descriptors. The
 * parent owns the values (so the preview stays in sync); this just renders
 * inputs and surfaces Save / Revert.
 */
export function DraftEditor({
  dataset,
  values,
  onFieldChange,
  onSave,
  onRevert,
  dirty,
  hasDraft,
}: {
  dataset: DatasetDescriptor;
  values: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  onSave: () => void;
  onRevert: () => void;
  dirty: boolean;
  hasDraft: boolean;
}) {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      {dataset.fields.map((field) => {
        const id = `field-${field.key}`;
        const value = values[field.key] ?? "";
        return (
          <div className={styles.field} key={field.key}>
            <label htmlFor={id}>{field.label}</label>
            {field.kind === "rich" ? (
              <RichTextField id={id} value={value} onChange={(html) => onFieldChange(field.key, html)} />
            ) : field.kind === "multiline" ? (
              <textarea
                id={id}
                value={value}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
              />
            ) : (
              <input
                id={id}
                type="text"
                className={field.kind === "hebrew" ? styles.hebrewInput : undefined}
                value={value}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
              />
            )}
            {field.hint && <span className={styles.fieldHint}>{field.hint}</span>}
          </div>
        );
      })}

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={!dirty}>
          {dirty ? "Save draft" : "Saved"}
        </Button>
        <Button type="button" variant="ghost" onClick={onRevert} disabled={!hasDraft}>
          Revert to shipped
        </Button>
      </div>
    </form>
  );
}
