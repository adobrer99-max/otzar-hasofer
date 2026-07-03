#!/usr/bin/env node
/**
 * Generates src/data/shorashim.generated.ts from the vendored OpenScriptures
 * Strong's Hebrew dictionary (data-sources/openscriptures/HebrewStrong.xml).
 *
 * Source: OpenScriptures HebrewLexicon project (github.com/openscriptures/HebrewLexicon).
 * The underlying Brown-Driver-Briggs (BDB, 1906) and Strong's Hebrew dictionary
 * text is public domain; OpenScriptures' XML markup is CC BY 4.0.
 *
 * HARD CONSTRAINT: do not vendor or reference HALOT (Koehler-Baumgartner) data
 * anywhere in this pipeline — it is a modern, copyrighted work (Brill), unlike
 * BDB/Strong's. Only BDB-derived, public-domain sources belong here.
 *
 * Run: node scripts/build-shorashim.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.join(__dirname, "../data-sources/openscriptures/HebrewStrong.xml");
const OUTPUT_PATH = path.join(__dirname, "../src/data/shorashim.generated.ts");
const OVERRIDES_PATH = path.join(__dirname, "../data-sources/name-overrides.json");

// Mirrors src/data/letters.ts glyphs — kept as a small inline map so this
// script has no dependency on a TypeScript loader. Update both if the
// 22-letter set ever changes (it shouldn't).
const GLYPH_TO_ID = {
  א: "aleph", ב: "bet", ג: "gimel", ד: "dalet", ה: "heh", ו: "vav", ז: "zayin",
  ח: "chet", ט: "tet", י: "yod", כ: "kaf", ל: "lamed", מ: "mem", נ: "nun",
  ס: "samech", ע: "ayin", פ: "peh", צ: "tzadi", ק: "kuf", ר: "resh", ש: "shin", ת: "tav",
};

// Final-form letters normalize to their base form rather than being skipped —
// skipping would silently exclude a large, non-random share of legitimate
// roots whose third radical is final-form in citation form.
const FINAL_TO_BASE = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

const NIQQUD_AND_CANTILLATION = /[֑-ׇ]/g;

function stripNiqqud(hebrew) {
  return hebrew.replace(NIQQUD_AND_CANTILLATION, "");
}

function normalizeFinals(consonants) {
  return consonants
    .split("")
    .map((ch) => FINAL_TO_BASE[ch] ?? ch)
    .join("");
}

function toLetterIds(consonants) {
  const ids = [];
  for (const ch of consonants) {
    const id = GLYPH_TO_ID[ch];
    if (!id) return null; // contains a char outside our 22-letter set
    ids.push(id);
  }
  return ids;
}

/**
 * <meaning>/<usage> often mix plain text with nested tags (e.g. <def>) whose
 * relative order fast-xml-parser's default (non-preserveOrder) mode loses.
 * Rather than fight that, extract these two fields directly from each
 * entry's raw XML slice via regex, stripping inner tags but keeping text
 * in its original order — simpler and more faithful than reconstructing
 * mixed content from the parsed object tree.
 */
