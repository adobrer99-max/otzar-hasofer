import { Link, Navigate, useParams } from "react-router-dom";
import { sefarimById } from "../data/sefarim";
import { shorashim } from "../data/shorashim.generated";
import { lettersById } from "../data/letters";
import { HaShorashimBook } from "./HaShorashimBook";
import { BalaganBook } from "./BalaganBook";
import { VocabularyTreasuryBook } from "./VocabularyTreasuryBook";
import { BookmarkRibbon } from "./BookmarkRibbon";
import styles from "./library.module.css";

/** The ribbon's stamp: the open root's letter names when reading one, else the Book's name. */
function ribbonLabel(seferTitle: string, entryId?: string): string {
  if (entryId) {
    const entry = shorashim.find((e) => e.id === entryId);
    if (entry) return entry.letters.map((l) => lettersById[l]?.name ?? l).join("–");
  }
  return seferTitle;
}

export function SeferPage() {
  const { id, entryId } = useParams<{ id: string; entryId?: string }>();
  const sefer = id ? sefarimById[id] : undefined;

  if (!sefer) {
    return (
      <div className="page">
        <p>That Book is not on the shelf.</p>
        <Link to="/sefarim">← Back to the shelf</Link>
      </div>
    );
  }

  // External-link Sefarim live elsewhere; if reached directly, forward to their home.
  if (sefer.kind === "external-link" && sefer.target) {
    return <Navigate to={sefer.target} replace />;
  }

  return (
    <div className={`page ${styles.bookPage}`}>
      <BookmarkRibbon label={ribbonLabel(sefer.title, entryId)} />

      <div className="page-header">
        <div className="kicker">{sefer.hebrewName} · {sefer.subtitle}</div>
        <h1>{sefer.title}</h1>
      </div>

      {sefer.kind === "pardes-browse" && <HaShorashimBook entryId={entryId} />}
      {sefer.kind === "balagan" && <BalaganBook />}
      {sefer.kind === "explainer" && <VocabularyTreasuryBook />}
      {sefer.kind === "forthcoming" && (
        <>
          <p>{sefer.description}</p>
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            This Book is named in the doc but its content is not yet transcribed. The spine
            is on the shelf so its place is kept.
          </p>
        </>
      )}

      <p style={{ marginTop: "var(--space-5)" }}>
        <Link to="/sefarim">← Back to the shelf</Link>
      </p>
    </div>
  );
}
