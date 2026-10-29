#!/usr/bin/env node
/**
 * The go-live check — drive the deployed site end to end and report what
 * works, so a deploy is verified rather than assumed. See GOLIVE.md.
 *
 *   GOLIVE_URL=https://your.site npm run golive
 *   GOLIVE_URL=… GOLIVE_EMAIL=… GOLIVE_PASSWORD=… npm run golive
 *
 * Without credentials it runs the public checks (headers, routes, the
 * service worker, the cloud schema as an anonymous visitor sees it) and the
 * local ones (a reading kept across a reload, the calendar, the record).
 * A deploy with no Supabase on purpose: pass --local-only.
 * With a *dedicated test account* (already email-verified) it also signs in
 * on two fresh "devices" and exercises sync, share links and draft sync,
 * cleaning up everything it creates.
 *
 * Opt-in, because they touch more than the test account's own rows:
 *   --art             upload a test image to an EMPTY card-art slot, check a
 *                     signed-out visitor sees it, then remove it (briefly
 *                     public — every visitor could see it for a few seconds)
 *   --reset-email     request a password-reset email for the test account
 *   --delete-account  finally delete the test account itself (also needs
 *                     GOLIVE_CONFIRM_DELETE set to the same email)
 *   --local-only      this deploy has no cloud on purpose — "no cloud" passes
 *                     (and a build that unexpectedly has one fails)
 *   --headed          show the browser
 *
 * Browser: Playwright's own Chromium if installed (`npx playwright install
 * chromium`), else PLAYWRIGHT_CHROMIUM_PATH, else your installed Chrome.
 */

import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

// ——— options ———
const args = new Set(process.argv.slice(2));
const BASE = (process.env.GOLIVE_URL || process.argv.slice(2).find((a) => /^https?:/.test(a)) || "")
  .replace(/#.*$/, "")
  .replace(/\/+$/, "");
const EMAIL = process.env.GOLIVE_EMAIL || "";
const PASSWORD = process.env.GOLIVE_PASSWORD || "";
const WITH_ART = args.has("--art");
const WITH_RESET = args.has("--reset-email");
const WITH_DELETE = args.has("--delete-account");
const HEADED = args.has("--headed");
const LOCAL_ONLY = args.has("--local-only") || process.env.GOLIVE_LOCAL_ONLY === "1";

if (!BASE) {
  console.error("Set GOLIVE_URL (or pass the site URL) — e.g. GOLIVE_URL=https://otzar.example npm run golive");
  process.exit(2);
}
if (WITH_DELETE && process.env.GOLIVE_CONFIRM_DELETE !== EMAIL) {
  console.error("--delete-account needs GOLIVE_CONFIRM_DELETE set to the test account's email.");
  process.exit(2);
}

// ——— reporting ———
const tally = { pass: 0, fail: 0, skip: 0 };
const failures = [];
const mark = { pass: "✓", fail: "✗", skip: "–" };
function report(kind, name, detail = "") {
  tally[kind] += 1;
  if (kind === "fail") failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${mark[kind]} ${name}${detail ? `  (${detail})` : ""}`);
}
const pass = (n, d) => report("pass", n, d);
const fail = (n, d) => report("fail", n, d);
const skip = (n, d) => report("skip", n, d);
const check = (ok, n, d) => (ok ? pass(n, d) : fail(n, d));
const section = (title) => console.log(`\n${title}`);

/** Run a step; a thrown error fails it instead of ending the run. */
async function step(name, fn) {
  try {
    await fn();
  } catch (err) {
    fail(name, (err?.message || String(err)).split("\n")[0].slice(0, 200));
  }
}

const shown = (locator, timeout = 10000) =>
  locator.first().waitFor({ timeout }).then(
    () => true,
    () => false,
  );

// ——— the browser ———
async function launch() {
  const opts = { headless: !HEADED };
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH && { ...opts, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
    opts,
    existsSync("/opt/pw-browsers/chromium") && { ...opts, executablePath: "/opt/pw-browsers/chromium" },
    { ...opts, channel: "chrome" },
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return await chromium.launch(candidate);
    } catch {
      // try the next
    }
  }
  console.error("No Chromium found. Run `npx playwright install chromium`, or set PLAYWRIGHT_CHROMIUM_PATH.");
  process.exit(2);
}

const browser = await launch();
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
const PARTICIPANT = `Go-live check ${STAMP}`;
const MARKER = `[go-live ${STAMP}]`;

async function device(label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(`${label}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") page.errors.push(`${label}: ${m.text().slice(0, 200)}`);
  });
  return { context, page };
}

