import { useEffect, useMemo, useState } from "react";
import type { LetterDraw } from "../../types/herald";
import { lettersById } from "../../data/letters";
import styles from "./dealReveal.module.css";

/** One card in the reveal. A `sealed` card is the Veiled Anchor — it lands
 *  face-down and is never turned over, so its letter stays the Sod. */
export interface RevealCard {
  draw: LetterDraw;
  sealed?: boolean;
}

/**
 * A ceremonial reveal for a deck draw: the cards flip over one by one,
 * face-down seal to face-up letter. The veiled anchor turns like the rest —
 * the Scribe needs to see it to perform the reading — but it is set visibly
 * apart under a veil and labelled the Sod, so it never reads as a public,
 * open card (and it stays excluded from the rendered Herald elsewhere).
 * Presentation only — it renders whatever `drawLetters` returned and never
 * touches the reading itself, so the settled form-slots / folio remain the
 * source of truth (and stay accessible).
 *
 * Reduced-motion users get no overlay at all (the slots simply fill); the open
 * letters are announced to assistive tech, with the sealed Sod card noted apart.
 */
export function DealReveal({
  cards,
  nonce,
  onDone,
}: {
  /** The draw to reveal; the veiled anchor is flagged `sealed`. */
  cards: RevealCard[];
  /** Bumped on every draw so an identical result still re-triggers the reveal. */
  nonce: number;
  onDone: () => void;
}) {
  const reducedMotion = useMemo(
    () =>
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const [visible, setVisible] = useState(false);

  const nameOf = (c: RevealCard) => lettersById[c.draw.letterId]?.name ?? c.draw.letterId;
  // Open cards are named plainly; the sealed Sod card is noted apart (the Scribe
  // needs it, but it is never one of the public, open letters).
  const openNames = cards.filter((c) => !c.sealed).map(nameOf).join(", ");
  const sealedCard = cards.find((c) => c.sealed);

  // Total = the last card's flip finish + a hold + the fade-out. The overlay's
  // fade keyframe is stretched over this whole span so it stays lit until the
  // cards have settled, then fades once.
  const totalMs = cards.length * STAGGER_MS + FLIP_MS + HOLD_MS + FADE_MS;

  useEffect(() => {
    if (nonce === 0 || cards.length === 0) return;
    if (reducedMotion) {
      // No flip — the slots just fill. Still let the parent clear its nonce.
      onDone();
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, totalMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  // Announce the result for assistive tech whether or not the overlay plays.
  const announceText =
    nonce > 0 && cards.length > 0
      ? `Drawn from the deck: ${openNames}.` +
        (sealedCard ? ` The sealed Sod card: ${nameOf(sealedCard)}.` : "")
      : "";
  const announce = (
    <span className={styles.srOnly} role="status" aria-live="polite">
      {announceText}
    </span>
  );

  if (!visible || reducedMotion) return announce;

  return (
    <>
      {announce}
      <div
        className={styles.overlay}
        aria-hidden="true"
        style={{ animationDuration: `${totalMs}ms` }}
        onClick={() => {
          setVisible(false);
          onDone();
        }}
      >
        <div className={styles.row}>
          {cards.map((card, i) => {
            const letter = lettersById[card.draw.letterId];
            return (
              <div
                key={i}
                className={styles.card}
                style={{ animationDelay: `${i * STAGGER_MS}ms` }}
              >
                <div className={styles.inner} style={{ animationDelay: `${i * STAGGER_MS}ms` }}>
                  <div className={styles.back}>✦</div>
                  <div className={`${styles.front} ${card.sealed ? styles.sealedFront : ""}`}>
                    <span
                      className={styles.glyph}
                      style={card.draw.orientation === "reversed" ? reversedStyle : undefined}
                    >
                      {letter?.glyph ?? "?"}
                    </span>
                    <span className={styles.name}>
                      {card.sealed ? "The Sod — sealed" : (letter?.name ?? "")}
                    </span>
                    {card.sealed && <span className={styles.veil} aria-hidden="true" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

const STAGGER_MS = 200;
const FLIP_MS = 560;
const HOLD_MS = 750;
const FADE_MS = 420;

const reversedStyle = { transform: "rotate(180deg)", display: "inline-block" } as const;
