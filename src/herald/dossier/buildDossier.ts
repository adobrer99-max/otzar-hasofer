import type { HeraldLayer, LetterDraw, ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import { LIFE_CYCLE_EVENT_LABELS } from "../../types/lifeCycle";
import { lettersById } from "../../data/letters";
import { dorotCardsById, dorotHousesById } from "../../data/dorot";
import { festivalsById } from "../../data/festivals";
import { middot } from "../../data/middot";
import { encountersByNumber } from "../../data/encounters";
import { formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { resolveShoresh } from "../shoresh/resolveShoresh";

/**
 * A participant's whole history as a plain document model — the Scribe's own
 * printable record. Pure, so the privacy rule is testable: the Sod (the
 * veiled letter), reflections, palm notes, and the private notes on
 * life-cycle events appear only when the Scribe opts each one in.
 */

export interface DossierOptions {
  includeSod: boolean;
  includeReflections: boolean;
  includePalmNotes: boolean;
  includeEventNotes: boolean;
}

export const PRIVATE_DEFAULTS: DossierOptions = {
  includeSod: false,
  includeReflections: false,
  includePalmNotes: false,
  includeEventNotes: false,
};

export interface DossierLetter {
  glyph: string;
  name: string;
  keyword: string;
  reversed: boolean;
}

export interface DossierReading {
  key: string;
  title: string;
  civilDate: string;
  hebrewDate?: string;
  occasion: string[];
  spread: string;
  letters: DossierLetter[];
  /** The Etz Chaim fourth, or the Yichud spread's openly paired fourth. */
  fourth?: DossierLetter;
  /** The veiled letter — present only when the Sod is opted in. */
  sod?: DossierLetter;
  middah?: string;
  word?: string;
  dorot: { role: string; title: string; house?: string }[];
  geography?: string;
  reflection?: string;
  palmNotes?: string;
}

export interface DossierEvent {
  key: string;
  label: string;
  date: string;
  notes?: string;
}

export interface Dossier {
  name: string;
  hebrewName?: string;
  path: string;
  birthday?: string;
  epithet?: string;
  readings: DossierReading[];
  events: DossierEvent[];
}

const SPREAD_LABELS = {
  triadic: "The Triadic Spread",
  "etz-chaim": "The Etz Chaim — PaRDeS",
  yichud: "Yichud — the paired spread",
} as const;

const DOROT_ROLES = {
  "beneath-first": "Beneath the First drawn",
  "beneath-second": "Beneath the Second drawn",
  "beneath-third": "Beneath the Third drawn",
  council: "The Council of Sefirot",
} as const;

function letterOf(draw: LetterDraw): DossierLetter {
  const letter = lettersById[draw.letterId];
  return {
    glyph: letter?.glyph ?? "?",
    name: letter?.name ?? draw.letterId,
    keyword: letter?.keyword ?? "",
    reversed: draw.orientation === "reversed",
  };
}

function civil(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function readingOf(layer: HeraldLayer, options: DossierOptions): DossierReading {
  const input = layer.input;
  const spread = input.spread ?? "triadic";
  const sacredTime = input.sacredTime;
  const festival = festivalsById[input.festivalId];
  const occasion: string[] = [];
  if (festival && festival.id !== "ordinary") occasion.push(festival.name);
  if (sacredTime?.omer) occasion.push(`Omer day ${sacredTime.omer.day}`);
  const encounter = input.encounterNumber ? encountersByNumber[input.encounterNumber] : undefined;
  if (encounter) occasion.push(`Encounter ${encounter.number}: ${encounter.aspect}`);

  // The Shoresh is resolved from the three open letters only (never the Sod),
  // and PaRDeS takes precedence on the Etz Chaim spread.
  const shoresh =
    spread === "etz-chaim"
      ? undefined
      : resolveShoresh(input.drawnLetters.map((d) => d.letterId) as [string, string, string]);
  const word =
    shoresh?.tier === "root"
      ? `${shoresh.word} (${shoresh.transliteration}) — ${shoresh.gloss}`
      : shoresh?.tier === "name"
        ? `${shoresh.name} (${shoresh.transliteration}) — ${shoresh.gloss}`
        : undefined;

  const fourth =
    spread === "etz-chaim" && input.fourthLetter
      ? letterOf(input.fourthLetter)
      : spread === "yichud"
        ? letterOf(input.veiledLetter) // drawn openly as the second pair's partner
        : undefined;
  const sodIsSealed = spread !== "yichud";

  return {
    key: layer.id,
    title: layer.isOrigin ? "The Origin Herald" : `Reading ${layer.layerIndex + 1}`,
    civilDate: civil(layer.createdAt),
    hebrewDate: sacredTime ? formatHebrewDateEnglish(sacredTime.hebrewDate) : undefined,
    occasion,
    spread: SPREAD_LABELS[spread],
    letters: input.drawnLetters.map(letterOf),
    fourth,
    sod: options.includeSod && sodIsSealed ? letterOf(input.veiledLetter) : undefined,
    middah: middot.find((m) => m.id === input.middah)?.label,
    word,
    dorot: (input.dorotDraws ?? []).map((d) => {
      const card = dorotCardsById[d.cardId];
      return {
        role: DOROT_ROLES[d.role],
        title: card?.title ?? d.cardId,
        house: card ? dorotHousesById[card.houseId]?.figure : undefined,
      };
    }),
    geography:
      input.geography.mode === "land"
        ? "In the Land"
        : `In the galut${input.geography.place ? ` — ${input.geography.place}` : ""}`,
    reflection: options.includeReflections ? input.reflection?.trim() || undefined : undefined,
    palmNotes: options.includePalmNotes ? input.palmNotes?.trim() || undefined : undefined,
  };
}

function eventOf(event: LifeCycleEvent, options: DossierOptions): DossierEvent {
  const label = LIFE_CYCLE_EVENT_LABELS[event.type] ?? event.type;
  const notes = options.includeEventNotes
    ? [event.notes, event.sponsoringCommunity && `Community: ${event.sponsoringCommunity}`, event.beitDin && `Beit din: ${event.beitDin}`]
        .filter(Boolean)
        .join(" · ") || undefined
    : undefined;
  return {
    key: event.id,
    label: event.type === "yahrzeit" ? `${label} — ${event.relation}: ${event.personName}` : label,
    date: formatHebrewDateEnglish(event.hebrewDate),
    notes,
  };
}

export function buildDossier(
  participant: ParticipantRecord,
  layers: HeraldLayer[],
  events: LifeCycleEvent[],
  options: DossierOptions = PRIVATE_DEFAULTS,
): Dossier {
  return {
    name: participant.displayName,
    hebrewName: participant.hebrewName,
    path: participant.path === "brit" ? "Brit — the covenantal path" : "Noach — the universal path",
    birthday: participant.hebrewBirthDate ? formatHebrewDateEnglish(participant.hebrewBirthDate) : undefined,
    epithet: participant.heraldicEpithet?.text,
    readings: [...layers].sort((a, b) => a.layerIndex - b.layerIndex).map((l) => readingOf(l, options)),
    events: events.map((e) => eventOf(e, options)),
  };
}
