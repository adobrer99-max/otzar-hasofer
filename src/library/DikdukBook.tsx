import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { groupRootsByPattern, ROOT_PATTERNS, type RootPatternId } from "../data/dikduk";
import { lettersById } from "../data/letters";
import type { ShoreshEntry } from "../data/shorashim.generated";
import styles from "./library.module.css";

const SAMPLE_SIZE = 24;

function rootGlyphs(entry: ShoreshEntry): string {
  return entry.letters.map((id) => lettersById[id]?.glyph ?? "").join("");
}

/**
 * Sefer HaDikduk — the grammar of the roots, taught through the lexicon
 * itself: the classical weak-radical categories, each opened onto the real
 * roots of Sefer HaShorashim that carry it.
 */
export function DikdukBook() {
  const groups = useMemo(() => groupRootsByPattern(), []);
  const [openPattern, setOpenPattern] = useState<RootPatternId>();

  return (
    <div>
      <p>
        Every Hebrew root wants three firm radicals; not every letter can hold the post. The
        gutturals refuse doubling, an opening Nun assimilates into its neighbor, a middle Vav
        or Yod collapses into a vowel, a closing Heh falls away — and the grammars classify
        each root by which of its letters bend. The categories below are that classical map,
        applied mechanically to this Treasury's own{" "}
        <Link to="/sefarim/hashorashim">Book of Roots</Link>: open a category to see the real
        roots that carry it, and open any root to read it through the four tiers.
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        The classification is pure letter-pattern logic over the BDB/Strong's-derived lexicon —
        first-draft reference content; spelling-level subtleties (defective vs. full spellings,
        original-Vav first radicals) are noted in the descriptions rather than modeled.
      </p>

      {groups.map(({ pattern, entries }) => (
        <section key={pattern.id}>
          <h2>
            <button
              type="button"
              onClick={() => setOpenPattern(openPattern === pattern.id ? undefined : pattern.id)}
              aria-expanded={openPattern === pattern.id}
              style={{ font: "inherit", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
            >
              {openPattern === pattern.id ? "▾" : "▸"} {pattern.name}{" "}
              <span className="hebrew" dir="rtl" style={{ fontSize: "0.85em" }}>
                {pattern.hebrewName}
              </span>{" "}
              <span style={{ color: "var(--text-muted)", fontSize: "0.8em" }}>
                ({entries.length} roots)
              </span>
            </button>
          </h2>
          <p>{pattern.description}</p>
          {openPattern === pattern.id && (
            <div className={styles.cards}>
              {entries.slice(0, SAMPLE_SIZE).map((entry) => (
                <div key={entry.id} className={styles.card}>
                  <Link to={`/sefarim/hashorashim/${entry.id}`}>
                    <span className={styles.cardMeta} style={{ marginInlineStart: 0 }}>
                      {rootGlyphs(entry)}
                    </span>{" "}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      ({entry.transliteration})
                    </span>
                  </Link>
                  <p>{entry.gloss}</p>
                </div>
              ))}
              {entries.length > SAMPLE_SIZE && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Showing {SAMPLE_SIZE} of {entries.length} — the rest are searchable in the{" "}
                  <Link to="/sefarim/hashorashim">Book of Roots</Link>.
                </p>
              )}
            </div>
          )}
        </section>
      ))}

      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {ROOT_PATTERNS.length} categories over {groups.reduce((n, g) => n + g.entries.length, 0)}{" "}
        pattern assignments (a root with several weak radicals appears under each).
      </p>
    </div>
  );
}
