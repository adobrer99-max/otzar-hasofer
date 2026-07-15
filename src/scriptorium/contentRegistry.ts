import { festivals } from "../data/festivals";
import { dorotCards, dorotHousesById } from "../data/dorot";
import { liturgies, LITURGY_SECTIONS } from "../data/liturgies";
import { encounters } from "../data/encounters";
import { sefirahHonorifics, letterEmblems, DEFAULT_HONORIFIC } from "../data/epithets";
import { letters } from "../data/letters";

/**
 * The Scriptorium's single source of truth for "what content is authorable."
 *
 * This module is a PURE descriptor built by reading the shipped `src/data/*`
 * datasets — it imports no components, no CSS, and never mutates the data. It
 * drives the studio's index (gap badges), the generic draft form, and the JSON
 * export. Folding drafted values back into the canonical `src/data/*.ts` files
 * is a deliberate, separate step done from the exported JSON; nothing here
 * changes what the live app renders.
 */

export type DatasetId =
  | "festivals"
  | "dorot-matriarchal"
  | "liturgy"
  | "encounters"
  | "epithets"
  | "letters";

/** How a field is edited (and, in the export, understood). `rich` fields carry
 *  sanitized HTML from the composition editor; the rest are plain strings. */
export type FieldKind = "text" | "multiline" | "hebrew" | "rich";

export interface FieldDescriptor {
  /** The data field name, e.g. "contemplativeQuestion". */
  key: string;
  label: string;
  kind: FieldKind;
  /** Shown under the field as guidance. */
  hint?: string;
}

export interface RegistryEntry {
  /** Stable within its dataset — the export keys on this. */
  id: string;
  label: string;
  /** Secondary context for the list (house, section, aspect…). */
  sublabel?: string;
  /** Large Hebrew glyph/word to head the preview, if any. */
  hebrew?: string;
  /** Shipped values for each authorable field (empty string when absent). */
  base: Record<string, string>;
  /** A genuine content gap (missing required content), vs. a first-draft rework. */
  isGap: boolean;
}

export interface DatasetDescriptor {
  id: DatasetId;
  label: string;
  /** One-line description of the gap this dataset represents. */
  blurb: string;
  /** The word used for a flagged entry ("gap" for missing, "first-draft" for rework). */
  gapNoun: string;
  fields: FieldDescriptor[];
  entries: RegistryEntry[];
}

function str(value: string | undefined): string {
  return value ?? "";
}

// ——— Festivals: gesture + contemplative question (20 lack a question) ———
const festivalsDataset: DatasetDescriptor = {
  id: "festivals",
  label: "Festival questions",
  blurb: "The contemplative question (and gesture) for each sacred-time override.",
  gapNoun: "gap",
  fields: [
    { key: "gesture", label: "Gesture", kind: "text", hint: "The one-word verb/theme, e.g. “Rest”, “Illuminate”." },
    {
      key: "contemplativeQuestion",
      label: "Contemplative question",
      kind: "rich",
      hint: "The question the day asks of the participant.",
    },
  ],
  entries: festivals
    .filter((f) => f.id !== "ordinary")
    .map((f) => ({
      id: f.id,
      label: f.name,
      sublabel: f.hebrewName,
      hebrew: f.hebrewName,
      base: {
        gesture: str(f.gesture),
        contemplativeQuestion: str(f.contemplativeQuestion),
      },
      isGap: !f.contemplativeQuestion,
    })),
};

// ——— Ha'Dorot, matriarchal Houses: title + practice + question (112 thin) ———
const matriarchalCards = dorotCards.filter(
  (c) => dorotHousesById[c.houseId]?.kind === "matriarchal",
);
const dorotDataset: DatasetDescriptor = {
  id: "dorot-matriarchal",
  label: "Ha'Dorot cards",
  blurb:
    "The 112 matriarchal episode cards — a real title, the lived practice, and the question.",
  gapNoun: "gap",
  fields: [
    { key: "title", label: "Card title", kind: "text", hint: "An evocative title (currently equal to the episode name)." },
    { key: "humanPractice", label: "The Human Practice", kind: "rich", hint: "The lived practice the episode points toward." },
    { key: "question", label: "Contemplative question", kind: "rich" },
  ],
  entries: matriarchalCards.map((c) => {
    const house = dorotHousesById[c.houseId];
    return {
      id: c.id,
      label: `${c.index}. ${c.title}`,
      sublabel: `House of ${house?.figure ?? c.houseId}${c.coreEnergy ? ` · ${c.coreEnergy}` : ""}`,
      base: {
        title: str(c.title),
        humanPractice: str(c.humanPractice),
        question: str(c.question),
      },
      // Thin cards lack a distinct practice and question (title === episode).
      isGap: !c.humanPractice || !c.question,
    };
  }),
};

