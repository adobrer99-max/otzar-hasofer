import { useState, useSyncExternalStore } from "react";
import { getCardArtVersion, subscribeCardArt } from "../../data/cardArtVersion";
import type { CardArt } from "../../types/letter";

/** Re-render whenever uploaded art is applied or cleared. */
export function useCardArtVersion(): number {
  return useSyncExternalStore(subscribeCardArt, getCardArtVersion, getCardArtVersion);
}

/**
 * The art a card should show right now: subscribes to art changes, and drops
 * an image that failed to load so the caller falls back to its drawn glyph.
 * Pass the record's field fresh each render (`useCardArt(letter.art)`).
 */
export function useCardArt(art: CardArt | undefined): { art: CardArt | undefined; onError: () => void } {
  useCardArtVersion();
  const [failedSrc, setFailedSrc] = useState<string>();
  const visible = art && art.src !== failedSrc ? art : undefined;
  return { art: visible, onError: () => setFailedSrc(art?.src) };
}
