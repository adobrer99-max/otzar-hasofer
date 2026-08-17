import type { FestivalId } from "../types/festival";

/**
 * **What a named day does to the board — one table, exhaustive.**
 *
 * The Encounters set the shape (`ENCOUNTER_RULES`): a small authored table of
 * numbers and ids, selected by a fact about the run, folded once, proved
 * distinct. Before this file the day's effects were scattered — the light
 * multipliers in `sacredAscent.ts`, the nigunim in `audio/nigunim.ts`, and
 * nothing anywhere for ground — each a `Record<string, …>` that could go
 * silently stale. This is the one home, `Record<FestivalId, …>`, where a
 * festival with no entry fails to compile and `null` is a *decision*: the day
 * is named in the notes, and the board is unchanged.
 *
 * **What may live here, and what may not.** `light` (a multiplier on the
 * day's strewn light), `note` (the day-line the threshold prints), `nigun`
 * (the tune the score reaches for), `gateRoom` (which chamber the rung's
 * Word-Gate opens onto). All of them appearance, economy-of-the-day, or a
 * room variant — never a verb, never a letter, never a lamp: the graces-only
 * law in `sacredAscent.ts` stands, and the Encounter knobs (husks, klipot,
 * veilCost…) stay the Encounters' own.
 *
 * **Stacking**, because days overlap (Shabbat in Sukkot; Yom Kippur inside
 * the Ten Days): `light` **multiplies** across every active festival — that
 * is shipped behavior, Shabbat+Hanukkah has been 1.4 × 1.5 = 2.1 since the
 * multipliers existed. Every other knob is **first-specific-wins**, the
 * convention `graceOfTheDay` set: `activeFestivalIds` arrives most-specific
 * first, and the first rule that names a nigun (or a room) is the day's.
 */
export interface FestivalRule {
  /** Multiplier on the day's strewn light. Absent = 1 — the day is bright in some other way. */
  light?: number;
  /** The day-line shown at the threshold and kept in the record's notes. */
  note?: string;
  /** The nigun the score sings, by id in `nigunim.ts`. First specific active festival wins. */
  nigun?: string;
  /**
   * The chamber this day's Word-Gates open onto, by chunk id — a variant in
   * `GATE_ROOMS`, never a new fixed screen (a fixed screen reshuffles
   * `layout` on every seed; the tour paid 202 walks against a cap of 200 to
   * learn that twice). On an ordinary day `gateRoomFor` hashes the day and
   * the path; on a day with a room, the day *is* the room.
   */
  gateRoom?: "word-gate-sukkah" | "word-gate-lamps";
}

/**
 * The four minor fasts share a multiplier — that is the measured economy and
 * it holds — and no longer a sentence: four days that remember four different
 * griefs were shipping one line verbatim, which the census filed beside the
 * Omer's single sentence for forty-nine days.
 */
const FAST_LIGHT = 0.75;

/**
 * The values are the shipped ones, byte for byte — this table *absorbed*
 * `DAY_EFFECTS` and `FESTIVAL_NIGUNIM`, it did not retune them, and
 * `festivalRules.test.ts` pins every light multiplier to the number that was
 * measured against. Consolidation is not a balance pass.
 */
export const FESTIVAL_RULES: Record<FestivalId, FestivalRule | null> = {
  ordinary: null,
  shabbat: {
    light: 1.4,
    note: "Shabbat — the regions lie brighter than on any working day.",
    nigun: "hevenu-shalom-aleichem",
  },
  pesach: { light: 1.3, note: "Pesach — the narrow place is behind you." },
  sukkot: {
    light: 1.3,
    note: "Sukkot — the guests are welcomed, and the booth is hung with light.",
    gateRoom: "word-gate-sukkah",
  },
  "high-holy-days": null,
  "rosh-hashanah": { light: 1.2, note: "Rosh Hashanah — the year turns." },
  "yom-kippur": {
    light: 0.7,
    note: "Yom Kippur — the regions are spare. Little is strewn, and little is needed.",
  },
  purim: { light: 1.2, note: "Purim — the hidden face; even the light is in disguise." },
  shavuot: { light: 1.4, note: "Shavuot — the letters themselves were given on this day." },
  tishabav: {
    light: 0.55,
    note: "Tisha B'Av — the light is scarce. What is destroyed is climbed through, not around.",
  },
  tubishvat: { light: 1.3, note: "Tu Bishvat — the sap rises in the Tree, and the Tree is lit." },
  tubav: { nigun: "hava-nagila" },
  hanukkah: {
    light: 1.5,
    note: "Hanukkah — the light that lasted longer than it had any right to.",
    nigun: "lamps-phrase",
    gateRoom: "word-gate-lamps",
  },
  "simchat-torah": { nigun: "hava-nagila" },
  "lag-baomer": { nigun: "hava-nagila" },
  "fast-of-gedaliah": {
    light: FAST_LIGHT,
    note: "The Fast of Gedaliah — a governor murdered, a remnant scattered; less lies waiting on the ground.",
  },
  "tenth-of-tevet": {
    light: FAST_LIGHT,
    note: "The Tenth of Tevet — the siege begins, and the walls still hold; less lies waiting on the ground.",
  },
  "seventeenth-of-tammuz": {
    light: FAST_LIGHT,
    note: "The Seventeenth of Tammuz — the walls are breached, and three weeks begin; less lies waiting on the ground.",
  },
  "fast-of-esther": {
    light: FAST_LIGHT,
    note: "The Fast of Esther — the day before the lot falls, fasting in the king's city; less lies waiting on the ground.",
  },
  "yom-hashoah": null,
  "yom-hazikaron": null,
  "yom-haatzmaut": null,
  "yom-yerushalayim": null,
};

/**
 * The winning value of one knob across the active festivals — **per knob, not
 * per rule.** On a Shabbat inside Sukkot the booth names the room and Shabbat
 * still names the tune; a whole-rule winner would silence the tune, which is
 * not what shipped: `FESTIVAL_NIGUNIM` always scanned every active id for the
 * first that carried one, and this keeps that word.
 */
export function festivalKnob<K extends keyof FestivalRule>(
  active: readonly FestivalId[],
  knob: K,
): FestivalRule[K] | undefined {
  for (const id of active) {
    const value = FESTIVAL_RULES[id]?.[knob];
    if (value !== undefined) return value;
  }
  return undefined;
}
