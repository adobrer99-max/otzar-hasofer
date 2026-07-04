import { useState } from "react";
import type { ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import { hebrewDateFromGregorian, formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { setHebrewBirthDate } from "../../storage/participantsRepo";
import { addYahrzeit, deleteLifeCycleEvent, listLifeCycleEvents } from "../../storage/lifeCycleRepo";
import styles from "./lifeCycle.module.css";

export interface LifeCycleEventsPanelProps {
  participant: ParticipantRecord;
  onParticipantChange: (updated: ParticipantRecord) => void;
  events: LifeCycleEvent[];
  onEventsChange: (events: LifeCycleEvent[]) => void;
}

export function LifeCycleEventsPanel({
  participant,
  onParticipantChange,
  events,
  onEventsChange,
}: LifeCycleEventsPanelProps) {
  const [birthDateInput, setBirthDateInput] = useState("");
  const [relation, setRelation] = useState("");
  const [personName, setPersonName] = useState("");
  const [passingDate, setPassingDate] = useState("");
  const [notes, setNotes] = useState("");
  const [adarRule, setAdarRule] = useState<"adarI" | "adarII" | undefined>(undefined);

  async function handleSetBirthDate() {
    if (!birthDateInput) return;
    const hebrewDate = hebrewDateFromGregorian(new Date(birthDateInput));
    const updated = await setHebrewBirthDate(participant.id, hebrewDate);
    onParticipantChange(updated);
    setBirthDateInput("");
  }

  async function handleAddYahrzeit() {
    if (!relation || !personName || !passingDate) return;
    await addYahrzeit(participant.id, {
      relation,
      personName,
      gregorianDateOfEvent: passingDate,
      notes: notes || undefined,
      adarRule,
    });
    onEventsChange(await listLifeCycleEvents(participant.id));
    setRelation("");
    setPersonName("");
    setPassingDate("");
    setNotes("");
    setAdarRule(undefined);
  }

  async function handleDelete(id: string) {
    await deleteLifeCycleEvent(id);
    onEventsChange(events.filter((e) => e.id !== id));
  }

  const isAdarAnchor = passingDate
    ? hebrewDateFromGregorian(new Date(passingDate)).month === "Adar"
    : false;

  return (
    <div className={styles.panel}>
      <h3>Hebrew Birthday</h3>
      {participant.hebrewBirthDate ? (
        <p>{formatHebrewDateEnglish(participant.hebrewBirthDate)}</p>
      ) : (
        <div className={styles.row}>
          <input
            type="date"
            value={birthDateInput}
            onChange={(e) => setBirthDateInput(e.target.value)}
          />
          <button type="button" onClick={handleSetBirthDate}>
            Set Hebrew Birthday
          </button>
        </div>
      )}

      <h3>Yahrzeits</h3>
      {events.length > 0 && (
        <ul className={styles.eventList}>
          {events.map((event) => (
            <li key={event.id}>
              <span>
                {event.relation}: {event.personName} — {formatHebrewDateEnglish(event.hebrewDate)}
                {event.notes && ` (${event.notes})`}
              </span>
              <button type="button" onClick={() => handleDelete(event.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.row}>
        <input
          type="text"
          placeholder="Relation (parent, spouse, ...)"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />
        <input
          type="text"
          placeholder="Name"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
        />
        <input
          type="date"
          value={passingDate}
          onChange={(e) => setPassingDate(e.target.value)}
        />
      </div>
      {isAdarAnchor && (
        <div className={styles.row}>
          <label className={styles.note}>
            In a leap year, observe in:{" "}
            <select
              value={adarRule ?? "adarII"}
              onChange={(e) => setAdarRule(e.target.value as "adarI" | "adarII")}
            >
              <option value="adarII">Adar II (default custom)</option>
              <option value="adarI">Adar I</option>
            </select>
          </label>
        </div>
      )}
      <div className={styles.row}>
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="button" onClick={handleAddYahrzeit}>
          Add Yahrzeit
        </button>
      </div>
    </div>
  );
}
