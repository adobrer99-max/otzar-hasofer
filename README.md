# Otzar Ha'Sofer — The Treasury

A digital companion and reference guide for the Otzar Ha'Sofer physical folio and Derekh Eretz (22-letter) deck. Not a fortune-telling tool — a reference for the Scribe during a reading, plus a generator for each participant's **Herald**, a procedurally-rendered heraldic sigil built from the three letters drawn in their reading.

## What's here

- **Reference guide** (`/guide/*`) — Foundations, all 22 Hebrew letters (one chapter each), Shoresh (the root/Nikkudot mechanic), Derekh Ha'Dorot (the second deck: 7 patriarchal Houses of 8 fully-drafted episode cards plus 7 matriarchal Houses of 16 episodes — 168 entries embodying lived biblical history, unfolding pillar-by-pillar through the Seven Encounters), the Mizbe'ach, the Scribe's ritual steps, Sacred Time (festival overrides plus Immediate/Personal/Covenantal time), the Seven Encounters of Bereshit, and the Visual Canon.
- **The Herald** (`/herald`) — an input form mirroring the reading's ritual flow, auto-detecting today's Hebrew date/Omer/festival (with a backdate override), and a deterministic procedural SVG renderer that builds a unique heraldic shield from the three openly-drawn letters (the veiled fourth letter stays hidden, recorded but never rendered). The three letters are also resolved as a potential Hebrew root through a 4-tier hierarchy (Canonical Root → Canonical Name → Related Correspondence → Shoresh Nistar/Hidden Root). Each reading is also placed within the Seven Encounters of Bereshit — a participant's first seven readings each surface a Creation-day theme and contemplative question (and open that Encounter's Ha'Dorot Houses), with a soft (non-blocking) rest-period note before the seventh. At the seventh reading the participant receives their **Heraldic Epithet**: the Treasury deterministically proposes one from the seven readings' accumulated history, the Scribe may reword it, and once sealed it is inscribed into the rendered Herald from that layer onward. Each new reading adds a layer rather than overwriting the last, with a history scrubber, SVG/PNG export, and — per participant — a Hebrew Birthday and Yahrzeit tracker that surfaces past readings on the same recurring Hebrew date.
- **Commentaries** (`/commentaries`) — the Treasury's Drash tier: Scribe-authored commentaries attached to any letter, Ha'Dorot card, or Hebrew root, dated in Hebrew time and kept alongside the received seed commentary (the doc's "Commentary on ה — Ot Ha'Neshema" by Aleph Yud). Commentaries surface inline on letter chapters, House pages, and in a reading's caption when its three letters match a commented root.

Everything is local-only: participant, Herald, and commentary data is stored in the browser (IndexedDB), no backend or accounts. Out of scope for this build: recording drawn Ha'Dorot cards inside a reading and the festival-specific draw mechanics (Galut cards beneath the letters, Sukkot's Council of Sefirot, Tisha B'Av forcing the Galut deck, Tu Bishvat's vertical draw), "moments of calling," weekly Torah portion tracking, and most life-cycle events beyond Hebrew Birthday/Yahrzeit (marriage, Bris, conversion, Aliyah, etc.) — see the project plan for what's deferred and why.

### A note on licensing

Hebrew calendar conversion uses [`jewish-date`](https://www.npmjs.com/package/jewish-date) (MIT). The more complete `@hebcal/core` library was deliberately avoided — it's GPL-2.0, which isn't safe to bundle into a commercial client-side app. Holiday/Omer/Yahrzeit logic is this project's own thin layer on top of the MIT conversion primitive. Similarly, the Shoresh root data is generated from the public-domain Brown-Driver-Briggs (BDB) lexicon via OpenScriptures — never from HALOT, which is modern-copyrighted.

## Development

```sh
npm install
npm run dev       # local dev server
npm run build     # production build (also generates the PWA service worker)
npm run test      # vitest — includes a determinism test for the Herald renderer
```

Built with Vite, React, and TypeScript. Installable as an offline-capable PWA.