const go = (page, route) => page.goto(`${BASE}/#${route}`, { waitUntil: "load" });

// ═══════════════════════════════ public ═══════════════════════════════
console.log(`Go-live check — ${BASE}  (${new Date().toLocaleString()})`);
section("The site, as anyone sees it");

let response;
await step("the site answers", async () => {
  response = await fetch(`${BASE}/`, { redirect: "follow" });
  check(response.ok, "the site answers", `HTTP ${response.status}`);
});

if (response) {
  const csp = response.headers.get("content-security-policy") || "";
  check(Boolean(csp), "security headers are served (Content-Security-Policy)", csp ? "" : "public/_headers not applied?");
  check(/frame-ancestors 'none'/.test(csp) || response.headers.get("x-frame-options") === "DENY", "the site refuses to be framed");
  check(
    /geolocation=\(self\)/.test(response.headers.get("permissions-policy") || ""),
    "location is allowed for the Mizrach finder",
    response.headers.get("permissions-policy") || "no Permissions-Policy",
  );
}

await step("the app manifest and icons", async () => {
  const manifest = await fetch(`${BASE}/manifest.webmanifest`).then((r) => (r.ok ? r.json() : null));
  check(Boolean(manifest), "the install manifest is served");
  const sizes = (manifest?.icons ?? []).map((i) => i.sizes);
  check(sizes.includes("192x192") && sizes.includes("512x512"), "it lists 192 and 512 icons", sizes.join(", "));
});

const visitor = await device("visitor");
let supabaseUrl = "";
let anonKey = "";
visitor.page.on("request", (req) => {
  const url = req.url();
  const key = req.headers()["apikey"];
  if (key && !anonKey) {
    anonKey = key;
    supabaseUrl = new URL(url).origin;
  }
});

await step("pages load cleanly", async () => {
  const routes = ["/", "/guide/letters", "/guide/letters/aleph", "/guide/dorot", "/herald", "/mizbeach", "/sefarim", "/account", "/scriptorium"];
  const before = visitor.page.errors.length;
  for (const route of routes) {
    await go(visitor.page, route);
    await visitor.page.waitForTimeout(route === "/mizbeach" ? 2500 : 900);
  }
  const errs = visitor.page.errors.slice(before);
  check(errs.length === 0, `${routes.length} pages load without errors`, errs.slice(0, 2).join(" | "));
});

await step("the service worker installs", async () => {
  const scope = await visitor.page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker?.ready.then((r) => r.scope),
      new Promise((resolve) => setTimeout(() => resolve(null), 15000)),
    ]),
  );
  check(Boolean(scope), "the service worker installs (offline + updates)", scope || "not ready after 15 s");
});

let cloud = false;
await step("the cloud is configured in this build", async () => {
  await go(visitor.page, "/account");
  const unconfigured = await shown(visitor.page.getByText("This deployment has no cloud configured"), 4000);
  cloud = !unconfigured && (await shown(visitor.page.locator("#account-email"), 4000));
  if (LOCAL_ONLY) {
    check(
      !cloud,
      "this build is local-only, as intended",
      cloud ? "it has a cloud configured — drop --local-only to check it" : "",
    );
  } else {
    check(
      cloud,
      "the cloud is configured in this build",
      cloud
        ? ""
        : "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY were not set when it was built — or pass --local-only if this deploy is meant to have no cloud",
    );
  }
});

if (cloud && !anonKey) {
  // The card-art registry fetch at startup carries the anon key; give it a moment.
  await go(visitor.page, "/");
  await visitor.page.waitForTimeout(2500);
}

section("The cloud's schema, as an anonymous visitor sees it");
async function rest(path, init = {}) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json", ...init.headers },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // empty
  }
  return { status: res.status, body };
}
const missing = (r) => r.status === 404 || r.body?.code === "42P01" || r.body?.code === "PGRST205" || r.body?.code === "PGRST202";

