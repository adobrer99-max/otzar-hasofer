import type { ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import type { HebrewDate } from "../../data/hebrewCalendar";
import type { HebrewMonthDay } from "./recurringDates";

/** A dated observance falling on a given Hebrew day — a Hebrew birthday or a
 *  life-cycle anniversary. `monthDay` is the recurring anchor used to find
 *  past readings on the same day. */
export interface Observance {
  key: string;
  title: string;
  monthDay: HebrewMonthDay;
}

function sameMonthDay(a: HebrewDate, b: HebrewDate): boolean {
  return a.month === b.month && a.day === b.day;
}

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

/**
 * The participant's observances that fall on `today` — a Hebrew birthday and/or
 * any life-cycle anniversaries. Pure: the same day, participant, and events
 * always produce the same list. Shared by the Herald page's SacredTimeBanners
 * and the Home page's Today panel so the wording never drifts.
 */
export function todaysObservances(
  today: HebrewDate,
  participant: ParticipantRecord,
  events: LifeCycleEvent[],
): Observance[] {
  const observances: Observance[] = [];

  if (participant.hebrewBirthDate && sameMonthDay(today, participant.hebrewBirthDate)) {
    const age = today.year - participant.hebrewBirthDate.year;
    observances.push({
      key: "birthday",
      title: `Today is ${participant.displayName}'s Hebrew Birthday${age > 0 ? ` (age ${age})` : ""} — the Annual Treasury Reading.`,
      monthDay: participant.hebrewBirthDate,
    });
  }

  for (const event of events) {
    if (!sameMonthDay(today, event.hebrewDate)) continue;
    const years = today.year - event.hebrewDate.year;
    const nth = years > 0 ? `${years}${ordinalSuffix(years)} ` : "";
    const since = years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "the day";
    const name = participant.displayName;
    const titles: Record<typeof event.type, string> = {
      yahrzeit: `Today is the ${nth}Yahrzeit of ${event.personName} (${event.relation}).`,
      "wedding-anniversary": `Today is ${name}'s ${nth}Hebrew wedding anniversary.`,
      "bar-bat-mitzvah": `Today marks ${since} since ${name}'s Bar/Bat Mitzvah — the first reading conducted together.`,
      bris: `Today is the ${nth}anniversary of ${name}'s Bris — the covenant remembered. No conclusions; only blessing.`,
      conversion: `Today marks ${since} since ${name} was grafted into the covenant — nothing erased, everything redeemed.`,
      aliyah: `Today marks ${since} since ${name}'s Aliyah — the day the reading began with the Letters alone.`,
    };
    observances.push({ key: event.id, title: titles[event.type], monthDay: event.hebrewDate });
  }

  return observances;
}
