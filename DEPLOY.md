# Deploying Otzar Ha'Sofer

The app is a static Vite build (`npm run build` → `dist/`) with hash routing,
so any static host serves it with zero special configuration. This guide
covers the recommended setup: **Cloudflare Pages** for hosting and
(optionally) **Supabase** for the Scribes' Cloud — accounts with private,
cross-device sync.

Both halves are independent: you can host the site with no Supabase project
at all, and the app runs fully local in each visitor's browser, exactly as it
always has. The cloud is enabled purely by setting two environment variables
at build time.

## 1. Host on Cloudflare Pages

1. Create a free Cloudflare account and open **Workers & Pages → Create →
   Pages → Connect to Git**.
2. Select the `otzar-hasofer` GitHub repository and choose the production
   branch. (If your work lives on a feature branch, either select it directly
   or merge it to your default branch first — Pages can build from any
   branch.)
3. Build settings: framework preset **None** (or Vite), build command
   `npm run build`, output directory `dist`.
4. Deploy. You'll get a `*.pages.dev` URL immediately; add a custom domain
   under **Custom domains** whenever ready (HTTPS is automatic).

Notes:
- The free tier has unlimited bandwidth and permits commercial use.
- `public/_headers` ships security headers (including a CSP that allows the
  Supabase origin); Pages applies it automatically.
- Hash routing means no SPA-fallback/redirect rules are needed.

## 2. Enable the Scribes' Cloud (optional — Supabase)

Without this step the deployed site is fully functional but local-only per
browser. With it, Scribes can sign in (email magic link) and their Treasury
syncs privately across their devices.

1. Create a free project at [supabase.com](https://supabase.com). Note the
   **Project URL** and **anon/public key** (Settings → API).
2. In the project's **SQL Editor**, paste and run the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql). This creates the four
   tables, their row-level-security policies (each row readable/writable
   only by its owning Scribe), timestamps, and indexes.
3. In **Authentication → URL Configuration**, set the **Site URL** to your
   deployed URL (the `*.pages.dev` URL or your custom domain) and add it to
   the **Redirect URLs** list — magic-link emails redirect there.
4. In Cloudflare Pages → your project → **Settings → Environment
   variables**, add (for Production, and Preview if you like):
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon/public key
5. Re-deploy (retry the latest deployment or push a commit). The Account
   page ("The Scribe's Seal") now offers sign-in.

Security model, plainly: the anon key is public by design — it ships to
every browser. What protects each Scribe's Treasury is the database's
row-level security (`owner_id = auth.uid()` on every table), enforced by
Postgres itself, not by the app code.

Free-tier caveats (verify current terms at deploy time): free Supabase
projects pause after about a week of inactivity and need a dashboard click
to wake; the paid tier removes this.

## 3. Post-deploy checklist

- Visit the deployed URL; click through the guide, the Herald, the
  Mizbe'ach, the Sefarim. Install it as a PWA and confirm it loads offline.
- Without Supabase configured: `/account` should calmly explain that this
  deployment has no cloud configured.
- With Supabase configured:
  1. Sign in with your email; click the magic link; confirm the Account page
     shows your address and "Sync now" completes.
  2. Create a participant and a reading; open the site in a second browser
     (or device), sign in with the same email, and confirm the reading
     appears after sync.
  3. Delete a commentary on one device; confirm it disappears from the other
     after both sync.
  4. Go offline (airplane mode), create a reading, come back online —
     confirm it syncs up without intervention.

## Local development

Copy `.env.example` to `.env.local` and fill in the two variables to develop
against a real Supabase project, or leave them unset to work fully local.
