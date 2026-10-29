import type { LetterCard } from "../../types/letter";
import type { RevealCard } from "./DealReveal";
import { CardArtImage } from "../../components/cardArt/CardArtImage";
import { useCardArt } from "../../components/cardArt/useCardArt";
import styles from "./dealReveal.module.css";

/**
 * The turned face of one dealt card. An open card with uploaded art shows the
 * artwork beneath a scrim, its glyph and name still set over it (a reversed
 * card turns the art with the glyph). The sealed Sod card never shows art —
 * it stays the veiled glyph alone.
 */
export function RevealCardFace({ card, letter }: { card: RevealCard; letter: LetterCard | undefined }) {
  const { art, onError } = useCardArt(card.sealed ? undefined : letter?.art);
  const reversed = card.draw.orientation === "reversed";
  const className = [styles.front, card.sealed ? styles.sealedFront : "", art ? styles.frontArt : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      {art && (
        <>
          <span className={`${styles.artLayer} ${reversed ? styles.artReversed : ""}`}>
            <CardArtImage art={art} variant="face" onError={onError} decorative />
          </span>
          <span className={styles.scrim} />
        </>
      )}
      <span className={styles.glyph} style={reversed ? reversedStyle : undefined}>
        {letter?.glyph ?? "?"}
      </span>
      <span className={styles.name}>{card.sealed ? "The Sod — sealed" : (letter?.name ?? "")}</span>
      {!card.sealed && letter && (
        <>
          <span className={styles.keyword}>{letter.keyword}</span>
          <span className={styles.orient}>{reversed ? "Reversed — inward" : "Upright"}</span>
        </>
      )}
      {card.sealed && <span className={styles.veil} aria-hidden="true" />}
    </div>
  );
}

const reversedStyle = { transform: "rotate(180deg)", display: "inline-block" } as const;
