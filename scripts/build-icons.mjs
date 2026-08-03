#!/usr/bin/env node
/**
 * The app icons, rendered from the one favicon that is actually authored.
 *
 * `public/favicon.svg` is the source of truth and always has been; the problem
 * was that it was also the *only* icon, and the manifest offered it as
 * `sizes: "any"`. That is legal and it is not what a phone wants: Android
 * homescreens and the install prompt look for raster icons at 192 and 512, and
 * a maskable one so the platform can crop to whatever shape it uses without
 * cutting the mark in half. Without them an installed Ma'alot got a generic
 * glyph or a letter in a white circle.
 *
 * Rendered rather than hand-drawn, and checked in rather than built at deploy
 * time, so the icons cannot drift from the favicon and the build stays free of
 * an image toolchain. Chromium is already here for the playtest harness, which
 * is why there is no `sharp` in this file.
 *
 *   npm run build:icons
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/favicon.svg"), "utf8");

/** The page colour behind the mark — the same one `index.html` sets. */
const BACKDROP = "#14171c";

const JOBS = [
  { size: 192, file: "icon-192.png", inset: 0 },
  { size: 512, file: "icon-512.png", inset: 0 },
  // A maskable icon may be cropped to a circle, a squircle or a rounded
  // square, so the shield is inset into the safe zone rather than run to the
  // edge. One tenth on each side is inside every platform's crop.
  { size: 512, file: "icon-maskable-512.png", inset: 0.1 },
];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium",
});

for (const { size, file, inset } of JOBS) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  const pad = Math.round(size * inset);
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:${BACKDROP}}
       .wrap{position:absolute;inset:${pad}px}
       svg{width:100%;height:100%;display:block}
     </style><div class="wrap">${svg}</div>`,
  );
  await page.screenshot({ path: join(root, "public", file) });
  await page.close();
  console.log(`wrote public/${file} (${size}×${size})`);
}

await browser.close();
