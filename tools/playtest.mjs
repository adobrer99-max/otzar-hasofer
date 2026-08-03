#!/usr/bin/env node
/**
 * A way to actually look at Ma'alot.
 *
 * Everything in this game has been verified by unit test, and three times in
 * one session a "finding" turned out to be a driver of mine being dumber than
 * the game rather than a bug. This runs a real browser against the real dev
 * server, plays a scripted session, and leaves behind three things:
 *
 *   - a **video** of the whole run (`recordVideo` — no extra library),
 *   - a **contact sheet**: N canvas frames composed into one PNG *inside the
 *     page*, so there is no image dependency and no per-frame file to open,
 *   - a **report**: lamps over time, husks broken and left standing, letters
 *     taken, every caption raised, every plate seen, and how it ended.
 *
 * Usage:
 *
 *   npm run playtest                 # every script
 *   npm run playtest -- crown-mute   # one, by name
 *   npm run playtest -- --list
 *   npm run playtest -- porch --headed --url=http://localhost:5173
 *
 * It needs `npm run dev` running, **not `vite preview`** — the warp and the
 * probe are both gated on `import.meta.env.DEV`, which preview sets to false.
 * If nothing is listening it says so and exits rather than timing out.
 *
 * The driver deliberately mirrors the traversal probe in
 * `src/game/world/traversal.test.ts`: look one stride ahead for a missing
 * floor, hold the jump rather than tapping it, clear a barrier from a distance,
 * back off leftward out of a pocket after a long stall. A harness that plays
 * worse than the player the suite guarantees can finish would report every
 * region as impossible — which is exactly the false alarm this tool exists to
 * end.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const PROBE_KEY = "__otzar-dev-warp";
const KEYS = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  jump: "Space",
  act: "KeyX",
  dash: "KeyC",
  strike: "KeyV",
};

// --- the scripts -------------------------------------------------------------
//
// Each is a thing that shipped without ever being looked at.

const SCRIPTS = [
  {
    name: "porch",
    about: "The taught opening in Malchut — the three lessons and the first gap.",
    warp: { rung: 1, letters: "as-of-rung", lamps: 3, porch: 1, seed: 7 },
    until: (p) => p.progress > 0.35 || p.finished,
    seconds: 70,
  },
  {
    name: "husk",
    about: "A klipah on screen, and a mark thrown at it.",
    warp: { rung: 5, letters: "as-of-rung", lamps: 3, seed: 11 },
    until: (p) => p.husks.broken >= 2 || p.finished,
    seconds: 90,
  },
  {
    name: "house",
    about: "A figure of the Dorot standing on a rung, and what they say.",
    warp: { rung: 4, letters: "as-of-rung", lamps: 3, seed: 3 },
    until: (p) => p.housesMet > 0 || p.finished,
    seconds: 180,
  },
  {
    name: "crown-whole",
    about: "Keter with the Mouth and all seven Houses — the whole case made.",
    warp: { rung: 10, letters: "all", lamps: 3, witnesses: 7, seed: 5 },
    until: (p) => p.plate === "sealed",
    seconds: 180,
  },
  {
    name: "crown-mute",
    about: "Keter without Peh. He arrives unable to say anything.",
    warp: { rung: 10, letters: "all-but-peh", lamps: 3, witnesses: 7, seed: 5 },
    until: (p) => p.plate === "sealed",
    seconds: 180,
  },
  {
    name: "crown-alone",
    about: "Keter with the Mouth and no witnesses — pleading into a silence.",
    warp: { rung: 10, letters: "all", lamps: 3, witnesses: 0, seed: 5 },
    until: (p) => p.plate === "sealed",
    seconds: 180,
  },
  {
    name: "path",
    about: "A path of the Tree walked from the overworld, and the map it returns to.",
    // **No warp.** The warp reaches a *rung*, and this script exists to prove
    // the other road works: begin at the threshold, stand on the Tree, choose a
    // way out of the kingdom, and walk it. That is the entire loop the
    // overworld added, and it is the one thing no unit test can see end to end
    // — `afterWalking` is pure and tested, but whether the plate at the far end
    // actually hands the Scribe back to a map with the far Sefirah under their
    // feet is a question about wiring.
    warp: {},
    enter: async (page) => {
      await page.getByRole("button", { name: /^Begin/ }).first().click();
      await page.waitForTimeout(400);
      // Out by Yesod, which is the path that pays the Breath — so the rung is
      // built for a Scribe holding nothing, which is the hardest thing the
      // generator is ever asked for and the right thing to look at first.
      await page.getByRole("button", { name: /Yesod/ }).first().click();
    },
    until: (p) => p.plate === "path-done",
    seconds: 150,
  },
  {
    name: "kindled",
    about: "A climb standing on the Tree with light in hand: kindle, and read the map back.",
    warp: {},
    // Seeded rather than played, because reaching this state honestly is three
    // hundred light and about twenty rungs. The record is the whole of a climb
    // — where you stand, what you walked, what you hold — so writing one and
    // reloading puts the map in a state a real climb would take an hour to
    // reach, and reads back exactly what a player would see there.
    enter: async (page) => {
      await page.evaluate(async () => {
        const req = indexedDB.open("otzar-hasofer");
        const db = await new Promise((res, rej) => {
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        const now = new Date().toISOString();
        const tx = db.transaction("ascents", "readwrite");
        tx.objectStore("ascents").put({
          id: "playtest-kindled",
          seed: 7,
          seedLabel: "playtest",
          createdAt: now,
          updatedAt: now,
          regionIndex: 5,
          at: "tiferet",
          pathsWalked: [
            "malchut-yesod", "yesod-hod", "gevurah-hod", "gevurah-tiferet",
            "netzach-tiferet", "malchut-netzach", "yesod-tiferet",
          ],
          lettersHeld: ["aleph", "bet", "gimel", "dalet", "heh", "vav", "zayin"],
          or: 220,
          regionsCleared: [1, 2, 3, 4, 5],
          housesMet: [],
          sefirotLit: ["malchut", "yesod", "hod", "netzach"],
        });
        await new Promise((res) => { tx.oncomplete = res; });
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      // Kindle where the Scribe stands, then walk a path so the harness has a
      // world to photograph — the map itself is not a canvas.
      const kindle = page.getByRole("button", { name: /^Kindle/ });
      if (await kindle.count()) await kindle.first().click();
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: /Keter/ }).first().click();
    },
    until: (p) => p.plate === "path-done",
    seconds: 150,
  },
  {
    name: "abyss",
    about: "The Abyss plate answers to the keyboard — and Enter crosses, never climbs.",
    warp: {},
    // This script exists because Enter on this plate used to fall through the
    // plate handler's enumeration to `climbOn` — the pre-Tree linear road —
    // which at region ten sealed the climb without a single kindling. The
    // record is the witness: the linear road writes `regionIndex + 1` at once,
    // and a crossing writes nothing until its far end is reached.
    enter: async (page) => {
      await page.evaluate(async () => {
        const req = indexedDB.open("otzar-hasofer");
        const db = await new Promise((res, rej) => {
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        const now = new Date().toISOString();
        const tx = db.transaction("ascents", "readwrite");
        tx.objectStore("ascents").put({
          id: "playtest-abyss",
          seed: 7,
          seedLabel: "playtest",
          createdAt: now,
          updatedAt: now,
          regionIndex: 5,
          at: "tiferet",
          pathsWalked: ["malchut-yesod", "yesod-hod", "gevurah-hod", "gevurah-tiferet"],
          lettersHeld: ["aleph", "bet", "gimel", "dalet", "heh", "vav", "zayin"],
          or: 60,
          regionsCleared: [1, 2, 3, 4, 5],
          housesMet: [],
        });
        await new Promise((res) => { tx.oncomplete = res; });
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      const regionIndexOf = () =>
        page.evaluate(async () => {
          const req = indexedDB.open("otzar-hasofer");
          const db = await new Promise((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
          });
          return await new Promise((res) => {
            const r = db.transaction("ascents", "readonly").objectStore("ascents").get("playtest-abyss");
            r.onsuccess = () => res(r.result?.regionIndex);
          });
        });
      // Raise the plate, and decline it with Escape: nothing may move.
      await page.getByRole("button", { name: /Keter/ }).first().click();
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      if ((await regionIndexOf()) !== 5) {
        throw new Error("Escape on the Abyss plate walked the linear road — the record moved");
      }
      // Raise it again and accept with Enter: the focused button is "Cross",
      // so a world loads — the crossing, whose record is untouched until the
      // far end. The linear road would have written regionIndex 6 by now.
      await page.getByRole("button", { name: /Keter/ }).first().click();
      await page.waitForTimeout(400);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(700);
      if ((await regionIndexOf()) !== 5) {
        throw new Error("Enter on the Abyss plate walked the linear road — the record moved");
      }
    },
    // The crossing is entered; walking any of it is proof enough here. Its far
    // end is behind a Word-Gate no driver can answer yet — see the note below
    // this table — so finishing is not asked for.
    until: (p) => p.progress > 0.05,
    seconds: 60,
  },
  {
    name: "going-out",
    about: "One lamp, and a Scribe who does not fight back. The kingdom comes up.",
    warp: { rung: 7, letters: "as-of-rung", lamps: 1, seed: 13 },
    until: (p) => p.out || p.plate === "out",
    seconds: 120,
    // Walk into everything, write nothing.
    driver: { strike: false, reckless: true },
  },
];

// --- arguments ---------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};
const has = (name) => args.includes(`--${name}`);

const url = flag("url", "http://localhost:5173");
const outDir = flag("out", "playtest");
const frames = Number(flag("frames", 12));
const wanted = args.filter((a) => !a.startsWith("--"));

if (has("list")) {
  for (const s of SCRIPTS) console.log(`${s.name.padEnd(13)} ${s.about}`);
  process.exit(0);
}

/**
 * `--warp=seed=8,lamps=1` and `--seconds=240` — the two things worth changing
 * without editing the file. A script is a starting point, not a fixture: a
 * region that went badly on one seed is worth seeing on another, and a run
 * that ran out of clock is worth more clock.
 */