if (!cloud) {
  skip("schema checks", LOCAL_ONLY ? "local-only deploy" : "no cloud in this build");
} else if (!anonKey) {
  fail("schema checks", "never saw the app call the cloud — is the card-art registry blocked (CSP connect-src)?");
} else {
  await step("card_art", async () => {
    const r = await rest("/rest/v1/card_art?select=id&limit=1");
    check(r.status === 200, "card_art is readable by everyone", missing(r) ? "table missing — run its block" : `HTTP ${r.status}`);
  });
  await step("content_drafts", async () => {
    const r = await rest("/rest/v1/content_drafts?select=id&limit=1");
    check(r.status === 200 && Array.isArray(r.body) && r.body.length === 0, "content_drafts exists and shows a visitor nothing", missing(r) ? "table missing — run its block" : `HTTP ${r.status}`);
  });
  await step("participants", async () => {
    const r = await rest("/rest/v1/participants?select=id&limit=1");
    check(r.status === 200 && Array.isArray(r.body) && r.body.length === 0, "participants are locked to their owner", `HTTP ${r.status}, ${Array.isArray(r.body) ? r.body.length : "?"} rows`);
  });
  await step("shared_heralds", async () => {
    const r = await rest("/rest/v1/shared_heralds?select=token&limit=1");
    check(r.status === 200 && Array.isArray(r.body) && r.body.length === 0, "share tokens can't be listed", missing(r) ? "table missing — run its block" : `HTTP ${r.status}, ${Array.isArray(r.body) ? r.body.length : "?"} rows`);
    const cols = await rest("/rest/v1/shared_heralds?select=expires_at,view_count&limit=1");
    check(cols.status === 200, "share links have expiry and open counts", cols.body?.code === "42703" ? "run the 'shared_heralds: expiry & views' block" : `HTTP ${cols.status}`);
  });
  await step("get_shared_herald", async () => {
    const r = await rest("/rest/v1/rpc/get_shared_herald", { method: "POST", body: JSON.stringify({ share_token: crypto.randomUUID() }) });
    check(r.status === 200 && r.body === null, "an unknown share token reads as nothing", missing(r) ? "function missing — run the shared_heralds block" : `HTTP ${r.status}`);
  });
  await step("delete_my_account", async () => {
    const r = await rest("/rest/v1/rpc/delete_my_account", { method: "POST", body: "{}" });
    check(!missing(r) && r.status !== 200 && r.status !== 204, "account deletion exists and refuses a visitor", missing(r) ? "function missing — run its block" : `HTTP ${r.status}`);
  });
  await step("shared page", async () => {
    await go(visitor.page, `/shared/${crypto.randomUUID()}`);
    check(await shown(visitor.page.getByText("This link is no longer lit")), "an unknown share link shows the calm 'no longer lit' page");
  });
}

// ═══════════════════════════════ local ═══════════════════════════════
// Everything below lives in the visitor's own browser (a fresh profile here),
// so it runs on every deploy, cloud or not, and touches nobody's data.
section("Local, in this browser");
const local = await device("local");
await step("local", async () => {
  const page = local.page;
  const name = `Go-live local ${STAMP}`;
  const secret = `private reflection ${STAMP}`;
  await go(page, "/account");
  check(
    await shown(cloud ? page.locator("#account-email") : page.getByText("This deployment has no cloud configured")),
    cloud ? "the Account page offers sign-in" : "the Account page explains the Treasury lives in this browser",
  );

  await go(page, "/herald");
  await page.getByPlaceholder("New participant name").fill(name);
  await page.getByRole("button", { name: "+ New participant" }).click();
  await page.getByLabel("Civil date of birth").fill("1990-04-10");
  await page.getByRole("button", { name: "Set Hebrew Birthday" }).click();
  await page.getByRole("button", { name: "✦ Deal the whole spread" }).click();
  await page.locator("#reflection").fill(secret);
  await page.getByRole("button", { name: "Create this Reading's Herald" }).click();
  check(await shown(page.getByRole("button", { name: "Print the record" })), "a reading is recorded");
  check(await selectParticipant(page, name), "it is still there after a reload (kept in the browser)");

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 10000 }),
    page.getByRole("button", { name: "Add to calendar (.ics)" }).click(),
  ]);
  const ics = readFileSync(await download.path(), "utf8");
  check(
    ics.startsWith("BEGIN:VCALENDAR\r\n") && (ics.match(/BEGIN:VEVENT/g) ?? []).length === 20,
    "the Hebrew birthday exports as a 20-year calendar",
    download.suggestedFilename(),
  );

  await page.getByRole("button", { name: "Print the record" }).click();
  check(await shown(page.getByRole("heading", { name, level: 1 })), "the printable record opens");
  check(await shown(page.getByRole("region", { name: "The Origin Herald" })), "with the reading in it");
  check(!(await page.content()).includes(secret), "and the reflection left out by default");

  if (!(await selectParticipant(page, name))) throw new Error("participant vanished");
  await page.getByRole("button", { name: "Remove participant" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByText("Participant removed").waitFor({ timeout: 10000 });
  check(!(await selectParticipant(page, name)), "removing it removes it for good");
});

