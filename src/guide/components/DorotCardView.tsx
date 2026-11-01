import type { ReactNode } from "react";
import type { DorotCard } from "../../types/dorot";
import { RichText } from "../../components/ui";
import { CardArtImage } from "../../components/cardArt/CardArtImage";
import { useCardArt } from "../../components/cardArt/useCardArt";
import styles from "../pages/Dorot.module.css";

/**
 * The presentation of a single Derekh Ha'Dorot card — title, art, episode,
 * practice, core energy, and question. Extracted from DorotHouse so the same
 * markup renders both on the House page and in the Scriptorium's live preview.
 * `children` is an optional slot (the House page hangs commentaries here).
 */
export function DorotCardView({ card, children }: { card: DorotCard; children?: ReactNode }) {
  const { art, onError } = useCardArt(card.art);
  return (
    <div className={styles.card}>
      <h3>
        {card.index}. {card.title}
      </h3>
      {art && <CardArtImage art={art} variant="figure" onError={onError} maxWidth={280} />}
      {card.title !== card.episode && (
        <div className={styles.cardMeta}>The Episode: {card.episode}</div>
      )}
      {card.humanPractice && (
        <div className={styles.cardMeta}>
          The Human Practice: <RichText as="span" html={card.humanPractice} />
        </div>
      )}
      {card.coreEnergy && <div className={styles.cardMeta}>Core Energy: {card.coreEnergy}</div>}
      {card.question && <RichText html={card.question} />}
      {children}
    </div>
  );
}
