import { useState } from "react";
import type { ParticipantRecord, ReadingPath } from "../../types/herald";
import styles from "./history.module.css";

export function ParticipantPicker({
  participants,
  selectedId,
  onSelect,
  onCreate,
}: {
  participants: ParticipantRecord[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onCreate: (displayName: string, path: ReadingPath) => void;
}) {
  const [newName, setNewName] = useState("");

  return (
    <div className={styles.picker}>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
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
    </div>
  );
}
