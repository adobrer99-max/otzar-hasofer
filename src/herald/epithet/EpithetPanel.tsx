import { useMemo, useState } from "react";
import type { HeraldLayer, ParticipantRecord } from "../../types/herald";
import { setHeraldicEpithet } from "../../storage/participantsRepo";
import { deriveEpithet } from "./deriveEpithet";
import styles from "./epithet.module.css";

interface EpithetPanelProps {
  participant: ParticipantRecord;
  layers: HeraldLayer[];
  onParticipantChange: (updated: ParticipantRecord) => void;
}

/**
 * Shown once a participant reaches their seventh reading without a sealed
 * Epithet: the Treasury proposes one from the seven readings' history, the
 * Scribe may reword it, and sealing is permanent.
 */
export function EpithetPanel({ participant, layers, onParticipantChange }: EpithetPanelProps) {
  const derived = useMemo(() => deriveEpithet(layers), [layers]);
  const [text, setText] = useState(derived.text);
  const [saving, setSaving] = useState(false);

  async function handleSeal() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const updated = await setHeraldicEpithet(participant.id, trimmed, derived.text);
      onParticipantChange(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>The Heraldic Epithet</div>
      <p className={styles.note}>
        Creation is complete; the Herald is revealed. From the seven readings
        the Treasury proposes an Epithet — reword it if another chapter of
        life suggests otherwise, then seal it. Sealing is permanent.
      </p>
      <p className={styles.proposal}>“{derived.text}”</p>
      <div className={styles.row}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Heraldic Epithet"
        />
        <button type="button" onClick={handleSeal} disabled={saving || !text.trim()}>
          Seal the Epithet
        </button>
      </div>
    </div>
  );
}
