import { Link, Navigate, useParams } from "react-router-dom";
import { sefarimById } from "../data/sefarim";
import { HaShorashimBook } from "./HaShorashimBook";
import { BalaganBook } from "./BalaganBook";
import { VocabularyTreasuryBook } from "./VocabularyTreasuryBook";

export function SeferPage() {
  const { id } = useParams<{ id: string }>();
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
    <div className="page">
      <div className="page-header">
        <div className="kicker">{sefer.hebrewName} · {sefer.subtitle}</div>
        <h1>{sefer.title}</h1>
      </div>

      {sefer.kind === "pardes-browse" && <HaShorashimBook />}
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
