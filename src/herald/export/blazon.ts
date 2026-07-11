import type { HeraldInputSnapshot, HeraldStyle, LetterDraw } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import type { HeraldForm } from "../synthesis/deriveHeraldForm";
import { lettersById } from "../../data/letters";
import { ushpizin } from "../../data/ushpizin";
import { computeDivisions } from "../render/divisions";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import { colorFor, colorNameFor } from "../render/letterColors";
import { dorotSefirotOf } from "../render/buildHeraldSvg";
import { associationOf, associationLabel, dominantElementHue, toHebrewNumeral } from "../render/associations";
import { speciesFor, type Species } from "../render/heraldFlora";

/**
 * A Herald's blazon — a deterministic, machine-readable description of the arms
 * as the renderer draws them, derived from the same functions. It is the
 * "artist's brief": everything a human illustrator or a foil-die shop needs to
 * realize the emblem, with every choice traced back to the reading. The veiled
 * letter is never included (it is sealed, and never drawn).
 */
export interface Blazon {
  subject: "reading" | "synthesis";
  status?: string;
  metal: "gold" | "silver" | "antique";
  field: {
    division: string;
    regions: { letterId: string; letterName: string; glyph: string; tincture: string }[];
    elementCast?: { element: string; hue: string };
  };
  charges: { letterId: string; letterName: string; glyph: string; association?: string }[];
  wordOfLife?: { word: string; gloss: string; citation?: string };
  crest: { kind: "zodiac" | "flame"; signs: string[] };
  planets: { letterName: string; planet: string }[];
  mantling?: { species: Species; fromSefirah?: string };
  compartment: "land" | "galut";
  gematria: { total: number; hebrew: string };
  dorotPillars: string[];
  hiddenNameWoven: boolean;
  epithet?: string;
  spread?: "etz-chaim" | "yichud";
}

const SEFIRAH_NAME: Record<string, string> = Object.fromEntries(
  ushpizin.map((u) => [u.sefirah, u.sefirahName]),
);

function metalOf(style?: HeraldStyle): Blazon["metal"] {
  return style?.metal === "silver" ? "silver" : style?.metal === "antique" ? "antique" : "gold";
}

function letterName(id: string): string {
  return lettersById[id]?.name ?? id;
}
function glyphOf(id: string): string {
  return lettersById[id]?.glyph ?? "";
}

const DIVISION_NAME = ["a plain field", "a plain field", "per pale", "tierced in pale"];

/** Build a blazon from an ordered set of drawn letters (the field/charges) plus context. */
function buildBlazon(params: {
  subject: Blazon["subject"];
  drawnLetters: [LetterDraw, LetterDraw, LetterDraw];
  middah: SefirahId;
  geography: "land" | "galut";
  style?: HeraldStyle;
  dorotSefirot: SefirahId[];
  hiddenName?: string;
  epithet?: string;
  status?: string;
  spread?: "etz-chaim" | "yichud";
}): Blazon {
  const { drawnLetters, middah, geography, style, dorotSefirot } = params;
  const divisions = computeDivisions(drawnLetters);
  const ordered = [...divisions].sort((a, b) => a.drawOrder - b.drawOrder);
  const orderedIds = ordered.map((d) => d.letterId);
  const distinct = [...new Set(orderedIds)];

  const elementHue = dominantElementHue(orderedIds);
  const elementLetter = orderedIds.find((id) => associationOf(id)?.kind === "element");

  const gematriaTotal = divisions.reduce((s, d) => s + (lettersById[d.letterId]?.gematria ?? 0) * d.count, 0);

  const shoresh = resolveShoresh(orderedIds.slice(0, 3) as [string, string, string]);
  const wordOfLife =
    shoresh.tier === "root" || shoresh.tier === "name"
      ? {
          word: ordered.map((d) => glyphOf(d.letterId)).join(""),
          gloss: "gloss" in shoresh ? shoresh.gloss : "",
          citation: "citation" in shoresh ? shoresh.citation : undefined,
        }
      : undefined;

  const zodiacSigns = distinct
    .filter((id) => associationOf(id)?.kind === "zodiac")
    .map((id) => associationLabel(id)!)
    .filter(Boolean);
  const planets = distinct
    .filter((id) => associationOf(id)?.kind === "planet")
    .map((id) => ({ letterName: letterName(id), planet: associationLabel(id)! }));

  const species = style?.mantlingSpecies ?? speciesFor(middah, gematriaTotal);

  return {
    subject: params.subject,
    status: params.status,
    metal: metalOf(style),
    field: {
      division: DIVISION_NAME[Math.min(distinct.length, 3)],
      regions: distinct.map((id) => ({
        letterId: id,
        letterName: letterName(id),
        glyph: glyphOf(id),
        tincture: colorFor(id),
      })),
      elementCast:
        elementHue && elementLetter
          ? { element: associationLabel(elementLetter)!, hue: elementHue }
          : undefined,
    },
    charges: ordered.map((d) => ({
      letterId: d.letterId,
      letterName: letterName(d.letterId),
      glyph: glyphOf(d.letterId),
      association: associationLabel(d.letterId),
    })),
    wordOfLife,
    crest: zodiacSigns.length > 0 ? { kind: "zodiac", signs: zodiacSigns } : { kind: "flame", signs: [] },
    planets,
    mantling:
      (style?.mantling ?? true)
        ? { species, fromSefirah: style?.mantlingSpecies ? undefined : SEFIRAH_NAME[middah] }
        : undefined,
    compartment: geography,
    gematria: { total: gematriaTotal, hebrew: toHebrewNumeral(gematriaTotal) },
    dorotPillars: dorotSefirot.map((s) => SEFIRAH_NAME[s] ?? s),
    hiddenNameWoven: !!params.hiddenName,
    epithet: params.epithet,
    spread: params.spread,
  };
}

