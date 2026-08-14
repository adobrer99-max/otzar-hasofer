import { describe, expect, it } from "vitest";
import { CHUNK_H, CHUNK_W, CHUNKS, END_CHUNK, START_CHUNK } from "./chunks";
import { paintChunks, tileAt } from "./build";
import { hurried } from "./probes";
import { routeTo } from "./route";
import { Tile } from "./tiles";
import type { Verb } from "../abilities";
import type { Chunk } from "./types";

/**
 * **How much a screen asks of a body that will not slow down.**
 *
 * Everything else in this suite that walks the library asks whether a screen
 * can be *crossed* — the soft-lock question, settled for every screen there is,
 * on every seed, by `traversal.test.ts`. This file asks the other one, and
 * until `hurried` existed nothing could: **does the ground cost anything to run
 * past?**
 *
 * The play report the terrain phase came from is that it does not — that the
 * small klipot can be skipped by running and the ground does not punish it —
 * and the reason is now written down rather than felt. The authoring alphabet
 * is nine things a screen can hold besides stone, ledge and air, and every one
 * of the nine is a **lock**: a thorn, water, a thicket, a vine, veiled stone, a
 * door, a ring, a low crawl, a Word-Gate. Each is answered by a letter and each
 * costs exactly nothing once the letter is held. The one tile in the game that
 * charges a careless body rather than an unequipped one is `Tile.Maskit`, and
 * until this slice it had no character in `TILE_CHARS`, so no screen had ever
 * been composed around one.
 *
 * So this slice is a vocabulary and an instrument, and it ships with neither
 * used: not one screen writes an `m` yet, and no band moves. What it buys is
 * that the next slice can name the free screens as a list rather than a
 * suspicion.
 */

const chainFor = (chunk: Chunk): Chunk[] | undefined => {
  const up = CHUNKS.find((c) => c.id === "rise-to-high");
  const down = CHUNKS.find((c) => c.id === "fall-to-ground");
  if (!up || !down) throw new Error("the library lost its way up or down");
  if (chunk.entry === "ground" && chunk.exit === "ground") return [START_CHUNK, chunk, END_CHUNK];
  if (chunk.entry === "high" && chunk.exit === "high") return [START_CHUNK, up, chunk, down, END_CHUNK];
  if (chunk.entry === "ground" && chunk.exit === "high") return [START_CHUNK, chunk, down, END_CHUNK];
  if (chunk.entry === "high" && chunk.exit === "ground") return [START_CHUNK, up, chunk, END_CHUNK];
  return undefined;
};

/** A screen on the high road is reached over the lift, so the lift's letters count. */
const declares = (chunk: Chunk): Verb[] => {
  const lift = CHUNKS.filter((c) => c.id === "rise-to-high" || c.id === "fall-to-ground");
  const extra = chunk.entry === "high" || chunk.exit === "high" ? lift.flatMap((c) => c.requires) : [];
  return [...new Set([...chunk.requires, ...extra])];
};

const SEEDS = [1, 2, 3, 4, 5, 6];

interface Reading {
  id: string;
  crossed: number;
  veilings: number;
  sprung: number;
  ticks: number;
}

/** A screen, walked by a body that will not slow down, on every seed. */
function run(chunk: Chunk): Reading | undefined {
  const chain = chainFor(chunk);
  if (!chain) return undefined;
  const verbs = declares(chunk);
  const out: Reading = { id: chunk.id, crossed: 0, veilings: 0, sprung: 0, ticks: 0 };
  for (const seed of SEEDS) {
    // A figured-stone budget big enough that every authored one on the chain
    // stands — otherwise a screen composed around a trap is measured with the
    // trap turned off and reported as harmless.
    const world = paintChunks(chain, seed, 8);
    // The klipot are not what is being measured, and both lists have to go:
    // a figured stone stands something up out of the floor, so emptying the
    // bodies is not the same act as emptying the rung of creatures.
    world.husks = [];
    world.klipot = [];
    const r = hurried(world, { verbs, graces: [] }, 6000);
    if (r.crossed) out.crossed += 1;
    out.veilings += r.veilings;
    out.sprung += r.sprung;
    out.ticks += r.ticks;
  }
  return out;
}

