import { useEffect, useState } from "react";
import type { CommentaryRecord, CommentarySubject } from "../types/commentary";
import { rootKeyFor } from "../types/commentary";
import { letters } from "../data/letters";
import { dorotHouses, cardsByHouse } from "../data/dorot";
import styles from "./commentaries.module.css";

interface CommentaryFormProps {
  /** When set, the form edits this record (subject is locked). */
  editing?: CommentaryRecord;
  onSubmit: (values: {
    subject: CommentarySubject;
    title?: string;
    author: string;
    body: string;
  }) => Promise<void>;
  onCancelEdit?: () => void;
}

export function CommentaryForm({ editing, onSubmit, onCancelEdit }: CommentaryFormProps) {
  const [kind, setKind] = useState<CommentarySubject["kind"]>("letter");
  const [letterId, setLetterId] = useState(letters[0].id);
  const [houseId, setHouseId] = useState(dorotHouses[0].id);
  const [cardId, setCardId] = useState(cardsByHouse(dorotHouses[0].id)[0].id);
  const [rootLetters, setRootLetters] = useState<[string, string, string]>([
    letters[0].id,
    letters[0].id,
    letters[0].id,
  ]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title ?? "");
      setAuthor(editing.author);
      setBody(editing.body);
    } else {
      setTitle("");
      setBody("");
    }
  }, [editing]);

  const houseCards = cardsByHouse(houseId);

  function currentSubject(): CommentarySubject {
    if (editing) return editing.subject;
    switch (kind) {
      case "letter":
        return { kind: "letter", letterId };
      case "dorot-card":
        return { kind: "dorot-card", cardId };
      case "root":
        return { kind: "root", rootKey: rootKeyFor(rootLetters) };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        subject: currentSubject(),
        title: title.trim() || undefined,
        author: author.trim(),
        body: body.trim(),
      });
      if (!editing) {
        setTitle("");
        setBody("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {!editing && (
        <div className={styles.formRow}>
          <label>
            Subject
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CommentarySubject["kind"])}
              aria-label="Commentary subject kind"
            >
              <option value="letter">A Letter</option>
              <option value="dorot-card">A Derekh Ha'Dorot card</option>
              <option value="root">A Hebrew root</option>
            </select>
          </label>
          {kind === "letter" && (
            <label>
              Letter
              <select value={letterId} onChange={(e) => setLetterId(e.target.value)} aria-label="Letter">
                {letters.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.glyph} — {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "dorot-card" && (
            <>
              <label>
                House
                <select
                  value={houseId}
                  onChange={(e) => {
                    setHouseId(e.target.value);
                    setCardId(cardsByHouse(e.target.value)[0].id);
                  }}
                  aria-label="House"
                >
                  {dorotHouses.map((h) => (
                    <option key={h.id} value={h.id}>
                      House of {h.figure}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Card
                <select value={cardId} onChange={(e) => setCardId(e.target.value)} aria-label="Card">
                  {houseCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.index}. {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {kind === "root" &&
            rootLetters.map((value, i) => (
              <label key={i}>
                {["First", "Second", "Third"][i]} letter
                <select
                  value={value}
                  onChange={(e) =>
                    setRootLetters(
                      (prev) =>
                        prev.map((v, j) => (j === i ? e.target.value : v)) as [string, string, string],
                    )
                  }
                  aria-label={`Root letter ${i + 1}`}
                >
                  {letters.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.glyph} — {l.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </div>
      )}
      <div className={styles.formRow}>
        <label>
          Title (optional)
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Author
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name or pen name"
            required
          />
        </label>
      </div>
      <label>
        Commentary
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Blank lines separate paragraphs."
          required
        />
      </label>
      <div className={styles.formRow}>
        <button type="submit" disabled={saving || !author.trim() || !body.trim()}>
          {editing ? "Save changes" : "Add to the Treasury"}
        </button>
        {editing && onCancelEdit && (
          <button type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
