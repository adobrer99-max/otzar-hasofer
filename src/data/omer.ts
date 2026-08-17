import { ushpizin } from "./ushpizin";

/**
 * **The forty-nine days, each with its own name.**
 *
 * The Omer count is a 7×7 grid — seven weeks, each a Sefirah of the lower
 * seven, and each day of a week that Sefirah's quality *within* the week's —
 * chesed she-b'chesed through malchut she-b'malchut. The game computed the
 * day number from the start (`computeOmer`) and then said the same sentence
 * for all forty-nine of them: "the count itself is an ascent," reused daily
 * for seven weeks, which the P10 census filed among the thinnest lines in
 * the repo.
 *
 * The grid is the traditional counting, and the sefirah names come from the
 * same table the Ushpizin and the Herald's middot already read — one source,
 * as ever. What is authored here is only the seven day-qualities' clauses,
 * in the day's own voice; the composition makes each of the forty-nine
 * distinct, which `sacredTime.test.ts` counts.
 */
const QUALITY_CLAUSE: readonly string[] = [
  "what is given freely", // chesed
  "what holds its bound", // gevurah
  "what stands in balance", // tiferet
  "what outlasts the moment", // netzach
  "what serves without display", // hod
  "what everything rests on", // yesod
  "what is finally made real", // malchut
];

/** The day-line for a given Omer day, 1–49. */
export function omerLine(day: number): string {
  const week = Math.floor((day - 1) / 7);
  const within = (day - 1) % 7;
  const weekName = ushpizin[week]?.sefirahName ?? "";
  const dayName = ushpizin[within]?.sefirahName ?? "";
  return (
    `Day ${day} of the Omer — ${dayName} within ${weekName}: ` +
    `${QUALITY_CLAUSE[within]}, inside ${weekName.toLowerCase()}'s week.`
  );
}
