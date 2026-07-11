/**
 * One-off / repeatable print-master generator for the Mizbe'ach folio.
 *
 * Renders the real folio components (the central panel + the ring mandala in
 * its neutral, un-highlighted "master" state) with react-dom/server, composes
 * them into a single landscape "open folio" spread, inlines the brand-constant
 * palette as literal hex, and embeds the David Libre + Frank Ruhl Libre woff2
 * fonts as base64 @font-face — so the resulting .svg is fully self-contained
 * and portable to any print shop (scalable vector, no external assets).
 *
 * Usage: node scripts/export-folio-print.mjs [outfile.svg]
 */
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const fontsDir = join(projectRoot, "public", "fonts");
const outFile = resolve(process.argv[2] ?? join(projectRoot, "mizbeach-folio-print.svg"));

// ——— brand constants (mirror src/styles/theme.css :root) — the folio always
// lives on the charcoal field, so we bake the dark-theme literals. ———
const VAR_MAP = {
  "--color-charcoal": "#14171c",
  "--color-charcoal-raised": "#1c2027",
  "--color-charcoal-line": "#2a2f38",
  "--color-gold": "#c9a24b",
  "--color-gold-bright": "#e4c579",
  "--color-blue": "#1f3a5f",
  "--color-blue-bright": "#3f6ea5",
  "--color-silver": "#c7ccd4",
  "--color-copper": "#c98056",
  "--color-parchment": "#ece6d8",
  "--text": "#ece6d8",
  "--text-muted": "#9aa1ad",
  "--accent": "#c9a24b",
  "--accent-bright": "#e4c579",
  "--font-hebrew": "'David Libre'",
  "--font-latin": "'Frank Ruhl Libre'",
};

function inlineVars(svg) {
  return svg.replace(/var\((--[a-z-]+)\)/g, (_, name) => VAR_MAP[name] ?? "#000");
}

// ——— embed the self-hosted fonts as base64 @font-face ———
const HEBREW_RANGE = "U+0590-05FF, U+FB1D-FB4F, U+200C-2010, U+20AA, U+25CC";
const LATIN_RANGE = "U+0000-00FF, U+2000-206F, U+2122, U+2212";
const FONT_FACES = [
  { family: "David Libre", weight: 400, file: "david-libre-400-hebrew.woff2", range: HEBREW_RANGE },
  { family: "David Libre", weight: 400, file: "david-libre-400-latin.woff2", range: LATIN_RANGE },
  { family: "David Libre", weight: 500, file: "david-libre-500-hebrew.woff2", range: HEBREW_RANGE },
  { family: "David Libre", weight: 500, file: "david-libre-500-latin.woff2", range: LATIN_RANGE },
  { family: "David Libre", weight: 700, file: "david-libre-700-hebrew.woff2", range: HEBREW_RANGE },
  { family: "David Libre", weight: 700, file: "david-libre-700-latin.woff2", range: LATIN_RANGE },
  { family: "Frank Ruhl Libre", weight: "400 900", file: "frank-ruhl-libre-hebrew.woff2", range: HEBREW_RANGE },
  { family: "Frank Ruhl Libre", weight: "400 900", file: "frank-ruhl-libre-latin.woff2", range: LATIN_RANGE },
];

async function buildFontDefs() {
  const faces = [];
  for (const f of FONT_FACES) {
    const b64 = (await readFile(join(fontsDir, f.file))).toString("base64");
    faces.push(
      `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};` +
        `src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${f.range};}`,
    );
  }
  return `<defs><style type="text/css">${faces.join("")}</style></defs>`;
}

// ——— render the real components to two SVG strings via a bundled entry ———
async function renderComponents() {
  const entryPath = join(__dirname, ".folio-entry.tsx");
  const outPath = join(__dirname, ".folio-entry.mjs");
  const entry = `
import { renderToStaticMarkup } from "react-dom/server";
import { MizbeachCentralPanel } from "../src/mizbeach/render/centralPanel";
import { MizbeachSvgContent } from "../src/mizbeach/render/buildMizbeachSvg";
import { computeSacredTime } from "../src/data/sacredTime";

const sacred = computeSacredTime(new Date(2026, 0, 1), "land");
export const central = renderToStaticMarkup(<MizbeachCentralPanel />);
export const mandala = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 760">
    <rect x={0} y={0} width={760} height={760} fill="var(--color-charcoal)" />
    <MizbeachSvgContent sacredTime={sacred} revealHidden={false} neutral />
  </svg>,
);
`;
  await writeFile(entryPath, entry);
  try {
    await build({
      entryPoints: [entryPath],
      outfile: outPath,
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      jsx: "automatic",
      logLevel: "silent",
    });
    const mod = await import(`${outPath}?t=${Date.now()}`);
    return { central: mod.central, mandala: mod.mandala };
  } finally {
    await rm(entryPath, { force: true });
    await rm(outPath, { force: true });
  }
}

async function main() {
  const { central, mandala } = await renderComponents();

  // Landscape "open folio" spread: ring mandala (left leaf) + central panel
  // (right leaf), a titled header band above both, on the charcoal field.
  const MARGIN = 64;
  const GAP = 64;
  const TITLE_BAND = 128;
  const MANDALA = 760;
  const PANEL_W = 620;
  const PANEL_H = 870;
  const W = MARGIN + MANDALA + GAP + PANEL_W + MARGIN;
  const H = TITLE_BAND + PANEL_H + MARGIN;
  const mandalaY = TITLE_BAND + (PANEL_H - MANDALA) / 2;

  const place = (svg, attrs) => svg.replace(/^<svg /, `<svg ${attrs} `);
  const mandalaEl = place(mandala.trim(), `x="${MARGIN}" y="${mandalaY}" width="${MANDALA}" height="${MANDALA}"`);
  const panelEl = place(
    central.trim().replace(/ style="[^"]*"/, ""),
    `x="${MARGIN + MANDALA + GAP}" y="${TITLE_BAND}" width="${PANEL_W}" height="${PANEL_H}"`,
  );

  const fontDefs = await buildFontDefs();

  let sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    fontDefs +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="var(--color-charcoal)"/>` +
    `<text x="${W / 2}" y="66" text-anchor="middle" font-family="var(--font-hebrew)" font-size="42" fill="var(--color-gold)">מִזְבֵּחַ</text>` +
    `<text x="${W / 2}" y="100" text-anchor="middle" font-family="var(--font-latin)" font-size="17" letter-spacing="5" fill="var(--color-silver)">THE MIZBE’ACH · READING FOLIO</text>` +
    `<line x1="${MARGIN}" y1="114" x2="${W - MARGIN}" y2="114" stroke="var(--color-gold)" stroke-width="0.75" opacity="0.5"/>` +
    mandalaEl +
    panelEl +
    `</svg>`;

  sheet = inlineVars(sheet);
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `<?xml version="1.0" encoding="UTF-8"?>\n${sheet}`);
  const kb = ((await readFile(outFile)).length / 1024).toFixed(0);
  console.log(`Wrote ${outFile} (${kb} KB, self-contained: fonts + colors embedded)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
