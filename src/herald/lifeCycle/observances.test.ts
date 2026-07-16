import { describe, it, expect } from "vitest";
import { todaysObservances } from "./observances";
import type { ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import type { HebrewDate } from "../../data/hebrewCalendar";

const today: HebrewDate = { year: 5786, month: "Nisan", day: 10 };

function participant(over: Partial<ParticipantRecord> = {}): ParticipantRecord {
  return { id: "p1", displayName: "Dvora", path: "brit", createdAt: "2020-01-01T00:00:00.000Z", ...over };
}

function yahrzeit(hebrewDate: HebrewDate): LifeCycleEvent {
  return {
    id: "e1",
    participantId: "p1",
    type: "yahrzeit",
    relation: "grandmother",
    personName: "Miriam",
    hebrewDate,
    gregorianDateOfEvent: "2000-01-01",
    createdAt: "2020-01-01T00:00:00.000Z",
  };
}

describe("todaysObservances", () => {
  it("returns the Hebrew birthday with age when it falls today", () => {
    const p = participant({ hebrewBirthDate: { year: 5750, month: "Nisan", day: 10 } });
    const result = todaysObservances(today, p, []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("birthday");
    expect(result[0].title).toContain("Dvora's Hebrew Birthday");
    expect(result[0].title).toContain("age 36");
    expect(result[0].monthDay).toEqual({ year: 5750, month: "Nisan", day: 10 });
  });

  it("returns a Yahrzeit with its ordinal count when it falls today", () => {
    const result = todaysObservances(today, participant(), [yahrzeit({ year: 5783, month: "Nisan", day: 10 })]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Today is the 3rd Yahrzeit of Miriam (grandmother).");
  });

  it("returns nothing on a day with no matching observance", () => {
    const p = participant({ hebrewBirthDate: { year: 5750, month: "Sivan", day: 2 } });
    expect(todaysObservances(today, p, [yahrzeit({ year: 5783, month: "Av", day: 9 })])).toEqual([]);
  });
});
