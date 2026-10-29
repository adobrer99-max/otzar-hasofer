import { describe, expect, it } from "vitest";
import type { ParticipantRecord } from "../../types/herald";
import { birthdayEvents, buildIcs, escapeText, foldLine } from "./birthdayCalendar";

const miriam: ParticipantRecord = {
  id: "p-1",
  displayName: "Miriam, of the well",
  path: "brit",
  createdAt: "2026-01-01T00:00:00Z",
  hebrewBirthDate: { year: 5750, month: "Nisan", day: 15 },
};

describe("birthdayEvents", () => {
  it("writes one all-day event per year, starting with the current Hebrew year", () => {
    const events = birthdayEvents(miriam, 5786, 3);
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.uid)).toEqual([
      "p-1-5786@otzar-hasofer",
      "p-1-5787@otzar-hasofer",
      "p-1-5788@otzar-hasofer",
    ]);
    const d = events[0].date;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 4, 2]);
    expect(events[0].description).toContain("36th Hebrew birthday");
    expect(events[0].description).toContain("15 Nisan 5786");
  });

  it("never dates an anniversary before the birth", () => {
    const baby = { ...miriam, hebrewBirthDate: { year: 5786, month: "Nisan" as const, day: 1 } };
    expect(birthdayEvents(baby, 5786, 2).map((e) => e.uid)).toEqual(["p-1-5787@otzar-hasofer"]);
  });

  it("writes nothing for a participant with no Hebrew birthday", () => {
    expect(birthdayEvents({ ...miriam, hebrewBirthDate: undefined }, 5786)).toEqual([]);
  });
});

describe("iCalendar text", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe(String.raw`a\, b\; c\\d\ne`);
  });

  it("folds long lines at 75 octets without splitting a character", () => {
    const line = `SUMMARY:${"א".repeat(60)}`;
    const folded = foldLine(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });

  it("builds a calendar of all-day events with an evening-before reminder", () => {
    const ics = buildIcs(birthdayEvents(miriam, 5786, 1), "Hebrew Birthdays", new Date("2026-10-29T12:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260402\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20260403\r\n");
    expect(ics).toContain("DTSTAMP:20261029T120000Z");
    expect(ics).toContain("SUMMARY:Miriam\\, of the well's Hebrew Birthday");
    expect(ics).toContain("TRIGGER:-PT6H");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    // No bare LF anywhere.
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });
});
