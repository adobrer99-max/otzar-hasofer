/**
 * Merge uploaded card art onto the live in-memory datasets (the same posture
 * as the Scriptorium's applyContentOverrides): the renderers already read
 * `letter.art` / `card.art`, so writing the objects in place lights up every
 * consumer with no refactor.
 *
 * Startup order matters for offline + first paint: `initCardArt()` applies a
 * localStorage-cached copy synchronously before render (instant, works
 * offline), then refreshes from the cloud in the background and re-applies +
 * rewrites the cache. Each apply/clear bumps the art version, so pages
 * already on screen re-render with freshly fetched art.
 */

import { lettersById } from "../data/letters";
import { dorotCardsById } from "../data/dorot";
import { bumpCardArt } from "../data/cardArtVersion";
import { isCloudConfigured } from "./config";
import type { CardArtRow } from "./cardArt";

const CACHE_KEY = "otz-card-art-v1";

/** Write art rows onto the live letter/dorot records. Idempotent. */
export function applyCardArt(rows: CardArtRow[]): void {
  for (const row of rows) {
    const art = { src: row.src, alt: row.alt, credit: row.credit || undefined };
    if (row.id.startsWith("letter:")) {
      const letter = lettersById[row.id.slice("letter:".length)];
      if (letter) letter.art = art;
    } else if (row.id.startsWith("dorot:")) {
      const card = dorotCardsById[row.id.slice("dorot:".length)];
      if (card) card.art = art;
    }
  }
  if (rows.length > 0) bumpCardArt();
}

/** Remove an entry's art from the live records (after a studio delete). */
export function clearCardArt(id: string): void {
  if (id.startsWith("letter:")) {
    const letter = lettersById[id.slice("letter:".length)];
    if (letter) delete letter.art;
  } else if (id.startsWith("dorot:")) {
    const card = dorotCardsById[id.slice("dorot:".length)];
    if (card) delete card.art;
  }
  bumpCardArt();
}

export function readCardArtCache(): CardArtRow[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CardArtRow[]) : [];
  } catch {
    return [];
  }
}

export function writeCardArtCache(rows: CardArtRow[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    // storage full/unavailable — the cloud fetch still applies in-memory
  }
}

/**
 * Call once at startup. Synchronous cache apply (never delays first paint,
 * keeps art offline), then a background refresh from the registry.
 */
export function initCardArt(): void {
  if (!isCloudConfigured()) return;
  applyCardArt(readCardArtCache());
  void (async () => {
    try {
      const { fetchCardArtRows } = await import("./cardArt");
      const rows = await fetchCardArtRows();
      // Art removed on another device: drop what the cache applied but the
      // registry no longer lists, before applying the fresh rows.
      const live = new Set(rows.map((r) => r.id));
      for (const cached of readCardArtCache()) {
        if (!live.has(cached.id)) clearCardArt(cached.id);
      }
      applyCardArt(rows);
      writeCardArtCache(rows);
    } catch {
      // offline or cloud unreachable — the cached copy already applied
    }
  })();
}
