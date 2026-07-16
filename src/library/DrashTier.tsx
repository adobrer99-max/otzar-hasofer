import { useEffect, useState } from "react";
import type { CommentaryRecord, CommentarySubject } from "../types/commentary";
import {
  listCommentariesForSubject,
  addCommentary,
  updateCommentary,
  deleteCommentary,
} from "../storage/commentariesRepo";
import { CommentaryList } from "../commentaries/CommentaryList";
import { toast } from "../components/ui/toast";
import commentaryStyles from "../commentaries/commentaries.module.css";

/**
 * The Drash tier of a PaRDeS page (and the body of each Balagan section):
 * a subject's received + ongoing commentaries, with inline authoring. Reuses
 * the shared commentary store and `CommentaryList`; unlike the read-only
 * `CommentarySection`, this one lets the Scribe add, edit, and delete in place.
 */
export function DrashTier({
  subject,
  addLabel = "Add a commentary",
}: {
  subject: CommentarySubject;
  addLabel?: string;
}) {
  const [commentaries, setCommentaries] = useState<CommentaryRecord[]>([]);
  const [editing, setEditing] = useState<CommentaryRecord>();
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const key = JSON.stringify(subject);

  useEffect(() => {
    let cancelled = false;
    listCommentariesForSubject(subject).then((records) => {
      if (!cancelled) setCommentaries(records);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function refresh() {
    setCommentaries(await listCommentariesForSubject(subject));
  }

  function beginEdit(record: CommentaryRecord) {
    setEditing(record);
    setAuthor(record.author);
    setTitle(record.title ?? "");
    setBody(record.body);
  }

  function resetForm() {
    setEditing(undefined);
    setAuthor("");
    setTitle("");
    setBody("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCommentary(editing.id, { author: author.trim(), title: title.trim() || undefined, body: body.trim() });
      } else {
        await addCommentary({ subject, author: author.trim(), title: title.trim() || undefined, body: body.trim() });
      }
      resetForm();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: CommentaryRecord) {
    await deleteCommentary(record.id);
    if (editing?.id === record.id) resetForm();
    await refresh();
    toast("Commentary deleted");
  }

  return (
    <div>
      {commentaries.length === 0 && <p>None received yet.</p>}
      <CommentaryList
        commentaries={commentaries}
        showSubject={false}
        onEdit={beginEdit}
        onDelete={handleDelete}
      />

      <form className={commentaryStyles.form} onSubmit={handleSubmit}>
        <div className={commentaryStyles.formRow}>
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
          <label>
            Title (optional)
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
        </div>
        <label>
          {editing ? "Edit the commentary" : addLabel}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Blank lines separate paragraphs."
            required
          />
        </label>
        <div className={commentaryStyles.formRow}>
          <button type="submit" disabled={saving || !author.trim() || !body.trim()}>
            {editing ? "Save changes" : addLabel}
          </button>
          {editing && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
