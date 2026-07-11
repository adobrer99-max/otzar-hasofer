import type { HeraldStyle } from "../../types/herald";
import { Card, SegmentedControl, Button } from "../../components/ui";
import styles from "./HeraldStylePanel.module.css";

const METALS: { value: NonNullable<HeraldStyle["metal"]>; label: string }[] = [
  { value: "gold", label: "Gold" },
  { value: "antique", label: "Antique" },
  { value: "silver", label: "Silver" },
];

const TOGGLES: {
  key: "crest" | "mantling" | "compartment" | "supporters" | "motto" | "chief" | "seme" | "gematria";
  label: string;
  def: boolean;
}[] = [
  { key: "crest", label: "Crest", def: true },
  { key: "mantling", label: "Mantling", def: true },
  { key: "compartment", label: "Compartment", def: true },
  { key: "supporters", label: "Supporters", def: false },
  { key: "motto", label: "Motto scroll", def: true },
  { key: "chief", label: "Chief of associations", def: true },
  { key: "seme", label: "Semé (powdering)", def: true },
  { key: "gematria", label: "Gematria mark", def: true },
];

/**
 * The Scribe's curation panel — refine a participant's Herald within the
 * Visual Canon (curated choices, no free colour) with a live preview, then
 * seal it. Faithful to "the Herald is recognized, never assigned": the Scribe
 * curates, the derivation still speaks.
 */
export function HeraldStylePanel({
  draft,
  onChange,
  onSeal,
  dirty,
  sealed,
}: {
  draft: HeraldStyle;
  onChange: (style: HeraldStyle) => void;
  onSeal: () => void;
  dirty: boolean;
  sealed: boolean;
}) {
  return (
    <Card className={styles.panel}>
      <div className={styles.head}>
        <h3 className={styles.title}>Curating the Herald</h3>
        <p className={styles.sub}>
          Refine within the canon — the Herald is recognized, never assigned.
        </p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Device on the shield</span>
        <SegmentedControl
          ariaLabel="Device on the shield"
          value={draft.device ?? "glyph"}
          options={[
            { value: "glyph", label: "Letterform" },
            { value: "charge", label: "Heraldic charge" },
          ]}
          onChange={(device) => onChange({ ...draft, device })}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Metal of the achievement</span>
        <SegmentedControl
          ariaLabel="Metal of the achievement"
          value={draft.metal ?? "gold"}
          options={METALS.map((m) => ({ value: m.value, label: m.label }))}
          onChange={(metal) => onChange({ ...draft, metal })}
        />
      </div>

      <fieldset className={styles.toggles}>
        <legend className={styles.label}>Heraldic vocabulary</legend>
        {TOGGLES.map((t) => (
          <label key={t.key} className={styles.toggle}>
            <input
              type="checkbox"
              checked={draft[t.key] ?? t.def}
              onChange={(e) => onChange({ ...draft, [t.key]: e.target.checked })}
            />
            <span>{t.label}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.actions}>
        <Button variant="primary" onClick={onSeal} disabled={!dirty}>
          {sealed ? "Update the curation" : "Seal the curation"}
        </Button>
        {dirty && <span className={styles.hint}>Previewing live · unsealed</span>}
      </div>
    </Card>
  );
}
