import type { LetterCard } from "../types/letter";

export const REVERSED_FRAMING_LABEL = "Reversed — Turned Inward";

/**
 * Reversed is not a distinct meaning per letter — it's one shared convention:
 * drawn upside down, a letter's principle is read as turned inward rather
 * than outward.
 */
export function reversedFramingText(letter: Pick<LetterCard, "name" | "eternalPrinciple">): string {
  return (
    `Drawn upside down, ${letter.name} invites the participant to turn its energy inward. ` +
    `Rather than acting outward on "${letter.eternalPrinciple}", the reading holds it as a private, ` +
    `introspective question — something to sit with rather than something to do.`
  );
}
