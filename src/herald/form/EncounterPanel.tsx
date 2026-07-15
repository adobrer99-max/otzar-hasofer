import { Link } from "react-router-dom";
import { RichText } from "../../components/ui";
import { getEncounterForReadingIndex } from "../../data/encounters";
import { housesBySefirah } from "../../data/dorot";
import { ushpizinBySefirah } from "../../data/ushpizin";
import styles from "./form.module.css";

export function EncounterPanel({ readingIndex }: { readingIndex: number }) {
  const encounter = getEncounterForReadingIndex(readingIndex);
  if (!encounter) return null;

  const houses = housesBySefirah(encounter.sefirah);

  return (
    <div className={styles.encounterPanel}>
      <div className={styles.encounterTitle}>
        Encounter {encounter.number}: {encounter.aspect}
      </div>
      <div className={styles.encounterThemes}>{encounter.themes}</div>
      <RichText className={styles.encounterQuestion} html={encounter.question} />
      <p className={styles.encounterThemes}>
        With this Encounter, the Pillar of{" "}
        {ushpizinBySefirah[encounter.sefirah].sefirahName} opens —{" "}
        {houses.map((house, i) => (
          <span key={house.id}>
            {i > 0 && " and "}
            <Link to={`/guide/dorot/${house.id}`}>the House of {house.figure}</Link>
          </span>
        ))}
        .
      </p>
      {readingIndex === 6 && (
        <p className={styles.restNote}>
          Tradition invites a period of rest and quiet internalization before this reading — the
          Seventy Days of Silence. This is guidance, not a restriction; proceed whenever ready.
        </p>
      )}
    </div>
  );
}
