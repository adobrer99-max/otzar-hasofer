import type { CardArt } from "../../types/letter";
import styles from "./cardArt.module.css";

/**
 * The one renderer for uploaded card art. `figure` is the reading-page plate
 * with its credit; `tile` and `face` fill a 5:7 card box (the letter tiles,
 * the deal reveal), whose box reserves its shape so nothing shifts when the
 * art arrives. The plate keeps the artwork's own proportions — never cropped.
 */
export function CardArtImage({
  art,
  variant,
  onError,
  decorative = false,
  maxWidth,
}: {
  art: CardArt;
  variant: "figure" | "tile" | "face";
  onError?: () => void;
  /** Empty alt where adjacent text already names the card. */
  decorative?: boolean;
  /** The figure's width cap in px. */
  maxWidth?: number;
}) {
  if (variant === "figure") {
    return (
      <figure className={styles.figure} style={maxWidth ? { maxWidth } : undefined}>
        <img
          className={styles.figureImage}
          src={art.src}
          alt={decorative ? "" : art.alt}
          loading="lazy"
          decoding="async"
          onError={onError}
        />
        {art.credit && <figcaption className={styles.credit}>{art.credit}</figcaption>}
      </figure>
    );
  }
  return (
    <img
      className={variant === "tile" ? styles.tileImage : styles.faceImage}
      src={art.src}
      alt={decorative ? "" : art.alt}
      // The reveal preloads its faces, so they decode eagerly.
      loading={variant === "tile" ? "lazy" : "eager"}
      decoding="async"
      onError={onError}
    />
  );
}
