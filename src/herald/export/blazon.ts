import type { HeraldInputSnapshot, HeraldStyle, LetterDraw } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import type { HeraldForm } from "../synthesis/deriveHeraldForm";
import { lettersById } from "../../data/letters";
import { ushpizin } from "../../data/ushpizin";
import { computeDivisions } from "../render/divisions";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import { colorFor } from "../render/letterColors";
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
