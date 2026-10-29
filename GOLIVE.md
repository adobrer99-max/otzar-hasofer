# Go-live check

How to verify a deploy of Otzar Ha'Sofer end to end, rather than assume it.
Half of it is a script (`npm run golive`) that drives the live site in a real
browser; the other half is a short list of things only a person can do (open
an email, scan a code with a phone, install the app).

Run it after every deploy, and once before telling anyone the site is ready.

## A local-only deploy (no Supabase)

If the site is deployed without a cloud — the Treasury lives entirely in each
visitor's browser — run:

```sh
npm ci
npx playwright install chromium   # once
GOLIVE_URL=https://your.site npm run golive -- --local-only
```

It checks the security headers, the manifest, nine pages with no console
errors, the service worker, that the build really has no cloud (so a deploy
that picked one up by accident is flagged), and then, in a fresh browser:
a reading is recorded and still there after a reload; the Hebrew birthday
exports as a calendar; the printable record opens without the private
parts; and removing the participant removes it. The cloud sections are
skipped. Of the by-hand checks in §3, do 5–8 (install, offline, the
record, the calendar) — 1–4 need the cloud.

Everything from here on is for a deploy **with** the Supabase cloud.

## 1. Before you start (with a cloud)

- **Supabase SQL.** In the project's SQL editor, run every block of
  [`supabase/schema.sql`](./supabase/schema.sql) your project doesn't have
  yet — on an existing project, at least the R37 blocks (`content_drafts`,
  `shared_heralds`, `delete_my_account`) and the final
  `shared_heralds: expiry & views` block. That last one is safe to re-run.
- **Build variables.** In Cloudflare, the Worker's build must have
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (Settings → Build →
  Variables). They are read at *build* time — after changing them, redeploy.
- **Auth settings** (Supabase → Authentication):
  - Email provider on, **Confirm email** on.
  - **URL Configuration → Site URL** = the live origin, and the same origin
    under **Redirect URLs** — the verification, magic-link and
    password-reset emails send people back there.
- **A test account.** Create one through the live site's Account page with
  an inbox you can read (e.g. `you+golive@…`), and open its verification
  email. Use it only for this — the script creates and removes data in it.

## 2. Run the script

```sh
npm ci
npx playwright install chromium   # once; or set PLAYWRIGHT_CHROMIUM_PATH, or have Chrome installed

# public checks only — no account needed
GOLIVE_URL=https://your.site npm run golive

# everything a signed-in Scribe does
GOLIVE_URL=https://your.site GOLIVE_EMAIL=you+golive@example.com GOLIVE_PASSWORD='…' npm run golive
```

Each line prints ✓, ✗ or – (skipped), and the run ends with a list of what
to look at; the exit code is non-zero if anything failed.

**Without an account** it checks:
- the security headers from `public/_headers` are served;
- the install manifest and icons;
- nine pages load with no console errors (this is how a Content-Security-
  Policy problem shows up);
- the service worker installs;
- the build has the cloud configured;
- the cloud's schema as an anonymous visitor sees it — every table and
  function exists, private tables show a visitor nothing, share tokens can't
  be listed, account deletion refuses a visitor, and the expiry/views block
  has been run.

**With the account** it signs in on two fresh browsers ("devices") and
checks:
- a reading made on A arrives on B;
- share links — publish with a one-day expiry, open signed out, "opened
  once" appears for the Scribe, the QR code draws, Reset kills the old link,
  Revoke kills the new one;
- a Scriptorium draft saved on A appears on B, and reverting it reverts both;
- removing the test participant on A removes it on B.

It removes everything it creates.

**Opt-in flags**, because they reach beyond the test account's own rows:

| Flag | What it does |
| --- | --- |
| `--art` | Uploads a tiny test image to an **empty** card-art slot, checks a signed-out visitor can see it, then removes it. Every visitor could see it for those few seconds. |
| `--reset-email` | Requests a password-reset email for the test account. |
| `--delete-account` | Finally deletes the test account itself (also set `GOLIVE_CONFIRM_DELETE` to the same email). Use a throwaway account. |
| `--headed` | Shows the browser while it runs. |

## 3. By hand

The script can't read email or hold a phone. After it passes:

1. **Sign-up and verification.** On the live Account page, create an
   account with a fresh address; the verification email arrives, and its
   link lands back on the site signed in.
2. **Magic link.** Switch the Account page to *Email link*, request one,
   open it on the same device → signed in.
3. **Password reset.** "Forgot password?" → the email's link opens the
   Account page on *Set a new password*; set one, then sign in with it.
4. **QR code.** Publish a share link on `/herald`, "Show a QR code", scan it
   with a phone → the shared Herald opens on the phone.
5. **Install.** On a phone, *Add to Home Screen* — the icon is the gold
   aleph shield (not a generic glyph), and the app opens full-screen.
6. **Offline.** With the installed app open, go offline (airplane mode):
   pages still open and a reading can be recorded. With a cloud, the nav
   also shows **Offline**, and back online the Account page's "Awaiting
   push" drains to 0.
7. **The record.** On `/herald`, "Print the record" → the print dialog's
   *Save as PDF* gives a clean, white document.
8. **Calendar.** "Add to calendar (.ics)" on a participant's Hebrew Birthday
   opens in your calendar app with the next 20 birthdays.

`DEPLOY.md` has the longer per-feature checklist; this file is the one to
run every time.