describe("the hurried Scribe", () => {
  /**
   * A pair of hands that crosses nothing measures nothing. The floor under the
   * whole instrument: on the plainest ground in the library — the opening
   * screen, a screen and the way out — a body that never stops gets out.
   */
  it("crosses plain ground without stopping", () => {
    const world = paintChunks([START_CHUNK, END_CHUNK], 1);
    world.husks = [];
    world.klipot = [];
    expect(hurried(world, { verbs: [], graces: [] }, 4000).crossed).toBe(true);
  });

  /**
   * **Impatient, not incompetent** — and getting that line right took a wrong
   * reading first, which is worth keeping.
   *
   * The first version of `hurried` had no wall-climb and latched its reach to
   * once a fall. It reported thirteen of fifty-six screens uncrossable at speed
   * — `sheer-wall`, `sheer-face`, `high-vault`, `vine-wall` and every screen
   * built around the Hook, five of those with a hundred and fifty veilings
   * apiece. Read as terrain that would be *the anchor screens punish a runner*.
   * It was the driver: holding into a face and tapping jump is a reflex, and
   * the Hook wants another cast the moment it has thrown you. Six screens stop
   * it now, and every one of them is a screen that asks for a considered move.
   *
   * So both bounds are here on purpose. The lower one catches a driver that has
   * stopped working; the upper one is exact rather than chosen — a probe that
   * crossed *every* screen would be `probe` with extra steps, and the table the
   * next slice publishes would be a column of zeroes.
   */
  it("is stopped by some of the library, and by no means most of it", { timeout: 300000 }, () => {
    const readings = CHUNKS.map(run).filter((r): r is Reading => r !== undefined);
    const clean = readings.filter((r) => r.crossed === SEEDS.length);
    const where = `${clean.length}/${readings.length} screens crossed on every seed in a hurry`;
    expect(readings.length).toBeGreaterThan(50);
    expect(clean.length, where).toBeGreaterThan(readings.length * 0.35);
    expect(clean.length, where).toBeLessThan(readings.length);
  });

  /**
   * **And the state of the ground before a line of it is authored: nothing the
   * library holds charges a body that crosses it.**
   *
   * Fifty of fifty-six screens are crossed in a hurry on every seed, and across
   * all three hundred of those walks the terrain took **nothing** — not one
   * veiling, and the tick counts within a few per cent of the same screens
   * walked carefully, most of them identical to the tick. Every veiling in the
   * whole sweep comes from the one screen a runner cannot do at all.
   *
   * That is the play report — *the terrain does not punish running* — stated as
   * a number, and it is a measurement of the authoring rather than a rule about
   * it. **P13d is expected to make this false**, one screen at a time, and the
   * screens that make it false are named here when they do. A test that has to
   * be edited to author risk is the right kind of friction: it means nobody can
   * add a price to the ground without saying so out loud.
   */
  it("charges nothing at all for the screens a runner does get across", { timeout: 300000 }, () => {
    const readings = CHUNKS.map(run).filter((r): r is Reading => r !== undefined);
    const charged = readings
      .filter((r) => r.crossed === SEEDS.length && r.veilings > 0)
      .map((r) => `${r.id} (${r.veilings})`);
    expect(charged, `screens that cost a runner something and let them through:\n  ${charged.join("\n  ")}`).toEqual(
      [],
    );
  });
});

describe("the figured stone, authored", () => {
  /**
   * A floor whose sixth and eleventh tiles are lies — the composition the
   * scatter cannot express, since it places at most two tiles per rung at
   * random and never on purpose.
   */
  const LIE: Chunk = {
    id: "test-lie",
    requires: [],
    demand: 1,
    entry: "ground",
    exit: "ground",
    rows: [
      ...Array.from({ length: CHUNK_H - 2 }, () => ".".repeat(CHUNK_W)),
      "#####m####m#####",
      "################",
    ],
  };
  const chain = [START_CHUNK, LIE, END_CHUNK];
  /** Where the authored stones land in the painted grid. */
  const at = [
    { x: CHUNK_W + 5, y: CHUNK_H - 2 },
    { x: CHUNK_W + 10, y: CHUNK_H - 2 },
  ];

  it("writes a figured stone exactly where the screen asks for one", () => {
    const world = paintChunks(chain, 1, 2);
    for (const p of at) expect(tileAt(world, p.x, p.y)).toBe(Tile.Maskit);
  });

  /**
   * **The budget is the rung's, and the authored ones come out of it first.**
   * A Sefirah that wants no untrustworthy ground gets none, however many
   * screens it lays that were drawn with some — which is what stops the two
   * ways of laying one from double-counting.
   */
  it("draws an authored stone from the rung's own budget, in reading order", () => {
    expect(tileAt(paintChunks(chain, 1, 0), at[0].x, at[0].y)).toBe(Tile.Stone);
    // One in the budget: the first is a lie, the second is stone.
    const one = paintChunks(chain, 1, 1);
    expect(tileAt(one, at[0].x, at[0].y)).toBe(Tile.Maskit);
    expect(tileAt(one, at[1].x, at[1].y)).toBe(Tile.Stone);
  });

  /**
   * **And no budget can move where a body may walk.**
   *
   * This is the property the whole thing rests on. An authored stone over
   * budget is written as ordinary hewn stone rather than dropped, and `isSolid`
   * cannot tell the two apart — so the grid a route is proved against is the
   * same grid at every setting of `region.maskit`, and the no-soft-lock
   * guarantee taken over the painted world in `route.test.ts` cannot be
   * invalidated by a number in a region table.
   */
  it("changes no tile but its own, and no route at all", () => {
    const none = paintChunks(chain, 1, 0);
    const some = paintChunks(chain, 1, 2);
    const differ: string[] = [];
    for (let i = 0; i < none.tiles.length; i += 1) {
      if (none.tiles[i] !== some.tiles[i]) differ.push(`${i % none.width},${Math.floor(i / none.width)}`);
    }
    expect(differ).toEqual(at.map((p) => `${p.x},${p.y}`));
    expect(routeTo(none, []).usable).toBe(true);
    expect(routeTo(some, []).usable).toBe(true);
  });

  /**
   * And it costs a runner the thing a runner is trying to save: the floor is
   * not there, and getting back up onto it is a jump that was not planned.
   */
  it("gives way under a body that will not slow down", () => {
    const world = paintChunks(chain, 1, 2);
    world.husks = [];
    world.klipot = [];
    const r = hurried(world, { verbs: [], graces: [] }, 4000);
    expect(r.sprung).toBeGreaterThan(0);
    // Ground, never lamps: it is still crossed, and nothing was veiled.
    expect(r.crossed).toBe(true);
    expect(r.veilings).toBe(0);
  });
});