// ═══════════════════════════════ signed in ═══════════════════════════════
async function signIn(page) {
  await go(page, "/account");
  await page.locator("#account-email").fill(EMAIL);
  await page.locator("#account-password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  if (!(await shown(page.getByText("Signed in as"), 15000))) {
    const why = await page.locator("[role=alert]").first().textContent().catch(() => "");
    throw new Error(`could not sign in${why ? `: ${why}` : ""}`);
  }
}

/** Open a route afresh (a reload, so the page re-reads the device's data). */
async function fresh(page, route) {
  await go(page, route);
  await page.reload({ waitUntil: "load" });
}

/**
 * Sync on the Account page and wait for the engine's own completion event.
 * (A sync already running from the page load absorbs the click; its event
 * still arrives.) Repeats while changes remain queued.
 */
async function syncNow(page) {
  await fresh(page, "/account");
  const status = page.getByText(/Last synced:/);
  await status.waitFor({ timeout: 15000 });
  let pending;
  for (let attempt = 0; attempt < 3; attempt++) {
    const outcome = page.evaluate(
      () =>
        new Promise((resolve) => {
          window.addEventListener("otzar:sync-done", () => resolve("ok"), { once: true });
          window.addEventListener("otzar:sync-failed", (e) => resolve(`failed: ${e.detail}`), { once: true });
          setTimeout(() => resolve("did not finish in 30 s"), 30000);
        }),
    );
    await page.getByRole("button", { name: "Sync now" }).click();
    const result = await outcome;
    if (result !== "ok") throw new Error(`sync ${result}`);
    await page.waitForTimeout(500);
    pending = (await status.textContent())?.match(/Awaiting push:\s*(\d+)/)?.[1];
    if (pending === "0") break;
  }
  return pending;
}

/**
 * Whether the Scriptorium's first field shows (or no longer shows) the run's
 * marker. Drafts hydrate a moment after the page, so "shows" polls for it and
 * "doesn't" gives hydration time to land first.
 */
async function fieldShows(page, present) {
  const field = page.locator("form input[type=text], form textarea").first();
  await field.waitFor({ timeout: 10000 });
  if (!present) await page.waitForTimeout(1500);
  return page
    .waitForFunction(
      ([marker, want]) => {
        const el = document.querySelector("form input[type=text], form textarea");
        return Boolean(el) && el.value.includes(marker) === want;
      },
      [MARKER, present],
      { timeout: 10000 },
    )
    .then(
      () => true,
      () => false,
    );
}

async function selectParticipant(page, name) {
  await fresh(page, "/herald");
  const select = page.getByLabel("Select participant");
  await select.waitFor({ timeout: 10000 });
  const options = await select.locator("option").allTextContents();
  if (!options.includes(name)) return false;
  await select.selectOption({ label: name });
  return true;
}

const signedIn = cloud && EMAIL && PASSWORD;
section("Signed in — sync between two devices");
if (!signedIn) {
  skip(
    "signed-in checks",
    cloud ? "set GOLIVE_EMAIL and GOLIVE_PASSWORD (a dedicated, verified test account)" : LOCAL_ONLY ? "local-only deploy" : "no cloud",
  );
}

const a = signedIn ? await device("device A") : null;
const b = signedIn ? await device("device B") : null;
let ready = false;
let created = false;

if (signedIn) {
  await step("sign in", async () => {
    await signIn(a.page);
    pass("the test account signs in with a password");
    ready = true;
  });
}

