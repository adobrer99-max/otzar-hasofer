import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { shorashim, type ShoreshEntry } from "../data/shorashim.generated";
import { lettersById } from "../data/letters";
import { rootKeyFor } from "../types/commentary";
import { PardesEntry } from "./PardesEntry";
import styles from "./library.module.css";

/** Roots are deep-linkable: the open root lives in the URL, so a refresh or a shared link lands on it. */
const BASE = "/sefarim/hashorashim";

/** The three radicals as Hebrew glyphs, written right-to-left. */
function rootGlyphs(entry: ShoreshEntry): string {
  return entry.letters.map((id) => lettersById[id]?.glyph ?? "").join("");
}

function rootNames(entry: ShoreshEntry): string {
  return entry.letters.map((id) => lettersById[id]?.name ?? id).join("–");
}

const MAX_RESULTS = 40;

export function HaShorashimBook({ entryId }: { entryId?: string }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shorashim.slice(0, MAX_RESULTS);
    return shorashim
      .filter(
        (e) =>
          e.transliteration.toLowerCase().includes(q) ||
          e.gloss.toLowerCase().includes(q) ||
          rootNames(e).toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);
  }, [query]);

  const selected = entryId ? shorashim.find((e) => e.id === entryId) : undefined;

  if (entryId && !selected) {
    return (
      <div>
        <p>No root by that name is in the lexicon.</p>
        <p>
          <Link to={BASE}>← Back to the roots</Link>
        </p>
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <p>
          <Link to={BASE}>← Back to the roots</Link>
        </p>
        <h2>
          {rootNames(selected)}{" "}
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>({selected.transliteration})</span>
        </h2>
        <PardesEntry
          primaryHebrew={rootGlyphs(selected)}
          drashSubject={{ kind: "root", rootKey: rootKeyFor(selected.letters) }}
          drashAddLabel="Add a commentary on this root"
          peshat={
            <>
              <p>{selected.gloss}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {selected.citation}
                {selected.kind === "name" ? " · a biblical name" : " · an attested root"}
              </p>
            </>
          }
          remez={
            selected.usageNote ? (
              <p>{selected.usageNote}</p>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>
                No usage note transcribed for this entry yet.
              </p>
            )
          }
          sod={
            <>
              <p>
                The mystery of a root is disclosed only through the life of the one who draws
                it. Sit with this word before deciding what it asks of you:
              </p>
              <ul>
                <li>Where is this word already at work in your life?</li>
                <li>What would it mean to live it rather than define it?</li>
              </ul>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <p>
        The canonical lexicon of roots, drawn from the public-domain Brown-Driver-Briggs /
        Strong's Hebrew (never from the copyrighted HALOT). Search by transliteration, meaning,
        or letter name, then open a root to read it through the four tiers.
      </p>
      <p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roots (e.g. shamar, guard, Mem)"
          aria-label="Search the roots"
          style={{ width: "100%", maxWidth: 360 }}
        />
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {query.trim()
          ? `Showing up to ${MAX_RESULTS} matches.`
          : `Showing the first ${MAX_RESULTS} of ${shorashim.length} roots — search to narrow.`}
      </p>

      <div className={styles.cards}>
        {results.map((entry) => (
          <div key={entry.id} className={styles.card}>
            <Link to={`${BASE}/${entry.id}`}>
              <span className={styles.cardMeta} style={{ marginInlineStart: 0 }}>
                {rootGlyphs(entry)}
              </span>{" "}
              <span style={{ color: "var(--accent-bright)" }}>{rootNames(entry)}</span>{" "}
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                ({entry.transliteration})
              </span>
            </Link>
            <p>{entry.gloss}</p>
          </div>
        ))}
        {results.length === 0 && <p>No roots match that search.</p>}
      </div>
    </div>
  );
}
