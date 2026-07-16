import { Link } from "react-router-dom";
import type { LetterCard } from "../../types/letter";

export function LetterTile({ letter }: { letter: LetterCard }) {
  return (
    <Link to={`/guide/letters/${letter.id}`} className="otz-letter">
      <span className="otz-letter__glyph" lang="he">{letter.glyph}</span>
      <span className="otz-letter__name">{letter.name}</span>
      <span className="otz-letter__meaning">{letter.keyword}</span>
    </Link>
  );
}
