import type {
  HeraldInputSnapshot,
  LetterDraw,
  DorotDraw,
  ReadingPath,
  GeographyMode,
} from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { computeSacredTime } from "../../data/sacredTime";
import { getEncounterForReadingIndex } from "../../data/encounters";
import { resolveSpread } from "../../herald/spreads/resolveSpread";
import { resolveDorotMechanic } from "../../herald/dorot/dorotMechanics";

/**
 * The in-progress reading being laid out on the folio. It mirrors
 * `ReadingForm`'s state, but the placements come from surface zones rather
 * than form fields. `toSnapshot` assembles exactly the `HeraldInputSnapshot`
 * that `ReadingForm.handleSubmit` builds — reusing the same spread and Dorot
 * resolvers — so a reading sealed on the Mizbe'ach is indistinguishable from
 * one entered through the form, and persists through the same `addLayer`.
 */
export interface MizbeachReadingState {
  path: ReadingPath;
  hebrewName: string;
  isFirstTime: boolean;
  palmNotes: string;
  /** The three drawn letters, by zone; null until placed. */
  letters: [LetterDraw | null, LetterDraw | null, LetterDraw | null];
  veiled: LetterDraw | null;
  /** Etz Chaim (Tu Bishvat) fourth card. */
  fourth: LetterDraw | null;
  middah: SefirahId | null;
  geoMode: GeographyMode;
  place: string;
  /** The date the rings are turned to (drives sacred time, festival, spread). */
  effectiveDate: Date;
  /** Optional explicit festival override; otherwise derived from the rings' date. */
  festivalOverride?: string;
  /** Galut/Tisha B'Av "beneath" card ids, by drawn letter; and the Sukkot Council card. */
  beneathCards: [string | null, string | null, string | null];
  councilCard: string | null;
  reflection: string;
}

export function emptyReadingState(effectiveDate: Date = new Date()): MizbeachReadingState {
  return {
    path: "brit",
    hebrewName: "",
    isFirstTime: true,
    palmNotes: "",
    letters: [null, null, null],
    veiled: null,
    fourth: null,
    middah: null,
    geoMode: "land",
    place: "",
    effectiveDate,
    beneathCards: [null, null, null],
    councilCard: null,
    reflection: "",
  };
}

/** The festival the reading resolves to — the manual override, else the rings' date. */
export function resolvedFestivalId(state: MizbeachReadingState): string {
  if (state.festivalOverride) return state.festivalOverride;
  const sacredTime = computeSacredTime(state.effectiveDate, state.geoMode);
  return sacredTime.activeFestivalIds[0] ?? "ordinary";
}

export type ToSnapshotResult =
  | { ok: true; snapshot: HeraldInputSnapshot }
  | { ok: false; errors: string[] };

/**
 * Assembles the reading snapshot from the surface state, or reports what is
 * still missing. Pure — the same logic the form's handleSubmit runs.
 */
export function toSnapshot(state: MizbeachReadingState, readingIndex: number): ToSnapshotResult {
  const festivalId = resolvedFestivalId(state);
  const spread = resolveSpread(festivalId);
  const mechanic = resolveDorotMechanic(festivalId, state.geoMode);
  const sacredTime = computeSacredTime(state.effectiveDate, state.geoMode);

  const errors: string[] = [];
  if (state.letters.some((l) => l === null)) errors.push("Place all three drawn letters.");
  if (!state.veiled) errors.push("Place the veiled anchor.");
  if (!state.middah) errors.push("Choose a dominant middah on the Tree of Life.");
  if (spread === "etz-chaim" && !state.fourth) {
    errors.push("Place the fourth card (the Fruit — Atzilut).");
  }

  const needsBeneath = mechanic.beneath === "forced-tishabav" || mechanic.beneath === "galut";
  if (needsBeneath && state.beneathCards.some((c) => c === null)) {
    errors.push("Lay the three Derekh Ha'Dorot cards beneath the letters.");
  }
  if (mechanic.council && !state.councilCard) {
    errors.push("Draw the Council of Sefirot card.");
  }

  if (errors.length > 0) return { ok: false, errors };

  const drawnLetters = state.letters as [LetterDraw, LetterDraw, LetterDraw];

  const dorotDraws: DorotDraw[] = [];
  if (needsBeneath) {
    dorotDraws.push(
      { cardId: state.beneathCards[0]!, role: "beneath-first" },
      { cardId: state.beneathCards[1]!, role: "beneath-second" },
      { cardId: state.beneathCards[2]!, role: "beneath-third" },
    );
  }
  if (mechanic.council && state.councilCard) {
    dorotDraws.push({ cardId: state.councilCard, role: "council" });
  }

  const snapshot: HeraldInputSnapshot = {
    path: state.path,
    hebrewName: state.path === "brit" ? state.hebrewName || undefined : undefined,
    isFirstTime: state.isFirstTime,
    palmNotes: state.palmNotes || undefined,
    drawnLetters,
    veiledLetter: state.veiled!,
    fourthLetter: spread === "etz-chaim" ? state.fourth! : undefined,
    spread: spread === "triadic" ? undefined : spread,
    middah: state.middah!,
    geography: { mode: state.geoMode, place: state.place || undefined },
    festivalId,
    reflection: state.reflection || undefined,
    sacredTime,
    encounterNumber: getEncounterForReadingIndex(readingIndex)?.number,
    dorotDraws: dorotDraws.length > 0 ? dorotDraws : undefined,
  };
  return { ok: true, snapshot };
}
