import { Link } from "react-router-dom";
import { liturgies, liturgiesById, LITURGY_SECTIONS } from "../data/liturgies";
import { PardesEntry } from "./PardesEntry";
import styles from "./library.module.css";

const BASE = "/sefarim/hatefillot";

/**
 * Sefer HaTefillot — the Book of Liturgies. Each liturgy opens as a
 * four-tier PaRDeS page: the canonical Hebrew as the Peshat, its occasion
 * as the Remez, the Scribe's addable commentaries as the Drash, and a
 * contemplative prompt as the Sod.
 */
export function TefillotBook({ entryId }: { entryId?: string }) {
  const selected = entryId ? liturgiesById[entryId] : undefined;

  if (entryId && !selected) {
    return (
      <div>
        <p>No liturgy by that name is in the Book.</p>
        <p>
          <Link to={BASE}>← Back to the liturgies</Link>
        </p>
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <p>
          <Link to={BASE}>← Back to the liturgies</Link>
        </p>
        <h2>
          {selected.title}{" "}
          <span className="hebrew" dir="rtl" style={{ fontSize: "0.9em" }}>
            {selected.hebrewName}
          </span>
        </h2>
        <PardesEntry
          drashSubject={{ kind: "liturgy", liturgyId: selected.id }}
          drashAddLabel="Add a commentary on this liturgy"
          peshat={
            <>
              <p className="hebrew" dir="rtl" style={{ fontSize: "1.25rem", lineHeight: 1.9 }}>
                {selected.hebrew}
              </p>
              <p>{selected.english}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                The Hebrew is the traditional, public-domain formula, given unvowelized — verify
                against your own siddur before ritual use. The English rendering is a first
                draft in this project's voice.
              </p>
            </>
          }
          remez={<p>{selected.occasionNote}</p>}
          sod={<p>{selected.sodPrompt}</p>}
        />
      </div>
    );
  }

  return (
    <div>
      <p>
        The liturgies of the practice, by occasion — Shabbat, holidays, fasts, festivals, and
        the events of a life. Open one to read it through the four tiers and add your own
        Drash.
      </p>
      {LITURGY_SECTIONS.map((section) => {
        const entries = liturgies.filter((l) => l.section === section.id);
        if (entries.length === 0) return null;
        return (
          <section key={section.id}>
            <h2>
              {section.title}{" "}
              <span className="hebrew" dir="rtl" style={{ fontSize: "0.85em", color: "var(--text-muted)" }}>
                {section.hebrewName}
              </span>
            </h2>
            <div className={styles.cards}>
              {entries.map((liturgy) => (
                <div key={liturgy.id} className={styles.card}>
                  <Link to={`${BASE}/${liturgy.id}`}>
                    <span style={{ color: "var(--accent-bright)" }}>{liturgy.title}</span>{" "}
                    <span className="hebrew" dir="rtl" style={{ fontSize: "0.85rem" }}>
                      {liturgy.hebrewName}
                    </span>
                  </Link>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{liturgy.occasionNote}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
