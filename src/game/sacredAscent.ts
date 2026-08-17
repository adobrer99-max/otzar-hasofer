import { festivalsById } from "../data/festivals";
import { formatHebrewDateEnglish, resolveAdar } from "../data/hebrewCalendar";
import { mazalotByMonth } from "../data/mazalot";
import { computeSacredTime } from "../data/sacredTime";
import type { FestivalId, Gesture } from "../types/festival";
import type { GeographyMode } from "../types/herald";
import type { SacredTimeSnapshot } from "../types/sacredTime";
import type { Grace } from "./abilities";
import { hashSeed } from "./rng";

/**
 * Sacred Time, as the Ascent meets it.
 *
 * No reading occurs outside of sacred time, and neither does a climb. The
 * run's seed *is* the Hebrew date, so every Scribe who begins on the same day
 * ascends the same Tree — the same episodes stand at the same stations, the
 * letters come in the same order — and the day's own character is on the
 * board: the month's zodiac letter rises, Shabbat grants its rest, a fast
 * narrows the hand.
 */
export interface AscentTime {
  snapshot: SacredTimeSnapshot;
  seed: number;
  /** "14 Nisan 5786" — the seed in words, shown on the board. */
  seedLabel: string;
  /** The Simple letter whose month this is. */
  ascendantLetterId?: string;
  /**
   * How much light the day itself strews through the regions, as a multiplier
   * on the ordinary scattering. A festival is brighter; a fast is darker. The
   * ground is the same ground either way — only what is lying on it changes.
   */
  lightOfTheDay: number;
  /**
   * The grace the day's own gesture lends, for this day only. See
   * `GESTURE_GRACES` — it is read off the festival's authored `gesture`, so
   * the calendar decides it rather than this file.
   */
  graceOfTheDay?: Grace;
  notes: string[];
}

/**
 * The day's gesture, as something the body can do.
 *
 * `festivals.ts` already names a gesture for every festival — Rest, Depart,
 * Dwell, Gather, seventeen of them — authored long before there was a game to
 * read them, and until now nothing in the Treasury did. Each maps to a grace
 * the Scribe holds for that day and no other, so a festival is not merely
 * announced in a caption: it is in the hands.
 *
 * **Graces only, never verbs.** A verb lent for a day would open chunks the
 * builder laid on the assumption they were shut — the whole no-soft-lock
 * guarantee rests on `lettersOnEntering` being the complete truth about what
 * verbs a region can demand. A grace changes how the world meets you and
 * unlocks nothing, so it is safe to give and safe to take away at midnight.
 *
 * **`Record<Gesture, Grace>` and not `Record<string, Grace>`**, which is what
 * it was: under the loose key a gesture authored with a typo'd name — or a new
 * gesture added to `festivals.ts` and forgotten here — looked up `undefined`,
 * lent nothing, and no one noticed, because a day lending nothing is also what
 * an ordinary day does. Exhaustive both ways now: every member of `Gesture`
 * must appear here, and a key not in the union will not compile.
 */
const GESTURE_GRACES: Record<Gesture, Grace> = {
  Rest: "slow-fall", // upheld, as on Shabbat
  Depart: "high-jump", // rising out of the narrow place
  Dwell: "second-stone", // a booth is built and stood in
  "Listen/Reflect": "farsight", // the window cut in the wall
  "Return/Repent": "return", // teshuvah — back to the beginning
  "Reveal/Unmask": "light", // the hidden face, lit
  // **Not `speech`.** The rule eight lines up says a grace unlocks nothing, and
  // `speech` is the one grace that does: it is the sole gate on the Houses
  // (`world/step.ts`), and through them every guest, all seven testimonies and
  // the ending's branch. Lending it for a day opened all of that without Peh —
  // and then the crown still called the Scribe *mute*, because `hasMouth` asks
  // for the letter, so the closing plate printed "you walked past them" over
  // "7 of 7 Houses met on the way".
  //
  // Farsight instead, which is receiving of the kind a grace is allowed to be:
  // the view widens, and nothing opens that was shut.
  Receive: "farsight", // on the day the letters were given, you see further
  Remember: "light", // a lamp kept burning
  Plant: "second-stone", // something set down that stands
  Connect: "swift-water", // the flow between
  Illuminate: "light",
  Rejoice: "high-jump", // the dancing
  Hone: "crawl", // a fast day: made small
  "Bear Witness": "farsight",
  Honour: "light",
  Build: "second-stone",
  Gather: "draw-motes", // what is scattered comes in
};

