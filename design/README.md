# The Illuminated Plate — design schema

The source-of-truth design layer for Otzar Ha'Sofer's visual identity: the
"illuminated plate" — every surface framed as one lit, gold-filletted document
on a softly lit ground.

## Files

- **`otzar.css`** — the standalone stylesheet. An *additive* layer whose
  `.otz-*` classes never collide with the app's CSS-module classes, and whose
  every value maps to the repo's own `theme.css` tokens (`--bg`, `--accent`,
  `--border-hairline`, `--font-latin`…) with a brand-hex fallback, so it
  inherits **both** the charcoal and vellum grounds automatically.
- **`otzar-preview.html`** — the plate specimen. Open it in a browser (it links
  `otzar.css` alongside it) to see every component: nav, reading column, cards,
  letter grid, spine shelf, chips, buttons, feed, status bar.
- **`assets/scribe-seal.png`** — the Scribe's Seal mark (reference asset).

## Relationship to the app

- The **applied** copy lives at **`src/styles/otzar.css`** — identical, minus the
  web-font `@import` (Frank Ruhl Libre / David Libre are self-hosted in
  `theme.css`) and the duplicate box-sizing/body resets (already in
  `index.css`). It is imported globally, and `src/App.tsx` frames every routed
  surface in the `.otz-page` → `.otz-panel` plate.
- The in-app routed equivalent of `otzar-preview.html` is the live specimen page
  at **`/guide/stylesheet-preview`** (`src/guide/pages/StylesheetPreview.tsx`).

This folder is a design reference; it is not built or bundled by Vite.