/** The blazon of a single reading's Herald. */
export function blazonForSnapshot(input: HeraldInputSnapshot, style?: HeraldStyle, epithet?: string): Blazon {
  const spread = input.spread && input.spread !== "triadic" ? input.spread : undefined;
  return buildBlazon({
    subject: "reading",
    drawnLetters: input.drawnLetters,
    middah: input.middah,
    geography: input.geography.mode,
    style,
    dorotSefirot: dorotSefirotOf(input.dorotDraws),
    hiddenName: input.hebrewName,
    epithet,
    spread,
  });
}

/** The blazon of the synthesis-of-seven Herald. */
export function blazonForForm(form: HeraldForm, style?: HeraldStyle, epithet?: string): Blazon {
  return buildBlazon({
    subject: "synthesis",
    drawnLetters: form.charges,
    middah: form.dominantMiddah,
    geography: form.geography,
    style,
    dorotSefirot: form.dorotSefirot,
    epithet,
    status: form.revealed ? "revealed (seven readings)" : `forming — ${form.readingCount} of 7`,
  });
}

/** Render a blazon as a human-readable brief with a machine-readable JSON appendix. */
export function blazonToText(b: Blazon, title: string): string {
  const L: string[] = [];
  L.push(`HERALD BLAZON — ${title}`);
  L.push(b.subject === "synthesis" ? `The synthesis of the seven readings${b.status ? ` (${b.status})` : ""}.` : `A single reading's Herald${b.spread ? ` — the ${b.spread} spread` : ""}.`);
  L.push("");
  L.push(`Metal: ${b.metal} (all linework, charges, and ornament struck in this one flat metal).`);
  const fieldLine = b.field.regions
    .map((r) => `${r.letterName} (${r.tincture})`)
    .join(", ");
  L.push(`Field: ${b.field.division}, tinctured from ${fieldLine}.`);
  if (b.field.elementCast) L.push(`  The field is cast toward ${b.field.elementCast.element} (${b.field.elementCast.hue}).`);
  L.push(`Charges: ${b.charges.map((c) => `${c.glyph} ${c.letterName}`).join(", ")} — struck in ${b.metal}.`);
  if (b.wordOfLife) L.push(`Fess (the Word of the Life): ${b.wordOfLife.word} — ${b.wordOfLife.gloss}${b.wordOfLife.citation ? ` [${b.wordOfLife.citation}]` : ""}.`);
  L.push(
    b.crest.kind === "zodiac"
      ? `Crest: the constellation${b.crest.signs.length > 1 ? "s" : ""} of ${b.crest.signs.join(", ")}, upon a gold torse.`
      : `Crest: a gold flame upon a torse.`,
  );
  if (b.planets.length) L.push(`Base: the planet sigil${b.planets.length > 1 ? "s" : ""} of ${b.planets.map((p) => `${p.planet} (${p.letterName})`).join(", ")}.`);
  if (b.mantling) L.push(`Mantling: ${b.mantling.species}${b.mantling.fromSefirah ? ` (for ${b.mantling.fromSefirah})` : " (curated)"}, of the Shivat HaMinim.`);
  L.push(`Compartment: ${b.compartment === "land" ? "rooted earth (the Land)" : "water (Galut)"}.`);
  L.push(`Gematria: ${b.gematria.total} — ${b.gematria.hebrew}.`);
  if (b.dorotPillars.length) L.push(`Derekh Ha'Dorot marks: ${b.dorotPillars.join(", ")}.`);
  if (b.hiddenNameWoven) L.push(`The Hebrew name is woven into the border (never displayed).`);
  if (b.epithet) L.push(`Motto: "${b.epithet}".`);
  L.push("");
  L.push("--- blazon.json ---");
  L.push(JSON.stringify(b, null, 2));
  return L.join("\n");
}

