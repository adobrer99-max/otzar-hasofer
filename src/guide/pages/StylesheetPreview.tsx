import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./StylesheetPreview.module.css";

/** The letter specimens shown in the card grid. */
const letters = [
  { glyph: "א", name: "Aleph", meaning: "The Silent Genesis" },
  { glyph: "מ", name: "Mem", meaning: "The Flow of Time" },
  { glyph: "ש", name: "Shin", meaning: "Transformation" },
];

/** The spine specimens shown on the shelf, with their per-book heights. */
const spines = [
  { cls: styles.spineGold, title: "ספר השורשים", latin: "Sefer HaShorashim", h: 210 },
  { cls: styles.spineCopper, title: "בלגן האוצר", latin: "Balagan HaOtzar", h: 224 },
  { cls: styles.spineBlue, title: "אוצר המילים", latin: "Otzar HaMilim", h: 216 },
  { cls: styles.spineSilver, title: "ספר המועדים", latin: "Sefer HaMo'adim", h: 222 },
];

const chipLabels = ["All", "Letters", "Roots", "Balagan"] as const;

/**
 * Stylesheet Preview — the illuminated "plate" specimen.
 *
 * A faithful recreation of the design-handoff preview: one framed artifact that
 * shows every plate-layer component (nav, reading column, cards, letter grid,
 * spine shelf, chips, buttons, feed, status bar). It is a living reference for
 * the treatments the Guide slugs can adopt, rendered in the Visual Canon and
 * theme-aware through the same theme.css tokens as the rest of the Treasury.
 */
export function StylesheetPreview() {
  const [activeChip, setActiveChip] = useState<(typeof chipLabels)[number]>("All");

  return (
    <div className="page page--wide">
      <div className={styles.plate}>
        {/* ——— nav specimen ——— */}
        <nav className={styles.nav} aria-label="Stylesheet nav specimen">
          <div className={styles.navGroup}>
            <Link className={styles.brand} to="/">
              <span className={styles.brandMark} aria-hidden="true">
                א
              </span>
              <span className={styles.brandWord}>אוצר הסופר</span>
            </Link>
            <div className={styles.navLinks}>
              <Link to="/">The Treasury</Link>
              <Link className={styles.active} to="/guide/foundations">
                The Guide ▾
              </Link>
              <Link to="/herald">The Practice ▾</Link>
              <Link to="/sefarim">The Sefarim</Link>
              <Link to="/commentaries">Commentaries</Link>
            </div>
          </div>
          <div className={styles.navRight}>
            <Link className={styles.navAccount} to="/account">
              Account
            </Link>
            <span className={styles.navToggle} aria-hidden="true">
              ☀
            </span>
          </div>
        </nav>

        {/* ——— reading column ——— */}
        <div className={`${styles.read} ${styles.prose}`}>
          <div className={styles.eyebrow}>Stylesheet Reference</div>
          <h1 className={styles.title}>Extending the Design</h1>
          <div className={styles.heb}>גיליון סגנון</div>
          <div className={styles.rule} />

          <p>
            This page shows the illuminated plate layer as one artifact. Every
            element below is a component of the Visual Canon — link a reference
            slug to these treatments and its markup inherits the prototype look,
            on both the charcoal and vellum grounds.
          </p>

          <div className={styles.callout}>
            <p>
              Callouts, section labels, and note panels carry the same reverent
              hierarchy as the built pages.
            </p>
          </div>

          <div className={styles.sectionLabel}>I · A Sample Section</div>
          <p>
            Body copy sits at a measured width in the Visual Canon:{" "}
            <em>Frank Ruhl Libre</em> for Latin, <em>David Libre</em> for Hebrew.
            Every colour pulls from the <em>theme.css</em> tokens, so this layer
            follows both grounds. Links look like{" "}
            <Link to="/guide/visual-canon">this one</Link>.
          </p>

          <div className={styles.notePanel}>
            <p>
              A bordered note panel, used for set-apart passages such as the
              Shoresh Nistar.
            </p>
          </div>
        </div>

        {/* ——— components ——— */}
        <div className={styles.content} style={{ paddingTop: 0 }}>
          <div className={styles.sectionLabel}>Cards</div>
          <div className={styles.grid3}>
            {letters.map((l) => (
              <Link className={styles.letter} to="/guide/letters" key={l.name}>
                <span className={styles.letterGlyph}>{l.glyph}</span>
                <span className={styles.letterName}>{l.name}</span>
                <span className={styles.letterMeaning}>{l.meaning}</span>
              </Link>
            ))}
          </div>

          <Link className={`${styles.card} ${styles.cardGold}`} to="/sefarim">
            <div>
              <span className={styles.cardTitle}>Sefer HaShorashim</span>
              <span className={styles.cardHeb}>ספר השורשים</span>
            </div>
            <p className={styles.cardBody}>
              The canonical lexicon of Hebrew roots. Each root opens as a
              four-tier page.
            </p>
            <div className={styles.pips}>
              <span className={styles.pip}>פשט</span>
              <span className={styles.pip}>רמז</span>
              <span className={styles.pip}>דרש</span>
              <span className={styles.pip}>סוד</span>
            </div>
          </Link>

          {/* shelf */}
          <div className={styles.sectionLabel}>Shelf</div>
          <div className={styles.shelf}>
            {spines.map((s) => (
              <Link
                className={`${styles.spine} ${s.cls}`}
                to="/sefarim"
                key={s.latin}
                style={{ height: s.h }}
              >
                <span className={styles.spineTitle}>{s.title}</span>
                <span className={styles.spineLatin}>{s.latin}</span>
              </Link>
            ))}
          </div>
          <div className={styles.ledge} />

          {/* chips + buttons */}
          <div className={styles.sectionLabel}>Chips &amp; Buttons</div>
          <div className={styles.chips}>
            {chipLabels.map((label) => (
              <button
                type="button"
                key={label}
                className={`${styles.chip} ${activeChip === label ? styles.chipActive : ""}`}
                aria-pressed={activeChip === label}
                onClick={() => setActiveChip(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.buttons}>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} to="/guide/foundations">
              Enter the Guide
            </Link>
            <Link className={`${styles.btn} ${styles.btnGhost}`} to="/mizbeach">
              Begin a Reading
            </Link>
          </div>

          {/* feed */}
          <div className={`${styles.sectionLabel} ${styles.blockLabel}`}>Feed</div>
          <div className={styles.feed}>
            <div className={styles.feedCard}>
              <div className={styles.feedTitle}>Why?</div>
              <div className={styles.feedByline}>
                Commentary of Aleph Yud · 29 Tammuz 5786 ·{" "}
                <Link to="/sefarim">Balagan HaOtzar</Link>
              </div>
              <p className={styles.feedBody}>
                A question kept here so it is not lost.
              </p>
            </div>
          </div>
        </div>

        {/* ——— status bar ——— */}
        <div className={styles.statusbar}>
          <span className={styles.statusDot} />
          <span>29 Tammuz 5786 · Tuesday · Parashat Devarim</span>
        </div>
      </div>
    </div>
  );
}
