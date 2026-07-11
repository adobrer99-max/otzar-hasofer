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

/**
 * Which spread the reading used. Absent/"triadic" is the standard reading
 * (three open letters plus the veiled anchor). "etz-chaim" is Tu Bishvat's
 * Vertical Four-Card Draw (roots/trunk/branches/fruit ↔ the Four Worlds,
 * plus a fifth sealed card for the world to come). "yichud" is Tu B'Av's
 * unification reading, where the veiled anchor is drawn openly and the four
 * letters are read as two pairs seeking synthesis.
 */
export type SpreadKind = "triadic" | "etz-chaim" | "yichud";

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
   * Two spread-specific reinterpretations of this slot: on Tu Bishvat
   * ("etz-chaim") it holds the fifth card — Olam Ha'Ba, the world to come —
   * still sealed, still unrendered; on Tu B'Av ("yichud") the anchor is
   * unveiled and this letter is, exceptionally, drawn openly and rendered.
   */
  veiledLetter: LetterDraw;
  /**
   * Etz Chaim (Tu Bishvat) only: the fourth open card — the Fruit / Atzilut.
   * `drawnLetters` then hold roots/trunk/branches (Assiyah/Yetzirah/Briyah).
   * Additive — readings predating this feature simply lack it.
   */
  fourthLetter?: LetterDraw;
  /** Additive — absent means "triadic", the standard spread. */
  spread?: SpreadKind;
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

/**
 * The Scribe's curation of a participant's Herald — refinements on top of the
 * derived defaults, in keeping with "the Herald is recognized, never assigned":
 * every option is a curated enum/toggle within the Visual Canon (no free
 * colour), so the render stays deterministic and brand-faithful. All fields
 * optional; absent = the default illuminated frame. Applies to the synthesis
 * and to every layer render, re-derived from the stored record.
 */
export interface HeraldStyle {
  /**
   * The metal of the whole achievement (frame, charges, ornament) — one flat
   * foil metal, gold by default. The field tinctures carry the reading's own
   * colours; the metal does not. ("natural" is a deprecated alias kept for
   * records saved before the foil-stamp redesign; it renders as gold.)
   */
  metal?: "natural" | "gold" | "antique" | "silver";
  /** How each drawn letter appears on the shield: its enamelled letterform, or its heraldic charge (the pictographic symbol language). Default letterform. */
  device?: "glyph" | "charge";
  crest?: boolean;
  mantling?: boolean;
  compartment?: boolean;
  supporters?: boolean;
  /** Which of the seven species flanks the shield; omit to derive it from the dominant middah. */
  mantlingSpecies?: "wheat" | "barley" | "grape" | "fig" | "pomegranate" | "olive" | "date";
  /** Whether the sealed epithet is shown on the motto scroll. */
  motto?: boolean;
  /** Semé — the field strewn with faint gold estoiles. Default on. */
  seme?: boolean;
  /** The reading's gematria, struck in Hebrew numerals below the charges. Default on. */
  gematria?: boolean;
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
  /** The Scribe's curation of this participant's Herald. Additive; absent = default frame. */
  heraldStyle?: HeraldStyle;
  /** Set on mutation (birthday/epithet), for cloud-sync ordering. Additive; falls back to createdAt. */
  updatedAt?: string;
}

export interface HeraldLayer {
  id: string;
  participantId: string;
  layerIndex: number;
  createdAt: string;
  input: HeraldInputSnapshot;
  isOrigin: boolean;
}
