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
browser. With it, Scribes can create an account (email + password, with
email verification) or sign in with an emailed magic link, and their
Treasury syncs privately across their devices.

1. Create a free project at [supabase.com](https://supabase.com). Note the
   **Project URL** and **anon/public key** (Settings → API).
2. In the project's **SQL Editor**, paste and run the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql). This creates the
   per-Scribe tables, their row-level-security policies (each row
   readable/writable only by its owning Scribe), timestamps, and indexes,
   plus the public card-art registry and its storage bucket, the
   `content_drafts` table (Scriptorium drafts, composite `(owner_id, id)`
   key), the `shared_heralds` table with its `get_shared_herald` read RPC,
   and the `delete_my_account` function. If the storage
   policy statements are rejected in the SQL editor (some projects restrict
   DDL on `storage.objects`), create the same four policies in the dashboard
   under **Storage → Policies** for the `card-art` bucket instead: public
   `SELECT`; `INSERT`/`UPDATE`/`DELETE` for authenticated users only.
   *(Upgrading an existing deployment? Each later block in the file is headed
   "existing deployments: run just this block" — run the `content_drafts`,
   `shared_heralds`, and `delete_my_account` blocks to add R37's features.)*
3. In **Authentication → Sign In / Up**, make sure the **Email** provider is
   enabled with **Confirm email ON** (new accounts must open a verification
   link before they can sign in). Set the minimum password length to **8**
   to match the app's client-side rule.
4. In **Authentication → URL Configuration**, set the **Site URL** to your
   deployed URL (the `*.workers.dev` URL or your custom domain) and add it
   to the **Redirect URLs** list — the magic-link, account-confirmation,
   and password-reset emails all redirect there (one origin covers all
   three; the app routes a reset link to the Account page by itself).
5. In the Cloudflare dashboard → your Worker → **Settings → Variables and
   Secrets**, add two build-time variables:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon/public key
6. Re-deploy (retry the latest deployment or push a commit). The Account
   page ("The Scribe's Seal") now offers password sign-in/sign-up and the
   magic link.

Security model, plainly: the anon key is public by design — it ships to
every browser. What protects each Scribe's Treasury is the database's
row-level security (`owner_id = auth.uid()` on every table), enforced by
Postgres itself, not by the app code.

Two deliberate exceptions to "every row is locked to its owner":
- **Card art** (`card_art` + the `card-art` bucket) is global published
  content — public read, authenticated write — so every visitor sees it.
- **Share links** (`shared_heralds`) let a Scribe publish a participant's
  Herald read-only. The table has **no anonymous `SELECT` policy**, so the
  unguessable token can't be enumerated; anonymous readers reach a single
  row only through the `security definer` `get_shared_herald(token)` RPC,
  which requires the exact token. Revoking deletes the row — the link goes
  dark at once. Anyone holding a live link can view it, so treat it like any
  unlisted URL.

Account deletion (`delete_my_account`, a `security definer` function scoped
to `auth.uid()`) removes the Scribe's auth user; every `owner_id` foreign
key cascades, so all their cloud rows go with it. The local Treasury on the
device is untouched.

Free-tier caveats (verify current terms at deploy time): free Supabase
projects pause after about a week of inactivity and need a dashboard click
to wake; the paid tier removes this.

## 3. Post-deploy checklist

- Visit the deployed URL; click through the guide, the Herald, the
  Mizbe'ach, the Sefarim. Install it as a PWA and confirm it loads offline.
- Without Supabase configured: `/account` should calmly explain that this
  deployment has no cloud configured.
- With Supabase configured:
  1. **Create an account** with email + password; confirm the verification
     email arrives and that sign-in is refused until its link is opened.
  2. Sign in with the password; confirm the Account page shows your address
     and "Sync now" completes. (The magic-link path should also still work.)
  3. Use **Forgot password** — the reset email's link should land you on the
     Account page's "Set a new password" panel; set one and sign in with it.
  4. While signed in, use **Change password** and re-sign-in with the new one.
  5. Create a participant and a reading; open the site in a second browser
     (or device), sign in with the same account, and confirm the reading
     appears after sync.
  6. Delete a commentary on one device; confirm it disappears from the other
     after both sync.
  7. Go offline (airplane mode), create a reading, come back online —
     confirm it syncs up without intervention.
  8. **Card art**: in `/scriptorium` → The Card Art, upload an image for a
     letter while signed in; confirm it renders on that letter's chapter, and
     that a signed-out visitor (fresh browser profile) sees it too.
  9. **Scriptorium drafts sync**: edit a letter's meaning in `/scriptorium`
     on one device; on a second device signed in to the same account,
     confirm the edit appears after a sync (and that deleting the draft
     reverts the shipped text on both).
  10. **Share links**: on `/herald`, publish a participant's Herald, copy the
      link, and open it in a private/incognito window (signed out) — it
      should render the Herald read-only with no edit controls. Revoke it and
      re-open the link → "This link is no longer lit." As a token-enumeration
      spot-check, a raw `select * from shared_heralds` with only the anon key
      should return **no rows**.
  11. **Mizrach finder**: on `/guide/mizbeach` (or the folio), tap "Find the
      Mizrach from here," grant location, and confirm a bearing + compass
      point appears; deny it and confirm the calm inline note instead.
  12. **Account deletion**: from the Account page's "Remove the account"
      disclosure, delete a throwaway account and confirm its cloud rows are
      gone while the local Treasury still works.

## Local development

Copy `.env.example` to `.env.local` and fill in the two variables to develop
against a real Supabase project, or leave them unset to work fully local.
