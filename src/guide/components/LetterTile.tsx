import { Link } from "react-router-dom";
import type { LetterCard } from "../../types/letter";
import styles from "./LetterTile.module.css";

export function LetterTile({ letter }: { letter: LetterCard }) {
  return (
    <Link to={`/guide/letters/${letter.id}`} className={styles.tile}>
      <span className={styles.glyph}>{letter.glyph}</span>
      <span className={styles.name}>{letter.name}</span>
      <span className={styles.keyword}>{letter.keyword}</span>
    </Link>
  );
}
