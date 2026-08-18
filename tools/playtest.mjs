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

/**
 * Present yourself at the crown, from the Tree.
 *
 * The four ending scripts used to warp onto the linear road's tenth rung and
 * get the sealed plate by walking off the end of it. That road is gone, so the
 * ending is reached the way a player reaches it: standing on a Keter whose
 * Tree is kindled, and choosing to seal. The warp lights the ten (`lit`) —
 * three hundred light is not something a harness can be asked to earn.
 */
/**
 * Put the prologue down, if it is being told.
 *
 * Every playwright context is a fresh browser with empty storage, so **every**
 * script that presses Begin is by definition a first Begin: the prologue plays
 * before the Tree rises, and a script that clicked straight through to a way
 * out stood waiting on a button behind a plate. That is exactly what happened
 * to `path` the first time the whole set was run after the prologue landed —
 * a thirty-second timeout on a Yesod that was never going to appear.
 *
 * `first-run` is the one script that wants the telling, and it walks it page
 * by page rather than calling this.
 */
const pastThePrologue = async (page) => {
  const skip = page.getByRole("button", { name: /^Skip/ });
  if (await skip.count()) {
    /**
     * **The one place every script sees the prologue**, so it is where the
     * panel is checked — once, cheaply, for everybody.
     *
     * A scene is a `<canvas>` inside a plate, which is a hole in the document
     * with an `aria-label` on it. Neither `scene.test.ts` nor the `scenes`
     * sheet can say whether it was ever *mounted*: the first tests the painter
     * and the second calls it directly. This asks the shipped page, and it is
     * exactly the class of thing that went unnoticed for the whole life of P5b
     * when `onVessel` was threaded through props and never assigned.
     */
    const panel = page.locator('[role="dialog"] canvas[role="img"]');
    if (!(await panel.count())) throw new Error("the prologue plate has no scene in it");
    const said = await panel.first().getAttribute("aria-label");
    if (!said || said.length < 30) throw new Error(`the prologue's scene says "${said}"`);
    await skip.first().click();
    await page.waitForTimeout(500);
  }
};

/**
 * Wipe the drawers a returning Scribe carries, so the next Begin is a **first**
 * Begin — the prologue told, the map teaching itself, the kingdom seen for the
 * first time.
 *
 * `first-run` has done this inline since it was written; the two panel scripts
 * need the same four keys and a fifth (`otzar-game-seen`, which P11b added), and
 * three copies of a list of storage keys is three places to forget one. The
 * asymmetry is deliberate: `pastThePrologue` puts the telling *down*, this makes
 * sure there is one to put down.
 */
