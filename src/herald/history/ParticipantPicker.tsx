import { useState } from "react";
import type { ParticipantRecord, ReadingPath } from "../../types/herald";
import styles from "./history.module.css";

export function ParticipantPicker({
  participants,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
}: {
  participants: ParticipantRecord[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onCreate: (displayName: string, path: ReadingPath) => void;
  onDelete?: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const selected = participants.find((p) => p.id === selectedId);

  return (
    <div className={styles.picker}>
      <select
        value={selectedId ?? ""}
        onChange={(e) => {
          setConfirming(false);
          onSelect(e.target.value);
        }}
        aria-label="Select participant"
      >
        <option value="" disabled>
          Select a participant…
        </option>
        {participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="New participant name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
      <button
        type="button"
        onClick={() => {
          if (!newName.trim()) return;
          onCreate(newName.trim(), "brit");
          setNewName("");
        }}
      >
        + New participant
      </button>
      {onDelete && selected && !confirming && (
        <button type="button" className={styles.dangerLink} onClick={() => setConfirming(true)}>
          Remove participant
        </button>
      )}
      {onDelete && selected && confirming && (
        <span className={styles.confirm} role="group" aria-label="Confirm removal">
          <span className={styles.confirmText}>
            Delete <strong>{selected.displayName}</strong> and all their readings?
          </span>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => {
              setConfirming(false);
              onDelete(selected.id);
            }}
          >
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </span>
      )}
    </div>
  );
}
