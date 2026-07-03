import type { FestivalOverride } from "../types/festival";

/**
 * Sacred-time overrides. `heraldAccent` is a data-driven hook the Herald
 * renderer reads to apply a single, small visual delta per festival —
 * deliberately minimal, not a full re-skin per festival.
 *
 * `dateRule` lets the Sacred Time engine (`sacredTime.ts`) auto-detect
 * "is today a festival" instead of relying only on manual selection.
 *
 * Known v1 limitations, documented rather than silently glossed over:
 * - Minor-fast and Israeli-commemoration weekday-postponement rules are NOT
 *   modeled (e.g. Tisha B'Av shifting to Sunday when 9 Av is Shabbat, the
 *   Fast of Esther's forward shift, Yom HaZikaron/Yom HaAtzmaut's
 *   legislated weekday avoidance). Each `dateRule` is the plain, unadjusted
 *   Hebrew date.
 * - Purim and the Fast of Esther are written with `month: "Adar"` even
 *   though a leap year splits Adar into AdarI/AdarII — the engine resolves
 *   a bare "Adar" rule to Adar II in leap years (the standard practice),
 *   not Adar I. This keeps the data readable without leap-year logic here.
 * - Simchat Torah and Shmini Atzeret are bundled into one entry
 *   (`simchat-torah`) rather than modeled as fully separate observances.
 * - `"high-holy-days"` is kept, unrenamed, as a broader "Ten Days of
 *   Repentance" umbrella (1–10 Tishrei) alongside the more specific
 *   `"rosh-hashanah"`/`"yom-kippur"` entries added below — its id must
 *   never be renamed or removed, since it's already embedded in persisted
 *   `HeraldLayer.input.festivalId` values from readings saved before this
 *   change.
 * - Several entries have a `gesture` (the doc's Gesture/Verb/Theme) but no
 *   transcribed `contemplativeQuestion` yet — a first-draft content gap
 *   to fill in later, not a bug.
 */