if (ready) {
  await step("a reading syncs", async () => {
    await go(a.page, "/herald");
    await a.page.getByPlaceholder("New participant name").fill(PARTICIPANT);
    await a.page.getByRole("button", { name: "+ New participant" }).click();
    await a.page.getByRole("button", { name: "✦ Deal the whole spread" }).click();
    await a.page.getByRole("button", { name: "Create this Reading's Herald" }).click();
    created = await shown(a.page.getByRole("button", { name: "Print the record" }));
    check(created, "device A records a reading");
    const pending = await syncNow(a.page);
    check(pending === "0", "device A pushes it to the cloud", `awaiting push: ${pending}`);
    await signIn(b.page);
    await syncNow(b.page);
    check(await selectParticipant(b.page, PARTICIPANT), "device B receives the participant and reading");
  });

  section("Signed in — share links");
  await step("share links", async () => {
    if (!(await selectParticipant(a.page, PARTICIPANT))) throw new Error("participant not on device A");
    await a.page.getByRole("button", { name: "Publish the link" }).waitFor({ timeout: 15000 });
    await a.page.getByLabel("The link expires").selectOption("1d");
    await a.page.getByRole("button", { name: "Publish the link" }).click();
    await a.page.locator("p", { hasText: /Expires / }).waitFor({ timeout: 15000 });
    const link1 = (await a.page.locator("code").first().textContent())?.trim();
    pass("a share link publishes with a one-day expiry");

    const anon = await device("anonymous");
    await anon.page.goto(link1);
    check(await shown(anon.page.getByText(PARTICIPANT)), "a signed-out visitor sees the shared Herald");
    check((await anon.page.locator("form, input, textarea").count()) === 0, "the shared page has no edit controls");

    await selectParticipant(a.page, PARTICIPANT);
    check(await shown(a.page.getByText(/Opened once/), 15000), "the Scribe sees that it was opened");

    await a.page.getByRole("button", { name: "Show a QR code" }).click();
    check(await shown(a.page.getByRole("img", { name: "QR code for the share link" })), "the QR code draws (scan it with a phone — see GOLIVE.md)");

    await a.page.getByRole("button", { name: "Reset link" }).click();
    await a.page.getByRole("group", { name: "Confirm resetting the share link" }).getByRole("button", { name: "Confirm" }).click();
    await a.page.waitForFunction((old) => document.querySelector("code")?.textContent?.trim() !== old, link1, { timeout: 15000 });
    const link2 = (await a.page.locator("code").first().textContent())?.trim();
    await anon.page.goto("about:blank");
    await anon.page.goto(link1);
    check(await shown(anon.page.getByText("This link is no longer lit")), "after a reset the old link is dark");
    await anon.page.goto("about:blank");
    await anon.page.goto(link2);
    check(await shown(anon.page.getByText(PARTICIPANT)), "and the new link opens");

    await a.page.getByRole("button", { name: "Revoke", exact: true }).click();
    await a.page.getByRole("group", { name: "Confirm revoking the share link" }).getByRole("button", { name: "Confirm" }).click();
    await a.page.getByRole("button", { name: "Publish the link" }).waitFor({ timeout: 15000 });
    await anon.page.goto("about:blank");
    await anon.page.goto(link2);
    check(await shown(anon.page.getByText("This link is no longer lit")), "a revoked link goes dark");
    await anon.context.close();
  });

  section("Signed in — Scriptorium drafts");
  await step("drafts sync", async () => {
    await go(a.page, "/scriptorium");
    const field = a.page.locator("form input[type=text], form textarea").first();
    await field.waitFor({ timeout: 10000 });
    await field.fill(`${await field.inputValue()} ${MARKER}`);
    await a.page.getByRole("button", { name: "Save draft" }).click();
    // Let the save land on the device before the page is reloaded to sync.
    await a.page.getByRole("button", { name: "Saved", exact: true }).waitFor({ timeout: 10000 });
    await syncNow(a.page);
    await syncNow(b.page);
    await go(b.page, "/scriptorium");
    check(await fieldShows(b.page, true), "a draft saved on device A appears on device B");

    await go(a.page, "/scriptorium");
    await fieldShows(a.page, true);
    await a.page.getByRole("button", { name: "Revert to shipped" }).click();
    // The revert is done once the field is back to the shipped text.
    await fieldShows(a.page, false);
    await syncNow(a.page);
    await syncNow(b.page);
    await go(b.page, "/scriptorium");
    check(await fieldShows(b.page, false), "reverting it on A reverts it on B");
  });

  section("Signed in — card art");
  if (!WITH_ART) {
    skip("card-art upload", "pass --art to upload and remove a test image");
  } else {
    await step("card art", async () => {
      await go(a.page, "/scriptorium");
      await a.page.getByRole("button", { name: /The Card Art/ }).click();
      const empty = a.page.locator("button", { hasText: "empty" });
      await empty.first().waitFor({ timeout: 15000 });
      const slot = empty.last();
      const slotLabel = (await slot.locator("span span").first().textContent())?.trim();
      await slot.click();
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAOCAYAAAAWo42rAAAAJklEQVR42mN8z8DwnwEJMDIyMjAx4AFMQ7SGBgYGBgYmJiYGBgYAAJlRBQ1VrrXUAAAAAElFTkSuQmCC",
        "base64",
      );
      await a.page.locator("#card-art-file").setInputFiles({ name: "golive.png", mimeType: "image/png", buffer: png });
      await a.page.locator("#card-art-alt").fill(`Go-live test image ${STAMP}`);
      await a.page.getByRole("button", { name: "Upload & publish" }).click();
      check(await shown(a.page.getByText("Art published"), 30000), `a test image uploads to the empty slot “${slotLabel}”`);
      const src = await a.page.locator("figure img").first().getAttribute("src");
      const res = await fetch(src);
      check(res.ok, "the image is publicly reachable", `HTTP ${res.status}`);
      const listed = await rest(`/rest/v1/card_art?select=id,alt&alt=eq.${encodeURIComponent(`Go-live test image ${STAMP}`)}`);
      check(Array.isArray(listed.body) && listed.body.length === 1, "a signed-out visitor sees it in the registry");
      await a.page.getByRole("button", { name: "Remove", exact: true }).click();
      await a.page.getByRole("group", { name: "Remove this card's art" }).getByRole("button", { name: "Confirm" }).click();
      check(await shown(a.page.getByText("Art removed"), 20000), "the test image is removed");
      const after = await rest(`/rest/v1/card_art?select=id&alt=eq.${encodeURIComponent(`Go-live test image ${STAMP}`)}`);
      check(Array.isArray(after.body) && after.body.length === 0, "and is gone from the registry");
    });
  }

  section("Signed in — clean-up");
  await step("deleting syncs", async () => {
    if (!created) return skip("deleting the test participant", "nothing was created");
    if (!(await selectParticipant(a.page, PARTICIPANT))) throw new Error("participant not on device A");
    await a.page.getByRole("button", { name: "Remove participant" }).click();
    await a.page.getByRole("button", { name: "Delete", exact: true }).click();
    await a.page.getByText("Participant removed").waitFor({ timeout: 10000 });
    await syncNow(a.page);
    await syncNow(b.page);
    check(!(await selectParticipant(b.page, PARTICIPANT)), "removing the test participant on A removes it on B");
  });

  if (WITH_RESET) {
    await step("password reset email", async () => {
      await go(b.page, "/account");
      await b.page.getByRole("button", { name: "Sign out" }).click();
      await b.page.locator("#account-email").fill(EMAIL);
      await b.page.getByRole("button", { name: "Forgot password?" }).click();
      check(await shown(b.page.getByText(/password-reset email is on its way/), 15000), "a password-reset email is requested (check the inbox — see GOLIVE.md)");
    });
  } else {
    skip("password-reset email", "pass --reset-email to send one to the test account");
  }

  if (WITH_DELETE) {
    await step("account deletion", async () => {
      await go(a.page, "/account");
      await a.page.getByText("Remove the account").click();
      await a.page.getByRole("button", { name: "Delete the account and its cloud data" }).click();
      await a.page.getByRole("button", { name: "Delete forever" }).click();
      check(await shown(a.page.getByText(/Account removed/), 20000), "the test account deletes itself");
      const again = await device("after deletion");
      await go(again.page, "/account");
      await again.page.locator("#account-email").fill(EMAIL);
      await again.page.locator("#account-password").fill(PASSWORD);
      await again.page.getByRole("button", { name: "Sign in", exact: true }).click();
      check(await shown(again.page.locator("[role=alert]"), 15000), "and can no longer sign in");
      await again.context.close();
    });
  } else {
    skip("account deletion", "pass --delete-account (with GOLIVE_CONFIRM_DELETE) on a throwaway account");
  }
}

const stray = [visitor, local, a, b].filter(Boolean).flatMap((d) => d.page.errors);
section("Console");
check(stray.length === 0, "no uncaught errors in any page", stray.slice(0, 3).join(" | "));

await browser.close();
console.log(`\n${tally.pass} passed · ${tally.fail} failed · ${tally.skip} skipped`);
if (failures.length) {
  console.log("\nTo look at:");
  for (const f of failures) console.log(`  • ${f}`);
}
process.exit(tally.fail ? 1 : 0);
