import { Link } from "react-router-dom";
import type { CommentaryRecord } from "../types/commentary";
import { isSeedCommentary } from "../data/seedCommentaries";
import { formatHebrewDateEnglish } from "../data/hebrewCalendar";
import { subjectLabel } from "./subjectLabel";
import { ConfirmButton } from "../components/ui";
import styles from "./commentaries.module.css";

interface CommentaryListProps {
  commentaries: CommentaryRecord[];
  /** Hide the subject line when listing under the subject itself (e.g. on a letter chapter). */
  showSubject?: boolean;
  onEdit?: (record: CommentaryRecord) => void;
  onDelete?: (record: CommentaryRecord) => void;
}

export function CommentaryList({ commentaries, showSubject = true, onEdit, onDelete }: CommentaryListProps) {
  if (commentaries.length === 0) return null;
  return (
    <>
      {commentaries.map((record) => {
        const seed = isSeedCommentary(record.id);
        const subject = subjectLabel(record.subject);
        return (
          <div key={record.id} className={styles.entry}>
            <div className={styles.entryHeader}>
              <span className={styles.entryTitle}>
                {record.title ?? `Commentary of ${record.author}`}
              </span>
              {seed && <span className={styles.seedBadge}>Received</span>}
            </div>
            <div className={styles.entryMeta}>
              Commentary of {record.author}, {formatHebrewDateEnglish(record.hebrewDate)}
              {showSubject && (
                <>
                  {" · "}
                  {subject.to ? <Link to={subject.to}>{subject.label}</Link> : subject.label}
                </>
              )}
            </div>
            <div className={styles.body}>
              {record.body.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {!seed && (onEdit || onDelete) && (
              <div className={styles.actions}>
                {onEdit && (
                  <button type="button" onClick={() => onEdit(record)}>
                    Edit
                  </button>
                )}
                {onDelete && (
                  <ConfirmButton
                    confirmLabel="Delete"
                    ariaLabel="Confirm delete commentary"
                    onConfirm={() => onDelete(record)}
                  >
                    Delete
                  </ConfirmButton>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
