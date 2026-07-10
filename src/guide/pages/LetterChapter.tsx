import { Link, useParams } from "react-router-dom";
import { letters, lettersById } from "../../data/letters";
import { ClassificationBadge } from "../components/ClassificationBadge";
import { ReversedFraming, REVERSED_FRAMING_LABEL } from "../components/ReversedFraming";
import { CommentarySection } from "../../commentaries/CommentarySection";
import styles from "./LetterChapter.module.css";

export function LetterChapter() {
  const { id } = useParams<{ id: string }>();
  const letter = id ? lettersById[id] : undefined;

  if (!letter) {
    return (
      <div className="page">
        <p>Letter not found.</p>
        <Link to="/guide/letters">← Back to the Twenty-Two Letters</Link>
      </div>
    );
  }

  const index = letters.findIndex((l) => l.id === letter.id);
  const prev = letters[(index - 1 + letters.length) % letters.length];
  const next = letters[(index + 1) % letters.length];

  return (
    <div className="page">
      <div className={styles.hero}>
        <span className={styles.glyph}>{letter.glyph}</span>
        <div>
          <div className="kicker">
            Chapter {letter.order} of 22 — {letter.keyword}
          </div>
          <h1>{letter.name}</h1>
          <div className={styles.meta}>
            <ClassificationBadge classification={letter.classification} />
            <span>Gematria: {letter.gematria}</span>
            {letter.element && <span>Element: {letter.element}</span>}
            {letter.astrological && <span>{letter.astrological}</span>}
            {letter.sefirahOrPath && <span>{letter.sefirahOrPath}</span>}
          </div>
        </div>
      </div>

      {letter.art && (
        <figure style={{ margin: "1rem 0", maxWidth: 360 }}>
          <img src={letter.art.src} alt={letter.art.alt} style={{ maxWidth: "100%", height: "auto" }} />
          {letter.art.credit && (
            <figcaption style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {letter.art.credit}
            </figcaption>
          )}
        </figure>
      )}

      <div className={styles.section}>
        <h3>Translation / Root</h3>
        <p>{letter.translationRoot}</p>
      </div>
      <div className={styles.section}>
        <h3>Eternal Principle</h3>
        <p>{letter.eternalPrinciple}</p>
      </div>
      {letter.question && (
        <div className={styles.section}>
          <h3>The Question</h3>
          <p>
            <em>{letter.question}</em>
          </p>
        </div>
      )}
      <div className={styles.section}>
        <h3>{REVERSED_FRAMING_LABEL}</h3>
        <ReversedFraming letter={letter} />
      </div>
      {letter.hebrewRoot && (
        <div className={styles.section}>
          <h3>Hebrew Root</h3>
          <p style={{ fontFamily: "var(--font-hebrew)" }}>{letter.hebrewRoot}</p>
        </div>
      )}
      {letter.scribeNotes && (
        <div className={styles.section}>
          <h3>Scribe's Notes</h3>
          <p>{letter.scribeNotes}</p>
        </div>
      )}
      <p className={styles.sources}>
        Sources: {letter.traditionalSources.join("; ")}
      </p>

      <CommentarySection subject={{ kind: "letter", letterId: letter.id }} />

      <p className={styles.sources}>
        See also: <Link to="/guide/shoresh">Shoresh</Link> — how three drawn
        letters become the root of a reading — and{" "}
        <Link to="/guide/dorot">Derekh Ha'Dorot</Link>, where the letters'
        eternal principles are lived out in history.
      </p>

      <div className={styles.nav}>
        <Link to={`/guide/letters/${prev.id}`}>
          ← {prev.glyph} {prev.name}
        </Link>
        <Link to="/guide/letters">All Letters</Link>
        <Link to={`/guide/letters/${next.id}`}>
          {next.glyph} {next.name} →
        </Link>
      </div>
    </div>
  );
}