const overrides = Object.fromEntries(
  (flag("warp", "") ? flag("warp", "").split(",") : []).map((pair) => {
    const [key, value] = pair.split("=");
    return [key, value];
  }),
);
const seconds = flag("seconds", undefined);

const scripts = (wanted.length ? SCRIPTS.filter((s) => wanted.includes(s.name)) : SCRIPTS).map(
  (s) => ({
    ...s,
    warp: { ...s.warp, ...overrides },
    seconds: seconds ? Number(seconds) : s.seconds,
  }),
);
if (!scripts.length) {
  console.error(`No such script. Try --list.`);
  process.exit(1);
}

// --- the browser -------------------------------------------------------------

/** Chromium as this environment provides it, falling back to Playwright's. */
function browserPath() {
  const given = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (given && existsSync(given)) return given;
  if (existsSync("/opt/pw-browsers/chromium")) return "/opt/pw-browsers/chromium";
  return undefined;
}

async function serverIsUp() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

if (!(await serverIsUp())) {
  console.error(
    `Nothing is answering at ${url}.\n` +
      `Start the dev server first — and it must be \`npm run dev\`, not \`vite preview\`:\n` +
      `  npm run dev\n` +
      `(the warp and the probe are gated on import.meta.env.DEV, which preview sets false)`,
  );
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

// --- the driver --------------------------------------------------------------

/**
 * One tick of decision, from the probe's own view of the world.
 *
 * `look` is `[dy][dx]` around the tile the Scribe stands in, radius 4 — so
 * `look[4][4]` is his own tile, `look[4][5]` the one ahead, `look[5][5]` the
 * floor he is about to step onto.
 */
function decide(p, look, memory, opts) {
  const R = 4;
  const at = (dx, dy) => look[R + dy]?.[R + dx] ?? "out";
  const solid = (t) => t === "stone" || t === "ledge" || t === "placed" || t === "growth";

  const progressing = p.x > memory.mark + 0.5;
  memory.stuckFor = progressing ? 0 : memory.stuckFor + 1;
  memory.mark = Math.max(memory.mark, p.x);

  // A floor one stride ahead that isn't there. One ahead, not two: two leaves
  // the ground a whole tile early and spends the arc on runway.
  const gapAhead = p.onGround && !solid(at(1, 0)) && !solid(at(1, 1));

  // Anything to land on, anywhere below? Reaching for the Hook on every
  // descent leaves the Scribe orbiting between anchors, never grounded.
  let groundBelow = false;
  for (let dy = 1; dy <= R; dy += 1) if (solid(at(0, dy))) groundBelow = true;

  // A thorn or a sealed door is cleared from a step away, not walked into.
  let barrierAhead = false;
  let gateAhead = false;
  for (let dx = 1; dx <= 3; dx += 1) {
    for (let dy = -2; dy <= 0; dy += 1) {
      const t = at(dx, dy);
      if (t === "thorn" || t === "growth" || t === "door") barrierAhead = true;
      if (t === "wordgate") gateAhead = true;
    }
  }
  const wallAhead = solid(at(1, -1)) || solid(at(1, -2));

  // Optional pockets are places a body holding right can climb into and then
  // press against a sealed wall forever. A player steps back down.
  //
  // A Word-Gate is the worst of them, and no key opens it: it wants three
  // letters spelled on a plate, which this driver cannot do. Watching a whole
  // Tiferet run go by showed the Scribe climbing into the same gate chamber
  // eight times. So a gate is not a barrier to be pressed at — it is a place
  // to walk away from, and the walking away has to last long enough to get
  // clear of the pocket's mouth.
  //
  // **This is wrong over the Abyss, and the tool cannot get there anyway.**
  // On the five crossings the gate *is* the way out, so walking away from it
  // is walking away from the exit — but every script here goes in by the
  // linear warp, which has no crossings in it. Whoever teaches this harness to
  // walk a Tree path has to teach it to spell first; until then a crossing is
  // unfinishable by the tool by construction, not by accident.
  if (gateAhead) memory.leaveGate = 60;
  else if (memory.leaveGate > 0) memory.leaveGate -= 1;

  const backingOff =
    memory.leaveGate > 0 || (memory.stuckFor > 90 && memory.stuckFor % 150 < 45);

  const wantJump = !backingOff && (gapAhead || wallAhead || memory.stuckFor > 6);

  // **Jump is an edge, not a state.** `GameCanvas` reads `jump` from the keys
  // *pressed since the last frame* and `jumpHeld` from the keys still down —
  // so a key held against a wall gives exactly one leap and then nothing, and
  // the Scribe stands there pressing forever. Found by watching it happen.
  // Hence: hold for a real, full-height jump, then let go long enough that the
  // next press is a press.
  memory.jumpFor -= 1;
  if (wantJump && memory.jumpFor <= -3) memory.jumpFor = 7;

  const husk = p.husks.nearest;
  const reckless = opts?.reckless;
  memory.actFor -= 1;

  return {
    // Held.
    right: !backingOff,
    left: backingOff,
    jump: memory.jumpFor > 0,
    // **Up, on a vine and in water** — and it was hardcoded false, which meant
    // this harness could not climb a vine or rise through water at all.
    // `step` begins a climb on `onVine && (up || down || climbing)`, so a
    // driver that never presses up never starts one, and every vine in the
    // game was scenery to the tool built for looking at the game. The same
    // bug, in the same shape, was found in the traversal probe on the same
    // afternoon — two drivers, written months apart, both unable to use a
    // third of what the route graph counts on.
    /**
     * **Held false, and it is a known gap rather than an oversight.**
     *
     * `step` begins a climb on `onVine && (up || down || climbing)`, so a driver
     * that never presses up can never start one: every vine in the game is
     * scenery to this harness, and so is rising through water. The traversal
     * probe had the identical bug — written months apart, both drivers unable
     * to use a third of what the route graph counts on — and there it is fixed,
     * against `p.climbing` and a vine within the body.
     *
     * The same fix was tried here, reading `inWater` and `onVine` off the dev
     * probe (which now reports both, for whoever picks this up). It measured
     * catastrophically: the `path` script goes from ninety-seven per cent and a
     * finished rung to **not moving at all** — progress two millionths, on a
     * screen with no vine and no water anywhere in it. Something about holding
     * the real ArrowUp key against a real browser stops this driver dead, and
     * whatever it is, it is not the thing the change was for.
     *
     * So it stays false and the note stays here. What the harness cannot show
     * is a vine screen and a swim, which is worth knowing when reading its
     * videos: an absence there is the tool, not the game.
     */
    up: false,
    // Leaving a gate chamber usually means getting *down* out of it first.
    down: memory.leaveGate > 30,
    // Tapped — all three are edges too, for the same reason.
    //
    // Only ever for a reason. A Scribe holding all twenty-two letters who taps
    // act on a rhythm sets a stone with Bet and then takes it straight back,
    // forever: one Keter run logged a hundred and seventy-seven alternating
    // "A stone stands where you set it" / "The stone is taken back". And once
    // the Hook has caught, pressing again just re-hangs him — that run ended
    // dangling from an anchor with the clock run out.
    // ...and never twice in quick succession. Over a chasm with rings above
    // it there is no ground below by definition, so an uncooled act casts the
    // Hook, gets thrown, falls, and casts again — a pendulum that never lands.
    // One Keter run spent a hundred and forty seconds oscillating between two
    // anchors at 53% across, which `step.ts` had warned in a comment was
    // exactly what happens.
    act: memory.actFor <= 0 && !p.grappled && (barrierAhead || (!p.onGround && !groundBelow)),
    dash: !reckless && !p.onGround && !groundBelow && memory.tick % 3 === 0,
    strike: opts?.strike !== false && husk !== undefined && husk < 220 && memory.tick % 5 === 0,
  };
}

/** Which keys are held down over time, and which are struck once. */
const HELD_KEYS = ["left", "right", "up", "down", "jump"];
const TAP_KEYS = ["act", "dash", "strike"];

// --- a run -------------------------------------------------------------------

async function play(script, browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    recordVideo: has("no-video") ? undefined : { dir: outDir, size: { width: 1280, height: 860 } },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  const query = new URLSearchParams(script.warp).toString();
  await page.goto(`${url}/#/game?${query}`, { waitUntil: "domcontentloaded" });

  // A script may have to *walk in* rather than warp in — the overworld is
  // reached by beginning a climb and choosing a way, and no query string
  // expresses that.
  if (script.enter) {
    await page.waitForTimeout(600);
    await script.enter(page);
    await page.waitForTimeout(600);
  }

  // Wait for the probe to answer, which is also the check that the warp took.
  await page
    .waitForFunction((key) => Boolean(globalThis[key]?.read?.()), PROBE_KEY, { timeout: 15000 })
    .catch(() => {
      throw new Error(
        `The probe never appeared. Is this \`npm run dev\`? (import.meta.env.DEV must be true)`,
      );
    });

  const held = new Set();
  const press = async (name, want) => {
    if (want && !held.has(name)) {
      held.add(name);
      await page.keyboard.down(KEYS[name]);
    } else if (!want && held.has(name)) {
      held.delete(name);
      await page.keyboard.up(KEYS[name]);
    }
  };
  const release = async () => {
    for (const name of HELD_KEYS) await press(name, false);
  };

  const memory = { mark: 0, stuckFor: 0, jumpFor: 0, leaveGate: 0, actFor: 0, tick: 0 };
  const report = {
    script: script.name,
    about: script.about,
    warp: script.warp,
    startedAt: new Date().toISOString(),
    samples: [],
    captions: [],
    plates: [],
    letters: [],
    errors,
  };
  const shots = [];
  const deadline = Date.now() + script.seconds * 1000;
  // The sheet has to be evenly spread over a run whose length is not known in
  // advance — a script that hits its condition in twenty seconds and one that
  // uses its whole budget both want twelve frames across the whole of it. So:
  // shoot often, and whenever there are too many, throw out every other one and
  // double the interval. The spread stays even however long the run turns out
  // to be. Photographing on a fixed schedule instead gave a two-frame sheet.
  let shotEvery = 1500;
  let lastShot = 0;

  let reason = "the clock ran out";
  let last = null;

  for (let i = 0; Date.now() < deadline; i += 1) {
    memory.tick = i;
    const state = await page.evaluate((key) => {
      const api = globalThis[key];
      return api ? { p: api.read(), look: api.look(4) } : null;
    }, PROBE_KEY);
    if (!state?.p) break;
    const { p, look } = state;
    last = p;

    // Record what the game says, once per thing said.
    if (p.message && report.captions.at(-1)?.text !== p.message) {
      report.captions.push({ tick: p.tick, text: p.message });
    }
    for (const id of p.letters) {
      if (!report.letters.includes(id)) report.letters.push(id);
    }
    if (i % 6 === 0) {
      report.samples.push({
        tick: p.tick,
        x: p.x,
        progress: Number(p.progress.toFixed(3)),
        lamps: p.lamps,
        or: p.or,
        standing: p.husks.standing,
        broken: p.husks.broken,
      });
    }

    // A plate is up: photograph it, note it, then dismiss it — everything
    // worth seeing in the last two commits happens on one of these.
    if (p.plate) {
      if (report.plates.at(-1)?.kind !== p.plate) {
        report.plates.push({
          kind: p.plate,
          tick: p.tick,
          text: (await page.locator('[role="dialog"]').innerText().catch(() => "")).slice(0, 4000),
        });
        // Plates get their own full-size file rather than a cell in the sheet:
        // they are pages of text, and the point of photographing one is to be
        // able to read it.
        const file = `${script.name}-${report.plates.length}-${p.plate}.png`;
        await page.screenshot({ path: join(outDir, file) });
        report.plates.at(-1).image = file;
      }
      if (script.until(p)) {
        reason = `reached: ${p.plate}`;
        break;
      }
      await release();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      continue;
    }

    if (script.until(p)) {
      reason = "the script's own condition";
      break;
    }

    const input = decide(p, look, memory, script.driver);
    for (const name of HELD_KEYS) await press(name, Boolean(input[name]));
    for (const name of TAP_KEYS) if (input[name]) await page.keyboard.press(KEYS[name]);
    if (input.act) memory.actFor = 25;

    // Not before the world has drawn once, or the sheet opens on a black cell.
    if (p.tick > 20 && Date.now() - lastShot > shotEvery) {
      lastShot = Date.now();
      shots.push(await canvasShot(page));
      if (shots.length > frames) {
        shots.splice(0, shots.length, ...shots.filter((_, n) => n % 2 === 0));
        shotEvery *= 2;
      }
    }
    await page.waitForTimeout(40);
  }

  await release();

  report.ended = reason;
  report.final = last;
  report.endedAt = new Date().toISOString();

  // The contact sheet, composed in the page — no image library anywhere.
  if (shots.length) {
    const sheet = await composeSheet(page, shots.filter(Boolean));
    if (sheet) await writeFile(join(outDir, `${script.name}.png`), sheet);
  }
  await writeFile(join(outDir, `${script.name}.json`), `${JSON.stringify(report, null, 2)}\n`);

  await context.close();
  const video = page.video();
  if (video) {
    await video.saveAs(join(outDir, `${script.name}.webm`)).catch(() => undefined);
    await video.delete().catch(() => undefined);
  }
  return report;
}

/** The canvas alone, as a PNG buffer — the game without the page around it. */
async function canvasShot(page) {
  const data = await page
    .evaluate(() => document.querySelector("canvas")?.toDataURL("image/png"))
    .catch(() => undefined);
  return data ? Buffer.from(data.split(",")[1], "base64") : null;
}

/**
 * N frames into one grid, drawn on a canvas inside the page.
 *
 * Composing here rather than in Node is the whole reason this tool needs no
 * image dependency: the browser already has a decoder and an encoder, and a
 * single PNG is the thing a person can actually look at.
 */
async function composeSheet(page, buffers) {
  const urls = buffers.map((b) => `data:image/png;base64,${b.toString("base64")}`);
  const data = await page.evaluate(async (sources) => {
    const images = await Promise.all(
      sources.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
          }),
      ),
    );
    const good = images.filter(Boolean);
    if (!good.length) return null;
    const cols = good.length <= 3 ? good.length : good.length <= 8 ? 2 : 3;
    const rows = Math.ceil(good.length / cols);
    // A uniform cell, with every frame fitted into it — the frames are not all
    // the same size, and stretching them to the first one's shape made an
    // unreadable sheet.
    const w = Math.max(...good.map((i) => i.width));
    const h = Math.max(...good.map((i) => i.height));
    const pad = 10;
    const canvas = document.createElement("canvas");
    canvas.width = cols * w + (cols + 1) * pad;
    canvas.height = rows * h + (rows + 1) * pad;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1b1710";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    good.forEach((img, i) => {
      const cx = pad + (i % cols) * (w + pad);
      const cy = pad + Math.floor(i / cols) * (h + pad);
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, cx + (w - dw) / 2, cy + (h - dh) / 2, dw, dh);
      ctx.fillStyle = "#c8a44d";
      ctx.font = "bold 18px monospace";
      ctx.fillText(String(i + 1), cx + 8, cy + 24);
    });
    return canvas.toDataURL("image/png");
  }, urls);
  return data ? Buffer.from(data.split(",")[1], "base64") : null;
}

