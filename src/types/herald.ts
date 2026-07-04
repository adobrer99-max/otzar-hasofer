import type { SefirahId } from "./letter";
import type { SacredTimeSnapshot } from "./sacredTime";
import type { HebrewDate } from "../data/hebrewCalendar";

export type ReadingPath = "brit" | "noach";
export type Orientation = "upright" | "reversed";
export type GeographyMode = "land" | "galut";

export interface LetterDraw {
  letterId: string;
  orientation: Orientation;
}

/**
 * Why a Derekh Ha'Dorot card was drawn: the three "beneath" roles are the
 * Galut cards laid beneath the three open letters (also used for Tisha
 * B'Av's forced draws); "council" is Sukkot's Council of Sefirot.
 */
export type DorotDrawRole = "beneath-first" | "beneath-second" | "beneath-third" | "council";

export interface DorotDraw {
  /** A stable Derekh Ha'Dorot card id, e.g. "abraham-1" … "ruth-16". */
  cardId: string;
  role: DorotDrawRole;
}

export interface HeraldInputSnapshot {
  path: ReadingPath;
  hebrewName?: string;
  isFirstTime: boolean;
  palmNotes?: string;
  /** The three openly drawn letters — the sole source of the visible Herald. */
  drawnLetters: [LetterDraw, LetterDraw, LetterDraw];
  /**
   * Drawn privately by the Scribe; recorded for the Sod/secret record but
   * deliberately excluded from the rendered Herald, since it stays hidden.
   */
  veiledLetter: LetterDraw;
  middah: SefirahId;
  geography: {
    mode: GeographyMode;
    place?: string;
  };
  /** FestivalOverride id, or "ordinary" for a non-festival day. */
  festivalId: string;
  reflection?: string;
  /** Additive — older stored layers simply lack this. */
  sacredTime?: SacredTimeSnapshot;
  /** Which of the Seven Encounters this reading was, by reading count at submit time. Additive; undefined for readings beyond the seventh or predating this feature. */
  encounterNumber?: number;
  /** Cards drawn from Derekh Ha'Dorot in this reading. Additive — readings predating this feature simply lack it. */
  dorotDraws?: DorotDraw[];
}

/**
 * The honorific received from the Treasury at the seventh reading. The
 * Treasury proposes (`derivedText`, kept even if reworded), the Scribe may
 * reword, and sealing is permanent.
 */
export interface HeraldicEpithet {
  text: string;
  derivedText: string;
  sealedAt: string;
}

export interface ParticipantRecord {
  id: string;
  displayName: string;
  hebrewName?: string;
  path: ReadingPath;
  createdAt: string;
  /** The recurring month/day anchor for the Hebrew Birthday / "Annual Treasury Reading". */
  hebrewBirthDate?: HebrewDate;
  /** Additive — participants who have not reached their seventh reading simply lack this. */
  heraldicEpithet?: HeraldicEpithet;
}

export interface HeraldLayer {
  id: string;
  participantId: string;
  layerIndex: number;
  createdAt: string;
  input: HeraldInputSnapshot;
  isOrigin: boolean;
}
