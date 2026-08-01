import type { SefirahId } from "../../types/letter";

/**
 * The *shtayger* — the modes Jewish prayer is actually sung in.
 *
 * Not the Western church modes. Ashkenazi liturgical music has its own small
 * set of scales, each attached to particular prayers and moods, and every one
 * of them sounds immediately like itself. Using Dorian and Aeolian here would
 * have produced generic "fantasy game" music over a Hebrew alphabet; using
 * these produces something a person who has been to shul will recognise
 * before they can say why.
 *
 * Each is written as semitone offsets from the tonic, so a phrase stored as
 * scale *degrees* can be poured into any of them (see `score.ts`).
 */
export interface Mode {
  id: string;
  name: string;
  hebrew: string;
  /** Semitones above the tonic, one per scale degree, ascending. */
  steps: number[];
  /** What the mode is for, in the tradition — shown in the sound panel. */
  character: string;
}

export const MODES: Record<string, Mode> = {
  /**
   * The one most people mean by "the Jewish sound": a flat second over a
   * major third, which is the augmented-second leap that gives it its ache.
   * Named for the blessing before the Shema.
   */
  "ahavah-rabbah": {
    id: "ahavah-rabbah",
    name: "Ahavah Rabbah",
    hebrew: "אהבה רבה",
    steps: [0, 1, 4, 5, 7, 8, 10],
    character: "Supplication — the flat second over a major third, the ache of asking.",
  },
  /**
   * Natural minor. The Friday-evening mode, named for the blessing that
   * follows the Amidah — settled, and the plainest of the four.
   */
  "magen-avot": {
    id: "magen-avot",
    name: "Magen Avot",
    hebrew: "מגן אבות",
    steps: [0, 2, 3, 5, 7, 8, 10],
    character: "Evening rest — the plain minor of Friday night, settled and unhurried.",
  },
  /**
   * Major with a flattened seventh. The mode of the psalms of praise, and
   * the most open and declarative of the four.
   */
  "adonai-malach": {
    id: "adonai-malach",
    name: "Adonai Malach",
    hebrew: "ה׳ מלך",
    steps: [0, 2, 4, 5, 7, 9, 10],
    character: "Declaration — major with a lowered seventh, the psalms of kingship.",
  },
  /**
   * Dorian with a raised fourth — the "Ukrainian Dorian" of klezmer, and the
   * mode of the prayer for the sick. Restless; it never quite settles.
   */
  "mi-sheberach": {
    id: "mi-sheberach",
    name: "Mi Sheberach",
    hebrew: "מי שברך",
    steps: [0, 2, 3, 6, 7, 9, 10],
    character: "Yearning — the raised fourth that will not sit still; the prayer for healing.",
  },
};

/**
 * A rung of the Tree, and the mode it is sung in.
 *
 * Chosen so the climb has a shape rather than a playlist: the kingdom is
 * plain and low, the middle rungs ache and yearn, Chesed opens into praise,
 * and the supernals thin out — Keter is barely a mode at all, which is why it
 * gets the plainest one and the fewest voices (`score.ts` handles that).
 *
 * `octave` shifts the tonic, so the ascent literally rises in pitch: Malchut
 * sits low, Keter two octaves above it.
 */
export interface RungVoice {
  mode: string;
  /** Octave offset from the base tonic. */
  octave: number;
}

export const RUNG_VOICES: Record<SefirahId, RungVoice> = {
  malchut: { mode: "magen-avot", octave: 0 },
  yesod: { mode: "mi-sheberach", octave: 0 },
  hod: { mode: "ahavah-rabbah", octave: 1 },
  netzach: { mode: "adonai-malach", octave: 1 },
  tiferet: { mode: "adonai-malach", octave: 1 },
  gevurah: { mode: "ahavah-rabbah", octave: 1 },
  chesed: { mode: "adonai-malach", octave: 2 },
  binah: { mode: "mi-sheberach", octave: 2 },
  chochmah: { mode: "ahavah-rabbah", octave: 2 },
  keter: { mode: "magen-avot", octave: 2 },
};

/** The tonic everything is reckoned from — D, low and warm. */
export const BASE_TONIC_HZ = 146.83;

export function modeFor(sefirah: SefirahId): Mode {
  const voice = RUNG_VOICES[sefirah];
  return MODES[voice?.mode ?? "magen-avot"];
}

/**
 * The pitch of a scale degree, in Hz. Degrees are 1-based and wrap past the
 * top of the mode into the octave above, so a phrase may run higher than
 * seven without needing a second table.
 */
export function pitchOf(mode: Mode, degree: number, octave: number): number {
  const size = mode.steps.length;
  // Degree 1 is the tonic; anything above `size` wraps up an octave.
  const index = ((degree - 1) % size + size) % size;
  const wraps = Math.floor((degree - 1) / size);
  const semitones = mode.steps[index] + 12 * (wraps + octave);
  return BASE_TONIC_HZ * Math.pow(2, semitones / 12);
}
