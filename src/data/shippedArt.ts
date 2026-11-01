import { shippedCardArt, type ShippedArtEntry } from "./shippedCardArt.generated";
import { lettersById } from "./letters";
import { dorotCardsById } from "./dorot";

/**
 * Card art shipped with the site (public/art/, registered at build time by
 * scripts/build-card-art.mjs) — the way a cloud-free deploy carries the
 * designer's art. Cloud uploads, where a cloud exists, take precedence.
 */

export interface ArtRow {
  id: string;
  src: string;
  alt: string;
  credit?: string | null;
}

/** The card an art id names, or undefined for an id that matches nothing. */
function describe(id: string): string | undefined {
  if (id.startsWith("letter:")) {
    const letter = lettersById[id.slice("letter:".length)];
    return letter ? `${letter.name} — ${letter.keyword}` : undefined;
  }
  if (id.startsWith("dorot:")) return dorotCardsById[id.slice("dorot:".length)]?.title;
  return undefined;
}

/** Shipped entries as art rows, alt text defaulting to the card's own name (pure). */
export function toArtRows(entries: ShippedArtEntry[]): ArtRow[] {
  return entries.flatMap((e) => {
    const fallback = describe(e.id);
    if (fallback === undefined) return [];
    return [{ id: e.id, src: e.src, alt: e.alt ?? fallback, credit: e.credit ?? null }];
  });
}

/** Shipped entries whose file name matches no letter or Dorot card. */
export function unknownArtIds(entries: ShippedArtEntry[]): string[] {
  return entries.filter((e) => describe(e.id) === undefined).map((e) => e.id);
}

export const shippedArtRows: ArtRow[] = toArtRows(shippedCardArt);
export const shippedArtById: ReadonlyMap<string, ArtRow> = new Map(shippedArtRows.map((r) => [r.id, r]));
