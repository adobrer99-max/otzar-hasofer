import { useEffect, useMemo, useRef, useState } from "react";
import type { LetterDraw } from "../../types/herald";
import { lettersById } from "../../data/letters";
import {
  isDealSoundOn,
  setDealSoundOn,
  ensureAudio,
  scheduleDealFeedback,
} from "./dealFeedback";
import styles from "./dealReveal.module.css";

/** The Word of the Reading, when the open letters resolve to a root/name. */
export interface RevealWord {
  text: string;
  gloss: string;
}

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
  word,
  onDone,
}: {
  /** The draw to reveal; the veiled anchor is flagged `sealed`. */
  cards: RevealCard[];
  /** Bumped on every draw so an identical result still re-triggers the reveal. */
  nonce: number;
  /** The Word the open letters spell, shown as a closing flourish (optional). */
  word?: RevealWord | null;
  onDone: () => void;
}) {
  const reducedMotion = useMemo(
    () =>
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const [visible, setVisible] = useState(false);
  const [soundOn, setSoundOn] = useState(isDealSoundOn);
  const cancelFeedbackRef = useRef<(() => void) | undefined>(undefined);

  const nameOf = (c: RevealCard) => lettersById[c.draw.letterId]?.name ?? c.draw.letterId;
  // Open cards are named plainly; the sealed Sod card is noted apart (the Scribe
  // needs it, but it is never one of the public, open letters).
  const openNames = cards.filter((c) => !c.sealed).map(nameOf).join(", ");
  const sealedCard = cards.find((c) => c.sealed);

  // Total = the last card's flip finish + a hold + the fade-out. The overlay's
  // fade keyframe is stretched over this whole span so it stays lit until the
  // cards have settled, then fades once. A Word flourish adds a longer hold so
  // it can be read before the overlay dismisses.
  const totalMs =
    cards.length * STAGGER_MS + FLIP_MS + HOLD_MS + FADE_MS + (word ? WORD_HOLD_MS : 0);

  useEffect(() => {
    if (nonce === 0 || cards.length === 0) return;
    if (reducedMotion) {
      // No flip — the slots just fill. Still let the parent clear its nonce.
      onDone();
      return;
    }
    setVisible(true);
    cancelFeedbackRef.current =
      soundOn ? scheduleDealFeedback(cards.length, STAGGER_MS, FLIP_MS) : undefined;
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, totalMs);
    return () => {
      clearTimeout(timer);
      cancelFeedbackRef.current?.();
      cancelFeedbackRef.current = undefined;
    };
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
      <button
        type="button"
        className={styles.soundToggle}
        aria-pressed={soundOn}
        aria-label="Deal sound"
        title={soundOn ? "Mute the deal" : "Sound the deal"}
        onClick={(e) => {
          e.stopPropagation();
          const next = !soundOn;
          setSoundOn(next);
          setDealSoundOn(next);
          // Creating/resuming the AudioContext here — inside a user gesture —
          // satisfies autoplay policies for the ticks that follow.
          if (next) ensureAudio();
        }}
      >
        {soundOn ? "🔔" : "🔕"}
      </button>
      <div
        className={styles.overlay}
        aria-hidden="true"
        style={{ animationDuration: `${totalMs}ms` }}
        onClick={() => {
          cancelFeedbackRef.current?.();
          cancelFeedbackRef.current = undefined;
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
                    {!card.sealed && letter && (
                      <>
                        <span className={styles.keyword}>{letter.keyword}</span>
                        <span className={styles.orient}>
                          {card.draw.orientation === "reversed" ? "Reversed — inward" : "Upright"}
                        </span>
                      </>
                    )}
                    {card.sealed && <span className={styles.veil} aria-hidden="true" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {word && (
          <div
            className={styles.word}
            style={{ animationDelay: `${cards.length * STAGGER_MS + FLIP_MS}ms` }}
          >
            The letters spell{" "}
            <span className={`${styles.wordHebrew} hebrew`} dir="rtl" lang="he">
              {word.text}
            </span>{" "}
            — {word.gloss}
          </div>
        )}
      </div>
    </>
  );
}

const STAGGER_MS = 200;
const FLIP_MS = 560;
const HOLD_MS = 750;
const FADE_MS = 420;
const WORD_HOLD_MS = 1500;

const reversedStyle = { transform: "rotate(180deg)", display: "inline-block" } as const;
