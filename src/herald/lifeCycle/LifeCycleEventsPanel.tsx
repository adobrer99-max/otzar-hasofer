import { useState } from "react";
import type { ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent, LifeCycleEventType } from "../../types/lifeCycle";
import { LIFE_CYCLE_EVENT_LABELS } from "../../types/lifeCycle";
import { hebrewDateFromGregorian, formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { setHebrewBirthDate, setHebrewName } from "../../storage/participantsRepo";
import { ConfirmButton } from "../../components/ui";
import {
  addLifeCycleEvent,
  deleteLifeCycleEvent,
  listLifeCycleEvents,
} from "../../storage/lifeCycleRepo";
import styles from "./lifeCycle.module.css";

export interface LifeCycleEventsPanelProps {
  participant: ParticipantRecord;
  onParticipantChange: (updated: ParticipantRecord) => void;
  events: LifeCycleEvent[];
  onEventsChange: (events: LifeCycleEvent[]) => void;
}

function eventSummary(event: LifeCycleEvent): string {
  const label = LIFE_CYCLE_EVENT_LABELS[event.type] ?? event.type;
  if (event.type === "yahrzeit") {
    return `${label} — ${event.relation}: ${event.personName}`;
  }
  return label;
}

export function LifeCycleEventsPanel({
  participant,
  onParticipantChange,
  events,
  onEventsChange,
}: LifeCycleEventsPanelProps) {
  const [birthDateInput, setBirthDateInput] = useState("");
  const [eventType, setEventType] = useState<LifeCycleEventType>("yahrzeit");
  const [relation, setRelation] = useState("");
  const [personName, setPersonName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [adarRule, setAdarRule] = useState<"adarI" | "adarII" | undefined>(undefined);
  const [sponsoringCommunity, setSponsoringCommunity] = useState("");
  const [beitDin, setBeitDin] = useState("");
  const [hebrewNameReceived, setHebrewNameReceived] = useState("");

  async function handleSetBirthDate() {
    if (!birthDateInput) return;
    const hebrewDate = hebrewDateFromGregorian(new Date(birthDateInput));
    const updated = await setHebrewBirthDate(participant.id, hebrewDate);
    onParticipantChange(updated);
    setBirthDateInput("");
  }

  const isYahrzeit = eventType === "yahrzeit";
  const isConversion = eventType === "conversion";
  const canAdd = eventDate && (!isYahrzeit || (relation && personName));

  async function handleAddEvent() {
    if (!canAdd) return;
    await addLifeCycleEvent(participant.id, {
      type: eventType,
      relation: isYahrzeit ? relation : undefined,
      personName: isYahrzeit ? personName : undefined,
      gregorianDateOfEvent: eventDate,
      notes: notes || undefined,
      adarRule,
      sponsoringCommunity: isConversion ? sponsoringCommunity || undefined : undefined,
      beitDin: isConversion ? beitDin || undefined : undefined,
    });
    if (isConversion && hebrewNameReceived && !participant.hebrewName) {
      onParticipantChange(await setHebrewName(participant.id, hebrewNameReceived));
    }
    onEventsChange(await listLifeCycleEvents(participant.id));
    setRelation("");
    setPersonName("");
    setEventDate("");
    setNotes("");
    setAdarRule(undefined);
    setSponsoringCommunity("");
    setBeitDin("");
    setHebrewNameReceived("");
  }

  async function handleDelete(id: string) {
    await deleteLifeCycleEvent(id);
    onEventsChange(events.filter((e) => e.id !== id));
  }

  const isAdarAnchor = eventDate
    ? hebrewDateFromGregorian(new Date(eventDate)).month === "Adar"
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
            aria-label="Hebrew birthday date"
            value={birthDateInput}
            onChange={(e) => setBirthDateInput(e.target.value)}
          />
          <button type="button" onClick={handleSetBirthDate}>
            Set Hebrew Birthday
          </button>
        </div>
      )}

      <h3>Life-Cycle Events</h3>
      {events.length > 0 && (
        <ul className={styles.eventList}>
          {events.map((event) => (
            <li key={event.id}>
              <span>
                {eventSummary(event)} — {formatHebrewDateEnglish(event.hebrewDate)}
                {event.notes && ` (${event.notes})`}
              </span>
              <ConfirmButton
                confirmLabel="Remove"
                ariaLabel="Confirm remove event"
                onConfirm={() => handleDelete(event.id)}
              >
                Remove
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.row}>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as LifeCycleEventType)}
          aria-label="Event type"
        >
          {(Object.keys(LIFE_CYCLE_EVENT_LABELS) as LifeCycleEventType[]).map((type) => (
            <option key={type} value={type}>
              {LIFE_CYCLE_EVENT_LABELS[type]}
            </option>
          ))}
        </select>
        <input type="date" aria-label="Event date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </div>
      {isYahrzeit && (
        <div className={styles.row}>
          <input
            type="text"
            aria-label="Relation (parent, spouse, ...)"
            placeholder="Relation (parent, spouse, ...)"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          />
          <input
            type="text"
            aria-label="Name of the deceased"
            placeholder="Name"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
          />
        </div>
      )}
      {isConversion && (
        <>
          <p className={styles.note}>
            The Herald is grafted. Like Ruth. Nothing erased — everything is redeemed. The
            Treasury records the moment; the earlier chapters remain exactly as written.
          </p>
          <div className={styles.row}>
            <input
              type="text"
              aria-label="Sponsoring community (optional)"
              placeholder="Sponsoring community (optional)"
              value={sponsoringCommunity}
              onChange={(e) => setSponsoringCommunity(e.target.value)}
            />
            <input
              type="text"
              aria-label="Beit Din (optional, private)"
              placeholder="Beit Din (optional, private)"
              value={beitDin}
              onChange={(e) => setBeitDin(e.target.value)}
            />
          </div>
          {!participant.hebrewName && (
            <div className={styles.row}>
              <input
                type="text"
                className="hebrew"
                dir="rtl"
                lang="he"
                aria-label="Hebrew name received (optional)"
                placeholder="Hebrew name received (optional)"
                value={hebrewNameReceived}
                onChange={(e) => setHebrewNameReceived(e.target.value)}
              />
            </div>
          )}
        </>
      )}
      {eventType === "aliyah" && (
        <p className={styles.note}>
          A beautiful threshold. The Herald changes; the geography changes; the ritual
          changes. From the next reading on, the Galut cards cease to matter.
        </p>
      )}
      {eventType === "bris" && (
        <p className={styles.note}>
          The parents receive the reading. The Herald begins; the Treasury opens; the child's
          first page is created. No conclusions. Only blessing.
        </p>
      )}
      {eventType === "bar-bat-mitzvah" && (
        <p className={styles.note}>
          The participant conducts their first reading with a Scribe. Not alone. Together.
        </p>
      )}
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
          aria-label="Notes (optional)"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="button" onClick={handleAddEvent} disabled={!canAdd}>
          Add {LIFE_CYCLE_EVENT_LABELS[eventType]}
        </button>
      </div>
    </div>
  );
}
