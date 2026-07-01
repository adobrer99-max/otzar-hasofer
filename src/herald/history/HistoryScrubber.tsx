import type { HeraldLayer } from "../../types/herald";
import { HeraldCanvas } from "../render/HeraldCanvas";
import styles from "./history.module.css";

export function HistoryScrubber({
  layers,
  selectedId,
  onSelect,
}: {
  layers: HeraldLayer[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (layers.length === 0) return null;

  return (
    <div className={styles.scrubber}>
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