// --- run them ----------------------------------------------------------------

const browser = await chromium.launch({
  executablePath: browserPath(),
  headless: !has("headed"),
});

const summary = [];
for (const script of scripts) {
  process.stdout.write(`▸ ${script.name} — ${script.about}\n`);
  try {
    const report = await play(script, browser);
    const f = report.final ?? {};
    summary.push({
      script: script.name,
      ended: report.ended,
      progress: f.progress,
      lamps: f.lamps,
      husks: f.husks,
      plates: report.plates.map((p) => p.kind),
      letters: report.letters.length,
      captions: report.captions.length,
      errors: report.errors.length,
    });
    console.log(
      `  ${report.ended} · ${Math.round((f.progress ?? 0) * 100)}% across · ` +
        `${f.lamps ?? "?"} lamps · ${f.husks?.broken ?? 0} of ${f.husks?.total ?? 0} husks broken · ` +
        `plates: ${report.plates.map((p) => p.kind).join(", ") || "none"}` +
        (report.errors.length ? ` · ${report.errors.length} console errors` : ""),
    );
  } catch (e) {
    console.error(`  failed: ${e.message}`);
    summary.push({ script: script.name, failed: e.message });
  }
}

await browser.close();
await writeFile(join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`\nWrote ${outDir}/ — one PNG contact sheet, one JSON report and one video per script.`);
