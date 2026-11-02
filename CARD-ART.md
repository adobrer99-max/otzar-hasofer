# Card art

The designer's finished art for the 22 Letters and the 168 Dorot cards ships
**with the site** — image files in this repository, deployed with every
Cloudflare build. No cloud is needed. (A deployment with Supabase can also
upload art live from the Scriptorium's *Card Art* tab; an upload takes
precedence over a shipped image for the same card.)

Once an image is in, it shows on the letter tiles, in the deal reveal, on the
letter's chapter page and on the Dorot card.

## Adding art

1. Put each image in the right folder, **named by its card id**:
   - Letters → `public/art/letters/<letter>.jpg` — `aleph`, `bet`, `gimel`,
     `dalet`, `heh`, `vav`, `zayin`, `chet`, `tet`, `yod`, `kaf`, `lamed`,
     `mem`, `nun`, `samech`, `ayin`, `peh`, `tzadi`, `kuf`, `resh`, `shin`,
     `tav`.
   - Dorot cards → `public/art/dorot/<card-id>.jpg` — the card ids are the
     `id` fields in `src/data/dorot.ts` (e.g. `abraham-1`, `sarah-16`). The
     Scriptorium's *Card Art* tab lists every slot.
2. Optionally describe them in `public/art/art.json` (alt text is read aloud
   to people who can't see the image; without it, the card's own name is
   used):
   ```json
   {
     "letter:aleph": { "alt": "Aleph — an ox-head of gold above still water", "credit": "Illustrated by …" },
     "dorot:abraham-1": { "alt": "…" }
   }
   ```
3. Commit and push. The build registers the images automatically (it runs
   `npm run build:art` first); to check locally, run `npm run build:art` —
   it lists what it found and warns about anything odd.

To replace an image, overwrite the file with the same name. Each URL carries a
fingerprint of the file, so phones that cached the old one fetch the new one.
To remove one, delete the file.

## The images themselves

- **Shape:** portrait, **5 : 7** (the card shape) — tiles and the deal reveal
  crop to it; the chapter page shows the whole image.
- **Size:** about **1000 × 1400 px**, and under **600 KB** each (the build
  warns above that). JPEG at quality ~80, or WebP, keeps a full deck light
  on a phone.
- **Formats:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.
- **Names:** lower-case card ids only. A file that doesn't match a card is
  skipped with a warning, and the test suite fails on it, so a typo can't
  ship silently. Two images for one card (e.g. `aleph.jpg` and `aleph.png`)
  stop the build.

Images aren't downloaded up front: each is fetched the first time it's seen,
then kept for offline use.
