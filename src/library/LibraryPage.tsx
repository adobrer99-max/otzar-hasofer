import { Link } from "react-router-dom";
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
    <div className="page">
      <div className="page-header">
        <div className="kicker">The Beit Midrash</div>
        <h1>The Shelf of Sefarim</h1>
      </div>
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

      <div className={styles.cards}>
        {sefarim.map((sefer) => (
          <div key={sefer.id} className={styles.card}>
            <Link to={seferHref(sefer)}>{sefer.title}</Link>
            <span className={styles.cardMeta}>{sefer.hebrewName}</span>
            <p>{sefer.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
