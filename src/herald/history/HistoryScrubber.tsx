import type { HeraldLayer } from "../../types/herald";
import type { HeraldForm } from "../synthesis/deriveHeraldForm";
import { HeraldCanvas } from "../render/HeraldCanvas";
import styles from "./history.module.css";

export function HistoryScrubber({
  layers,
  form,
  selectedId,
  synthesisSelected,
  onSelect,
  onSelectSynthesis,
}: {
  layers: HeraldLayer[];
  /** The synthesized Herald, shown as the leading chip when present. */
  form?: HeraldForm;
  selectedId: string | undefined;
  synthesisSelected: boolean;
  onSelect: (id: string) => void;
  onSelectSynthesis: () => void;
}) {
  if (layers.length === 0) return null;

  return (
    <div className={styles.scrubber}>
      {form && (
        <button
          type="button"
          className={`${styles.thumb} ${synthesisSelected ? styles.active : ""}`}
          onClick={onSelectSynthesis}
          title="The Herald — the synthesis of the seven readings"
        >
          <span className={styles.origin}>◆ The Herald</span>
          <HeraldCanvas form={form} />
        </button>
      )}
      {layers.map((layer, i) => (
        <button
          key={layer.id}
          type="button"
          className={`${styles.thumb} ${layer.id === selectedId ? styles.active : ""}`}
          onClick={() => onSelect(layer.id)}
          title={new Date(layer.createdAt).toLocaleString()}
        >
          {layer.isOrigin && <span className={styles.origin}>◆ origin</span>}
          <HeraldCanvas
            input={layer.input}
            previous={i > 0 ? layers[i - 1].input : undefined}
            layerCount={layer.layerIndex}
          />
        </button>
      ))}
    </div>
  );
}
