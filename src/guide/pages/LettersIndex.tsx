import { PageHeader } from "../../components/ui";
import { letters } from "../../data/letters";
import type { LetterClassification } from "../../types/letter";
import { LetterTile } from "../components/LetterTile";
import styles from "./LettersIndex.module.css";

const groups: {
  classification: LetterClassification;
  label: string;
  hebrew: string;
  note: string;
}[] = [
  {
    classification: "Mother",
    label: "The Three Mothers",
    hebrew: "אמות",
    note: "Aleph, Mem, Shin — Air, Water, Fire.",
  },
  {
    classification: "Double",
    label: "The Seven Doubles",
    hebrew: "כפולות",
    note: "Each carries a pair of opposites, and a classical planet.",
  },
  {
    classification: "Simple",
    label: "The Twelve Simples",
    hebrew: "פשוטות",
    note: "Each carries a zodiac sign and a month of the year.",
  },
];

export function LettersIndex() {
  return (
    <div className="page">
      <PageHeader kicker="Derekh Eretz" title="The Twenty-Two Letters" hebrew="כ״ב אותיות" />
      <p>
        Twenty-two cards, one per Hebrew letter — vertical, archetypal,
        covenantal. Each of the three drawn letters in a reading becomes a
        division of the participant's Herald; the veiled fourth letter is
        drawn but stays hidden.
      </p>
      {groups.map((group) => (
        <section key={group.classification} className={styles.group}>
          <div className="otz-shead">
            <h2 className="otz-section-title">{group.label}</h2>
            <span className="otz-heb">{group.hebrew}</span>
          </div>
          <p className="otz-subtle">{group.note}</p>
          <div className={styles.grid}>
            {letters
              .filter((letter) => letter.classification === group.classification)
              .map((letter) => (
                <LetterTile key={letter.id} letter={letter} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
