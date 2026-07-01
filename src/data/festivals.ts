import type { FestivalOverride } from "../types/festival";

/**
 * Sacred-time overrides. `heraldAccent` is a data-driven hook the Herald
 * renderer reads to apply a single, small visual delta per festival —
 * deliberately minimal, not a full re-skin per festival.
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
  },
  {
    id: "pesach",
    name: "Pesach & the Afikoman",
    hebrewName: "פסח",
    description:
      "\"The Broken Vessel.\" In Lurianic Kabbalah, the concept of a shattered, incomplete reality is foundational (Shevirat HaKelim). The Afikoman step, Tzafun (\"the hidden\"), enacts this: the Scribe's Veiled Anchor is broken and hidden until the very end of the reading, so the participant sits in the tension of an incomplete reality until the hidden piece is restored.",
    ritualMechanic: "Veiled Anchor is broken/hidden until the reading's close (Tzafun).",
    heraldAccent: { motif: "broken-vessel" },
  },
  {
    id: "sukkot",
    name: "Sukkot & the Ushpizin",
    hebrewName: "סוכות",
    description:
      "\"The Sefirotic Guests.\" The Ushpizin are the literal personifications of the seven lower Sefirot: Abraham (Chesed), Isaac (Gevurah), Jacob (Tiferet), Moses (Netzach), Aaron (Hod), Joseph (Yesod), David (Malchut). The standard deck is overridden with these seven figures, and the reading shifts from the Letters directly into the Sefirot.",
    ritualMechanic: "Deck overridden by the 7 Ushpizin/Sefirot; Letters step is bypassed.",
    heraldAccent: { forceMode: "sefirot" },
  },
  {
    id: "high-holy-days",
    name: "The High Holy Days",
    hebrewName: "ימים נוראים",
    description:
      "\"The Rebuilding of Malchut.\" Rosh Hashanah is the moment the Sefirah of Malchut is judged and rebuilt from scratch, entering a state of Din (strict judgment). The interface shifts to themes of solemnity, sealing, and absolute truth — the Grimoire ceases to be a compass and becomes a scale.",
    ritualMechanic: "Interface shifts to solemnity/sealing/judgment.",
    heraldAccent: { accentColor: "var(--color-silver)", motif: "seal" },
  },
  {
    id: "purim",
    name: "Purim & the Masking Protocol",
    hebrewName: "פורים",
    description:
      "\"Hester Panim\" — the hiding of the Divine Face. The Arizal taught Purim is a higher spiritual holiday than Yom Kippur precisely because God's name is never mentioned in the Megillah. The reading rejects Peshat (the literal) and aggressively pursues Sod (the secret): the mundane and chaotic are read as the deepest masks of the Divine.",
    ritualMechanic: "Peshat rejected; Sod pursued aggressively.",
    heraldAccent: { accentColor: "var(--color-blue-bright)", motif: "veil" },
  },
  {
    id: "shavuot",
    name: "Shavuot & the Sinai Revelation",
    hebrewName: "שבועות",
    description:
      "\"Yichud\" — unification. The Zohar views the giving of Torah at Sinai as a wedding between God and Israel. The veil is completely lifted: every card drawn on Shavuot is treated not as a tool for introspection, but as a direct, unmediated command — a slice of Sinai.",
    ritualMechanic: "Every card read as direct command, not introspection.",
    heraldAccent: { motif: "unveiled" },
  },
  {
    id: "tishabav",
    name: "Tisha B'Av",
    hebrewName: "תשעה באב",
    description:
      "\"The Ruined Vessel.\" The absolute nadir of the spiritual year: the destruction of the Temple, the exile of the Shechinah, the ultimate manifestation of Galut. The Major Arcana (the 22 Letters) is completely locked — the pure archetypes of the Land are inaccessible, even if the reading takes place in Jerusalem.",
    ritualMechanic: "The 22-Letter deck is locked entirely for this reading.",
    heraldAccent: { lockLetters: true, accentColor: "#7a7a7a", motif: "cracked" },
  },
  {
    id: "tubishvat",
    name: "Tu Bishvat",
    hebrewName: "ט״ו בשבט",
    description:
      "\"The Etz Chaim / Four Worlds.\" The New Year of the Trees, elevated by the Kabbalists of Tzfat into a meditation on the Tree of Life and the Four Worlds (Assiyah, Yetzirah, Beriah, Atzilut). The standard triadic spread becomes a vertical Four-Card Draw — roots, trunk, branches, and fruit — with a fifth card drawn for the world to come. The Pardes framework takes precedence.",
    ritualMechanic: "Vertical Four-Card Draw (roots/trunk/branches/fruit) + a fifth for the world to come.",
    heraldAccent: { accentColor: "#7a9a5a", motif: "rooted" },
  },
  {
    id: "tubav",
    name: "Tu B'Av",
    hebrewName: "ט״ו באב",
    description:
      "\"The Yichud / Unification.\" Occurring on the full moon six days after the devastation of Tisha B'Av, Tu B'Av is about transparency: the veiled anchor is unveiled. The reading does not look for tension or conflict, only for synthesis — between each letter in a pair, and between each pair.",
    ritualMechanic: "Veiled anchor is unveiled; reading looks only for synthesis, not tension.",
    heraldAccent: { accentColor: "var(--color-gold-bright)", motif: "synthesis" },
  },
];

export const festivalsById: Record<string, FestivalOverride> = Object.fromEntries(
  festivals.map((festival) => [festival.id, festival]),
);
