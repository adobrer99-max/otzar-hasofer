import type { HeraldLayer } from "../../types/herald";
import { festivalsById } from "../../data/festivals";
import { lettersById } from "../../data/letters";
import { formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { encountersByNumber } from "../../data/encounters";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import styles from "./history.module.css";

export function LayerCaption({ layer }: { layer: HeraldLayer }) {
  const festival = festivalsById[layer.input.festivalId] ?? festivalsById.ordinary;
  const drawnLetters = layer.input.drawnLetters.map((d) => lettersById[d.letterId]);
  const shoresh = resolveShoresh(layer.input.drawnLetters.map((d) => d.letterId) as [string, string, string]);
  const sacredTime = layer.input.sacredTime;
  const encounter = layer.input.encounterNumber ? encountersByNumber[layer.input.encounterNumber] : undefined;

  return (
    <div className={styles.caption}>
      <div>
        {layer.isOrigin ? "Origin Herald" : `Layer ${layer.layerIndex + 1}`} —{" "}
        {new Date(layer.createdAt).toLocaleDateString()}
        {sacredTime && ` (${formatHebrewDateEnglish(sacredTime.hebrewDate)})`}
        {festival.id !== "ordinary" && ` · ${festival.name}`}
        {sacredTime?.omer && ` · Omer day ${sacredTime.omer.day}`}
        {encounter && ` · Encounter ${encounter.number}: ${encounter.aspect}`}
      </div>
      {encounter?.number === 7 && (
        <div className={styles.citation}>
          Creation is complete; nothing new is made, only lived. Your Herald is revealed.
        </div>
      )}
      <div>Drawn: {drawnLetters.map((l) => l?.name).join(", ")}</div>

      {shoresh.tier === "root" && (
        <div>
          <strong>Word of the Reading:</strong> {shoresh.word} — {shoresh.gloss}{" "}
          <span className={styles.citation}>({shoresh.citation})</span>
        </div>
      )}
      {shoresh.tier === "name" && (
        <div>
          <strong>Recognized as:</strong> {shoresh.name} — {shoresh.gloss}{" "}
          <span className={styles.citation}>({shoresh.citation})</span>
        </div>
      )}
      {shoresh.tier === "related" && (
        <div>
          <strong>Avenues of contemplation:</strong>
          <ul>
            {shoresh.correspondences.map((c, i) => (
              <li key={i}>
                {c.label} — {c.meaning}
                {c.source && <span className={styles.citation}> ({c.source})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {shoresh.tier === "hidden" && (
        <div>
          <strong>Shoresh Nistar (שורש נסתר) — The Hidden Root.</strong> No attested root, name,
          or correspondence was found for these letters. This is not a failed reading: the
          Scribe does not invent a word or force an interpretation. The letters are recorded
          exactly as received, and the participant is invited to live with them, trusting that
          understanding may emerge through future readings, sacred time, personal experience, or
          continued study.
        </div>
      )}

      {drawnLetters.some((l) => l?.hebrewRoot) && (
        <div className={styles.citation}>
          Established symbolic associations:{" "}
          {drawnLetters
            .filter((l) => l?.hebrewRoot)
            .map((l) => `${l!.name}: ${l!.hebrewRoot}`)
            .join(" · ")}
        </div>
      )}

      {layer.input.reflection && <div>"{layer.input.reflection}"</div>}
    </div>
  );
}
