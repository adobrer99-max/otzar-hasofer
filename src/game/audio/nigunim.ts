import type { FestivalId } from "../../types/festival";
/**
 * The nigunim the Tree sings.
 *
 * A nigun is a Hasidic melody, usually wordless, usually old, usually
 * attributed to a rebbe or to nobody at all. That makes them the right
 * repertoire for a shipped application: they are oral tradition, not
 * publisher catalogue, and the ones here are all comfortably out of any
 * copyright term.
 *
 * ## Every entry says where it came from and how far to trust it
 *
 * Melodies are stored as **scale degrees, not pitches**, so a nigun pours
 * into whichever prayer mode the rung is sung in (see `modes.ts`). More
 * importantly, every entry carries a `transcription` note, because the
 * melodies below were written down **from memory and by ear**. The tunes are
 * real and the attributions are real; the exact intervals are one person's
 * recollection and have not been checked against a printed source. That is
 * recorded here rather than quietly hoped for — the Treasury cites BDB over
 * HALOT and names its first-draft content as first-draft, and a melody
 * carrying a rebbe's name deserves at least as much care.
 *
 * If you can check one against a real source, correct it and raise its
 * confidence. `PENDING_NIGUNIM` below lists tunes that belong here and that
 * were deliberately *not* guessed at.
 *
 * ## Before adding anything
 *
 * Sounding traditional is not the same as being traditional, and this
 * repertoire is full of traps:
 *
 * - **Shlomo Carlebach** (d. 1994) wrote a great deal of what is now sung as
 *   though it were ancient. Protected until roughly 2064.
 * - Most **post-1930 Chabad** compositions are likewise in copyright.
 * - **Shalom Aleichem**'s ubiquitous tune is Israel Goldfarb's, 1918 — public
 *   domain in the US, but check the life+70 term before shipping elsewhere.
 * - A **recording or a printed arrangement** is its own copyright even when
 *   the melody underneath is free. Transcribe the tune, never someone's
 *   setting of it.
 *
 * Check the date, not the feeling.
 */

export type TranscriptionConfidence = "high" | "moderate" | "low";

export interface Nigun {
  id: string;
  name: string;
  hebrew?: string;
  /** The court or tradition it belongs to, or "—" for a composed phrase. */
  tradition: string;
  attribution: string;
  era: string;
  rights: {
    basis: "traditional-oral" | "published-pd" | "composed-for-this-work";
    note: string;
  };
  /**
   * Scale degrees, 1 = the tonic of whatever mode it is sung in. Degrees
   * above the mode's size wrap into the octave above; 0 means a rest.
   */
  phrase: number[];
  transcription: { confidence: TranscriptionConfidence; note: string };
}

const BY_EAR =
  "Written down from memory by ear. The contour is right; the exact intervals are unverified. Check against a printed source before treating as authoritative.";

export const nigunim: Nigun[] = [
  {
    id: "hava-nagila",
    name: "Hava Nagila",
    hebrew: "הבה נגילה",
    tradition: "Sadigura",
    attribution: "Anonymous — a nigun of the Sadigura Hasidim of Bukovina",
    era: "before 1915",
    rights: {
      basis: "traditional-oral",
      note: "The melody is an anonymous Hasidic nigun, transcribed by A. Z. Idelsohn in Jerusalem in 1915 and arranged by him in 1918. The long-running authorship dispute concerns the Hebrew *words*, which are not used here — only the tune, which is traditional and free.",
    },
    phrase: [1, 1, 3, 4, 3, 4, 5, 5, 5, 4, 3, 2, 1, 0],
    transcription: { confidence: "moderate", note: BY_EAR },
  },
  {
    id: "hevenu-shalom-aleichem",
    name: "Hevenu Shalom Aleichem",
    hebrew: "הבאנו שלום עליכם",
    tradition: "Hasidic, court unrecorded",
    attribution: "Anonymous",
    era: "traditional; no composer established",
    rights: {
      basis: "traditional-oral",
      note: "Universally catalogued as a traditional Hasidic tune with no attributed composer. No publication claim found.",
    },
    phrase: [5, 5, 5, 6, 5, 4, 3, 0, 3, 4, 5, 4, 3, 2, 1, 0],
    transcription: { confidence: "moderate", note: BY_EAR },
  },

  // --- composed for this work -------------------------------------------
  // Not attributed to anyone, not claiming to be any particular nigun. These
  // exist so every rung has something to sing without a real tune being
  // guessed at to fill a gap — which is how misattributions get made.
  {
    id: "ascent-phrase",
    name: "A phrase for the climbing",
    tradition: "—",
    attribution: "Composed for the Treasury, in the idiom",
    era: "—",
    rights: {
      basis: "composed-for-this-work",
      note: "Original. Written in the shape of a nigun — a rising call, a hovering answer — but it is nobody's tune and is not offered as one.",
    },
    phrase: [1, 2, 3, 5, 4, 3, 2, 0, 3, 4, 5, 6, 5, 3, 1, 0],
    transcription: { confidence: "high", note: "Original — nothing to verify." },
  },
  {
    id: "supernal-phrase",
    name: "A phrase for the upper three",
    tradition: "—",
    attribution: "Composed for the Treasury, in the idiom",
    era: "—",
    rights: {
      basis: "composed-for-this-work",
      note: "Original. Sparse and slow, for the rungs above the Abyss, where the score thins to almost nothing.",
    },
    phrase: [1, 0, 5, 0, 4, 0, 3, 0, 1, 0, 0, 0],
    transcription: { confidence: "high", note: "Original — nothing to verify." },
  },
];

export const nigunimById: Record<string, Nigun> = Object.fromEntries(
  nigunim.map((n) => [n.id, n]),
);

/**
 * Nigunim that belong in this catalogue and were deliberately left out.
 *
 * Each is unambiguously in the public domain and would suit the game; none is
 * here because writing down a four-movement nigun of the Alter Rebbe from a
 * half-memory and attaching his name to it would be worse than the silence.
 * Added properly — from a source — they should be.
 */
export const PENDING_NIGUNIM = [
  {
    name: "Niggun Daled Bavos",
    attribution: "R. Schneur Zalman of Liadi (1745–1812), the Alter Rebbe",
    why: "Chabad's most sacred nigun, in four movements. Long, precisely structured, and far beyond safe recall.",
  },
  {
    name: "Niggun Shamil",
    attribution: "Chabad, 19th century, adapted from a Caucasian melody",
    why: "The shape is well known but the exact line is not something to guess.",
  },
  {
    name: "Szól a kakas már",
    attribution: "R. Yitzchak Isaac Taub of Kaliv (1751–1821)",
    why: "A Hungarian shepherd's song turned nigun. Wants a Hungarian source, not a recollection.",
  },
  {
    name: "Dudele",
    attribution: "R. Levi Yitzchak of Berditchev (1740–1809)",
    why: "Sung in many variants; picking one from memory would be picking arbitrarily.",
  },
] as const;

/**
 * Which nigun a day calls for, when the calendar names one. Festivals not
 * listed simply use the rung's own phrase.
 *
 * Keyed by `FestivalId` rather than `string`, so a festival renamed or
 * mistyped here stops compiling instead of silently playing the rung's own
 * phrase forever. The nigun side stays checked by `nigunFor`'s lookup into
 * `NIGUNIM`, and `audio.test.ts` holds that every value here names a real
 * tune.
 */
export const FESTIVAL_NIGUNIM: Partial<Record<FestivalId, string>> = {
  tubav: "hava-nagila",
  "lag-baomer": "hava-nagila",
  "simchat-torah": "hava-nagila",
  shabbat: "hevenu-shalom-aleichem",
};