/**
 * Days that reach onto the board. The rest of the calendar is still shown —
 * every active festival is named in the notes — but only these change play,
 * and each change is the one the day already means in the practice.
 */
const DAY_EFFECTS: Partial<Record<FestivalId, { light: number; note: string }>> = {
  shabbat: { light: 1.4, note: "Shabbat — the regions lie brighter than on any working day." },
  hanukkah: { light: 1.5, note: "Hanukkah — the light that lasted longer than it had any right to." },
  tubishvat: { light: 1.3, note: "Tu Bishvat — the sap rises in the Tree, and the Tree is lit." },
  sukkot: { light: 1.3, note: "Sukkot — the guests are welcomed, and the booth is hung with light." },
  pesach: { light: 1.3, note: "Pesach — the narrow place is behind you." },
  shavuot: { light: 1.4, note: "Shavuot — the letters themselves were given on this day." },
  "rosh-hashanah": { light: 1.2, note: "Rosh Hashanah — the year turns." },
  purim: { light: 1.2, note: "Purim — the hidden face; even the light is in disguise." },
  "yom-kippur": { light: 0.7, note: "Yom Kippur — the regions are spare. Little is strewn, and little is needed." },
  tishabav: { light: 0.55, note: "Tisha B'Av — the light is scarce. What is destroyed is climbed through, not around." },
  "fast-of-gedaliah": { light: 0.75, note: "A fast day — less lies waiting on the ground." },
  "tenth-of-tevet": { light: 0.75, note: "A fast day — less lies waiting on the ground." },
  "seventeenth-of-tammuz": { light: 0.75, note: "A fast day — less lies waiting on the ground." },
  "fast-of-esther": { light: 0.75, note: "A fast day — less lies waiting on the ground." },
};

/**
 * Reads a date into everything the run needs from it.
 *
 * `variant` distinguishes the day's shared ascent (0 — the daily run every
 * Scribe meets) from a Scribe's own further climbs on the same day, which
 * shuffle differently while keeping the day's character.
 */
export function readAscentTime(
  date: Date,
  geography: GeographyMode = "galut",
  variant = 0,
): AscentTime {
  const snapshot = computeSacredTime(date, geography);
  const { hebrewDate } = snapshot;
  const seedLabel = formatHebrewDateEnglish(hebrewDate);
  const seed = hashSeed(`${seedLabel}#${variant}`);

  const month = resolveAdar(hebrewDate.year, hebrewDate.month);
  const ascendantLetterId = mazalotByMonth[month]?.letterId;

  const notes: string[] = [];
  let lightOfTheDay = 1;

  if (ascendantLetterId) {
    const mazal = mazalotByMonth[month];
    notes.push(
      `The month of ${hebrewDate.month} — its letter rises under ${mazal?.zodiacName} (${mazal?.zodiacHebrew}).`,
    );
  }

  // The most specific active festival lends its gesture — `activeFestivalIds`
  // is documented as most-specific-first, so the first one that names a
  // gesture wins, and an ordinary day lends nothing.
  let graceOfTheDay: Grace | undefined;

  for (const id of snapshot.activeFestivalIds) {
    const festival = festivalsById[id];
    const gesture = festival?.gesture;
    if (!graceOfTheDay && gesture) {
      const grace = GESTURE_GRACES[gesture];
      if (grace) {
        graceOfTheDay = grace;
        notes.push(`The day's gesture is ${gesture} — and it is lent to your hands until nightfall.`);
      }
    }

    const effect = DAY_EFFECTS[id];
    if (effect) {
      lightOfTheDay *= effect.light;
      notes.push(effect.note);
    } else if (festival && !gesture) {
      notes.push(`${festival.name} — the day is named, though the board is unchanged.`);
    }
  }

  if (snapshot.omer) {
    notes.push(`Day ${snapshot.omer.day} of the Omer — the count itself is an ascent.`);
  }

  return { snapshot, seed, seedLabel, ascendantLetterId, lightOfTheDay, graceOfTheDay, notes };
}