// ——— Liturgies: English rendering + Sod prompt (14, first-draft rework) ———
const sectionTitle: Record<string, string> = Object.fromEntries(
  LITURGY_SECTIONS.map((s) => [s.id, s.title]),
);
const liturgyDataset: DatasetDescriptor = {
  id: "liturgy",
  label: "Liturgy English + Sod",
  blurb: "The first-draft English rendering and the Sod prompt for each liturgy.",
  gapNoun: "first-draft",
  fields: [
    { key: "english", label: "English rendering", kind: "rich", hint: "The project's own English voice — not a copyrighted translation." },
    { key: "sodPrompt", label: "Sod prompt", kind: "rich", hint: "The contemplative question (the Sod tier)." },
  ],
  entries: liturgies.map((l) => ({
    id: l.id,
    label: l.title,
    sublabel: `${sectionTitle[l.section] ?? l.section} · ${l.hebrewName}`,
    hebrew: l.hebrewName,
    base: { english: str(l.english), sodPrompt: str(l.sodPrompt) },
    isGap: false,
  })),
};

// ——— Encounters: the question (4 of 7 first-draft) ———
const firstDraftEncounters = new Set([2, 4, 5, 7]);
const encountersDataset: DatasetDescriptor = {
  id: "encounters",
  label: "Encounter questions",
  blurb: "The contemplative question for each of the Seven Encounters of Bereshit.",
  gapNoun: "first-draft",
  fields: [{ key: "question", label: "Contemplative question", kind: "rich" }],
  entries: encounters.map((e) => ({
    id: String(e.number),
    label: `${e.name} — ${e.aspect}`,
    sublabel: e.themes,
    base: { question: str(e.question) },
    isGap: firstDraftEncounters.has(e.number),
  })),
};

// ——— Epithets: honorifics, emblems, and the fallback (all first-draft) ———
const epithetsDataset: DatasetDescriptor = {
  id: "epithets",
  label: "Epithets",
  blurb: "The honorific per Sefirah, the emblem per letter, and the default honorific.",
  gapNoun: "first-draft",
  fields: [{ key: "phrase", label: "Phrase", kind: "text" }],
  entries: [
    ...Object.entries(sefirahHonorifics).map(([sefirah, phrase]) => ({
      id: `sefirah:${sefirah}`,
      label: `Honorific — ${sefirah}`,
      sublabel: "drawn from the dominant middah",
      base: { phrase: str(phrase) },
      isGap: false,
    })),
    {
      id: "default",
      label: "Default honorific",
      sublabel: "fallback when an upper Sefirah is met",
      base: { phrase: DEFAULT_HONORIFIC },
      isGap: false,
    },
    ...Object.entries(letterEmblems).map(([letterId, phrase]) => ({
      id: `emblem:${letterId}`,
      label: `Emblem — ${letterId}`,
      sublabel: "composed as “under the Sign of {emblem}”",
      base: { phrase: str(phrase) },
      isGap: false,
    })),
  ],
};

// ——— Letters: meanings and notes (all 22, first-draft rework) ———
const letterFields: FieldDescriptor[] = [
  { key: "keyword", label: "Keyword", kind: "text" },
  { key: "translationRoot", label: "Translation / root", kind: "text" },
  { key: "eternalPrinciple", label: "Eternal principle", kind: "rich" },
  { key: "question", label: "Contemplative question", kind: "rich" },
  { key: "hebrewRoot", label: "Hebrew root", kind: "hebrew" },
  { key: "scribeNotes", label: "Scribe notes", kind: "rich" },
];
const lettersDataset: DatasetDescriptor = {
  id: "letters",
  label: "Letter meanings",
  blurb: "The keyword, root, principle, question, and notes for each of the 22 letters.",
  gapNoun: "first-draft",
  fields: letterFields,
  entries: letters.map((l) => ({
    id: l.id,
    label: `${l.glyph} ${l.name}`,
    sublabel: l.transliteration,
    hebrew: l.glyph,
    base: {
      keyword: str(l.keyword),
      translationRoot: str(l.translationRoot),
      eternalPrinciple: str(l.eternalPrinciple),
      question: str(l.question),
      hebrewRoot: str(l.hebrewRoot),
      scribeNotes: str(l.scribeNotes),
    },
    isGap: false,
  })),
};

export const DATASETS: DatasetDescriptor[] = [
  festivalsDataset,
  dorotDataset,
  liturgyDataset,
  encountersDataset,
  epithetsDataset,
  lettersDataset,
];

export const datasetsById: Record<DatasetId, DatasetDescriptor> = Object.fromEntries(
  DATASETS.map((d) => [d.id, d]),
) as Record<DatasetId, DatasetDescriptor>;

/** The IndexedDB / draft key for one entry. */
export function draftKey(datasetId: DatasetId, entryId: string): string {
  return `${datasetId}::${entryId}`;
}

/** Split a draft key back into its dataset id and entry id. */
export function parseDraftKey(key: string): { datasetId: DatasetId; entryId: string } | undefined {
  const at = key.indexOf("::");
  if (at < 0) return undefined;
  const datasetId = key.slice(0, at) as DatasetId;
  if (!datasetsById[datasetId]) return undefined;
  return { datasetId, entryId: key.slice(at + 2) };
}