export const festivals: FestivalOverride[] = [
  {
    id: "ordinary",
    name: "An Ordinary Day",
    description:
      "No festival override. The cleanest, simplest Herald render — the baseline against which every sacred-time accent reads as distinct.",
    ritualMechanic: "Standard reading; no override.",
  },
  {
    id: "shabbat",
    name: "Shabbat & Havdalah",
    hebrewName: "שבת",
    description:
      "Shabbat is the weekly temporal heartbeat. In keeping with the kabbalistic tradition, the normally veiled anchor is instead the neshama yetarah (\"extra soul\"). During Havdalah it is revealed to the participant, to guide their transition from the holy back to the mundane.",
    ritualMechanic: "Veiled anchor is openly the neshama yetarah; revealed at Havdalah.",
    heraldAccent: { accentColor: "var(--color-gold-bright)", motif: "twin-flame" },
    dateRule: { kind: "weekly", dayOfWeek: "saturday" },
    gesture: "Rest",
    contemplativeQuestion: "What can I cease striving to control? How do I rest?",
  },
  {
    id: "pesach",
    name: "Pesach & the Afikoman",
    hebrewName: "פסח",
    description:
      "\"The Broken Vessel.\" In Lurianic Kabbalah, the concept of a shattered, incomplete reality is foundational (Shevirat HaKelim). The Afikoman step, Tzafun (\"the hidden\"), enacts this: the Scribe's Veiled Anchor is broken and hidden until the very end of the reading, so the participant sits in the tension of an incomplete reality until the hidden piece is restored.",
    ritualMechanic: "Veiled Anchor is broken/hidden until the reading's close (Tzafun).",
    heraldAccent: { motif: "broken-vessel" },
    dateRule: { kind: "range", month: "Nisan", startDay: 15, lengthLand: 7, lengthGalut: 8 },
    gesture: "Depart",
  },
  {
    id: "sukkot",
    name: "Sukkot & the Ushpizin",
    hebrewName: "סוכות",
    description:
      "\"The Sefirotic Guests.\" The Ushpizin are the literal personifications of the seven lower Sefirot: Abraham (Chesed), Isaac (Gevurah), Jacob (Tiferet), Moses (Netzach), Aaron (Hod), Joseph (Yesod), David (Malchut). The standard deck is overridden with these seven figures, and the reading shifts from the Letters directly into the Sefirot.",
    ritualMechanic: "Deck overridden by the 7 Ushpizin/Sefirot; Letters step is bypassed.",
    heraldAccent: { forceMode: "sefirot" },
    dateRule: { kind: "range", month: "Tishri", startDay: 15, lengthLand: 7, lengthGalut: 7 },
    gesture: "Dwell",
  },
  {
    id: "high-holy-days",
    name: "The High Holy Days",
    hebrewName: "ימים נוראים",
    description:
      "\"The Rebuilding of Malchut.\" Rosh Hashanah is the moment the Sefirah of Malchut is judged and rebuilt from scratch, entering a state of Din (strict judgment). The interface shifts to themes of solemnity, sealing, and absolute truth — the Grimoire ceases to be a compass and becomes a scale.",
    ritualMechanic: "Interface shifts to solemnity/sealing/judgment.",
    heraldAccent: { accentColor: "var(--color-silver)", motif: "seal" },
    dateRule: { kind: "range", month: "Tishri", startDay: 1, lengthLand: 10, lengthGalut: 10 },
  },
  {
    id: "rosh-hashanah",
    name: "Rosh Hashanah",
    hebrewName: "ראש השנה",
    description: "Listen/Reflect. The Jewish New Year — the day the world is judged and renewed.",
    ritualMechanic: "See The High Holy Days above for the full ritual override.",
    dateRule: { kind: "range", month: "Tishri", startDay: 1, lengthLand: 2, lengthGalut: 2 },
    gesture: "Listen/Reflect",
  },
  {
    id: "yom-kippur",
    name: "Yom Kippur",
    hebrewName: "יום כיפור",
    description: "Return/Repent. The Day of Atonement, the culmination of the Ten Days of Repentance.",
    ritualMechanic: "See The High Holy Days above for the full ritual override.",
    dateRule: { kind: "fixed", month: "Tishri", day: 10 },
    gesture: "Return/Repent",
  },
  {
    id: "purim",
    name: "Purim & the Masking Protocol",
    hebrewName: "פורים",
    description:
      "\"Hester Panim\" — the hiding of the Divine Face. The Arizal taught Purim is a higher spiritual holiday than Yom Kippur precisely because God's name is never mentioned in the Megillah. The reading rejects Peshat (the literal) and aggressively pursues Sod (the secret): the mundane and chaotic are read as the deepest masks of the Divine.",
    ritualMechanic: "Peshat rejected; Sod pursued aggressively.",
    heraldAccent: { accentColor: "var(--color-blue-bright)", motif: "veil" },
    dateRule: { kind: "fixed", month: "Adar", day: 14 },
    gesture: "Reveal/Unmask",
  },
  {
    id: "shavuot",
    name: "Shavuot & the Sinai Revelation",
    hebrewName: "שבועות",
    description:
      "\"Yichud\" — unification. The Zohar views the giving of Torah at Sinai as a wedding between God and Israel. The veil is completely lifted: every card drawn on Shavuot is treated not as a tool for introspection, but as a direct, unmediated command — a slice of Sinai.",
    ritualMechanic: "Every card read as direct command, not introspection.",
    heraldAccent: { motif: "unveiled" },
    dateRule: { kind: "range", month: "Sivan", startDay: 6, lengthLand: 1, lengthGalut: 2 },
    gesture: "Receive",
  },
  {
    id: "tishabav",
    name: "Tisha B'Av",
    hebrewName: "תשעה באב",
    description:
      "\"The Ruined Vessel.\" The absolute nadir of the spiritual year: the destruction of the Temple, the exile of the Shechinah, the ultimate manifestation of Galut. The Major Arcana (the 22 Letters) is completely locked — the pure archetypes of the Land are inaccessible, even if the reading takes place in Jerusalem.",
    ritualMechanic: "The 22-Letter deck is locked entirely for this reading.",
    heraldAccent: { lockLetters: true, accentColor: "#7a7a7a", motif: "cracked" },
    dateRule: { kind: "fixed", month: "Av", day: 9 },
    gesture: "Remember",
  },
  {
    id: "tubishvat",
    name: "Tu Bishvat",
    hebrewName: "ט״ו בשבט",
    description:
      "\"The Etz Chaim / Four Worlds.\" The New Year of the Trees, elevated by the Kabbalists of Tzfat into a meditation on the Tree of Life and the Four Worlds (Assiyah, Yetzirah, Beriah, Atzilut). The standard triadic spread becomes a vertical Four-Card Draw — roots, trunk, branches, and fruit — with a fifth card drawn for the world to come. The Pardes framework takes precedence.",
    ritualMechanic: "Vertical Four-Card Draw (roots/trunk/branches/fruit) + a fifth for the world to come.",
    heraldAccent: { accentColor: "#7a9a5a", motif: "rooted" },
    dateRule: { kind: "fixed", month: "Shevat", day: 15 },
    gesture: "Plant",
  },
  {
    id: "tubav",
    name: "Tu B'Av",
    hebrewName: "ט״ו באב",
    description:
      "\"The Yichud / Unification.\" Occurring on the full moon six days after the devastation of Tisha B'Av, Tu B'Av is about transparency: the veiled anchor is unveiled. The reading does not look for tension or conflict, only for synthesis — between each letter in a pair, and between each pair.",
    ritualMechanic: "Veiled anchor is unveiled; reading looks only for synthesis, not tension.",
    heraldAccent: { accentColor: "var(--color-gold-bright)", motif: "synthesis" },
    dateRule: { kind: "fixed", month: "Av", day: 15 },
    gesture: "Connect",
  },
  {
    id: "hanukkah",
    name: "Hanukkah",
    hebrewName: "חנוכה",
    description: "Illuminate. Eight days commemorating the rededication of the Temple and the miracle of the oil.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "range", month: "Kislev", startDay: 25, lengthLand: 8, lengthGalut: 8 },
    gesture: "Illuminate",
    contemplativeQuestion: "What darkness needs a light shone on it?",
  },
  {
    id: "simchat-torah",
    name: "Simchat Torah",
    hebrewName: "שמחת תורה",
    description:
      "Rejoice. The completion and immediate restart of the annual Torah-reading cycle, bundled here with Shmini Atzeret (the 8th day of assembly following Sukkot).",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "range", month: "Tishri", startDay: 22, lengthLand: 1, lengthGalut: 2 },
    gesture: "Rejoice",
  },
  {
    id: "lag-baomer",
    name: "Lag Ba'Omer",
    hebrewName: "ל״ג בעומר",
    description: "Illuminate. The 33rd day of the Omer count, a customary day of joy amid the semi-mourning period.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Iyyar", day: 18 },
    gesture: "Illuminate",
  },
  {
    id: "fast-of-gedaliah",
    name: "Fast of Gedaliah",
    hebrewName: "צום גדליה",
    description: "Hone. A minor fast mourning the assassination of Gedaliah and the final end of Jewish sovereignty after the First Temple's destruction.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Tishri", day: 3 },
    gesture: "Hone",
  },
  {
    id: "tenth-of-tevet",
    name: "Tenth of Tevet",
    hebrewName: "עשרה בטבת",
    description: "Hone. A minor fast marking the beginning of the Babylonian siege of Jerusalem.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Tevet", day: 10 },
    gesture: "Hone",
  },
  {
    id: "seventeenth-of-tammuz",
    name: "Seventeenth of Tammuz",
    hebrewName: "י״ז בתמוז",
    description: "Hone. A minor fast marking the first breach of Jerusalem's walls, beginning the Three Weeks leading to Tisha B'Av.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Tammuz", day: 17 },
    gesture: "Hone",
  },
  {
    id: "fast-of-esther",
    name: "Fast of Esther",
    hebrewName: "תענית אסתר",
    description: "Hone. A minor fast observed the day before Purim, commemorating Esther's fast before approaching the king.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Adar", day: 13 },
    gesture: "Hone",
  },
  {
    id: "yom-hashoah",
    name: "Yom HaShoah",
    hebrewName: "יום השואה",
    description: "Bear Witness. Holocaust Remembrance Day.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Nisan", day: 27 },
    gesture: "Bear Witness",
  },
  {
    id: "yom-hazikaron",
    name: "Yom HaZikaron",
    hebrewName: "יום הזיכרון",
    description: "Honour. Israel's Memorial Day for fallen soldiers and victims of terror.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Iyyar", day: 4 },
    gesture: "Honour",
  },
  {
    id: "yom-haatzmaut",
    name: "Yom HaAtzmaut",
    hebrewName: "יום העצמאות",
    description: "Build. Israel's Independence Day.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Iyyar", day: 5 },
    gesture: "Build",
  },
  {
    id: "yom-yerushalayim",
    name: "Yom Yerushalayim",
    hebrewName: "יום ירושלים",
    description: "Gather. Jerusalem Day, commemorating the reunification of Jerusalem.",
    ritualMechanic: "No ritual override defined yet.",
    dateRule: { kind: "fixed", month: "Iyyar", day: 28 },
    gesture: "Gather",
  },
];

export const festivalsById: Record<string, FestivalOverride> = Object.fromEntries(
  festivals.map((festival) => [festival.id, festival]),
);
