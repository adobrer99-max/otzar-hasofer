import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, EmptyState } from "../components/ui";
import type { CommentaryRecord, CommentarySubject } from "../types/commentary";
import {
  listAllCommentaries,
  addCommentary,
  updateCommentary,
  deleteCommentary,
} from "../storage/commentariesRepo";
import { CommentaryForm } from "./CommentaryForm";
import { CommentaryList } from "./CommentaryList";
import styles from "./commentaries.module.css";

type KindFilter = "all" | CommentarySubject["kind"];

const filters: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "letter", label: "Letters" },
  { value: "dorot-card", label: "Derekh Ha'Dorot" },
  { value: "root", label: "Roots" },
  { value: "liturgy", label: "Liturgies" },
  { value: "balagan", label: "Balagan" },
];

export function CommentariesPage() {
  const [commentaries, setCommentaries] = useState<CommentaryRecord[]>([]);
  const [filter, setFilter] = useState<KindFilter>("all");
  const [editing, setEditing] = useState<CommentaryRecord>();

  useEffect(() => {
    listAllCommentaries().then(setCommentaries);
  }, []);

  async function refresh() {
    setCommentaries(await listAllCommentaries());
  }

  async function handleSubmit(values: {
    subject: CommentarySubject;
    title?: string;
    author: string;
    body: string;
  }) {
    if (editing) {
      await updateCommentary(editing.id, values);
      setEditing(undefined);
    } else {
      await addCommentary(values);
    }
    await refresh();
  }

  async function handleDelete(record: CommentaryRecord) {
    if (!window.confirm(`Delete "${record.title ?? `Commentary of ${record.author}`}"? This cannot be undone.`)) {
      return;
    }
    await deleteCommentary(record.id);
    if (editing?.id === record.id) setEditing(undefined);
    await refresh();
  }

  const visible =
    filter === "all" ? commentaries : commentaries.filter((c) => c.subject.kind === filter);

  return (
    <div className="page">
      <PageHeader kicker="The Drash of the Treasury" title="Commentaries" hebrew="פירושים" />
      <p>
        Every reading proceeds through four tiers: the Letter as it is
        (Peshat), the witness of the tradition (Remez), the received and
        ongoing commentaries of the Scribe (Drash), and the participant's
        own lived experience (Sod) — the participant is the final
        commentary. This is the Drash shelf: marginal notes, unresolved
        questions, variant traditions, corrections, and respectful
        disagreements, kept alongside the received commentaries and
        preserved locally like everything else in the Treasury. Commentaries
        also appear inline on the <Link to="/guide/letters">letter</Link> and{" "}
        <Link to="/guide/dorot">Ha'Dorot</Link> pages they belong to.
      </p>

      <h2>{editing ? "Edit commentary" : "Add a commentary"}</h2>
      <CommentaryForm
        editing={editing}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditing(undefined)}
      />

      <div className={styles.filters}>
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            disabled={filter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No commentaries yet"
          description="The Drash tier is open — be the first to write one, using the form above."
        />
      ) : (
        <CommentaryList commentaries={visible} onEdit={setEditing} onDelete={handleDelete} />
      )}
    </div>
  );
}