function extractRawField(entryXml, tagName) {
  const match = entryXml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`));
  if (!match) return undefined;
  return match[1]
    .replace(/<[^>]+>/g, "") // strip nested tags (e.g. <def>, <w src="...">)
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`Missing vendored source at ${SOURCE_PATH}.`);
    console.error("Download it from https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml");
    process.exit(1);
  }

  const overrides = existsSync(OVERRIDES_PATH)
    ? JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"))
    : { forceName: [], forceRoot: [], exclude: [] };

  const xml = readFileSync(SOURCE_PATH, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const entries = doc.lexicon.entry;

  // Raw XML per entry id, used to extract <meaning>/<usage> text faithfully
  // (see extractRawField for why this bypasses the parsed object tree).
  const rawEntryById = new Map();
  for (const match of xml.matchAll(/<entry id="(H\d+)">([\s\S]*?)<\/entry>/g)) {
    rawEntryById.set(match[1], match[2]);
  }

  const results = [];
  let skippedNonThreeLetter = 0;
  let skippedOutsideAlphabet = 0;

  for (const entry of entries) {
    const id = entry["@_id"];
    if (!id || overrides.exclude?.includes(id)) continue;

    const w = Array.isArray(entry.w) ? entry.w[0] : entry.w;
    if (!w) continue;
    const hebrewRaw = typeof w === "string" ? w : w["#text"];
    if (!hebrewRaw) continue;

    const pos = typeof w === "object" ? w["@_pos"] ?? "" : "";
    const xlit = typeof w === "object" ? w["@_xlit"] ?? "" : "";

    const consonants = normalizeFinals(stripNiqqud(hebrewRaw));
    if (consonants.length !== 3) {
      skippedNonThreeLetter++;
      continue;
    }
    const letterIds = toLetterIds(consonants);
    if (!letterIds) {
      skippedOutsideAlphabet++;
      continue;
    }

    const rawBlock = rawEntryById.get(id) ?? "";
    const meaningText = extractRawField(rawBlock, "meaning");
    const usageText = extractRawField(rawBlock, "usage");
    const gloss = meaningText ?? usageText ?? "";
    const usageNote = meaningText ? usageText : undefined;

    const isProperNoun = pos.includes("n-pr") || overrides.forceName?.includes(id);
    const kind = overrides.forceRoot?.includes(id) ? "root" : isProperNoun ? "name" : "root";

    results.push({
      id,
      letters: letterIds,
      transliteration: xlit,
      gloss: gloss.trim(),
      usageNote: usageNote?.trim() || undefined,
      citation: `Strong's ${id} (BDB)`,
      kind,
    });
  }

  const header = `/**
 * Generated by scripts/build-shorashim.mjs — do not hand-edit.
 * Source: OpenScriptures HebrewLexicon (BDB/Strong's Hebrew, public domain).
 * Regenerate with: node scripts/build-shorashim.mjs
 *
 * HARD CONSTRAINT: never source this file (or its inputs) from HALOT
 * (Koehler-Baumgartner) — that lexicon is modern-copyrighted (Brill).
 * Only BDB/Strong's (public domain, 1906) content belongs here.
 *
 * This is a mechanically-filtered dataset (exactly-3-consonant entries
 * mapping onto the app's 22 letters). Expect noise — homographs, proper-noun
 * detection false positives/negatives, inflected forms miscast as roots —
 * and treat it as a first-pass draft needing editorial review, not a
 * finished lexicon.
 */
import type { LetterId } from "../types/letter";

export interface ShoreshEntry {
  id: string;
  letters: [LetterId, LetterId, LetterId];
  transliteration: string;
  gloss: string;
  usageNote?: string;
  citation: string;
  kind: "root" | "name";
}
`;

  const body =
    `export const shorashim: ShoreshEntry[] = ${JSON.stringify(results, null, 2)};\n\n` +
    `export const shorashimByKey: Record<string, ShoreshEntry[]> = {};\n` +
    `for (const entry of shorashim) {\n` +
    `  const key = entry.letters.join("-");\n` +
    `  (shorashimByKey[key] ??= []).push(entry);\n` +
    `}\n`;

  writeFileSync(OUTPUT_PATH, header + "\n" + body);

  console.log(`Parsed ${entries.length} Strong's entries.`);
  console.log(`Skipped ${skippedNonThreeLetter} (not exactly 3 consonants after normalization).`);
  console.log(`Skipped ${skippedOutsideAlphabet} (contain characters outside the 22-letter set).`);
  console.log(`Wrote ${results.length} entries (${results.filter((e) => e.kind === "name").length} names, ${results.filter((e) => e.kind === "root").length} roots) to ${OUTPUT_PATH}`);
}

main();
