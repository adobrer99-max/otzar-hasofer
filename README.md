# Otzar Ha'Sofer — The Treasury

A digital companion and reference guide for the Otzar Ha'Sofer physical folio and Derekh Eretz (22-letter) deck. Not a fortune-telling tool — a reference for the Scribe during a reading, plus a generator for each participant's **Herald**, a procedurally-rendered heraldic sigil built from the three letters drawn in their reading.

## What's here

- **Reference guide** (`/guide/*`) — Foundations, all 22 Hebrew letters (one chapter each), the Mizbe'ach, the Scribe's ritual steps, Sacred Time festival overrides, and the Visual Canon.
- **The Herald** (`/herald`) — an input form mirroring the reading's ritual flow, and a deterministic procedural SVG renderer that builds a unique heraldic shield from the three openly-drawn letters (the veiled fourth letter stays hidden, recorded but never rendered). Each new reading for a participant adds a layer rather than overwriting the last, with a history scrubber to look back through past Heralds, and SVG/PNG export.

Everything is local-only: participant and Herald data is stored in the browser (IndexedDB), no backend or accounts. Out of scope for this build: the 56-card Derekh Galut deck, full sacred-calendar tracking, and the ritual journal — see the project plan for details on what's deferred and why.

## Development

```sh
npm install
npm run dev       # local dev server
npm run build     # production build (also generates the PWA service worker)
npm run test      # vitest — includes a determinism test for the Herald renderer
```

Built with Vite, React, and TypeScript. Installable as an offline-capable PWA.