const tellItAgain = async (page) => {
  await page.evaluate(() => {
    for (const key of [
      "otzar-game-taught",
      "otzar-game-taught-tree",
      "otzar-game-told",
      "otzar-game-seen",
      "otzar-game-sound",
    ]) {
      localStorage.removeItem(key);
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
};

const sealFromTheMap = async (page) => {
  // Either ending's button — they are deliberately different words for
  // deliberately different acts, and this walks whichever the map is offering.
  const seal = page
    .getByRole("button", { name: /Seal the ascent|Present yourself at the crown/ })
    .first();
  await seal.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (await seal.count()) await seal.click();
};

/**
 * The same moment on both grounds.
 *
 * The game ships a charcoal palette and a vellum one, and P8 is the standing
 * lesson in what that costs an eye that only ever looks at one: twenty klipot
 * passed every test they had while being very nearly invisible on vellum, and
 * nothing but a pair of pictures side by side could have said so.
 *
 * The keys are dropped first. Flipping the theme and waiting for a repaint is
 * a fifth of a second in which a Scribe who is still holding *right* will walk
 * out of the frame — or onto the very stone the first picture was taken to
 * show intact — so the two grounds would not be two pictures of one moment.
 */
const bothGrounds = async (page, release, name) => {
  await release();
  await page.waitForTimeout(80);
  for (const [theme, ground] of [
    ["dark", "charcoal"],
    ["light", "vellum"],
  ]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.waitForTimeout(110);
    await page.screenshot({ path: join(outDir, `${name}-${ground}.png`) });
  }
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  await page.waitForTimeout(60);
};

/**
 * **A date the calendar itself vouches for.** Every festival script warps to
 * a day it *finds* by walking `computeSacredTime` forward — never a Gregorian
 * constant, because postponement rules are unmodeled (festivals.ts's own
 * header) and a hardcoded date rots the first year it slips. `only` asks for
 * a day where the festival is the *most specific* active one, so the ground
 * attribute and the day-line belong to it and not to a coinciding Shabbat.
 */
const findFestivalDay = async (page, id, opts = {}) => {
  const found = await page.evaluate(
    async ({ id, night, horizon }) => {
      const { computeSacredTime } = await import("/src/data/sacredTime.ts");
      for (let ahead = 0; ahead < horizon; ahead += 1) {
        const day = new Date();
        day.setDate(day.getDate() + ahead);
        day.setHours(12, 0, 0, 0);
        const snap = computeSacredTime(day, "galut");
        if (snap.activeFestivalIds[0] !== id) continue;
        if (night !== undefined && snap.festivalDays?.[id] !== night) continue;
        const y = day.getFullYear();
        const m = String(day.getMonth() + 1).padStart(2, "0");
        const d = String(day.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      return null;
    },
    { id, night: opts.night, horizon: opts.horizon ?? 420 },
  );
  if (!found) throw new Error(`no ${id} inside the search horizon`);
  return found;
};

/**
 * Warp the page onto a found day, wait for the probe, and walk out of the
 * Tree map into a rung — the pause menu that tells the day's own lines only
 * exists over ground, and a warp stands the Scribe on the map.
 */
const warpToDay = async (page, day, rung) => {
  await page.goto(`${url}/#/game?rung=${rung}&letters=as-of-rung&lamps=3&seed=5&day=${day}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction((k) => Boolean(globalThis[k]?.read?.()), PROBE_KEY, { timeout: 15000 });
  await page.waitForTimeout(600);
  await walkOut(page);
  await page.waitForTimeout(400);
};

/** The ground the page stands on, and the day-line the pause menu tells. */
const dayFacts = async (page) => {
  const ground = await page.evaluate(
    () => document.querySelector("[data-festival]")?.getAttribute("data-festival") ?? null,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const pause = await page.locator('[role="dialog"]').innerText().catch(() => "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  return { ground, pause };
};

/**
 * **The five festival scripts**, one per named day the phase gave ground to —
 * together they cover all three date-rule kinds, both light extremes, both
 * new chambers, the guest nights and the palette. Each asserts three things
 * no unit test can hold at once: the warped day reaches the page (the
 * `data-festival` ground), the day-line says the rule's own words, and the
 * thing the day changes is on screen and photographed.
 */
function festivalScripts() {
  const plain = (id, rung, mustSay, extra = {}) => ({
    name: `festival-${id}`,
    about: extra.about ?? `${id} — the ground, the day-line, and the look of the day.`,
    warp: {},
    seconds: 60,
    noPlay: true,
    until: () => true,
    enter: async (page) => {
      const day = await findFestivalDay(page, id, extra);
      await warpToDay(page, day, rung);
      const { ground, pause } = await dayFacts(page);
      if (ground !== id) throw new Error(`the ground says ${JSON.stringify(ground)}, not ${id}`);
      for (const line of mustSay) {
        if (!pause.includes(line)) throw new Error(`the day-line never says "${line}"`);
      }
      // A few strides so the sheet is the day in play, not a spawn point.
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(2500);
      await page.keyboard.up("ArrowRight");
      await page.screenshot({ path: join(outDir, `festival-${id}.png`) });
      return { day, ground };
    },
    ...extra.overrides,
  });

  /**
   * The two chamber days also paint their room straight through the shipping
   * painter — the bestiary pattern: `buildPath` with the frozen festival, the
   * camera stood on the Word-Gate's own tiles, `drawWorld` onto a bare
   * canvas. No driving, no luck, the picture every time.
   */
  const paintChamber = async (page, festival, file) => {
    const shot = await page.evaluate(
      async ({ festival }) => {
        const { buildPath, gateRoomFor } = await import("/src/game/world/build.ts");
        const { TREE_PATHS } = await import("/src/game/tree.ts");
        const { drawWorld } = await import("/src/game/render/draw.ts");
        const { readPalette, paletteOf } = await import("/src/game/render/palette.ts");
        const { Tile, TILE_SIZE } = await import("/src/game/world/tiles.ts");
        const letters = TREE_PATHS.map((p) => p.letter);
        // A path out of the kingdom, whose lower end holds a House — the
        // booth moves the figure in, and a room with no figure falls back.
        const path = TREE_PATHS.find((p) => p.ends.includes("malchut"));
        const room = gateRoomFor(path.id, 5, [festival]).id;
        const world = buildPath(path, 5, letters, 1, false, false, 1, [], 0, [], [festival]);
        let at = -1;
        for (let i = 0; i < world.tiles.length; i += 1) {
          if (world.tiles[i] === Tile.WordGate) { at = i; break; }
        }
        if (at < 0) return { room, image: null };
        const tx = at % world.width;
        const ty = Math.floor(at / world.width);
        const canvas = document.createElement("canvas");
        canvas.width = 820;
        canvas.height = 460;
        const ctx = canvas.getContext("2d");
        const camera = { x: tx * TILE_SIZE - 260, y: Math.max(0, ty * TILE_SIZE - 240) };
        drawWorld(ctx, world, camera, paletteOf(readPalette(), world.sefirah), 820, 460, []);
        return { room, image: canvas.toDataURL("image/png") };
      },
      { festival },
    );
    if (!shot.image) throw new Error(`${festival}: no gate found to photograph`);
    await writeFile(join(outDir, file), Buffer.from(shot.image.split(",")[1], "base64"));
    return shot.room;
  };

  return [
    plain("shabbat", 2, [
      "Shabbat — the regions lie brighter than on any working day.",
      "The day's gesture is Rest",
    ]),
    {
      ...plain("sukkot", 2, [
        "Sukkot — the guests are welcomed, and the booth is hung with light.",
        "Night 3 of the booth — tonight the guest is Jacob.",
      ], { night: 3, about: "Sukkot night 3 — the booth behind the gate, and whose booth tonight is." }),
      enter: async (page) => {
        const day = await findFestivalDay(page, "sukkot", { night: 3 });
        await warpToDay(page, day, 2);
        const { ground, pause } = await dayFacts(page);
        if (ground !== "sukkot") throw new Error(`the ground says ${JSON.stringify(ground)}`);
        if (!pause.includes("Night 3 of the booth — tonight the guest is Jacob.")) {
          throw new Error("the day-line never seats the night's guest");
        }
        const room = await paintChamber(page, "sukkot", "festival-sukkot-booth.png");
        if (room !== "word-gate-sukkah") throw new Error(`the gate opens onto ${room}`);
        await page.screenshot({ path: join(outDir, "festival-sukkot.png") });
        return { day, room };
      },
    },
    {
      ...plain("hanukkah", 2, [
        "Hanukkah — the light that lasted longer than it had any right to.",
      ], { about: "Hanukkah — the widened lamp in play, and the eight lights behind the gate." }),
      enter: async (page) => {
        const day = await findFestivalDay(page, "hanukkah");
        await warpToDay(page, day, 2);
        const { ground, pause } = await dayFacts(page);
        if (ground !== "hanukkah") throw new Error(`the ground says ${JSON.stringify(ground)}`);
        if (!pause.includes("the light that lasted longer")) throw new Error("the day-line is silent");
        const room = await paintChamber(page, "hanukkah", "festival-hanukkah-lamps.png");
        if (room !== "word-gate-lamps") throw new Error(`the gate opens onto ${room}`);
        // The halo in play — the grace is lent by the day, so a few strides
        // photograph the widened lamp with no warp flag at all.
        await page.keyboard.down("ArrowRight");
        await page.waitForTimeout(2500);
        await page.keyboard.up("ArrowRight");
        await page.screenshot({ path: join(outDir, "festival-hanukkah.png") });
        return { day, room };
      },
    },
    plain("yom-kippur", 2, [
      "Yom Kippur — the regions are spare. Little is strewn, and little is needed.",
    ], { about: "Yom Kippur — the spare ground, 0.7 of an ordinary day's light." }),
    plain("tishabav", 2, [
      "Tisha B'Av — the light is scarce. What is destroyed is climbed through, not around.",
    ], { about: "Tisha B'Av — the scarcest ground, and the day's own palette accent." }),
  ];
}

const SCRIPTS = [
  {
    name: "first-run",
    about: "A stranger's first minute — the prologue played, and the Tree teaching itself.",
    /**
     * **The one script that begins with nothing.** Every other script warps or
     * seeds a record; this one wipes the drawers a returning Scribe carries —
     * the lessons, the telling, the sound preference — and presses Begin, so
     * what it photographs is what a person who has never seen this game sees.
     *
     * It exists because the prologue and the map's own lessons are both
     * *first-time-only*, which makes them the two things in the game most
     * likely to break unnoticed: they never appear again on any machine that
     * has already run once, including every machine anyone develops on.
     */
    warp: {},
    enter: async (page) => {
      await tellItAgain(page);
      // The score is offered on the threshold, to somebody who has never said.
      const sound = page.getByRole("button", { name: /Play with sound/ });
      if (!(await sound.count())) throw new Error("the threshold never offered the score");
      await page.getByRole("button", { name: /^Begin/ }).first().click();
      await page.waitForTimeout(500);
      // The prologue, page by page, to its charge — and the map must stay down
      // until it is done. Pressing Enter is how a person turns it.
      let pages = 0;
      /**
       * **The kingdom's question, asked at Begin** (P15-3). Malchut's
       * first-sight rises after the prologue's last page and its plate now
       * carries the rung's question — asserted here because this is the one
       * deterministic road to a first-sight plate: every path-done walker
       * fights on wall-clock beats and can die, but Begin always arrives at
       * the kingdom. Verbatim rather than imported (this file cannot read
       * TS); the unit test guards the table, this guards the words reaching
       * the plate.
       */
      let asked = false;
      for (; pages < 12; pages += 1) {
        const go = page.getByRole("button", { name: /^Go on$|^Begin the ascent$/ });
        if (!(await go.count())) break;
        if (await page.locator("[class*=wayButton]").count()) {
          throw new Error("the Tree rose while the prologue was still being told");
        }
        const text = await page.locator('[role="dialog"]').innerText().catch(() => "");
        if (text.includes("Will you receive what is already given, before you climb past it?")) {
          asked = true;
        }
        await page.keyboard.press("Enter");
        await page.waitForTimeout(250);
      }
      if (pages < 2) throw new Error(`the prologue played ${pages} pages`);
      if (!asked) throw new Error("the kingdom was seen at Begin and never asked its question");
      await page.waitForTimeout(600);
      // And what is left is the Tree, teaching itself.
      const lesson = await page.locator("[class*=overlayLesson]").textContent().catch(() => "");
      if (!/Tree/.test(lesson ?? "")) throw new Error(`the map taught nothing: ${lesson}`);
      await page.screenshot({ path: join(outDir, "first-run-tree.png") });
      // Then out of the kingdom, so the run has ground to photograph.
      await walkOut(page);
    },
    until: (p) => p.progress > 0.1 || p.finished,
    seconds: 90,
  },
  {
    name: "midnight",
    about: "The day turns under an open session — the label rolls, and the lent grace is taken back.",
    /**
     * **The one transition no warp can reach.** `WarpOptions.day` stands the
     * game *on* a chosen day; this script watches the game cross from one day
     * into the next, which is a different claim: the sixty-second poll fires,
     * `seedLabel` changes, the festival attribute falls off the root, and
     * whatever the old day lent is taken back. `mechanics.test.ts` says
     * outright that the poll and the `visibilitychange` listener are not
     * testable from node — this is where they are testable.
     *
     * Playwright's clock is the instrument: install a fake time and the
     * page's own `Date` and `setInterval` follow it, so fast-forwarding five
     * minutes fires the poll exactly as a night at the desk would.
     *
     * **The Saturday is found, never hardcoded.** The calendar's own
     * `computeSacredTime` is imported out of the dev server (the `bestiary`
     * pattern) and walked forward until a Shabbat whose morrow is an ordinary
     * day — festivals.ts's header says postponement rules are unmodeled, so a
     * Gregorian constant would rot, and a Sunday that is itself a festival
     * would make "the attribute falls off" false for the right reasons.
     */
    warp: {},
    seconds: 60,
    noPlay: true,
    enter: async (page) => {
      const found = await page.evaluate(async () => {
        const { computeSacredTime } = await import("/src/data/sacredTime.ts");
        for (let ahead = 0; ahead < 60; ahead += 1) {
          const day = new Date();
          day.setDate(day.getDate() + ahead);
          day.setHours(12, 0, 0, 0);
          const morrow = new Date(day);
          morrow.setDate(morrow.getDate() + 1);
          const today = computeSacredTime(day, "galut");
          const next = computeSacredTime(morrow, "galut");
          if (today.activeFestivalIds.includes("shabbat") && next.activeFestivalIds.length === 0) {
            return { at: day.getTime(), label: day.toDateString() };
          }
        }
        return null;
      });
      if (!found) throw new Error("no Shabbat with an ordinary morrow inside sixty days");

      const ground = () => page.evaluate(() => document.querySelector("[data-festival]")?.getAttribute("data-festival") ?? null);
      const dayLine = () => page.locator("main, body").first().innerText().then((t) => t.slice(0, 4000));

      // Noon on the found Shabbat — installed and then *reloaded into*,
      // because the poll's interval is registered at mount and only timers
      // registered under the fake clock answer to `fastForward`. A clock
      // installed over a running page changes what `Date` says and leaves
      // the interval on the real clock, which was measured here as a
      // midnight that never came.
      await page.clock.install({ time: new Date(found.at) });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const before = await ground();
      if (before !== "shabbat") {
        throw new Error(`at noon on ${found.label} the ground says ${JSON.stringify(before)}, not shabbat`);
      }
      const labelBefore = await dayLine();
      await page.screenshot({ path: join(outDir, "midnight-1-shabbat.png") });

      // To 23:58, then across. Two fake minutes past midnight the poll has
      // fired at least once on the far side.
      await page.clock.fastForward("11:58:00");
      await page.clock.fastForward("04:00");
      await page.waitForTimeout(300);
      const after = await ground();
      if (after !== null) {
        throw new Error(`the day turned and the ground still says ${JSON.stringify(after)}`);
      }
      const labelAfter = await dayLine();
      if (labelBefore === labelAfter) {
        throw new Error("the day turned and the threshold still shows yesterday");
      }
      await page.screenshot({ path: join(outDir, "midnight-2-ordinary.png") });
      return { turned: true, shabbat: found.label };
    },
    until: () => true,
  },
  ...festivalScripts(),
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
    /**
     * The break's own sentence, heard — birur said aloud (P15-1). Every
     * shell breaks with its own line now, each naming the light it held; the
     * retired one-voice line ("…the light in it is yours") must not be heard
     * again. The unit test holds the table; this holds the wiring — that
     * `strikeHusk` actually says `spec.release` into a world a player is in.
     */
    watch: async (_page, p, _look, { seen }) => {
      if (p.message && /breaks|breaks away/.test(p.message)) seen.release = p.message;
    },
    check: (p, seen) => {
      if (p.husks.broken >= 1 && !seen.release) {
        throw new Error("a shell broke and no release was ever said");
      }
      if (seen.release && /the light in it is yours/.test(seen.release)) {
        throw new Error("the one voice is back — a break said the retired generic line");
      }
    },
  },
  {
    name: "maskit",
    about: "The figured stone — a lie in the floor, seen whole, giving way, and what came up.",
    /**
     * **The one thing P13 authored that nobody has ever looked at.**
     *
     * Nine screens were composed around a figured stone and the budget above
     * the kingdom was doubled, all of it proved by unit test and none of it
     * ever seen — and until the tile got a name in `TILE_NAMES` it could not
     * be: `look()` reported one to this harness as open air, so no script could
     * have found a stone to stand on if it had tried.
     *
     * **The question is not whether it works.** `maskit.test.ts` says the tile
     * is solid, that standing on it empties it, that it mends as hewn stone and
     * that something comes up. What no test can say is whether the seam is
     * *legible*, and `drawMaskit` sets itself a standard that is precisely a
     * question about a picture: legible to a player who has already been
     * dropped once and is now looking, and invisible to one who is running.
     *
     * That standard is met by one hatch drawn at **alpha 0.55 of `stoneEdge` on
     * vellum and 0.16 of `gold` on charcoal** — a different colour and a third
     * of the strength. An asymmetry of exactly that kind is what left twenty
     * klipot nearly invisible on one ground for the whole of P8, and it was a
     * pair of pictures side by side that found it, not a number.
     *
     * So the run stops at three moments and photographs them, the first and
     * last on both grounds:
     *
     *   1. **whole** — a stone still intact in the floor a stride ahead. The
     *      picture that matters most, because it is the only one a player gets
     *      *before* anything happens to them, and the whole of the legibility
     *      question lives in it.
     *   2. **giving way** — the instant the floor empties, which the world
     *      announces in its own words.
     *   3. **after** — the drop taken and whatever came out of the hole. The
     *      mended stone is a row above by then and may sit at the frame's edge
     *      or out of it; what this shows is what the player is looking at, not
     *      what the tile did.
     *
     * A high rung, because the kingdom lays none at all and the budget is three
     * only at the top of the Tree. If the run never meets one, `check` says so
     * — a script that photographed nothing must not report a clean run.
     */
    warp: { rung: 8, letters: "as-of-rung", lamps: 3, seed: 5 },
    seconds: 240,
    driver: { ontoMaskit: true },
    until: (p, seen) => Boolean(seen.after) || p.finished,
    watch: async (page, p, look, { seen, release, report }) => {
      const R = 4;
      // `neighbourhood` centres on the row the Scribe's feet are in, so dy 0 is
      // the floor he stands on and dy 0, dx 1..3 is the floor just ahead.
      const at = (dx, dy) => look[R + dy]?.[R + dx] ?? "out";
      const note = (what, extra) => report.moments.push({ what, tick: p.tick, ...extra });

      if (!seen.whole) {
        // **A stone anywhere in view, and not under his own feet.** In view,
        // because a tile within four of the Scribe is a tile on screen, and
        // what is being judged is a picture. Not underfoot, because a stone
        // beneath a body already standing is a stone breaking this very tick —
        // `breakMaskit` fires on exactly that — so that column photographs the
        // hole, and the only picture worth having is of the floor still whole.
        // **Where it is, in tiles from the Scribe**, and not merely that one is
        // somewhere on screen. A picture of a floor with a lie in it is no use
        // to an eye that does not know which tile is lying: the first of these
        // photographed a stone four tiles off and the report said only that it
        // had seen one, which left both grounds unjudgeable.
        let where;
        let near = Infinity;
        for (let dy = -4; dy <= 4; dy += 1) {
          for (let dx = -4; dx <= 4; dx += 1) {
            if (at(dx, dy) !== "maskit" || (dx === 0 && dy === 0)) continue;
            if (Math.abs(dx) + Math.abs(dy) >= near) continue;
            near = Math.abs(dx) + Math.abs(dy);
            where = { dx, dy };
          }
        }
        if (where && at(0, 0) !== "maskit" && p.onGround) {
          seen.whole = { tick: p.tick, where };
          note("whole", { where, sefirah: p.sefirah, facing: p.vx >= 0 ? "right" : "left" });
          await bothGrounds(page, release, "maskit-1-whole");
        }
        return;
      }

      if (!seen.gaveWay) {
        // **The world's own word for it**, rather than anything inferred. Both
        // branches of `breakMaskit` say something — one names what was under
        // the stone, the other admits there was nothing — and either way the
        // sentence is proof the tile broke under this body, which no count of
        // husks or reading of position can be.
        if (/under the stone|never stone/.test(p.message ?? "")) {
          seen.gaveWay = { tick: p.tick, said: p.message, lamps: p.lamps };
          note("giving-way", { said: p.message, lamps: p.lamps });
          await page.screenshot({ path: join(outDir, "maskit-2-giving-way.png") });
        }
        return;
      }

      // A second and a half on: the fall is over, the stone above has mended,
      // and the pacer's own second of coming up has run out — so what is on
      // screen is the trap's whole consequence rather than its middle.
      if (p.tick > seen.gaveWay.tick + 90) {
        seen.after = { tick: p.tick, lamps: p.lamps, husks: p.husks.standing };
        note("after", { lamps: p.lamps, standing: p.husks.standing });
        await bothGrounds(page, release, "maskit-3-after");
      }
    },
    check: (p, seen) => {
      if (!seen.whole) {
        throw new Error(
          `no figured stone was ever seen in the floor of ${p.sefirah ?? "the rung"} — ` +
            "either the rung laid none or look() cannot see them again",
        );
      }
      if (!seen.gaveWay) throw new Error("a stone was seen and never stood on");
      if (!seen.after) throw new Error("the stone gave way and the run ended before the landing");
    },
  },
  {
    name: "house",
    about: "A figure of the Dorot standing on a rung, and what they say.",
    /**
     * **This script meets a figure now, and the move that made it possible is
     * worth keeping.** For its whole prior life it shipped green having met
     * none — `until` also passed on `p.finished`, so "the clock ran out ·
     * plates: fragment" read as a pass run after run. P15-0's check exposed it
     * on its first run, and the diagnosis took three layers:
     *
     * 1. `letters: "as-of-rung"` can never open a House plate at all — Peh is
     *    assembled from scroll fragments, not found in an alcove, and without
     *    the `speech` grace the figure inclines their head and says nothing.
     * 2. On a two-storey rung (index 4+) the sighting watch put the figure at
     *    **dy −450** — `HOUSE_CHUNK` laid on the upper floor, up the shaft
     *    this driver still cannot take (that debt stands).
     * 3. On a corridor rung (index ≤ 3, one row) the same figure stands at
     *    **dy −18**, on the walking line.
     *
     * So: Yesod, the whole alphabet, and `seekHouse` — and the script now
     * proves the P15-0 chain whole: figure met, offer answered, the bargain
     * written to the record at the moment of choice and read back off the
     * probe.
     */
    /**
     * `letters: "all"` because Peh is the gate: a figure met without the
     * `speech` grace inclines their head and says nothing, and Peh is never
     * in `as-of-rung` — it is assembled from three scroll fragments, not
     * found in an alcove. The old warp could not open a House plate at all,
     * and the script shipped green anyway because `until` also passed on
     * `p.finished` — the generous-until fault `check` exists to kill, caught
     * here by its own new check on the first run.
     */
    warp: { rung: 2, letters: "all", lamps: 3, seed: 3 },
    /**
     * Met is not enough any more: the plate must be *answered* and the answer
     * must reach the record. `p.bargains` is the ledger read back off the
     * probe, so this script now proves the whole P15-0 chain — the offer
     * accepted, the bargain written at the moment of choice, and the record
     * carrying it — rather than that a dialog once existed.
     */
    until: (p) => p.bargains.length > 0 || p.finished,
    seconds: 180,
    driver: { seekHouse: true },
    /** Where the figure stood when seen — so a miss names its reason. */
    watch: async (_page, p, _look, { seen, report }) => {
      if (p.house && !seen.sighted) {
        seen.sighted = true;
        report.moments.push({ what: "figure sighted", tick: p.tick, ...p.house });
      }
      if (p.house) seen.lastHouse = { ...p.house, sefirah: p.sefirah };
    },
    onPlate: async (page, plate) => {
      if (plate !== "house") return false;
      // The offer's terms are the primary button; Decline is its sibling.
      // Clicked by role rather than trusted to focus, because whether Enter
      // lands on the accept is exactly the kind of thing this script must
      // not assume.
      const accept = page.locator('[role="dialog"] button').first();
      if (await accept.count()) {
        await accept.click();
        await page.waitForTimeout(400);
        return true;
      }
      return false;
    },
    check: (p) => {
      if (!p.bargains.length) {
        throw new Error("a House was met and no bargain was ever written to the record");
      }
      const outcome = p.bargains[0].outcome;
      if (outcome !== "accepted" && outcome !== "kept" && outcome !== "broken") {
        throw new Error(`the offer was answered and the ledger says "${outcome}"`);
      }
    },
  },
  {
    name: "house-declined",
    about: "The same guest refused — the parting answered in their middah, and the refusal written.",
    /**
     * The other half of the House bargain, which for the game's whole life
     * was a bare close: nothing recorded, nothing said, an honest no
     * indistinguishable from a House never met. P15-2's claim has three
     * parts and this run proves all of them in one pass — Decline writes
     * `declined` to the ledger at the moment of choice, the guest answers
     * with their authored parting (photographed, since it is a view no other
     * script can reach), and nothing is granted for it.
     */
    warp: { rung: 2, letters: "all", lamps: 3, seed: 3 },
    until: (p) => p.bargains.some((b) => b.outcome === "declined") || p.finished,
    seconds: 180,
    driver: { seekHouse: true },
    onPlate: async (page, plate) => {
      if (plate !== "house") return false;
      const decline = page.locator('[role="dialog"] button', { hasText: "Decline" });
      if (await decline.count()) {
        await decline.first().click();
        await page.waitForTimeout(400);
        // The parting view — the one picture of a guest answering a refusal.
        await page.screenshot({ path: join(outDir, "house-declined-parting.png") });
        return true;
      }
      return false;
    },
    check: (p) => {
      const declined = p.bargains.find((b) => b.outcome === "declined");
      if (!declined) throw new Error("Decline was pressed and the ledger never says declined");
      if (p.bargains.some((b) => b.outcome === "accepted" || b.outcome === "kept")) {
        throw new Error("a refusal granted something — the ledger holds an acceptance too");
      }
    },
  },
  {
    name: "crown-presented",
    about: "The other ending — a crown nothing is holding, and a Tree still mostly dark.",
    /**
     * **The branch that shipped unreachable.** `SealedPlate` has carried a
     * whole "The crown is reached" face since the linear road was retired, and
     * nothing in the game could raise it: the map offered sealing only to a
     * Scribe with all ten Sefirot lit, so `sealedAt`'s own promise of "the
     * crown, *or* all ten kindled" was half a lie.
     *
     * `freed` without `lit` is exactly that standing: every guardian broken —
     * which at Keter means Behemot — and not one Sefirah bought. What this
     * photographs is a real second ending rather than a shortcut: the same
     * plea, graded the same four ways, on a climb that went up rather than
     * across.
     */
    warp: { rung: 10, letters: "all", lamps: 3, witnesses: 4, seed: 5, freed: 1 },
    enter: sealFromTheMap,
    until: (p) => p.plate === "sealed",
    seconds: 90,
  },
  {
    name: "crown-whole",
    about: "Keter with the Mouth and all seven Houses — the whole case made.",
    warp: { rung: 10, letters: "all", lamps: 3, witnesses: 7, seed: 5, freed: 1, lit: 1 },
    enter: sealFromTheMap,
    until: (p) => p.plate === "sealed",
    seconds: 180,
  },
  {
    name: "crown-mute",
    about: "Keter without Peh. He arrives unable to say anything.",
    warp: { rung: 10, letters: "all-but-peh", lamps: 3, witnesses: 7, seed: 5, freed: 1, lit: 1 },
    enter: sealFromTheMap,
    until: (p) => p.plate === "sealed",
    seconds: 180,
  },
  {
    name: "crown-alone",
    about: "Keter with the Mouth and no witnesses — pleading into a silence.",
    warp: { rung: 10, letters: "all", lamps: 3, witnesses: 0, seed: 5, freed: 1, lit: 1 },
    enter: sealFromTheMap,
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
      /**
       * **The day is pinned, because this script has none of the warp's
       * anchors.** Every other script fixes its ground with `seed=`; this one
       * exists to prove the road that starts at the threshold, so its seed is
       * the real date's — and the date changed under it: it shipped green in
       * one day's sweep and went out twice in a row on the next day's ground,
       * a bare-handed walk on whatever the calendar dealt. The `midnight`
       * script's clock precedent makes it deterministic forever: install the
       * clock, reload so nothing keeps the wall time, then begin.
       */
      await page.clock.install({ time: new Date("2026-08-17T12:00:00") });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: /^Begin/ }).first().click();
      await page.waitForTimeout(400);
      await pastThePrologue(page);
      // Out by Yesod, which is the path that pays the Breath — so the rung is
      // built for a Scribe holding nothing, which is the hardest thing the
      // generator is ever asked for and the right thing to look at first.
      await page.getByRole("button", { name: /Yesod/ }).first().click();
    },
    until: (p) => p.plate === "path-done",
    // 360, raised from 150 with the day pinned: a bare-handed walk is the
    // slowest thing this harness does, its fight runs on wall-clock beats so
    // completion varies run to run, and the old budget passed near the wire
    // on the day it was drawn — measured here finishing at ~220s on one run
    // and missing 240 on the next.
    seconds: 360,
    /**
     * **No check, and the absence is documented rather than silent.** This
     * driver fights on wall-clock beats holding nothing, and measured on the
     * pinned day it completes some runs (~220s) and dies on others — a check
     * on completion would make the script flaky, and a check that tolerates
     * death proves nothing. The P15-3 question pairing is asserted on
     * `kindled` instead, whose strong-handed walk completes reliably. The
     * standing debt is the driver's bare-handed survivability, the same
     * class as the fighting probe's disengage fault (P14g-4).
     */
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
    name: "heard",
    about: "The fourth plea — some Houses stood for you, and the plate names who did not.",
    // Three witnesses of seven: `crown-whole` and `crown-alone` cover the ends
    // and `crown-mute` covers the Mouthless case, so this is the only one of
    // the four endings no script had ever raised.
    warp: { rung: 10, letters: "all", lamps: 3, witnesses: 3, seed: 5, freed: 1, lit: 1 },
    enter: sealFromTheMap,
    until: (p) => p.plate === "sealed",
    seconds: 90,
  },
  {
    name: "gate",
    about: "A Word-Gate answered — the root spelled, the chamber opened.",
    // **The thing this file said could not be done.** Its own note read: "a
    // Word-Gate is the worst of them, and no key opens it… a crossing is
    // unfinishable by the tool by construction." The probe reads the root off
    // the gate now (`dev/probe.ts`), so the driver can spell it — the clue is
    // on the plate for a person, and this is the machine reading the plate.
    //
    // An *ordinary* rung's gate rather than an Abyss crossing, and that is a
    // measurement rather than a dodge: a crossing has no shrine, so a veiling
    // costs the whole rung, and this driver is veiled several times before it
    // is a quarter of the way across — 4% on the run that settled it. The
    // gate machinery is what this proves; that the Abyss crossings can be
    // walked *and* answered end to end is proved in `world/climb.test.ts`,
    // where the driver is the fighting probe and has no clock.
    warp: { rung: 6, letters: "all", lamps: 3, seed: 5, freed: 1 },
    until: (p) => p.plate === "word-result" || p.finished,
    seconds: 180,
    driver: { intoGates: true },
    onPlate: async (page, plate) => {
      if (plate !== "word-gate") return false;
      return await answerGate(page);
    },
  },
  {
    name: "hint",
    about: "The same gate, answered by someone who reads nothing — the ladder to the end.",
    // The counterpart to `gate`, and the one that proves the "for anyone"
    // claim rather than the machinery: `gate` answers cold, off the root read
    // out of the probe, which is a thing only the harness can do. This one
    // touches nothing but what a person sees — it presses "Ask for a hint"
    // until the plate hands over the word, and inscribes what it was given.
    // If this passes, the gate has no reading requirement left in it.
    warp: { rung: 6, letters: "all", lamps: 3, seed: 5, freed: 1 },
    until: (p) => p.plate === "word-result" || p.finished,
    seconds: 180,
    driver: { intoGates: true },
    onPlate: async (page, plate) => {
      if (plate !== "word-gate") return false;
      for (let rung = 0; rung < 6; rung += 1) {
        const ask = page.getByRole("button", { name: /Ask for a hint|Tell me the word/ });
        if (!(await ask.count())) break;
        await ask.first().click();
        await page.waitForTimeout(200);
      }
      // The plate is photographed when it *appears*, which is before any of
      // this — so the ladder itself would never be seen without a second shot.
      await page.screenshot({ path: join(outDir, "hint-ladder.png") });
      const inscribe = page.getByRole("button", { name: "Inscribe" });
      if (await inscribe.isDisabled().catch(() => true)) return false;
      await inscribe.click();
      await page.waitForTimeout(400);
      return true;
    },
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
    name: "beyond",
    about: "Past the seventh seal — the seven become seven days to choose between.",
    /**
     * **The end of the arc, which used to be the end of everything.** The Seven
     * Encounters were this game's whole long progression and they run out:
     * the eighth climb read "Beyond the seven" and was played on the game's own
     * numbers with nothing acting on it. Seven sealed climbs is a fortnight for
     * anybody enjoying themselves.
     *
     * Seven sealed records are written straight in, because reaching this
     * honestly is seven whole climbs. What it photographs is the choice, and
     * that choosing one actually writes it onto the next record — the rule
     * being *offered* and the rule being *played* are two different claims and
     * only the second one matters.
     */
    warp: {},
    noPlay: true,
    enter: async (page) => {
      await page.evaluate(async () => {
        const req = indexedDB.open("otzar-hasofer");
        const db = await new Promise((res, rej) => {
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        const tx = db.transaction("ascents", "readwrite");
        for (let i = 1; i <= 7; i += 1) {
          const when = `2026-0${i}-01T00:00:00.000Z`;
          tx.objectStore("ascents").put({
            id: `beyond-${i}`, seed: i, seedLabel: `climb ${i}`,
            createdAt: when, updatedAt: when, sealedAt: when,
            regionIndex: 10, at: "keter", pathsWalked: ["malchut-yesod"],
            lettersHeld: ["peh"], or: 0, regionsCleared: [], housesMet: [],
            guardiansBroken: ["keter"], encounterNumber: i,
            endingPlea: "alone", witnessSefirot: [],
          });
        }
        await new Promise((res) => { tx.oncomplete = res; });
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      const front = (await page.textContent("body")) ?? "";
      if (!/Beyond the seven/.test(front)) throw new Error("the seven are not behind this Scribe");
      if (!/Choose the day you climb under/.test(front)) {
        throw new Error(`no choice was offered: ${front.replace(/\s+/g, " ").slice(0, 300)}`);
      }
      // The Fourth is the fourth lamp, which is the easiest to see acting.
      const fourth = page.getByRole("button", { name: /^Luminaries/ });
      if (!(await fourth.count())) throw new Error("the Fourth cannot be chosen");
      await fourth.first().click();
      await page.waitForTimeout(300);
      const said = (await page.textContent("body")) ?? "";
      if (!/A fourth lamp burns/.test(said)) throw new Error("choosing said nothing");
      await page.screenshot({ path: join(outDir, "beyond-choice.png") });
      // **And it is played, not merely offered.** Begin, then read the record.
      await page.getByRole("button", { name: /^Begin/ }).first().click();
      await page.waitForTimeout(500);
      await pastThePrologue(page);
      await page.waitForTimeout(600);
      const chosen = await page.evaluate(async () => {
        const req = indexedDB.open("otzar-hasofer");
        const db = await new Promise((res) => { req.onsuccess = () => res(req.result); });
        // `getAll()` is a request, not a promise — awaiting it hands back the
        // request object, whose `.filter` is exactly as undefined as it sounds.
        const request = db.transaction("ascents").objectStore("ascents").getAll();
        const all = await new Promise((res, rej) => {
          request.onsuccess = () => res(request.result);
          request.onerror = () => rej(request.error);
        });
        return all.filter((a) => !a.sealedAt && !a.abandonedAt).map((a) => a.ruleNumber);
      });
      if (!chosen.includes(4)) {
        throw new Error(`the chosen rule never reached the record: ${JSON.stringify(chosen)}`);
      }
    },
    until: () => true,
    seconds: 30,
  },
  {
    name: "going-out",
    about: "One lamp, and a Scribe who does not fight back. The kingdom comes up.",
    warp: { rung: 7, letters: "as-of-rung", lamps: 1, seed: 13 },
    until: (p) => p.out || p.plate === "out",
    seconds: 120,
    // Walk into everything, write nothing.
    driver: { strike: false, reckless: true },
    /**
     * **The claim, rather than the timeout.** This script has an `until` that
     * says when to stop and, until now, nothing that said whether stopping was
     * the right thing — so when `WarpOptions.lamps` turned out to be parsed and
     * applied nowhere, the Scribe walked the whole two minutes on the full three
     * lamps, never went out, and reported *the clock ran out* as a clean run.
     * The one script whose subject is a climb ending had never seen one end.
     */
    check: (p) => {
      if (!p.out && p.plate !== "out") {
        throw new Error("the last lamp never went out — the kingdom never came up");
      }
    },
  },
  {
    name: "book",
    about: "The Book of Ascents — three climbs of different shapes, read back.",
    /**
     * **The one surface that looks backwards**, and therefore the one no
     * ordinary run can reach: it needs a *history*, and a warp is a single
     * climb. So three sealed records are written straight into the store —
     * a lit Tree, a crown taken with three paths, and one in the pre-P0 shape
     * with no frozen ending at all, which the Book has to derive. Plus a
     * climb that was put down, because that happened too and is counted.
     *
     * If this run ever stops showing three pages, either the folds have
     * drifted from the record or the record has drifted from history — and
     * the third one is the interesting case, since a Scribe's old climbs are
     * the thing this game can least afford to lose.
     */
    warp: {},
    enter: async (page) => {
      await page.evaluate(async () => {
        const req = indexedDB.open("otzar-hasofer");
        const db = await new Promise((res, rej) => {
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        const tx = db.transaction("ascents", "readwrite");
        const store = tx.objectStore("ascents");
        const ALL = [
          "malchut", "yesod", "hod", "netzach", "tiferet",
          "gevurah", "chesed", "binah", "chochmah", "keter",
        ];
        store.put({
          id: "book-lit", seed: 3, seedLabel: "14 Nisan 5786",
          createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-03-01T00:00:00.000Z",
          sealedAt: "2026-03-01T00:00:00.000Z", regionIndex: 10, at: "keter",
          pathsWalked: [
            "malchut-yesod", "yesod-hod", "gevurah-hod", "gevurah-tiferet",
            "netzach-tiferet", "malchut-netzach", "yesod-tiferet", "tiferet-keter",
            "binah-keter", "chochmah-keter", "binah-chesed", "chesed-chochmah",
          ],
          lettersHeld: ["aleph", "bet", "gimel", "peh"], or: 40,
          regionsCleared: [], housesMet: [], sefirotLit: ALL, guardiansBroken: ALL,
          falls: 2, encounterNumber: 1, endingPlea: "alone", witnessSefirot: [],
          wordsFormed: [{
            letterIds: ["nun", "kaf", "lamed"], hebrew: "נכל", transliteration: "nêkel",
            gloss: "deceit", wasTarget: true, regionIndex: 6,
          }],
        });
        store.put({
          id: "book-crown", seed: 5, seedLabel: "3 Iyyar 5786",
          createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z",
          sealedAt: "2026-02-01T00:00:00.000Z", regionIndex: 10, at: "keter",
          pathsWalked: ["malchut-yesod", "yesod-tiferet", "tiferet-keter"],
          lettersHeld: ["aleph", "bet", "peh"], or: 12, regionsCleared: [], housesMet: [],
          sefirotLit: [], guardiansBroken: ALL, falls: 0, encounterNumber: 2,
          endingPlea: "heard", witnessSefirot: ["malchut", "hod"],
        });
        // No `endingPlea`, no `witnessSefirot` — the shape every record had
        // before P0 froze the ending. The Book derives it.
        store.put({
          id: "book-old", seed: 9, seedLabel: "9 Av 5785",
          createdAt: "2025-08-01T00:00:00.000Z", updatedAt: "2025-08-01T00:00:00.000Z",
          sealedAt: "2025-08-01T00:00:00.000Z", regionIndex: 10,
          pathsWalked: ["malchut-hod"], lettersHeld: ["aleph"], or: 3,
          regionsCleared: [], housesMet: [],
        });
        store.put({
          id: "book-putdown", seed: 1, seedLabel: "1 Elul 5786",
          createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
          abandonedAt: "2026-01-02T00:00:00.000Z", regionIndex: 2,
          lettersHeld: [], or: 0, regionsCleared: [], housesMet: [],
        });
        await new Promise((res) => { tx.oncomplete = res; });
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      // **The threshold remembers.** It used to say every climb "reached the
      // crown" — the linear road's only ending — and nothing at all about the
      // plea, which is the thing the whole climb was for. The newest sealed
      // record here is the lit one, which pleaded alone.
      const front = (await page.textContent("body")) ?? "";
      if (!/Last time: the Tree stood lit/.test(front)) {
        throw new Error(`the threshold forgot the last climb: ${front.replace(/\s+/g, " ").slice(0, 300)}`);
      }
      const door = page.getByRole("button", { name: /The Book of Ascents/ });
      if (!(await door.count())) throw new Error("the threshold offered no Book");
      await door.first().click();
      await page.waitForTimeout(500);
      // Case-folded, because `innerText` returns *rendered* text and the
      // section headings are `text-transform: uppercase` — "The Lexicon" comes
      // back as "THE LEXICON", which cost one run to work out.
      const text = (await page.locator('[role="dialog"]').innerText()).toLowerCase();
      for (const wanted of [
        "All ten kindled",
        "The crown reached",
        // The derived one: a climb with no Peh pleaded without a mouth, and
        // nothing about that was ever written on its record.
        "You arrived without a mouth",
        "one climb was put down",
        "The Lexicon",
        // What a Scribe has *become*, which is the only thing here that can
        // still be added to: the lit climb broke all ten, and the crown climb
        // broke all ten again, so those are at tier two.
        "What you have broken",
        "tier 2 of 3",
      ]) {
        if (!text.includes(wanted.toLowerCase())) {
          throw new Error(
            `the Book never said "${wanted}" — it said: ${text.replace(/\s+/g, " ").slice(0, 600)}`,
          );
        }
      }
      await page.screenshot({ path: join(outDir, "book-shelf.png") });
    },
    noPlay: true,
    until: () => true,
    seconds: 30,
  },
  {
    name: "arenas",
    about: "All ten guardians' rooms, one screenshot each — the terrain, the palette and the creature.",
    /**
     * **The ten rooms, looked at.**
     *
     * Nine of the ten fights shared one empty box until the arenas were
     * authored, and every claim about the new terrain is a claim about a
     * picture: whether Yesod's Nefilim reads as hanging from the mass above it,
     * whether Gevurah's vault looks like a weight, whether the ten palettes are
     * ten places or one place ten times. None of that is a thing a duel probe
     * can answer — it counts ticks and lamps, and it would count them happily
     * in a room drawn entirely in mud.
     *
     * A record per Sefirah, seeded rather than climbed, and the map's own
     * "Face …" button to go in — which is the door a player uses. `noPlay`,
     * because nothing here is meant to be fought: the frame wanted is the one
     * before anything happens.
     */
    warp: {},
    noPlay: true,
    enter: async (page) => {
      const ROOMS = [
        ["malchut", 1], ["yesod", 2], ["hod", 3], ["netzach", 4], ["tiferet", 5],
        ["gevurah", 6], ["chesed", 7], ["binah", 8], ["chochmah", 9], ["keter", 10],
      ];
      const ALL = [
        "aleph", "bet", "gimel", "dalet", "heh", "vav", "zayin", "chet", "tet", "yod",
        "kaf", "lamed", "mem", "nun", "samech", "ayin", "peh", "tzadi", "kuf", "resh",
        "shin", "tav",
      ];
      const missing = [];
      for (const [sefirah, index] of ROOMS) {
        await page.evaluate(
          async ({ sefirah, index, ALL }) => {
            const req = indexedDB.open("otzar-hasofer");
            const db = await new Promise((res, rej) => {
              req.onsuccess = () => res(req.result);
              req.onerror = () => rej(req.error);
            });
            const now = new Date().toISOString();
            const tx = db.transaction("ascents", "readwrite");
            // One record at a time, cleared between rooms, so the game always
            // resumes the climb this loop is looking at.
            tx.objectStore("ascents").clear();
            tx.objectStore("ascents").put({
              id: "playtest-arena",
              seed: 7,
              seedLabel: "playtest",
              createdAt: now,
              updatedAt: now,
              regionIndex: index,
              at: sefirah,
              pathsWalked: ["malchut-yesod"],
              lettersHeld: ALL,
              or: 0,
              regionsCleared: [],
              housesMet: [],
              sefirotLit: [],
            });
            await new Promise((res) => { tx.oncomplete = res; });
          },
          { sefirah, index, ALL },
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(700);
        await pastThePrologue(page);
        const face = page.getByRole("button", { name: /^Face / });
        if (!(await face.count())) {
          missing.push(sefirah);
          continue;
        }
        await face.first().click();
        await page.waitForTimeout(400);
        // **Walk in.** A guardian's room is three rooms — an entrance, the
        // fight, and the way out — and the Scribe appears in the first one,
        // which is plain by design. The first pass of this script photographed
        // ten identical porches and called it a sweep. Thirty tiles of holding
        // right is what puts the camera on the middle room, which is the one
        // that was authored.
        await page.keyboard.down(KEYS.right);
        await page.waitForTimeout(5200);
        await page.keyboard.up(KEYS.right);
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(outDir, `arena-${index}-${sefirah}.png`) });
      }
      if (missing.length) {
        throw new Error(`no way into the room at: ${missing.join(", ")}`);
      }
    },
    until: () => true,
    seconds: 30,
  },
  {
    name: "vessel",
    about: "A pedestal offers, and the offer is taken — the plate that could never rise.",
    /**
     * **The script that would have caught it, had it existed.**
     *
     * `GameCanvas` threaded `onVessel` through its props, stored it in
     * `callbacks.current`, and never assigned it onto the step context. `step`
     * calls `ctx.onVessel?.(e.ref)`; optional chaining on `undefined` is a
     * no-op; so the pedestal never spoke and **no vessel could be picked up in
     * the shipped game.** No type error, no runtime error, and every test green:
     * the fight and economy probes build their own `StepContext` and pass
     * `items` straight in, so they were measuring a game nobody could play.
     *
     * The reason no script covered it is worth keeping too, because it is a
     * general one: **the driver climbs nothing.** A vessel sits on a shelf two
     * rows off the floor, so even a script written for it would have walked
     * under the pedestal and reported a clean run. Hence `Probe.vessel` and
     * `seekVessel` — the probe says where the pedestal is and the driver turns
     * around and jumps at it, exactly as `seekHouse` already did for the
     * figures of the Dorot.
     *
     * And it asserts **taking**, not offering: `p.items` rather than
     * `p.plate === "vessel"`. A plate that rises and cannot be answered would
     * be the same bug one layer up.
     *
     * **Yesod, the whole alphabet, and the way back down** — three choices, and
     * every one of them is the driver's inability to climb wearing a different
     * hat. Worth writing down, because the next collectible will meet all three.
     *
     * `rowsFor` gives a rung of four or more *two* storeys and the vessel room
     * can land on the upper one: at rung 5 the probe read the pedestal at
     * `dy: -535`, which is not a shelf but a floor, and no amount of jumping
     * reaches it. A single-storey rung puts it on the Scribe's own level.
     *
     * `toward: "Malchut"` is the way back down out of Yesod, so the ground is
     * the kingdom's — the gentlest in the game.
     *
     * And `letters: "all"` rather than `as-of-rung`, which is the one that
     * actually mattered: holding only Malchut's two letters the driver spent
     * every run of four minutes bouncing off a three-tile pillar with a klipah
     * behind it, reaching eight per cent of the rung. Photographed, it is
     * unmistakable — the contact sheet is twelve frames of the same pillar. The
     * suite's own traversal probe crosses that ground holding nothing; this
     * driver is a worse player than the one the tests guarantee, which is
     * already written down against `up`. With the alphabet it reaches the
     * pedestal on every run.
     *
     * The debt is unchanged and is now named twice: whoever teaches this driver
     * to take a shaft gets the vessels on every rung, the Houses and the vows
     * in one go.
     */
    warp: { rung: 2, letters: "all", lamps: 3, seed: 3 },
    toward: "Malchut",
    until: (p) => p.items.length > 0 || p.finished,
    // Generous, because this driver is a real browser on a wall clock rather
    // than a deterministic probe: the same seed takes a different number of
    // seconds each run, and the pedestal sits a long way into the rung.
    seconds: 260,
    driver: { seekVessel: true },
    onPlate: async (page, plate) => {
      if (plate !== "vessel") return;
      const take = page.getByRole("button", { name: /Take it up/i });
      if (await take.count()) await take.first().click();
    },
  },
  {
    name: "reliquary",
    about: "A hidden thing found behind the Eye, climbed to, and taken up.",
    /**
     * **The chamber, played rather than asserted** — and the first screen in
     * this game behind *two* gates.
     *
     * `chamber.test.ts` proves the ground: the lane runs clear the whole width,
     * every rise is a plain jump, the staircase is veiled stone, and a held
     * relic leaves the room standing and empty with the tiles byte-identical.
     * What a test cannot do is press a key. The relic is seven tiles up behind
     * three steps that **do not exist** until Ayin is pressed, so this needed
     * the driver taught two things at once: `openTheEye`, which presses act on
     * a beat until `p.revealed` says it landed, and `seekRelic`, which is
     * `seekVessel`'s mechanism pointed at the niche.
     *
     * The three concessions are the vessel script's, unchanged and for the same
     * reason — **this driver climbs nothing.** A single-storey rung so the
     * chamber lands on the Scribe's own level; `toward: "Malchut"` for the
     * kingdom's gentle ground; and `letters: "all"`, which here is not a
     * concession at all but the whole point, since Ayin is in the alphabet and
     * without it there is no staircase.
     *
     * **No relics in the warp**, deliberately: this is the finding, and a
     * Scribe already carrying the thing would meet an empty room. The empty
     * room is `chamber.test.ts`'s claim; a full one is this script's.
     *
     * And it asserts **taking**, not offering — `p.relics` rather than
     * `p.plate === "relic"` — because a plate that rises and cannot be answered
     * is the same bug one layer up. That is the lesson `vessel` was written to
     * hold and it applies twice as hard here: a relic is the only thing in this
     * game that outlives the seal.
     */
    warp: { rung: 2, letters: "all", lamps: 3, seed: 3 },
    toward: "Malchut",
    until: (p) => p.relics.length > 0 || p.finished,
    seconds: 260,
    driver: { seekRelic: true },
    onPlate: async (page, plate) => {
      if (plate !== "relic") return false;
      const take = page.getByRole("button", { name: /Take it up/i });
      if (await take.count()) await take.first().click();
      return true;
    },
    check: (p) => {
      if (!p.revealed) throw new Error("the Eye was never opened — there was never a staircase");
      if (!p.relics.length) throw new Error("the chamber was reached and nothing was taken");
    },
  },
  {
    name: "scenes",
    about: "Every cut scene, across its own motion, on both grounds — the sheet this pass is judged on.",
    /**
     * **The scenes, looked at**, which is the only way a picture can be judged.
     *
     * `scene.test.ts` can say that six scenes are six different pictures and
     * that each of them moves, because a recording canvas can say that much. It
     * cannot say whether a wedge and a dot read as a scribe at a desk, and P4b
     * is the standing lesson on what happens when a table of drawn things has
     * only the first kind of test: twenty silhouettes passed "no two rows
     * match" while every creature on screen was a blob.
     *
     * Built exactly like `bestiary` and for the same reason — it imports
     * `/src/game/render/scene.ts` and `/src/game/render/scenes.ts` **out of the
     * dev server**, so what is photographed is the shipping painter rather than
     * a copy that would drift within a week. That is why `paintScene` takes a
     * scene, a palette, a `t` and a box, and needs no React and no world.
     *
     * **A row per scene, five frames across it**, at 0, 1, 2, 4 and 8 seconds,
     * and the ten places are tinted through `paletteOf` exactly as the panel in
     * the plate tints them — a place's scene is authored with no colour in it at
     * all and takes every bit of it from the Sefirah, so photographing them on
     * the plain theme would be photographing something nobody sees.
     * A single still cannot show motion and a video cannot be compared, so the
     * strip is the same instrument P8 built for the gaits: a row of keys is how
     * animators have always judged a walk, and it caught a figure doing the
     * splits that sixty frames a second had hidden. Eight seconds is on the end
     * deliberately — it is where a `once` drift has long since landed, and the
     * fall is meant to *stay* fallen.
     *
     * And **both grounds**, because a scene is painted entirely out of the
     * palette and the two are not the same picture with different numbers: on
     * vellum `ink` is the text colour and on charcoal it is the background. That
     * is the exact shape of the bug P8 shipped, and this is the sheet that would
     * have caught it.
     */
    warp: {},
    noPlay: true,
    enter: async (page) => {
      await pastThePrologue(page);
      const write = async (name, dataUrl) => {
        await writeFile(join(outDir, name), Buffer.from(dataUrl.split(",")[1], "base64"));
      };
      for (const theme of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.waitForTimeout(150);
        const sheet = await page.evaluate(async () => {
          const { paintScene, paintGround } = await import("/src/game/render/scene.ts");
          const { ALL_SCENES, PLACE_SCENES } = await import("/src/game/render/scenes.ts");
          const { paletteOf } = await import("/src/game/render/palette.ts");
          // Which Sefirah each scene is tinted for, so the ten are photographed
          // in the colour a player actually meets them in — a place's scene is
          // deliberately authored without colour and gets all of it from here.
          const placeOf = Object.fromEntries(
            Object.entries(PLACE_SCENES).map(([sefirah, scene]) => [scene.id, sefirah]),
          );
          const { readPalette } = await import("/src/game/render/palette.ts");
          const base = readPalette();

          // The panel's own aspect, so what is photographed is the composition
          // a reader gets rather than a crop of it.
          const W = 300;
          const H = 120;
          const AT = [0, 1, 2, 4, 8];
          const PAD = 4;
          const LABEL = 16;

          const canvas = document.createElement("canvas");
          canvas.width = AT.length * (W + PAD) + PAD;
          canvas.height = ALL_SCENES.length * (H + PAD + LABEL) + PAD;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = base.bgDeep;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ALL_SCENES.forEach((scene, row) => {
            const top = PAD + row * (H + PAD + LABEL);
            ctx.fillStyle = base.muted;
            ctx.font = "11px monospace";
            ctx.fillText(`${scene.id}  ·  ${AT.join("s  ")}s`, PAD, top + 11);
            AT.forEach((t, col) => {
              const left = PAD + col * (W + PAD);
              ctx.save();
              ctx.translate(left, top + LABEL);
              ctx.beginPath();
              ctx.rect(0, 0, W, H);
              ctx.clip();
              const here = paletteOf(base, placeOf[scene.id]);
              paintGround(ctx, here, W, H);
              paintScene(ctx, scene, here, t, W, H);
              ctx.restore();
              ctx.strokeStyle = base.stoneEdge;
              ctx.lineWidth = 1;
              ctx.strokeRect(left + 0.5, top + LABEL + 0.5, W - 1, H - 1);
            });
          });
          return canvas.toDataURL("image/png");
        });
        await write(`scenes-${theme}.png`, sheet);
      }
      await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
    },
    until: () => true,
    seconds: 20,
  },
  {
    name: "panel-still",
    about: "The panel under prefers-reduced-motion — a composed still, and a different one per page.",
    /**
     * **A still, not a blank**, which is a claim only a browser can settle.
     *
     * `SceneCanvas` reads `matchMedia("(prefers-reduced-motion: reduce)")` once
     * at mount and, if it matches, never starts the loop — it paints one frame
     * at the scene's own authored `still`. `scene.test.ts` can say that frame
     * has a picture in it, because it calls the painter directly. What it
     * cannot say is whether the *component* takes that branch, and the branch
     * has three ways to fail silently: the media query read at the wrong time,
     * the single paint racing a canvas that has no size yet, and the still
     * being painted once for the whole plate rather than once per page. All
     * three end in an empty box for exactly the readers who asked for less
     * movement and will never see the sheet the rest of this file produces.
     *
     * `reducedMotion` is a *context* setting in Playwright, fixed before the
     * first paint, so this has to be its own script rather than a passage in
     * another one.
     *
     * Three claims, and the third is the one that catches the frozen-canvas
     * failure: the picture does not change over a second, it is not the blank
     * canvas, and turning the page paints a *different* still.
     */
    warp: {},
    noPlay: true,
    motion: "reduce",
    enter: async (page) => {
      await tellItAgain(page);
      await page.getByRole("button", { name: /^Begin/ }).first().click();
      await page.waitForTimeout(700);

      const shot = () =>
        page.evaluate(() => {
          const canvas = document.querySelector('[role="dialog"] canvas[role="img"]');
          if (!canvas) return null;
          const blank = document.createElement("canvas");
          blank.width = canvas.width;
          blank.height = canvas.height;
          return {
            picture: canvas.toDataURL("image/png"),
            blank: blank.toDataURL("image/png"),
            size: [canvas.width, canvas.height],
          };
        });

      const first = await shot();
      if (!first) throw new Error("the prologue plate has no scene in it");
      if (first.size[0] < 2 || first.size[1] < 2) {
        throw new Error(`the panel is ${first.size.join("×")} — it never got a size`);
      }
      if (first.picture === first.blank) throw new Error("the still is an empty box");

      await page.waitForTimeout(1100);
      const again = await shot();
      if (again.picture !== first.picture) {
        throw new Error("the panel is still moving for a reader who asked it not to");
      }
      await page.screenshot({ path: join(outDir, "panel-still-1.png") });

      // ...and it is a still *of this page*, not one paint that outlived the
      // scene it was for.
      await page.keyboard.press("Enter");
      await page.waitForTimeout(600);
      const turned = await shot();
      if (!turned) throw new Error("the second page has no scene in it");
      if (turned.picture === first.picture) {
        throw new Error("turning the page did not repaint the still");
      }
      await page.screenshot({ path: join(outDir, "panel-still-2.png") });
      return { size: first.size, still: true };
    },
    until: () => true,
    seconds: 40,
  },
  {
    name: "panel-phone",
    about: "The prologue and the first sight of the kingdom at 390px — the new layout, on the screen it is played on.",
    /**
     * **The panel is new layout, and layout is the one thing the sheet cannot
     * photograph.** `scenes` draws the painter into a canvas of its own choosing
     * at whatever aspect it likes; this asks the shipped page what the panel
     * actually came out as when a plate of six lines of prose is above the fold
     * of a 390-wide phone.
     *
     * It is a fixed width rather than the global `--phone`, because this script
     * is *about* the narrow case: a layout arm that only ran when somebody
     * remembered a flag is an arm that runs on a desk.
     *
     * Two named traps from the phase, checked rather than assumed. **A plate
     * that grows past the screen** — `PlateOverlay` scrolls its body because
     * the crowning once overflowed, and a picture plus six paragraphs is the
     * same risk again; so nothing may overflow *horizontally*, at the page or
     * at the dialog, and the panel may not eat the plate. And **the panel is a
     * second canvas with a frame cost** — P6 measured the tile loop at 71% of
     * the drawing on a throttled phone, so the scene painter is timed here at
     * the size the panel really is, which is what `--phone --cpu=8` is for.
     *
     * It also carries the other half of `panel-still`'s claim: with motion
     * allowed, the same panel **does** move. Without it, a component that
     * painted one frame and died would pass the reduced-motion arm perfectly.
     */
    warp: {},
    noPlay: true,
    screen: { width: 390, height: 844 },
    enter: async (page) => {
      await tellItAgain(page);
      await page.getByRole("button", { name: /^Begin/ }).first().click();
      await page.waitForTimeout(700);

      const measured = [];
      const laidOut = async (name) => {
        const m = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          const canvas = dialog?.querySelector('canvas[role="img"]');
          const button = [...(dialog?.querySelectorAll("button") ?? [])].find(
            (b) => /Go on|Begin the ascent/.test(b.textContent ?? ""),
          );
          const box = (el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return [r.left, r.top, r.width, r.height].map((n) => Math.round(n));
          };
          return {
            page: [document.documentElement.scrollWidth, window.innerWidth],
            dialog: dialog ? [dialog.scrollWidth, dialog.clientWidth] : null,
            panel: box(canvas),
            button: box(button),
            viewport: [window.innerWidth, window.innerHeight],
          };
        });
        if (!m.panel) throw new Error(`${name}: the plate has no scene in it`);
        if (m.page[0] > m.page[1]) {
          throw new Error(`${name}: the page is ${m.page[0]}px wide in a ${m.page[1]}px window`);
        }
        if (m.dialog[0] > m.dialog[1]) {
          throw new Error(`${name}: the plate is ${m.dialog[0]}px wide in a ${m.dialog[1]}px box`);
        }
        if (m.panel[3] < 60) throw new Error(`${name}: the panel is ${m.panel[3]}px tall`);
        // A picture that takes half the screen on a phone is not an
        // establishing shot, it is the plate.
        if (m.panel[3] > m.viewport[1] * 0.45) {
          throw new Error(`${name}: the panel is ${m.panel[3]}px of a ${m.viewport[1]}px screen`);
        }
        measured.push({ at: name, ...m });
        return m;
      };

      // The panel moves when nobody has asked it not to — the other half of
      // `panel-still`, and the reason that script's pass means anything.
      const frame = () =>
        page.evaluate(() =>
          document.querySelector('[role="dialog"] canvas[role="img"]')?.toDataURL("image/png"),
        );
      const before = await frame();
      await page.waitForTimeout(700);
      if ((await frame()) === before) throw new Error("the panel is a still with motion allowed");

      /**
       * **What a frame of the panel costs**, at the size the panel really is on
       * this screen and through the shipping painter out of the dev server.
       * Every scene in turn rather than the one that happens to be up, because
       * the number worth writing down is the worst of the sixteen.
       */
      const cost = await page.evaluate(async () => {
        const { paintScene, paintGround } = await import("/src/game/render/scene.ts");
        const { ALL_SCENES, PLACE_SCENES } = await import("/src/game/render/scenes.ts");
        const { paletteOf, readPalette } = await import("/src/game/render/palette.ts");
        const live = document.querySelector('[role="dialog"] canvas[role="img"]');
        const rect = live.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const off = document.createElement("canvas");
        off.width = Math.round(rect.width * dpr);
        off.height = Math.round(rect.height * dpr);
        const ctx = off.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const placeOf = Object.fromEntries(
          Object.entries(PLACE_SCENES).map(([sefirah, scene]) => [scene.id, sefirah]),
        );
        const base = readPalette();
        const all = [];
        // **Per scene, and only then pooled.** A p95 taken across sixteen
        // different pictures is the cost of the expensive ones wearing the
        // name of the average, and it names nothing that could be changed.
        const each = ALL_SCENES.map((scene) => {
          const palette = paletteOf(base, placeOf[scene.id]);
          const ms = [];
          for (let i = 0; i < 24; i += 1) {
            const began = performance.now();
            ctx.clearRect(0, 0, rect.width, rect.height);
            paintGround(ctx, palette, rect.width, rect.height);
            paintScene(ctx, scene, palette, i / 6, rect.width, rect.height);
            ms.push(performance.now() - began);
          }
          all.push(...ms);
          ms.sort((a, b) => a - b);
          const round = (v) => Math.round(v * 1000) / 1000;
          return { id: scene.id, p50: round(ms[12]), worst: round(ms.at(-1)) };
        });
        all.sort((a, b) => a - b);
        const at = (q) => Math.round(all[Math.floor(all.length * q)] * 1000) / 1000;
        each.sort((a, b) => b.p50 - a.p50);
        return {
          css: [Math.round(rect.width), Math.round(rect.height)],
          backing: [off.width, off.height],
          paints: all.length,
          p50: at(0.5),
          p95: at(0.95),
          worst: Math.round(all.at(-1) * 1000) / 1000,
          dearest: each.slice(0, 4),
        };
      });

      /**
       * **Half a frame, whatever machine this is.** The bar is stated against
       * the sixty-a-second budget rather than against a number this run
       * happened to produce, which is what makes it mean the same thing at
       * `--cpu=8` as at `--cpu=1`: the throttle multiplies the cost, so a panel
       * that fits in half a frame on a throttled phone core fits everywhere.
       *
       * There is real headroom under it and that is deliberate — a bar drawn at
       * the last measurement is a bar that fails on the next machine, which is
       * exactly the mistake `fight.test.ts` made when it drew a ceiling from
       * the defect it was supposed to catch.
       */
      if (cost.p95 > 1000 / 60 / 2) {
        throw new Error(
          `a frame of the panel is ${cost.p95}ms at the 95th percentile (cpu ÷${CPU}), ` +
            `over half of a 16.7ms frame — dearest: ` +
            cost.dearest.map((d) => `${d.id} ${d.p50}ms`).join(", "),
        );
      }

      /**
       * The prologue, page by page, photographed at the width it is read at —
       * and bounded by **the page dots** rather than by the button.
       *
       * "Go on" is the button on the first sight too, so a loop that turned
       * every "Go on" walked straight through the kingdom and then complained
       * that the kingdom was never seen. The dots carry
       * `aria-label="Page n of 6"` and belong to the prologue alone, which
       * makes them both the fence and the label.
       */
      for (let turned = 0; turned < 12; turned += 1) {
        const dots = page.locator('[role="dialog"] [aria-label^="Page "]');
        if (!(await dots.count())) break;
        await laidOut((await dots.first().getAttribute("aria-label")) ?? `prologue ${turned + 1}`);
        await page.screenshot({ path: join(outDir, `panel-phone-${turned + 1}.png`) });
        await page.keyboard.press("Enter");
        await page.waitForTimeout(350);
      }

      /**
       * **And the kingdom seen from outside**, which is the other plate this
       * phase built and the only one of the ten a script can reach without
       * walking a path: Malchut is where a Scribe starts, so its first sight
       * plays at Begin, after the prologue's last page.
       */
      const sight = page.getByRole("button", { name: /^Go on$/ });
      await sight.first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
      const said = await page
        .locator('[role="dialog"]')
        .innerText()
        .catch(() => "");
      // Case-insensitively: the kicker is upper-cased in CSS, and `innerText`
      // reports the transformed text rather than the authored string.
      if (!/you come to/i.test(said)) {
        throw new Error(`the kingdom was never seen: ${said.slice(0, 80)}`);
      }
      await laidOut("first sight · malchut");
      await page.screenshot({ path: join(outDir, "panel-phone-first-sight.png") });

      return { cost, measured };
    },
    until: () => true,
    seconds: 60,
  },
  {
    name: "bestiary",
    about: "All twenty klipot, in their states, on both grounds — the sheet the creature pass is judged on.",
    /**
     * **The twenty, looked at — which nothing in this repo could do.**
     *
     * `arenas` photographs ten rooms and so shows the ten great ones, once
     * each, standing still and unhurt. That is half the bestiary and one of its
     * states. `bestiary.test.ts` answers the behavioural question — no two kinds
     * answer a Scribe alike — and cannot answer a visual one, because it never
     * draws anything. `husks.test.ts` enumerates the shape table and can only
     * say the rows differ, which is a claim about numbers and not about a
     * picture. So the pictures had no instrument at all, and a creature pass
     * without one is redecorating in the dark.
     *
     * This is that instrument, and note what it does *not* do: it does not
     * reimplement the painter. It imports the shipping module out of the dev
     * server — Vite serves and transpiles `/src/**` on demand, so
     * `import("/src/game/render/husks.ts")` inside the page is the same code
     * the game runs and not a copy that would drift within a week. That is the
     * whole reason `paintHusk` was lifted out of `draw.ts`: it takes a
     * creature, a palette and a tick, and needs no world to be true.
     *
     * **Two sheets on two grounds, because they answer different questions.**
     *
     * `bestiary-scale-*.png` draws every kind at the zoom a room is actually
     * framed at — a klipah is sixteen by eighteen world units and the camera
     * runs about 1.67, so a creature is roughly twenty-seven pixels of screen.
     * That is the only picture that can say whether a change reads *in play*,
     * and it is brutal about detail: anything under two pixels is mud. Each is
     * shown twice over, against open sky and against stone, because a shell is
     * filled from the palette's own deep background and the honest question is
     * whether it can be picked out of either.
     *
     * `bestiary-plate-*.png` draws the same twenty at six times, six states
     * apiece — whole, struck, half its shells gone, mid-charge, shut, and shut
     * *while being struck*. That is the picture you author against, and the
     * states are there because each was once drawn identically to its
     * neighbour: a creature about to charge looked exactly like one that is
     * not, and a blow that a shut creature turned aside looked exactly like a
     * blow that took a shell off it.
     *
     * And **both themes**, because the game ships a charcoal ground and a
     * vellum one and a klipah is drawn entirely out of the palette.
     *
     * The P6 lesson is why the magnified sheet exists at all: the tile-atlas
     * bug was four per cent of pixels against a one per cent run-to-run floor —
     * arguable as a number, unmistakable the moment a magnified strip was put
     * on screen.
     */
    warp: {},
    noPlay: true,
    enter: async (page) => {
      await pastThePrologue(page);
      const write = async (name, dataUrl) => {
        await writeFile(join(outDir, name), Buffer.from(dataUrl.split(",")[1], "base64"));
      };
      for (const theme of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.waitForTimeout(150);
        const shots = await page.evaluate(async () => {
          const { paintHusk } = await import("/src/game/render/husks.ts");
          const { readPalette } = await import("/src/game/render/palette.ts");
          const { HUSKS } = await import("/src/game/combat.ts");
          const base = readPalette();
          const kinds = Object.keys(HUSKS);

          /** A klipah standing on its own, in whatever state is asked for. */
          const stand = (kind, state) => {
            const spec = HUSKS[kind];
            return {
              id: kind,
              kind,
              x: -spec.size.w / 2,
              y: -spec.size.h / 2,
              w: spec.size.w,
              h: spec.size.h,
              vx: 0,
              vy: 0,
              shells: state === "opened" ? Math.max(1, spec.shells - 1) : spec.shells,
              facing: 1,
              home: { x: 3, y: 0 },
              cooldown: 0,
              charging: state === "charging" ? 20 : 0,
              struck: state === "struck" || state === "shut-struck" ? 6 : 0,
            };
          };

          const sheet = (w, h, paint) => {
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            paint(ctx);
            return canvas.toDataURL("image/png");
          };

          // The zoom a room is framed at, so this is the creature as seen.
          const PLAY = 1.67;
          const COLS = 5;
          const CELL = 96;
          const ROWS = Math.ceil(kinds.length / COLS);

          const scaleSheet = sheet(COLS * CELL, ROWS * CELL * 2 + 24, (ctx) => {
            // Two bands: open sky above, stone below. A shell that reads
            // against one and not the other is still a shell nobody can see.
            ctx.fillStyle = base.bg;
            ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
            ctx.fillStyle = base.stone;
            ctx.fillRect(0, ROWS * CELL, COLS * CELL, ROWS * CELL);
            for (const band of [0, 1]) {
              const top = band * ROWS * CELL;
              kinds.forEach((kind, i) => {
                const cx = (i % COLS) * CELL;
                const cy = top + Math.floor(i / COLS) * CELL;
                ctx.save();
                ctx.translate(cx + CELL / 2, cy + CELL / 2 - 6);
                ctx.scale(PLAY, PLAY);
                // **Open on the sky band, shut on the stone band.** The two
                // bands were the same picture twice against two grounds, which
                // answered "can it be picked out" and could not answer "can its
                // state be read" — and the second is the question P14 turns on.
                // The plate sheet at six times is where a tell is authored; this
                // is the only place that can say whether it survives being
                // twenty-seven pixels, which is the size it is actually played
                // at. The two questions still both get answered, because a shut
                // klipah is the same silhouette with a ring round it.
                paintHusk(ctx, stand(kind, "whole"), base, 0, band === 1);
                ctx.restore();
                ctx.fillStyle = base.muted;
                ctx.font = "11px monospace";
                ctx.fillText(kind, cx + 6, cy + CELL - 8);
              });
            }
            ctx.fillStyle = base.gold;
            ctx.font = "bold 13px monospace";
            ctx.fillText("open against sky (top), shut against stone (bottom), at play zoom", 8, ROWS * CELL * 2 + 17);
          });

          // **Six, and the last two are the pair P14c exists for.** `shut` is
          // a klipah no mark can take a shell off — the two great ones' own
          // condition today, and eighteen more kinds' as P14d lands them — and
          // `shut-struck` is the one that matters most, because `strikeHusk`
          // sets `struck` on a blow that was turned aside exactly as on one
          // that landed. Those two cells side by side with `struck` are the
          // whole judgement: gold means a shell came off, silver means it did
          // not, and if a sheet cannot show that at six times it will not show
          // it at twenty-seven pixels either.
          const STATES = ["whole", "struck", "opened", "charging", "shut", "shut-struck"];
          const BIG = 6;
          const ROW = 136;
          const COL = 132;
          const plate = sheet(COL * STATES.length + 140, ROW * kinds.length + 40, (ctx) => {
            ctx.fillStyle = base.stone;
            ctx.fillRect(0, 0, COL * STATES.length + 140, ROW * kinds.length + 40);
            ctx.fillStyle = base.gold;
            ctx.font = "bold 15px monospace";
            STATES.forEach((state, j) => ctx.fillText(state, 140 + j * COL + 10, 26));
            kinds.forEach((kind, i) => {
              const cy = 40 + i * ROW;
              ctx.fillStyle = base.text;
              ctx.font = "13px monospace";
              ctx.fillText(kind, 10, cy + ROW / 2);
              ctx.fillStyle = base.muted;
              ctx.font = "10px monospace";
              ctx.fillText(`${HUSKS[kind].shells} shell`, 10, cy + ROW / 2 + 16);
              STATES.forEach((state, j) => {
                const cx = 140 + j * COL;
                ctx.strokeStyle = base.stoneEdge;
                ctx.lineWidth = 1;
                ctx.strokeRect(cx + 0.5, cy + 0.5, COL - 8, ROW - 8);
                ctx.save();
                ctx.translate(cx + (COL - 8) / 2, cy + (ROW - 8) / 2);
                ctx.scale(BIG, BIG);
                paintHusk(ctx, stand(kind, state), base, 0, state.startsWith("shut"));
                ctx.restore();
              });
            });
          });

          /**
           * **The walk, laid out as a strip** — one creature a row, eight
           * frames across a full stride and one more standing still.
           *
           * A gait cannot be judged from a still, and it cannot be judged from
           * a video either: the thing that goes wrong is two legs swinging
           * together, and at sixty frames a second that reads as *something*
           * being off without saying what. Side by side across one cycle it is
           * obvious in a glance — which is the same reason animators have
           * always drawn a walk as a row of keys rather than as a film.
           *
           * The last column is the same creature with no speed, which is the
           * other half of the claim: the legs must **stop**.
           */
          const FRAMES = 8;
          const walk = sheet(CELL * (FRAMES + 2), kinds.length * 52 + 30, (ctx) => {
            ctx.fillStyle = base.bg;
            ctx.fillRect(0, 0, CELL * (FRAMES + 2), kinds.length * 52 + 30);
            ctx.fillStyle = base.gold;
            ctx.font = "bold 12px monospace";
            ctx.fillText("one full stride, then the same creature at rest", 8, 18);
            kinds.forEach((kind, i) => {
              const spec = HUSKS[kind];
              const stride = spec.size.w * 1.5;
              const cy = 30 + i * 52 + 26;
              ctx.fillStyle = base.muted;
              ctx.font = "10px monospace";
              ctx.fillText(kind, 4, cy + 20);
              for (let f = 0; f <= FRAMES; f += 1) {
                const resting = f === FRAMES;
                const husk = stand(kind, "whole");
                husk.x = (stride * f) / FRAMES - spec.size.w / 2;
                husk.vx = resting ? 0 : 60;
                ctx.save();
                ctx.translate(70 + f * (CELL * 0.9) - husk.x, cy - spec.size.h / 2);
                paintHusk(ctx, husk, base, f * 7);
                ctx.restore();
              }
            });
          });

          return { scaleSheet, plate, walk, count: kinds.length };
        });
        if (shots.count !== 20) {
          throw new Error(`the sheet drew ${shots.count} klipot, not twenty`);
        }
        await write(`bestiary-scale-${theme}.png`, shots.scaleSheet);
        await write(`bestiary-plate-${theme}.png`, shots.plate);
        await write(`bestiary-walk-${theme}.png`, shots.walk);
      }
    },
    until: () => true,
    seconds: 30,
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

/**
 * `--day=2025-10-09` — run every script on a chosen calendar day.
 *
 * Sugar over `--warp=day=…`, worth its own flag because it is the axis this
 * harness was blind on: festival content is content that exists one day a
 * year, and until the warp learned the date every script measured whatever
 * day the container happened to boot on. `first-run` and the panel scripts,
 * which begin at the threshold rather than warping, still run on the wall
 * clock — the day rides the warp, and they have no warp to ride.
 */
const warpDay = flag("day", undefined);
if (warpDay) overrides.day = warpDay;

/**
 * `--motion=no-preference` — how to check that `panel-still` can fail.
 *
 * A script that asserts a picture holds still is worthless if it would pass
 * anyway, and there is no way to find that out from inside: `prefers-reduced-
 * motion` is fixed on the context before the first paint, so it cannot be
 * toggled mid-run. This overrides it, and running that one arm with it must
 * come back "the panel is still moving for a reader who asked it not to". It is
 * the same argument as `?faces=0` in P6 — an A/B switch that was itself broken
 * once, and reported the atlas as worthless.
 */
const motion = flag("motion", undefined);

/**
 * **What machine this is pretending to be.**
 *
 * `--phone` is a 390×844 viewport at three device pixels to the CSS pixel with
 * touch — an ordinary modern handset, and nine times the fill of the desktop
 * default. `--cpu=6` throttles the main thread to a sixth of this machine's
 * speed, which is the shape of a mid-range phone core against a developer's.
 * Both default off, so every number taken before this still means what it said.
 */
const PHONE = has("phone");
const SCREEN = PHONE ? { width: 390, height: 844 } : { width: 1280, height: 860 };
const DPR = Number(flag("dpr", PHONE ? 3 : 1));
const CPU = Number(flag("cpu", 1));

const scripts = (wanted.length ? SCRIPTS.filter((s) => wanted.includes(s.name)) : SCRIPTS).map(
  (s) => ({
    ...s,
    warp: { ...s.warp, ...overrides },
    seconds: seconds ? Number(seconds) : s.seconds,
    motion: motion ?? s.motion,
  }),
);
if (!scripts.length) {
  console.error(`No such script. Try --list.`);
  process.exit(1);
}


// --- entering by the Tree ----------------------------------------------------

/**
 * Step onto a way out of wherever the warp put the Scribe down.
 *
 * **Every warped script comes through here now.** A warp used to drop straight
 * onto `buildRegion(rung)` — the pre-Tree linear road — so the harness spent
 * its whole life verifying a road no player has walked since the overworld
 * shipped, and the road survived only because this file kept it warm. The warp
 * writes `at` and `pathsWalked` today, so a warped Scribe stands on the map
 * exactly as a playing one does, and getting into a rung means choosing a way
 * — which is the thing worth checking anyway.
 *
 * `prefer` names the far end when a script cares which ground it gets.
 */
async function walkOut(page, prefer) {
  // **Wait for the map, do not guess at it.** A fixed pause raced the overlay:
  // two of three migrated scripts spent their whole clock standing on the Tree
  // because the ways had not rendered when the click went out.
  const ways = page.locator("[class*=wayButton]");
  await ways.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (prefer) {
    const wanted = ways.filter({ hasText: prefer }).first();
    if (await wanted.count()) {
      await wanted.click();
      await page.waitForTimeout(900);
      return;
    }
  }
  // Any way out. The map lists each as "<Name> — <letter>", and the first is
  // as good as another when the script only wants ground under its feet.
  if (await ways.count()) {
    await ways.first().click();
    await page.waitForTimeout(900);
  }
}

/**
 * Answer the Word-Gate that is asking, using the root the probe reads off it.
 *
 * The clue is on the plate for a person to read; this is the machine reading
 * it. Until now `decide` treated a gate as a place to walk away from and this
 * file said plainly that "a crossing is unfinishable by the tool by
 * construction" — which meant the one screen the game asks a Scribe to *know*
 * something on had never been crossed by the harness.
 */
async function answerGate(page) {
  const gate = await page.evaluate((key) => globalThis[key]?.read?.()?.gate, PROBE_KEY);
  if (!gate) return false;
  for (const id of gate.letterIds) {
    const key = page.locator(`[data-letter="${id}"]`).first();
    if (!(await key.count())) return false;
    await key.click();
    await page.waitForTimeout(120);
  }
  const inscribe = page.getByRole("button", { name: /Inscribe|Write it/i }).first();
  if (await inscribe.count()) await inscribe.click();
  await page.waitForTimeout(600);
  return true;
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
  /**
   * Terrain to stand on or bump into.
   *
   * Not the same list as `isSolid` — a door and a Word-Gate are solid too, and
   * both are handled below as things to *answer* rather than as walls. But
   * every tile that blocks a body unconditionally has to be known here or
   * elsewhere in this function, and for a long time two of them were known
   * nowhere at all: `look()` reported a `Seal` and a `Maskit` as open air, so
   * this driver read a door closed behind it as a hole to fall through, and a
   * figured stone as a gap to leap — on every rung, twice a rung since the
   * budget went up. `TILE_NAMES` names them now, and this reads them.
   *
   * **`maskit` counts as floor precisely because it is meant to.** The tile's
   * whole design is that it is indistinguishable from hewn stone underfoot, so
   * a driver that knew to step around one would measure a game no player is
   * playing. Naming it here does not teach avoidance — it is walked exactly as
   * stone is, and it gives way exactly as it would under anyone.
   */
  const solid = (t) =>
    t === "stone" ||
    t === "ledge" ||
    t === "placed" ||
    t === "growth" ||
    t === "maskit" ||
    t === "seal";

  /**
   * **The nearest figured stone in view, as something to walk to.**
   *
   * Only `maskit` asks for this. Walking right and hoping is not enough to
   * *meet* one — measured in the suite, a body that never stops springs 54 of
   * the 240 stones laid across ten rungs and twelve seeds, and on the rung this
   * script first warped to, three of thirty-six. Four browser runs each saw a
   * stone and none ever stood on one.
   *
   * So it is treated exactly as a House or a pedestal is: the thing is spotted,
   * and the driver turns around for it and jumps at it. The tile underfoot is
   * skipped — a stone there is already breaking.
   */
  let maskitSeen;
  if (opts?.ontoMaskit) {
    let near = Infinity;
    for (let dy = -R; dy <= R; dy += 1) {
      for (let dx = -R; dx <= R; dx += 1) {
        if (at(dx, dy) !== "maskit" || (dx === 0 && dy === 0)) continue;
        const far = Math.abs(dx) + Math.abs(dy);
        if (far >= near) continue;
        near = far;
        // In pixels and in the shape the `seek` machinery below already reads.
        maskitSeen = { dx: dx * 24, dy: dy * 24 };
      }
    }
  }

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
  // **Unless the script is here for the gate.** Walking away from gates is
  // right for every script that cannot spell — and exactly wrong for the one
  // that can, which spent three runs being steered out of the chamber it came
  // to answer. `gate` reached 29% and no plate at all on one of them.
  if (gateAhead && !opts?.intoGates) memory.leaveGate = 60;
  else if (memory.leaveGate > 0) memory.leaveGate -= 1;

  const backingOff =
    memory.leaveGate > 0 || (memory.stuckFor > 90 && memory.stuckFor % 150 < 45);

  /**
   * **Steering to the figure of the Houses**, when a script has asked for it.
   *
   * Walking right is enough to *pass* a House and not enough to *meet* one: the
   * `H` marker sits wherever its chunk puts it, which is often a ledge a
   * walking driver has no reason to climb onto. Measured, not guessed — the
   * `house` script and three attempts at `vow` all crossed the marker's column
   * and raised no plate. So the probe reports where it is (`p.house`) and this
   * turns around for it and jumps at it.
   */
  // **The one thing on a ledge the driver is told about.** Generalised from
  // `seekHouse`, because the pedestal needed it worse: `VESSEL_CHUNK` puts the
  // vessel on a shelf two rows up and no script had ever reached one, which is
  // half of why `onVessel` could go unwired for months without anything
  // noticing. Same mechanism either way — the probe says where it is, and this
  // turns around for it and jumps at it.
  const seek =
    opts?.seekHouse ? p.house
    : opts?.seekVessel ? p.vessel
    : opts?.seekRelic ? p.relic
    : opts?.ontoMaskit ? maskitSeen
    : undefined;

  /**
   * **Opening the Eye, which is a gate the driver had never met before.**
   *
   * The relic chamber is the first thing in the game behind *two* gates: the
   * staircase is `Tile.Veiled` and does not exist until `reveal` is pressed, so
   * a driver told only where the niche is jumps at empty air from the floor for
   * four minutes and reports a clean run. The same disagreement the suite's own
   * probe had — `routeTo` has assumed a Scribe holding Ayin stands on revealed
   * stone since the Tree replaced the line, and neither pair of hands ever
   * pressed the key.
   *
   * Ayin shares `act` with the Hook, the Edge, the Flame, the Door and the
   * House, and which one answers depends on what is standing beside you — so
   * this presses on a slow beat until `p.revealed` says it landed, rather than
   * once and hopefully.
   *
   * **Not until the niche is in sight**, which is both truer and useful. A
   * player reveals when they see something worth revealing; and pressed at the
   * first tick the Eye opens two hundred tiles before the chamber, so the
   * *unrevealed* chamber — the one everybody meets first, a hole in the wall
   * seven tiles up with no way to it — never appears on the contact sheet at
   * all. Waiting until the room is on screen puts both states in the pictures.
   */
  const inSight = Boolean(p.relic && Math.abs(p.relic.dx) < 260);
  const openTheEye = Boolean(
    opts?.seekRelic && inSight && !p.revealed && p.onGround && memory.tick % 11 === 0,
  );
  const seekBehind = Boolean(seek && seek.dx < -16);
  const seekAbove = Boolean(seek && Math.abs(seek.dx) < 110 && seek.dy < -20);

  /**
   * **A script that came to stand on one.**
   *
   * Off everywhere but `maskit`, and deliberately so: a driver that steered
   * toward the traps — or around them — would measure a game nobody is
   * playing. All this does is decline to *jump over* the tile, which is not a
   * player's instinct but is the difference between photographing the trap and
   * photographing the floor beside it. Measured: with the ordinary gait the
   * run met one figured stone in four minutes, cleared it in the stride it was
   * seen, and never touched another. A body that leaps every second crosses a
   * one-tile lie far more often than it lands on one.
   *
   * **The floor row ahead, and only that.** Widening this to "a stone anywhere
   * in view" made it worse, not better: a stone on a shelf above stays in sight
   * for a long stretch, and a driver forbidden to jump for all of it cannot
   * climb to the thing it is being held still for. Jumping only ever *carries a
   * body over* a stone that is in the line it is already walking, so that is
   * the only place worth declining to jump.
   */
  const seekingMaskit =
    Boolean(opts?.ontoMaskit) && [1, 2, 3, 4].some((dx) => at(dx, 0) === "maskit");

  const wantJump =
    !backingOff && !seekingMaskit && (gapAhead || wallAhead || seekAbove || memory.stuckFor > 6);

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
    right: !backingOff && !seekBehind,
    left: backingOff || seekBehind,
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
    act:
      memory.actFor <= 0 &&
      !p.grappled &&
      (openTheEye || barrierAhead || (!p.onGround && !groundBelow)),
    dash: !reckless && !p.onGround && !groundBelow && memory.tick % 3 === 0,
    strike: opts?.strike !== false && husk !== undefined && husk < 220 && memory.tick % 5 === 0,
  };
}

/** Which keys are held down over time, and which are struck once. */
const HELD_KEYS = ["left", "right", "up", "down", "jump"];
const TAP_KEYS = ["act", "dash", "strike"];

// --- a run -------------------------------------------------------------------

async function play(script, browser) {
  /**
   * **Two things a script may say about the machine it wants**, and both exist
   * for the same reason: they are settings of the *context*, fixed before the
   * first paint, so no amount of driving can reach them afterwards.
   *
   * `screen` is a width a script is *about* rather than one a run is taken on —
   * `--phone` is the global for "take these numbers on a handset", and a layout
   * arm has to be narrow whether or not anybody passed it. `motion` is
   * `prefers-reduced-motion`, which Playwright can only set here, and which
   * `SceneCanvas` reads once at mount.
   */
  const screen = script.screen ?? SCREEN;
  const context = await browser.newContext({
    viewport: screen,
    deviceScaleFactor: DPR,
    isMobile: PHONE,
    hasTouch: PHONE,
    recordVideo: has("no-video") ? undefined : { dir: outDir, size: screen },
    reducedMotion: script.motion ?? "no-preference",
  });
  const page = await context.newPage();

  /**
   * **The pocket, emulated rather than imagined.**
   *
   * P6 is gated on frame times and the gate was never armed: every number this
   * harness has ever taken came from a 1280-wide desktop viewport at one device
   * pixel per CSS pixel with a whole core to itself, which is the one machine
   * the phase is *not* about. A phone multiplies the work twice over — three
   * device pixels per CSS pixel is nine times the fill, and a mid-range core is
   * several times slower — and those two multiply each other.
   *
   * `Emulation.setCPUThrottlingRate` is the only honest way to get the second
   * one, and it is CDP rather than Playwright API, so it wants a session.
   */
  if (CPU > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  const query = new URLSearchParams(script.warp).toString();
  await page.goto(`${url}/#/game?${query}`, { waitUntil: "domcontentloaded" });

  // A script may have to *walk in* rather than warp in — the overworld is
  // reached by beginning a climb and choosing a way, and no query string
  // expresses that.
  // Whatever `enter` came back with is kept: a script that measures something
  // rather than playing it has nowhere else to put its findings, and a number
  // printed to a console and not written down is a number nobody can compare
  // against next month.
  let found;
  if (script.enter) {
    await page.waitForTimeout(600);
    found = await script.enter(page);
    await page.waitForTimeout(600);
  } else if (Object.keys(script.warp ?? {}).length > 0) {
    // A warp stands the Scribe on the Tree; a rung is chosen, never given.
    await walkOut(page, script.toward);
  }

  /**
   * **A script that has nothing to play.** `book` is about a surface that
   * exists precisely when no climb does — a shelf of sealed records — so there
   * is no world, no probe reading, and nothing for the driver to do. It has
   * already asserted everything it came for inside `enter`. Without this it
   * failed on "the probe never appeared", which was true and beside the point.
   */
  if (script.noPlay) {
    const report = {
      script: script.name,
      about: script.about,
      warp: script.warp,
      startedAt: new Date().toISOString(),
      samples: [],
      captions: [],
      plates: [],
      letters: [],
      found,
      errors,
      ended: "the script asked for nothing to be played",
    };
    // **Written down and closed up**, both of which this branch used to skip:
    // `book` and `scenes` left no JSON at all — so the one script whose whole
    // output is a measurement had nowhere to put it — and left their context
    // open, which on a set run holds every page of every no-play script alive
    // until the browser closes.
    await writeFile(join(outDir, `${script.name}.json`), `${JSON.stringify(report, null, 2)}\n`);
    await context.close();
    return report;
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
  /** A watching script's own scratch — see `script.watch` in the loop below. */
  const watching = {};
  const report = {
    script: script.name,
    about: script.about,
    warp: script.warp,
    startedAt: new Date().toISOString(),
    samples: [],
    captions: [],
    /** What a watching script stopped to photograph, and when. */
    moments: [],
    plates: [],
    letters: [],
    found,
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

    // What a frame costs, sampled once a second. The renderer re-synthesizes
    // every visible tile from vector primitives with no atlas and no layer
    // cache, and the roadmap's perf work is gated on numbers rather than on
    // suspicion — so every run leaves some behind.
    if (i % 60 === 0) {
      const frames = await page.evaluate((key) => globalThis[key]?.frames?.(), PROBE_KEY);
      if (frames?.frames > 0) report.frames = frames;
      const phases = await page.evaluate((key) => globalThis[key]?.phases?.(), PROBE_KEY);
      if (phases && Object.keys(phases).length > 0) report.phases = phases;
    }

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
      if (script.until(p, watching)) {
        reason = `reached: ${p.plate}`;
        break;
      }
      await release();
      // A script may want to *answer* a plate rather than dismiss it — the
      // Word-Gate is the only screen in the game where pressing on regardless
      // is the wrong move, and the crossing script is the one that knows it.
      const answered = script.onPlate ? await script.onPlate(page, p.plate) : false;
      if (!answered) {
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
      }
      continue;
    }

    /**
     * **A script that is here for a moment rather than for a run.**
     *
     * The contact sheet is spaced evenly over however long the run turns out to
     * be, which is right for watching a climb and useless for catching an
     * event: a figured stone gives way, drops a body and mends itself inside
     * two thirds of a second, and a sheet shooting every second and a half will
     * photograph the floor before and the floor after and nothing in between.
     *
     * So a script may watch the world itself and shoot on its own trigger.
     * `seen` is its scratch across ticks — a moment is photographed once — and
     * `release` lets it stop the Scribe first, because a picture taken of a
     * body still walking is a picture of somewhere else.
     */
    if (script.watch) await script.watch(page, p, look, { seen: watching, release, report });

    if (script.until(p, watching)) {
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

  /**
   * **What the run had to have come to**, checked after the sheet and the
   * report are on disk rather than before — a script that fails is the one
   * whose pictures you most want to look at, and throwing first would take
   * them with it.
   *
   * `until` says when to stop and this says whether stopping was the right
   * thing. They are not the same question: a script with a generous `until`
   * ends cleanly on a timeout and reports a tidy percentage, which is how a
   * driver that never reached anything reads as a pass.
   */
  // The report rides along as the third argument: a check may need to read
  // what was *recorded* — plate texts above all — because two plates can rise
  // back to back with no walking iteration between them, and the watch hook
  // never runs while a plate is up. Found by the path script asserting a
  // question both plates visibly carried.
  if (script.check) script.check(last ?? {}, watching, report);

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
