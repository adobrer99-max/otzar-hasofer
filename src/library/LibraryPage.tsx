import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { sefarim, type SeferMeta } from "../data/sefarim";
import styles from "./library.module.css";

/** Where a spine leads: external-link Sefarim go straight to their target; the rest open in the library. */
function seferHref(sefer: SeferMeta): string {
  return sefer.kind === "external-link" && sefer.target ? sefer.target : `/sefarim/${sefer.id}`;
}

function Spine({ sefer }: { sefer: SeferMeta }) {
  const forthcoming = sefer.kind === "forthcoming";
  return (
    <Link
      to={seferHref(sefer)}
      className={`${styles.spine} ${forthcoming ? styles.forthcoming : ""}`}
      style={{ background: sefer.spineColor }}
      title={`${sefer.title} — ${sefer.subtitle}`}
    >
      <span className={styles.spineHebrew}>{sefer.hebrewName}</span>
      <span className={styles.spineTitle}>{sefer.title}</span>
      {forthcoming && <span className={styles.forthcomingTag}>forthcoming</span>}
    </Link>
  );
}

export function LibraryPage() {
  return (
    <div className="page page--wide">
      <PageHeader kicker="The Beit Midrash" title="The Shelf of Sefarim" hebrew="מדף הספרים" />
      <p>
        The Books of the Treasury, kept together as a library. Some are read,
        some are written, and some link to chapters already open elsewhere in
        the guide. Each Book that lives here opens as a four-tier page — Peshat,
        Remez, Drash, Sod — the same order every reading passes through.
      </p>

      <div className={styles.shelf} role="list" aria-label="The shelf of Sefarim">
        {sefarim.map((sefer) => (
          <div key={sefer.id} role="listitem">
            <Spine sefer={sefer} />
          </div>
        ))}
      </div>

      <div className="otz-shead" style={{ marginTop: "var(--space-5)" }}>
        <h2 className="otz-section-title">The Books</h2>
        <span className="otz-heb">הספרים</span>
      </div>
      <div className="otz-grid otz-grid--2">
        {sefarim.map((sefer) => (
          <Link key={sefer.id} to={seferHref(sefer)} className="otz-card">
            <div>
              <span className="otz-card__title">{sefer.title}</span>
              <span className="otz-card__heb">{sefer.hebrewName}</span>
            </div>
            <p className="otz-card__body">{sefer.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
