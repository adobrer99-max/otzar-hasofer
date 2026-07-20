/**
 * The command-palette search index — a flat, static catalogue of everything a
 * Scribe can jump to: the guide/practice/library pages, the 22 letters, the
 * fourteen Houses of the Dorot, and the Sefarim. Assembled by reference from
 * the same data the pages render, so it can never drift from the routes.
 *
 * All content here is static and importable — the index builds synchronously,
 * with no IndexedDB read. User-authored content (commentaries, drafts) lives in
 * IDB and is deliberately out of scope for this v1 index.
 */

import { guideLinks, practiceLinks, libraryLinks, homeLink, accountLink } from "../components/siteMap";
import { letters } from "../data/letters";
import { dorotHouses } from "../data/dorot";
import { sefarim } from "../data/sefarim";

export type SearchCategory =
  | "Pages"
  | "Letters"
  | "Houses of the Dorot"
  | "Sefarim"
  | "Commentaries"
  | "Drafts";

/** The fixed display order of the result groups. */
export const CATEGORY_ORDER: SearchCategory[] = [
  "Pages",
  "Letters",
  "Houses of the Dorot",
  "Sefarim",
  "Commentaries",
  "Drafts",
];

export interface SearchEntry {
  id: string;
  label: string;
  /** Hebrew glyph / name, rendered `lang="he"` and searchable as-is. */
  hebrew?: string;
  /** A one-line description shown under the label. */
  sublabel?: string;
  category: SearchCategory;
  /** The in-app route this entry navigates to. */
  to: string;
  /** Extra searchable text (transliterations, alternate names) not shown. */
  keywords: string;
}

function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  // ——— Pages ———
  const pageLinks = [homeLink, ...guideLinks, ...practiceLinks, ...libraryLinks, accountLink];
  for (const link of pageLinks) {
    entries.push({
      id: `page:${link.to}`,
      label: link.label,
      sublabel: link.blurb,
      category: "Pages",
      to: link.to,
      keywords: link.blurb ?? "",
    });
  }

  // ——— Letters ———
  for (const letter of letters) {
    entries.push({
      id: `letter:${letter.id}`,
      label: letter.name,
      hebrew: letter.glyph,
      sublabel: letter.keyword,
      category: "Letters",
      to: `/guide/letters/${letter.id}`,
      keywords: `${letter.transliteration} ${letter.keyword} ${letter.translationRoot ?? ""}`,
    });
  }

  // ——— Houses of the Dorot ———
  for (const house of dorotHouses) {
    entries.push({
      id: `house:${house.id}`,
      label: house.figure,
      sublabel: house.houseName ?? `The House of ${house.figure}`,
      category: "Houses of the Dorot",
      to: `/guide/dorot/${house.id}`,
      keywords: `${house.houseName ?? ""} ${house.spiritualEnergy ?? ""}`,
    });
  }

  // ——— Sefarim ———
  for (const sefer of sefarim) {
    entries.push({
      id: `sefer:${sefer.id}`,
      label: sefer.title,
      hebrew: sefer.hebrewName,
      sublabel: sefer.subtitle,
      category: "Sefarim",
      // external-link Sefarim resolve to the page they stand in for; the rest
      // open their own reader at /sefarim/:id.
      to: sefer.target ?? `/sefarim/${sefer.id}`,
      keywords: `${sefer.subtitle} ${sefer.description}`,
    });
  }

  return entries;
}

/** The assembled index, built once at module load. */
export const searchIndex: SearchEntry[] = buildIndex();

/** Split a field into lowercased words, tolerating apostrophes, dots, and dashes. */
function words(field: string): string[] {
  return field
    .toLowerCase()
    .split(/[\s'’·.\-–—]+/)
    .filter(Boolean);
}

/**
 * Rank a single field against a query: prefix (0) > word-start (1) >
 * substring (2). Returns null when it doesn't appear at all.
 */
function scoreField(field: string | undefined, q: string): number | null {
  if (!field) return null;
  const f = field.toLowerCase();
  if (!f) return null;
  if (f.startsWith(q)) return 0;
  if (words(field).some((w) => w.startsWith(q))) return 1;
  if (f.includes(q)) return 2;
  return null;
}

function haystack(entry: SearchEntry): string {
  return [entry.label, entry.hebrew ?? "", entry.sublabel ?? "", entry.keywords]
    .join(" ")
    .toLowerCase();
}

/**
 * Case-insensitive ranked search over the index. Ranks whole-query matches on
 * the visible label/hebrew highest (prefix > word-start > substring), then
 * matches found only in the sublabel/keywords, then multi-token matches where
 * every token appears somewhere. An empty query returns the Pages group as
 * default suggestions. `extra` carries session-loaded user content
 * (commentaries, drafts) — the default keeps the static behavior unchanged.
 */
export function searchEntries(query: string, limit = 20, extra: SearchEntry[] = []): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return searchIndex.filter((e) => e.category === "Pages").slice(0, limit);
  }

  const candidates = extra.length ? [...searchIndex, ...extra] : searchIndex;
  const scored: { entry: SearchEntry; rank: number; order: number }[] = [];
  candidates.forEach((entry, order) => {
    // Best whole-query rank across the two visible fields.
    const nameScore = Math.min(
      scoreField(entry.label, q) ?? Infinity,
      scoreField(entry.hebrew, q) ?? Infinity,
    );
    let rank: number;
    if (nameScore !== Infinity) {
      rank = nameScore;
    } else if (haystack(entry).includes(q)) {
      // Appears only in sublabel/keywords.
      rank = 3;
    } else {
      // Multi-token: every token appears somewhere.
      const tokens = q.split(/\s+/).filter(Boolean);
      const hay = haystack(entry);
      if (tokens.length > 1 && tokens.every((t) => hay.includes(t))) {
        rank = 4;
      } else {
        return;
      }
    }
    scored.push({ entry, rank, order });
  });

  scored.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return scored.slice(0, limit).map((s) => s.entry);
}