/** Download a blazon as a .txt brief (human-readable, with the JSON appended). */
export function downloadBlazon(b: Blazon, title: string, filename: string): void {
  const blob = new Blob([blazonToText(b, title)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const DIVISION_PHRASE: Record<string, string> = {
  "a plain field": "a single field",
  "per pale": "divided into two vertical halves",
  "tierced in pale": "divided into three vertical bands",
};

/** A richer visual phrase for each species, for the image prompt's mantling. */
const SPECIES_PHRASE: Record<Species, string> = {
  wheat: "golden sheaves of wheat",
  barley: "long-awned barley",
  grape: "grape vines heavy with clusters",
  fig: "fig branches with broad lobed leaves and ripe figs",
  pomegranate: "pomegranate branches bearing crowned fruit",
  olive: "olive branches with silver-green leaves and small olives",
  date: "date-palm fronds with hanging clusters",
};

/**
 * Render a blazon as a rich image-generation prompt — the brief for an image
 * model (ChatGPT/DALL·E), tuned to produce an illuminated Hebrew heraldic plate
 * like a ketubah. Every element is drawn from the blazon (so it stays faithful
 * to the reading); the arms are kept Hebrew-only, the epithet is the one motto.
 */
export function blazonToImagePrompt(b: Blazon, title: string): string {
  const s: string[] = [];
  s.push(
    `An illuminated Hebrew heraldic plate — a personal coat of arms in the style of a medieval ketubah and illuminated manuscript. Hand-painted on aged cream vellum, with flat gold-leaf linework and soft watercolour tinctures, symmetrical and reverent, portrait orientation. The whole card is framed by an ornate double gold border inscribed with the twenty-two letters of the Hebrew alphabet in gold, separated by small dots.`,
  );

  s.push(
    `At the top centre, a small gold roundel bears the Hebrew numeral ${b.gematria.hebrew} and the number ${b.gematria.total}.`,
  );

  if (b.crest.kind === "zodiac" && b.crest.signs.length) {
    s.push(
      `Below it rises the crest: the constellation${b.crest.signs.length > 1 ? "s" : ""} of ${b.crest.signs.join(" and ")}, drawn as gold stars joined by fine lines, resting upon a twisted gold wreath (a torse).`,
    );
  } else {
    s.push(`Below it rises the crest: a single gold flame upon a twisted gold wreath (a torse).`);
  }

  if (b.wordOfLife) {
    s.push(`Beneath the crest, a cream ribbon banner is inscribed in Hebrew with the word ${b.wordOfLife.word} (its meaning: ${b.wordOfLife.gloss}); paint only the Hebrew word on the banner.`);
  }

  const regions = b.field.regions.map((r) => colorNameFor(r.letterId));
  const division = DIVISION_PHRASE[b.field.division] ?? b.field.division;
  const charges = b.charges.map((c) => `${c.glyph} (${c.letterName})`).join(", ");
  s.push(
    `At the centre stands a heraldic escutcheon (a pointed medieval shield), ${division} tinctured ${regions.join(", ")}. Upon it, ${b.charges.length > 1 ? "one large gold Hebrew letter fills each division" : "a large gold Hebrew letter"} — ${charges} — struck in ${b.metal}, and nothing is ever laid over a letter.`,
  );
  if (b.field.elementCast) {
    s.push(`The whole field is washed toward ${b.field.elementCast.element}, deepening its colour.`);
  }

  if (b.mantling) {
    s.push(`Flanking the shield on both sides, symmetrical branches of ${SPECIES_PHRASE[b.mantling.species]} (of the seven species of the Land), in gold and natural colour, cascade from behind the crest.`);
  }

  s.push(
    b.compartment === "land"
      ? `The shield rests on a mound of rooted earth, its roots visibly spreading.`
      : `The shield rests upon rippling water.`,
  );

  if (b.planets.length) {
    s.push(`At the very base, beneath the shield, are the alchemical planet sigil${b.planets.length > 1 ? "s" : ""} of ${b.planets.map((p) => p.planet).join(" and ")}, drawn small in gold.`);
  }

  if (b.epithet) {
    s.push(`Along the bottom, a gold-edged motto scroll reads "${b.epithet}".`);
  }

  s.push(
    `Palette limited to gold, the named tinctures, and cream vellum. Flat and hand-painted — no photographic or 3D rendering, no drop shadows, no modern typography. All lettering inside the shield must be in Hebrew only.`,
  );

  return `Herald — ${title}\n\n${s.join(" ")}`;
}

/** Copy text to the clipboard; resolves false if the clipboard is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Download an image prompt as a .txt (fallback when the clipboard is unavailable). */
export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
