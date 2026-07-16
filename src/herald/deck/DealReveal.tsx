import { useEffect, useMemo, useState } from "react";
import type { LetterDraw } from "../../types/herald";
import { lettersById } from "../../data/letters";
import styles from "./dealReveal.module.css";

/**
 * A ceremonial reveal for a deck draw: the drawn cards flip over one by one,
 * face-down seal to face-up letter, then fade. Presentation only — it renders
 * whatever `drawLetters` returned and never touches the reading itself, so the
 * settled form-slots / folio remain the source of truth (and stay accessible).
 *
 * Reduced-motion users get no overlay at all (the slots simply fill); the drawn
 * letters are announced politely to assistive tech in both cases.
 */
export function DealReveal({
  cards,
  nonce,
  onDone,
}: {
  /** The draw to reveal — the same LetterDraw[] handed to the reading. */
  cards: LetterDraw[];
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

  const names = cards
    .map((c) => lettersById[c.letterId]?.name ?? c.letterId)
    .join(", ");

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
  const announce = (
    <span className={styles.srOnly} role="status" aria-live="polite">
      {nonce > 0 && cards.length > 0 ? `Drawn from the deck: ${names}.` : ""}
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
            const letter = lettersById[card.letterId];
            return (
              <div
                key={i}
                className={styles.card}
                style={{ animationDelay: `${i * STAGGER_MS}ms` }}
              >
                <div className={styles.inner} style={{ animationDelay: `${i * STAGGER_MS}ms` }}>
                  <div className={styles.back}>✦</div>
                  <div className={styles.front}>
                    <span
                      className={styles.glyph}
                      style={card.orientation === "reversed" ? reversedStyle : undefined}
                    >
                      {letter?.glyph ?? "?"}
                    </span>
                    <span className={styles.name}>{letter?.name ?? ""}</span>
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
