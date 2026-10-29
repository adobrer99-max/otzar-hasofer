/**
 * A change counter for uploaded card art. The art itself is written straight
 * onto the live letter / Dorot records (see cloud/applyCardArt.ts); this is
 * only the signal that it happened, so a page that rendered before the
 * background registry fetch landed re-renders and shows the art at once.
 * Lives in data/ (no cloud import) so every renderer can subscribe.
 */

let version = 0;
const listeners = new Set<() => void>();

export function getCardArtVersion(): number {
  return version;
}

export function subscribeCardArt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Announce that art was applied or cleared. */
export function bumpCardArt(): void {
  version += 1;
  for (const listener of listeners) listener();
}
