# Otzar Ha'Sofer — The Treasury

A digital companion and reference guide for the Otzar Ha'Sofer physical folio and Derekh Eretz (22-letter) deck. Not a fortune-telling tool — a reference for the Scribe during a reading, plus a generator for each participant's **Herald**, a procedurally-rendered heraldic sigil built from the three letters drawn in their reading.

## What's here

- **Reference guide** (`/guide/*`) — Foundations, all 22 Hebrew letters (one chapter each), Shoresh (the root/Nikkudot mechanic), the Mizbe'ach, the Scribe's ritual steps, Sacred Time (festival overrides plus Immediate/Personal/Covenantal time), and the Visual Canon.
- **The Herald** (`/herald`) — an input form mirroring the reading's ritual flow, auto-detecting today's Hebrew date/Omer/festival (with a backdate override), and a deterministic procedural SVG renderer that builds a unique heraldic shield from the three openly-drawn letters (the veiled fourth letter stays hidden, recorded but never rendered). The three letters are also resolved as a potential Hebrew root through a 4-tier hierarchy (Canonical Root → Canonical Name → Related Correspondence → Shoresh Nistar/Hidden Root). Each new reading for a participant adds a layer rather than overwriting the last, with a history scrubber, SVG/PNG export, and — per participant — a Hebrew Birthday and Yahrzeit tracker that surfaces past readings on the same recurring Hebrew date.

Everything is local-only: participant and Herald data is stored in the browser (IndexedDB), no backend or accounts. Out of scope for this build: the 56-card Derekh Ha'Dorot deck, the "Seven Encounters" progressive-unlock system, weekly Torah portion tracking, and most life-cycle events beyond Hebrew Birthday/Yahrzeit (marriage, Bris, conversion, Aliyah, etc.) — see the project plan for what's deferred and why.

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
