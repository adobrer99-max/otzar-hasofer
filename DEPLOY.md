# Deploying Otzar Ha'Sofer

The app is a static Vite build (`npm run build` → `dist/`) with hash routing,
so any static host serves it with zero special configuration. This guide
covers the recommended setup: **Cloudflare** for hosting (via Workers with
static assets — the current unified successor to the classic "Pages"
product) and (optionally) **Supabase** for the Scribes' Cloud — accounts
with private, cross-device sync.

Both halves are independent: you can host the site with no Supabase project
at all, and the app runs fully local in each visitor's browser, exactly as it
always has. The cloud is enabled purely by setting two environment variables
at build time.

## 1. Host on Cloudflare

Connecting a Git repo through Cloudflare's dashboard today provisions a
**Worker with static assets**, not the older classic Pages product — it
still serves this static build for free with a custom domain and HTTPS, it
just deploys via `wrangler` instead of a plain asset upload. This repo
already ships the config that flow needs (`wrangler.jsonc`), so it works
out of the box once one one-time account step is done.

1. Create a free Cloudflare account and open **Workers & Pages → Create →
   Connect to Git** (or **Import a repository**, depending on the current
   dashboard wording).
2. Select the `otzar-hasofer` GitHub repository and choose the branch to
   deploy. Build settings should auto-detect from `wrangler.jsonc`: build
   command `npm run build`, deploy command `npx wrangler deploy`.
3. **Give the Worker somewhere to publish.** `wrangler deploy` needs either
   a registered `*.workers.dev` subdomain or a custom domain attached —
   without one, the first deploy fails with *"You need to register a
   workers.dev subdomain before publishing"*. Pick one:
   - **Custom domain (what this deployment uses)**: attach your domain
     under the Worker's **Domains & Routes** tab in the dashboard, then add
     matching entries to `wrangler.jsonc`'s `routes` array (`{ "pattern":
     "yourdomain.com", "custom_domain": true }`) so CI deploys know about
     it too — a dashboard-only attachment isn't visible to the committed
     config. Set `workers_dev: false` once a custom domain is in place.
   - **`*.workers.dev` subdomain**: open the onboarding link Cloudflare
     prints in the failed build's log (`https://dash.cloudflare.com/<account-id>/workers/onboarding`),
     pick a subdomain, and re-run the deploy. Keep `workers_dev: true` in
     `wrangler.jsonc` for this path.
   Either way this is a one-time step — once the config matches what's
   attached in the dashboard, every deploy after it succeeds without
   further prompts.

Notes:
- The free tier has unlimited bandwidth and permits commercial use.
- `public/_headers` ships security headers (including a CSP that allows the
  Supabase origin); Workers static assets applies it automatically.
- Hash routing + `assets.not_found_handling: "single-page-application"` in
  `wrangler.jsonc` means no separate SPA-fallback configuration is needed.
- To test the Workers runtime locally before pushing: `npm run
  preview:wrangler` (builds, then runs `wrangler dev`). Plain `npm run
  preview` (Vite's own static preview) is still available for a faster,
  non-Workers local check.

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
   deployed URL (the `*.workers.dev` URL or your custom domain) and add it
   to the **Redirect URLs** list — magic-link emails redirect there.
4. In the Cloudflare dashboard → your Worker → **Settings → Variables and
   Secrets**, add two build-time variables:
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
