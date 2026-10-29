import { useState } from "react";
import type { ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent, LifeCycleEventType } from "../../types/lifeCycle";
import { LIFE_CYCLE_EVENT_LABELS } from "../../types/lifeCycle";
import {
  hebrewDateFromGregorian,
  formatHebrewDateEnglish,
  parseDateInput,
} from "../../data/hebrewCalendar";
import { toast } from "../../components/ui/toast";
import { downloadText } from "../export/blazon";
import { birthdayEvents, buildIcs, CALENDAR_YEARS } from "./birthdayCalendar";
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
  /** Every participant, for the "all birthdays" calendar export. */
  allParticipants: ParticipantRecord[];
  /** The current Hebrew year — the calendar export starts here. */
  currentHebrewYear: number;
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

function calendarSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "participant";
}

export function LifeCycleEventsPanel({
  participant,
  allParticipants,
  currentHebrewYear,
  onParticipantChange,
  events,
  onEventsChange,
}: LifeCycleEventsPanelProps) {
  const [birthDateInput, setBirthDateInput] = useState("");
  const [afterSundown, setAfterSundown] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState(false);
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
    const civil = parseDateInput(birthDateInput);
    // The Hebrew day begins at nightfall: a birth after sundown belongs to
    // the next Hebrew date.
    if (afterSundown) civil.setDate(civil.getDate() + 1);
    const updated = await setHebrewBirthDate(participant.id, hebrewDateFromGregorian(civil));
    onParticipantChange(updated);
    setBirthDateInput("");
    setAfterSundown(false);
    setEditingBirthday(false);
  }

  function exportCalendar(people: ParticipantRecord[], filename: string, name: string) {
    const events = people.flatMap((p) => birthdayEvents(p, currentHebrewYear));
    downloadText(buildIcs(events, name), filename, "text/calendar;charset=utf-8");
    toast(
      `Calendar saved — ${people.length === 1 ? "" : `${people.length} birthdays, `}the next ${CALENDAR_YEARS} years. Open the file to add it to your calendar.`,
      { tone: "success" },
    );
  }

  const withBirthdays = allParticipants.filter((p) => p.hebrewBirthDate);

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
    ? hebrewDateFromGregorian(parseDateInput(eventDate)).month === "Adar"
    : false;

  return (
    <div className={styles.panel}>
      <h3>Hebrew Birthday</h3>
      {participant.hebrewBirthDate && !editingBirthday ? (
        <>
          <p>{formatHebrewDateEnglish(participant.hebrewBirthDate)}</p>
          <div className={styles.row}>
            <button
              type="button"
              onClick={() =>
                exportCalendar(
                  [participant],
                  `${calendarSlug(participant.displayName)}-hebrew-birthday.ics`,
                  `${participant.displayName} — Hebrew Birthday`,
                )
              }
            >
              Add to calendar (.ics)
            </button>
            {withBirthdays.length > 1 && (
              <button
                type="button"
                onClick={() => exportCalendar(withBirthdays, "hebrew-birthdays.ics", "Hebrew Birthdays — Otzar HaSofer")}
              >
                All {withBirthdays.length} birthdays (.ics)
              </button>
            )}
            <button type="button" onClick={() => setEditingBirthday(true)}>
              Change
            </button>
          </div>
        </>
      ) : (
        <div className={styles.row}>
          <input
            type="date"
            aria-label="Civil date of birth"
            value={birthDateInput}
            onChange={(e) => setBirthDateInput(e.target.value)}
          />
          <label className={styles.inlineCheck}>
            <input type="checkbox" checked={afterSundown} onChange={(e) => setAfterSundown(e.target.checked)} />
            Born after sundown
          </label>
          <button type="button" onClick={handleSetBirthDate} disabled={!birthDateInput}>
            Set Hebrew Birthday
          </button>
          {editingBirthday && (
            <button type="button" onClick={() => setEditingBirthday(false)}>
              Cancel
            </button>
          )}
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
