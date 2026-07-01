import type { HeraldLayer } from "../../types/herald";
import { festivalsById } from "../../data/festivals";
import { lettersById } from "../../data/letters";
import { findLetterPair } from "../../data/letterPairs";
import styles from "./history.module.css";

export function LayerCaption({ layer }: { layer: HeraldLayer }) {
  const festival = festivalsById[layer.input.festivalId] ?? festivalsById.ordinary;
  const openLetterIds = layer.input.drawnLetters.map((d) => lettersById[d.letterId]?.name);
  const pairs = [];
  const ids = layer.input.drawnLetters.map((d) => d.letterId);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const pair = findLetterPair(ids[i], ids[j]);
      if (pair) pairs.push(pair);
    }
  }

  return (
    <div className={styles.caption}>
      <div>
        {layer.isOrigin ? "Origin Herald" : `Layer ${layer.layerIndex + 1}`} —{" "}
        {new Date(layer.createdAt).toLocaleDateString()}
        {festival.id !== "ordinary" && ` · ${festival.name}`}
      </div>
      <div>Drawn: {openLetterIds.join(", ")}</div>
      {pairs.length > 0 && (
        <div>
          Root resonance: {pairs.map((p) => `${p.rootWord} (${p.meaning})`).join("; ")}
        </div>
      )}
      {layer.input.reflection && <div>"{layer.input.reflection}"</div>}
    </div>
  );
}
