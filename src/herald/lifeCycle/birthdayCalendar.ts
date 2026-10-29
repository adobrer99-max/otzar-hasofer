import type { ParticipantRecord } from "../../types/herald";
import { formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { anniversaryGregorian, anniversaryInYear } from "./hebrewAnniversary";

/**
 * Hebrew birthdays as an iCalendar (.ics) file for Apple / Google / Outlook
 * calendars. A Hebrew birthday has no fixed civil date, so no RRULE can carry
 * it — each year's anniversary is written out as its own all-day event, with
 * a stable UID per participant and Hebrew year so a re-import updates rather
 * than duplicates. Each event reminds the evening before, when the Hebrew day
 * begins.
 */

export interface CalendarEvent {
  uid: string;
  /** Local-midnight civil date of the all-day event. */
  date: Date;
  summary: string;
  description: string;
}

/** Number of years of anniversaries an export covers. */
export const CALENDAR_YEARS = 20;

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

/** A participant's anniversaries from `fromHebrewYear`, for `years` years. */
export function birthdayEvents(
  participant: ParticipantRecord,
  fromHebrewYear: number,
  years: number = CALENDAR_YEARS,
): CalendarEvent[] {
  const birth = participant.hebrewBirthDate;
  if (!birth) return [];
  const events: CalendarEvent[] = [];
  const start = Math.max(fromHebrewYear, birth.year + 1);
  for (let year = start; year < fromHebrewYear + years; year++) {
    const age = year - birth.year;
    const due = anniversaryInYear(birth, year);
    events.push({
      uid: `${participant.id}-${year}@otzar-hasofer`,
      date: anniversaryGregorian(birth, year),
      summary: `${participant.displayName}'s Hebrew Birthday`,
      description:
        `${participant.displayName}'s ${ordinal(age)} Hebrew birthday, ${formatHebrewDateEnglish(due)} ` +
        `(born ${formatHebrewDateEnglish(birth)}) — the Annual Treasury Reading. ` +
        `The Hebrew day begins at sundown the evening before.`,
    });
  }
  return events;
}

/** Escape a TEXT value (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line at 75 octets, never splitting a character (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    // Continuation lines start with a space, which counts toward their 75.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const pad = (n: number) => String(n).padStart(2, "0");

function dateValue(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** The whole calendar document, CRLF-delimited. */
export function buildIcs(events: CalendarEvent[], calendarName: string, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Otzar HaSofer//Hebrew Birthdays//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const event of events) {
    const next = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate() + 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;VALUE=DATE:${dateValue(event.date)}`,
      `DTEND;VALUE=DATE:${dateValue(next)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      // 6 pm the evening before — about when the Hebrew day begins.
      "TRIGGER:-PT6H",
      `DESCRIPTION:${escapeText(`${event.summary} begins at sundown`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
