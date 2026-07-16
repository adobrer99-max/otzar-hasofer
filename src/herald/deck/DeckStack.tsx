import styles from "./deckStack.module.css";

/**
 * A face-down deck the Scribe draws from. Tapping the stack draws the next card;
 * a secondary action deals the whole spread at once. Presentation for the draw
 * — the actual cards come from `deck.ts` in the parent's handlers.
 */
export function DeckStack({
  drawn,
  total,
  canDrawNext,
  onDrawNext,
  onDealAll,
  label = "Draw from the deck",
}: {
  /** How many of the spread's cards have been placed. */
  drawn: number;
  /** The spread's total card count (open + veiled). */
  total: number;
  /** False once every slot is filled. */
  canDrawNext: boolean;
  onDrawNext: () => void;
  onDealAll: () => void;
  label?: string;
}) {
  const remaining = Math.max(total - drawn, 0);
  return (
    <div className={styles.deck}>
      <button
        type="button"
        className={styles.stack}
        onClick={onDrawNext}
        disabled={!canDrawNext}
        aria-label={
          canDrawNext ? `${label} — draw the next card` : "The spread is complete"
        }
      >
        {/* A small pile of face-down cards. */}
        <span className={styles.cardBack} aria-hidden="true" data-layer="2" />
        <span className={styles.cardBack} aria-hidden="true" data-layer="1" />
        <span className={styles.cardBack} aria-hidden="true" data-layer="0">
          <span className={styles.seal}>✦</span>
        </span>
      </button>
      <div className={styles.controls}>
        <button type="button" className={styles.dealAll} onClick={onDealAll}>
          ✦ Deal the whole spread
        </button>
        <span className={styles.hint}>
          {canDrawNext
            ? `${drawn} of ${total} drawn · tap the deck to draw the next`
            : `All ${total} cards drawn · deal again to redraw`}
        </span>
        <span className={styles.srOnly} role="status" aria-live="polite">
          {`${remaining} of ${total} cards left to draw.`}
        </span>
      </div>
    </div>
  );
}
