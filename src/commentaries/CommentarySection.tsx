import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CommentaryRecord, CommentarySubject } from "../types/commentary";
import { subjectKeyFor } from "../types/commentary";
import { listCommentariesForSubject } from "../storage/commentariesRepo";
import { CommentaryList } from "./CommentaryList";
import styles from "./commentaries.module.css";

/**
 * Read-only list of one subject's commentaries for embedding in guide
 * pages, with a link to the Commentaries space for authoring.
 */
export function CommentarySection({ subject }: { subject: CommentarySubject }) {
  const [commentaries, setCommentaries] = useState<CommentaryRecord[]>([]);
  const key = subjectKeyFor(subject);

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

  return (
    <div className={styles.inlineSection}>
      <h3>Commentaries</h3>
      {commentaries.length === 0 && <p>None received yet.</p>}
      <CommentaryList commentaries={commentaries} showSubject={false} />
      <Link to="/commentaries">Add a commentary →</Link>
    </div>
  );
}
