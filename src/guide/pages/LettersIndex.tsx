import { letters } from "../../data/letters";
import type { LetterClassification } from "../../types/letter";
import { LetterTile } from "../components/LetterTile";
import styles from "./LettersIndex.module.css";

const groups: { classification: LetterClassification; label: string; note: string }[] = [
  {
    classification: "Mother",
    label: "The Three Mothers",
    note: "Aleph, Mem, Shin — Air, Water, Fire.",
  },
  {
    classification: "Double",
    label: "The Seven Doubles",
    note: "Each carries a pair of opposites, and a classical planet.",
  },
  {
    classification: "Simple",
    label: "The Twelve Simples",
    note: "Each carries a zodiac sign and a month of the year.",
  },
];

export function LettersIndex() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">Derekh Eretz</div>
        <h1>The Twenty-Two Letters</h1>
      </div>
      <p>
        Twenty-two cards, one per Hebrew letter — vertical, archetypal,
        covenantal. Each of the three drawn letters in a reading becomes a
        division of the participant's Herald; the veiled fourth letter is
        drawn but stays hidden.
      </p>
      {groups.map((group) => (
        <div key={group.classification}>
          <h2 className={styles.groupTitle}>{group.label}</h2>
          <p>
            <em>{group.note}</em>
          </p>
          <div className={styles.grid}>
            {letters
              .filter((letter) => letter.classification === group.classification)
              .map((letter) => (
                <LetterTile key={letter.id} letter={letter} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
