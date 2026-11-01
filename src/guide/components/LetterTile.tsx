import { Link } from "react-router-dom";
import type { LetterCard } from "../../types/letter";
import { CardArtImage } from "../../components/cardArt/CardArtImage";
import { useCardArt } from "../../components/cardArt/useCardArt";

/**
 * A letter's tile on the index. With uploaded art the tile carries the card
 * face, the glyph riding on it as a badge; without art (or if the image fails)
 * it is the drawn glyph alone. The art is decorative here — the name and
 * keyword beneath already name the card for assistive tech.
 */
export function LetterTile({ letter }: { letter: LetterCard }) {
  const { art, onError } = useCardArt(letter.art);
  return (
    <Link to={`/guide/letters/${letter.id}`} className={art ? "otz-letter otz-letter--art" : "otz-letter"}>
      {art ? (
        <span className="otz-letter__art">
          <CardArtImage art={art} variant="tile" onError={onError} decorative />
          <span className="otz-letter__badge" lang="he">{letter.glyph}</span>
        </span>
      ) : (
        <span className="otz-letter__glyph" lang="he">{letter.glyph}</span>
      )}
      <span className="otz-letter__name">{letter.name}</span>
      <span className="otz-letter__meaning">{letter.keyword}</span>
    </Link>
  );
}
